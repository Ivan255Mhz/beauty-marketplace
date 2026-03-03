import { useEffect, useState, useCallback, useRef } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Typography, Badge, Popover, Divider, notification } from 'antd';
import {
  ScissorOutlined, UserOutlined, LogoutOutlined,
  DashboardOutlined, BellOutlined, CheckOutlined,
  CalendarOutlined, CheckCircleOutlined, CloseCircleOutlined, StarOutlined,
  MessageOutlined, ClockCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { notificationsApi, messagesApi } from '../../api/endpoints';
import type { NotificationDto } from '../../types';

const { Header, Content, Footer } = Layout;
const { Text } = Typography;

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'только что';
  if (min < 60) return `${min} мин назад`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} ч назад`;
  return `${Math.floor(h / 24)} д назад`;
}

function NotifIcon({ type }: { type: NotificationDto['type'] }) {
  if (type === 'NewBooking')        return <CalendarOutlined    style={{ fontSize: 16, color: '#ff6b9d' }} />;
  if (type === 'BookingConfirmed')  return <CheckCircleOutlined style={{ fontSize: 16, color: '#52c41a' }} />;
  if (type === 'BookingCancelled')  return <CloseCircleOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />;
  if (type === 'BookingCompleted')  return <CheckCircleOutlined style={{ fontSize: 16, color: '#1677ff' }} />;
  if (type === 'BookingNoShow')     return <StopOutlined        style={{ fontSize: 16, color: '#722ed1' }} />;
  if (type === 'NewReview')         return <StarOutlined        style={{ fontSize: 16, color: '#faad14' }} />;
  if (type === 'Reminder24h')       return <ClockCircleOutlined style={{ fontSize: 16, color: '#fa8c16' }} />;
  if (type === 'Reminder2h')        return <ClockCircleOutlined style={{ fontSize: 16, color: '#f5222d' }} />;
  return <BellOutlined style={{ fontSize: 16, color: '#888' }} />;
}

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, name, role, avatarUrl, logout } = useAuthStore() as any;
  const navigate = useNavigate();
  const location = useLocation();

  const [notifications, setNotifications] = useState<NotificationDto[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadMessages, setUnreadMessages] = useState(0);
  const prevUnreadRef = useRef<number>(-1);  // -1 = первая загрузка

  const [notifApi, notifContextHolder] = notification.useNotification();

  const showReminderToast = useCallback((notif: NotificationDto) => {
    const isReminder = notif.type === 'Reminder24h' || notif.type === 'Reminder2h';
    const icon = notif.type === 'Reminder24h' ? '🕐' : '⏰';
    const title = notif.type === 'Reminder24h' ? 'Напоминание: завтра' : 'Скоро визит!';
    notifApi.open({
      key: notif.id,
      message: <Text strong>{icon} {title}</Text>,
      description: notif.message,
      duration: isReminder ? 8 : 4,
      placement: 'topRight',
      style: {
        borderRadius: 12,
        borderLeft: `4px solid ${notif.type === 'Reminder2h' ? '#f5222d' : '#fa8c16'}`,
      },
    });
  }, [notifApi]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationsApi.getAll();
      const newUnread = res.unreadCount;

      // Показываем toast только если появились НОВЫЕ непрочитанные (не первая загрузка)
      if (prevUnreadRef.current !== -1 && newUnread > prevUnreadRef.current) {
        const freshNotifs = res.items
          .filter(n => !n.isRead)
          .slice(0, newUnread - prevUnreadRef.current);
        freshNotifs.forEach(n => {
          if (n.type === 'Reminder24h' || n.type === 'Reminder2h') {
            showReminderToast(n);
          }
        });
      }
      prevUnreadRef.current = newUnread;

      setNotifications(res.items);
      setUnreadCount(newUnread);
    } catch {}
  }, [isAuthenticated, showReminderToast]);

  const fetchUnreadMessages = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await messagesApi.getUnreadCount();
      setUnreadMessages(typeof res === 'number' ? res : 0);
    } catch {}
  }, [isAuthenticated]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications, location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchNotifications]);

  // Сообщения — полинг каждые 10с
  useEffect(() => { fetchUnreadMessages(); }, [fetchUnreadMessages, location.pathname]);

  useEffect(() => {
    if (!isAuthenticated) return;
    const interval = setInterval(fetchUnreadMessages, 10000);
    return () => clearInterval(interval);
  }, [isAuthenticated, fetchUnreadMessages]);

  const handleOpenNotif = async (open: boolean) => {
    setNotifOpen(open);
    if (open && unreadCount > 0) {
      try {
        await notificationsApi.markAllRead();
        setUnreadCount(0);
        setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      } catch {}
    }
  };

  const handleLogout = () => { logout(); navigate('/'); };

  const userMenuItems = [
    { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/dashboard">Личный кабинет</Link> },
    { key: 'profile', icon: <UserOutlined />, label: <Link to="/profile">Профиль</Link> },
    { type: 'divider' as const },
    { key: 'logout', icon: <LogoutOutlined />, label: 'Выйти', danger: true, onClick: handleLogout },
  ];

  const navItems = [
    { key: '/', label: <Link to="/">Главная</Link> },
    { key: '/masters', label: <Link to="/masters">Мастера</Link> },
  ];

  const notifContent = (
    <div style={{ width: 340 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ fontSize: 14 }}>Уведомления</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" icon={<CheckOutlined />}
            style={{ color: '#ff6b9d', padding: 0, fontSize: 12 }}
            onClick={async () => {
              await notificationsApi.markAllRead();
              setUnreadCount(0);
              setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            }}>
            Прочитать все
          </Button>
        )}
      </div>

      {notifications.length === 0 ? (
        <div style={{ padding: '32px 16px', textAlign: 'center' }}>
          <BellOutlined style={{ fontSize: 32, color: '#ddd', display: 'block', marginBottom: 8 }} />
          <Text type="secondary" style={{ fontSize: 13 }}>Нет уведомлений</Text>
        </div>
      ) : (
        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
          {notifications.slice(0, 15).map((n, i) => (
            <div key={n.id}>
              <div
                onClick={() => { setNotifOpen(false); navigate('/dashboard'); }}
                style={{ padding: '12px 16px', cursor: 'pointer', background: n.isRead ? '#fff' : '#fff8fb', display: 'flex', gap: 12, alignItems: 'flex-start' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fef0f5')}
                onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? '#fff' : '#fff8fb')}
              >
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <NotifIcon type={n.type} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, display: 'block', lineHeight: 1.4 }}>{n.message}</Text>
                  <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: 'block' }}>{timeAgo(n.createdAt)}</Text>
                </div>
                {!n.isRead && (
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff6b9d', flexShrink: 0, marginTop: 4 }} />
                )}
              </div>
              {i < Math.min(notifications.length, 15) - 1 && <Divider style={{ margin: 0 }} />}
            </div>
          ))}
        </div>
      )}

      {notifications.length > 0 && (
        <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0', textAlign: 'center', cursor: 'pointer' }}
          onClick={() => { navigate('/dashboard'); setNotifOpen(false); }}>
          <Text style={{ color: '#ff6b9d', fontSize: 13 }}>Перейти в кабинет</Text>
        </div>
      )}
    </div>
  );

  return (
    <>
      {notifContextHolder}
    <Layout style={{ minHeight: '100vh' }}>
      <Header style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.1)', padding: '0 24px', position: 'sticky', top: 0, zIndex: 100 }}>
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScissorOutlined style={{ fontSize: 24, color: '#ff6b9d' }} />
          <Text strong style={{ fontSize: 18, color: '#ff6b9d' }}>BeautyBook</Text>
        </Link>

        <Menu mode="horizontal" selectedKeys={[location.pathname]} items={navItems} style={{ flex: 1, marginLeft: 32, border: 'none' }} />

        <Space size={12}>
          {isAuthenticated && (
            <>
              {/* Чат */}
              <Badge count={unreadMessages} size="small" color="#ff6b9d" offset={[-2, 2]}>
                <Button
                  type="text"
                  icon={<MessageOutlined style={{ fontSize: 18, color: unreadMessages > 0 ? '#ff6b9d' : '#888' }} />}
                  onClick={() => navigate('/chat')}
                  style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                />
              </Badge>

              {/* Уведомления */}
              <Popover content={notifContent} trigger="click" open={notifOpen} onOpenChange={handleOpenNotif}
                placement="bottomRight" styles={{ body: { padding: 0, borderRadius: 12, overflow: 'hidden' } }}>
                <Badge count={unreadCount} size="small" color="#ff6b9d" offset={[-2, 2]}>
                  <Button type="text"
                    icon={<BellOutlined style={{ fontSize: 18, color: unreadCount > 0 ? '#ff6b9d' : '#888' }} />}
                    style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  />
                </Badge>
              </Popover>
            </>
          )}

          {isAuthenticated ? (
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Space style={{ cursor: 'pointer' }}>
                <Avatar src={avatarUrl ? `${API_BASE}${avatarUrl}` : undefined} icon={<UserOutlined />} style={{ backgroundColor: '#ff6b9d' }} />
                <Text>{name}</Text>
                {role === 'Master' && <Text type="secondary" style={{ fontSize: 12 }}>(мастер)</Text>}
              </Space>
            </Dropdown>
          ) : (
            <Space>
              <Button onClick={() => navigate('/login')}>Войти</Button>
              <Button type="primary" onClick={() => navigate('/register')} style={{ background: '#ff6b9d', borderColor: '#ff6b9d' }}>Регистрация</Button>
            </Space>
          )}
        </Space>
      </Header>

      <Content style={{ background: '#f5f5f5' }}>{children}</Content>

      <Footer style={{ textAlign: 'center', background: '#fff', color: '#999' }}>
        BeautyBook © {new Date().getFullYear()} — маркетплейс бьюти-мастеров
      </Footer>
    </Layout>
    </>
  );
}
