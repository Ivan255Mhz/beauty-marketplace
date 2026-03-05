import { useEffect, useState, useCallback, useRef } from 'react';
import { Layout, Menu, Button, Avatar, Dropdown, Space, Typography, Badge, Popover, Divider, notification, Drawer } from 'antd';
import {
  ScissorOutlined, UserOutlined, LogoutOutlined,
  DashboardOutlined, BellOutlined, CheckOutlined,
  CalendarOutlined, CheckCircleOutlined, CloseCircleOutlined, StarOutlined,
  MessageOutlined, ClockCircleOutlined, StopOutlined,
  HomeOutlined, TeamOutlined, MenuOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../../context/authStore';
import { notificationsApi, messagesApi } from '../../api/endpoints';
import { useIsMobile } from '../../hooks/useIsMobile';
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
  const navigate  = useNavigate();
  const location  = useLocation();
  const isMobile  = useIsMobile();

  const [notifications,  setNotifications]  = useState<NotificationDto[]>([]);
  const [unreadCount,    setUnreadCount]     = useState(0);
  const [notifOpen,      setNotifOpen]       = useState(false);
  const [unreadMessages, setUnreadMessages]  = useState(0);
  const [drawerOpen,     setDrawerOpen]      = useState(false);
  const prevUnreadRef = useRef<number>(-1);

  const [notifApi, notifContextHolder] = notification.useNotification();

  const showReminderToast = useCallback((notif: NotificationDto) => {
    const icon  = notif.type === 'Reminder24h' ? '🕐' : '⏰';
    const title = notif.type === 'Reminder24h' ? 'Напоминание: завтра' : 'Скоро визит!';
    notifApi.open({
      key: notif.id,
      message: <Text strong>{icon} {title}</Text>,
      description: notif.message,
      duration: 8,
      placement: isMobile ? 'top' : 'topRight',
      style: { borderRadius: 12, borderLeft: `4px solid ${notif.type === 'Reminder2h' ? '#f5222d' : '#fa8c16'}` },
    });
  }, [notifApi, isMobile]);

  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationsApi.getAll();
      const newUnread = res.unreadCount;
      if (prevUnreadRef.current !== -1 && newUnread > prevUnreadRef.current) {
        const freshNotifs = res.items.filter(n => !n.isRead).slice(0, newUnread - prevUnreadRef.current);
        freshNotifs.forEach(n => { if (n.type === 'Reminder24h' || n.type === 'Reminder2h') showReminderToast(n); });
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
    const i = setInterval(fetchNotifications, 30000);
    return () => clearInterval(i);
  }, [isAuthenticated, fetchNotifications]);

  useEffect(() => { fetchUnreadMessages(); }, [fetchUnreadMessages, location.pathname]);
  useEffect(() => {
    if (!isAuthenticated) return;
    const i = setInterval(fetchUnreadMessages, 10000);
    return () => clearInterval(i);
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

  const handleLogout = () => { logout(); navigate('/'); setDrawerOpen(false); };

  const notifContent = (
    <div style={{ width: isMobile ? '90vw' : 340 }}>
      <div style={{ padding: '12px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text strong style={{ fontSize: 14 }}>Уведомления</Text>
        {unreadCount > 0 && (
          <Button type="link" size="small" icon={<CheckOutlined />}
            style={{ color: '#ff6b9d', padding: 0, fontSize: 12 }}
            onClick={async () => {
              await notificationsApi.markAllRead();
              setUnreadCount(0);
              setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
            }}>Прочитать все</Button>
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
              <div onClick={() => { setNotifOpen(false); navigate('/dashboard'); }}
                style={{ padding: '12px 16px', cursor: 'pointer', background: n.isRead ? '#fff' : '#fff8fb', display: 'flex', gap: 12, alignItems: 'flex-start' }}
                onMouseEnter={e => (e.currentTarget.style.background = '#fef0f5')}
                onMouseLeave={e => (e.currentTarget.style.background = n.isRead ? '#fff' : '#fff8fb')}>
                <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <NotifIcon type={n.type} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <Text style={{ fontSize: 13, display: 'block', lineHeight: 1.4 }}>{n.message}</Text>
                  <Text type="secondary" style={{ fontSize: 11, marginTop: 2, display: 'block' }}>{timeAgo(n.createdAt)}</Text>
                </div>
                {!n.isRead && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff6b9d', flexShrink: 0, marginTop: 4 }} />}
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

  // ── Bottom nav items (mobile) ──────────────────────────────────────────────
  const bottomNavItems = [
    { path: '/',          icon: <HomeOutlined />,      label: 'Главная' },
    { path: '/masters',   icon: <TeamOutlined />,      label: 'Мастера' },
    { path: '/chat',      icon: <MessageOutlined />,   label: 'Чат',    badge: unreadMessages },
    { path: '/dashboard', icon: <DashboardOutlined />, label: 'Кабинет', badge: unreadCount },
    { path: '__profile',  icon: <UserOutlined />,      label: 'Профиль' },
  ];

  const isActive = (path: string) => path === '/'
    ? location.pathname === '/'
    : location.pathname.startsWith(path);

  return (
    <>
      {notifContextHolder}
      <Layout style={{ minHeight: '100vh' }}>

        {/* ── Desktop / Mobile Header ─────────────────────────────────────── */}
        <Header style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#fff', boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
          padding: isMobile ? '0 16px' : '0 24px',
          position: 'sticky', top: 0, zIndex: 100,
          height: isMobile ? 52 : 64,
        }}>
          {/* Logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ScissorOutlined style={{ fontSize: isMobile ? 20 : 24, color: '#ff6b9d' }} />
            <Text strong style={{ fontSize: isMobile ? 16 : 18, color: '#ff6b9d' }}>BeautyBook</Text>
          </Link>

          {/* Desktop nav */}
          {!isMobile && (
            <Menu mode="horizontal"
              selectedKeys={[location.pathname]}
              items={[
                { key: '/',        label: <Link to="/">Главная</Link> },
                { key: '/masters', label: <Link to="/masters">Мастера</Link> },
              ]}
              style={{ flex: 1, marginLeft: 32, border: 'none' }}
            />
          )}

          {/* Right side */}
          <Space size={isMobile ? 4 : 12}>
            {isAuthenticated && !isMobile && (
              <>
                <Badge count={unreadMessages} size="small" color="#ff6b9d" offset={[-2, 2]}>
                  <Button type="text" icon={<MessageOutlined style={{ fontSize: 18, color: unreadMessages > 0 ? '#ff6b9d' : '#888' }} />}
                    onClick={() => navigate('/chat')}
                    style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                </Badge>
                <Popover content={notifContent} trigger="click" open={notifOpen} onOpenChange={handleOpenNotif}
                  placement="bottomRight" styles={{ body: { padding: 0, borderRadius: 12, overflow: 'hidden' } }}>
                  <Badge count={unreadCount} size="small" color="#ff6b9d" offset={[-2, 2]}>
                    <Button type="text" icon={<BellOutlined style={{ fontSize: 18, color: unreadCount > 0 ? '#ff6b9d' : '#888' }} />}
                      style={{ width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                  </Badge>
                </Popover>
              </>
            )}

            {/* Mobile: bell + burger */}
            {isMobile && isAuthenticated && (
              <Popover content={notifContent} trigger="click" open={notifOpen} onOpenChange={handleOpenNotif}
                placement="bottomRight" styles={{ body: { padding: 0, borderRadius: 12, overflow: 'hidden' } }}>
                <Badge count={unreadCount} size="small" color="#ff6b9d" offset={[-2, 2]}>
                  <Button type="text" icon={<BellOutlined style={{ fontSize: 18, color: unreadCount > 0 ? '#ff6b9d' : '#666' }} />}
                    style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
                </Badge>
              </Popover>
            )}

            {/* Desktop: user menu */}
            {!isMobile && (
              isAuthenticated ? (
                <Dropdown menu={{ items: [
                  { key: 'dashboard', icon: <DashboardOutlined />, label: <Link to="/dashboard">Личный кабинет</Link> },
                  { key: 'profile',   icon: <UserOutlined />,       label: <Link to="/profile">Профиль</Link> },
                  { type: 'divider' as const },
                  { key: 'logout',    icon: <LogoutOutlined />,     label: 'Выйти', danger: true, onClick: handleLogout },
                ]}} placement="bottomRight">
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
              )
            )}

            {/* Mobile: burger menu */}
            {isMobile && (
              <Button type="text" icon={<MenuOutlined style={{ fontSize: 20, color: '#333' }} />}
                onClick={() => setDrawerOpen(true)}
                style={{ width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center' }} />
            )}
          </Space>
        </Header>

        {/* ── Mobile Drawer Menu ───────────────────────────────────────────── */}
        <Drawer
          title={<span style={{ color: '#ff6b9d', fontWeight: 700 }}>BeautyBook</span>}
          placement="right"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          width={260}
          styles={{ body: { padding: 0 } }}
        >
          {isAuthenticated ? (
            <>
              <div style={{ padding: '20px 20px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 12 }}>
                <Avatar src={avatarUrl ? `${API_BASE}${avatarUrl}` : undefined} icon={<UserOutlined />}
                  size={48} style={{ backgroundColor: '#ff6b9d', flexShrink: 0 }} />
                <div>
                  <Text strong style={{ display: 'block' }}>{name}</Text>
                  <Text type="secondary" style={{ fontSize: 12 }}>{role === 'Master' ? 'Мастер' : 'Клиент'}</Text>
                </div>
              </div>
              {[
                { path: '/',          icon: <HomeOutlined />,      label: 'Главная' },
                { path: '/masters',   icon: <TeamOutlined />,      label: 'Мастера' },
                { path: '/dashboard', icon: <DashboardOutlined />, label: 'Личный кабинет' },
                { path: '/chat',      icon: <MessageOutlined />,   label: 'Сообщения', badge: unreadMessages },
                { path: '/profile',   icon: <UserOutlined />,      label: 'Профиль' },
              ].map(item => (
                <div key={item.path}
                  onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                  style={{
                    padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14,
                    cursor: 'pointer', borderBottom: '1px solid #f9f9f9',
                    background: isActive(item.path) ? '#fff0f6' : '#fff',
                  }}>
                  <span style={{ color: isActive(item.path) ? '#ff6b9d' : '#666', fontSize: 18 }}>{item.icon}</span>
                  <Text style={{ color: isActive(item.path) ? '#ff6b9d' : '#333', fontWeight: isActive(item.path) ? 600 : 400 }}>
                    {item.label}
                  </Text>
                  {item.badge ? <Badge count={item.badge} size="small" color="#ff6b9d" style={{ marginLeft: 'auto' }} /> : null}
                </div>
              ))}
              <div style={{ padding: '14px 20px', display: 'flex', alignItems: 'center', gap: 14, cursor: 'pointer' }}
                onClick={handleLogout}>
                <LogoutOutlined style={{ color: '#ff4d4f', fontSize: 18 }} />
                <Text style={{ color: '#ff4d4f' }}>Выйти</Text>
              </div>
            </>
          ) : (
            <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                { path: '/',        label: 'Главная',  icon: <HomeOutlined /> },
                { path: '/masters', label: 'Мастера',  icon: <TeamOutlined /> },
              ].map(item => (
                <div key={item.path} onClick={() => { navigate(item.path); setDrawerOpen(false); }}
                  style={{ padding: '12px 0', display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', borderBottom: '1px solid #f0f0f0' }}>
                  <span style={{ color: '#ff6b9d', fontSize: 18 }}>{item.icon}</span>
                  <Text>{item.label}</Text>
                </div>
              ))}
              <Button type="primary" block size="large"
                style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 12, marginTop: 8 }}
                onClick={() => { navigate('/login'); setDrawerOpen(false); }}>
                Войти
              </Button>
              <Button block size="large" style={{ borderRadius: 12 }}
                onClick={() => { navigate('/register'); setDrawerOpen(false); }}>
                Регистрация
              </Button>
            </div>
          )}
        </Drawer>

        {/* ── Content ─────────────────────────────────────────────────────── */}
        <Content style={{ background: '#f5f5f5', paddingBottom: isMobile ? 64 : 0 }}>
          {children}
        </Content>

        {/* ── Desktop Footer ───────────────────────────────────────────────── */}
        {!isMobile && (
          <Footer style={{ textAlign: 'center', background: '#fff', color: '#999' }}>
            BeautyBook © {new Date().getFullYear()} — маркетплейс бьюти-мастеров
          </Footer>
        )}

        {/* ── Mobile Bottom Navigation ─────────────────────────────────────── */}
        {isMobile && (
          <div style={{
            position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 200,
            background: '#fff', borderTop: '1px solid #f0f0f0',
            display: 'flex', height: 56,
            boxShadow: '0 -2px 8px rgba(0,0,0,0.08)',
          }}>
            {bottomNavItems.map(item => {
              const active = item.path === '__profile'
                ? location.pathname === '/profile'
                : isActive(item.path);

              const handleClick = () => {
                if (item.path === '__profile') {
                  if (isAuthenticated) navigate('/profile');
                  else navigate('/login');
                } else {
                  navigate(item.path);
                }
              };

              return (
                <button key={item.path} onClick={handleClick}
                  style={{
                    flex: 1, display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    border: 'none', background: 'none', cursor: 'pointer',
                    gap: 2, padding: '6px 0',
                    color: active ? '#ff6b9d' : '#888',
                  }}>
                  <Badge count={item.badge || 0} size="small" color="#ff6b9d" offset={[4, -2]}>
                    <span style={{ fontSize: 20, color: active ? '#ff6b9d' : '#888' }}>{item.icon}</span>
                  </Badge>
                  <span style={{ fontSize: 10, fontWeight: active ? 600 : 400 }}>{item.label}</span>
                </button>
              );
            })}
          </div>
        )}

      </Layout>
    </>
  );
}
