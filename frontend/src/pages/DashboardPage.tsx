import { useEffect, useState, useRef } from 'react';
import {
  Card, Tag, Button, Modal, Form, Input, Select, InputNumber,
  Typography, Space, Popconfirm, message, Empty, Spin, Avatar,
  Segmented, Badge, Tooltip, Divider, Row, Col, Switch, TimePicker,
  Upload, Image, Rate,
} from 'antd';
import {
  PlusOutlined, DeleteOutlined, CheckOutlined, CloseOutlined,
  EditOutlined, UserOutlined, DragOutlined, CalendarOutlined,
  RiseOutlined, TeamOutlined, ScissorOutlined, SettingOutlined,
  ClockCircleOutlined, PictureOutlined, UploadOutlined, StarOutlined,
  StarFilled, CheckCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import { useAuthStore } from '../context/authStore';
import { bookingsApi, servicesApi, mastersApi, scheduleApi, reviewsApi } from '../api/endpoints';
import type { BookingDto, ServiceDto, MasterProfileDto, WorkScheduleItem, PortfolioPhotoDto } from '../types';
import { useNavigate } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import dayjs from 'dayjs';
import RatingPicker from '../components/RatingPicker';

const { Title, Text } = Typography;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORIES = [
  { label: 'Стрижки', value: 'Haircut' },
  { label: 'Окрашивание', value: 'Coloring' },
  { label: 'Маникюр', value: 'Manicure' },
  { label: 'Педикюр', value: 'Pedicure' },
  { label: 'Макияж', value: 'Makeup' },
  { label: 'Брови', value: 'Eyebrows' },
  { label: 'Ресницы', value: 'Eyelashes' },
  { label: 'Массаж', value: 'Massage' },
  { label: 'Прочее', value: 'Other' },
];

const CATEGORY_LABELS: Record<string, string> = {
  Haircut: 'Стрижки', Coloring: 'Окрашивание',
  Manicure: 'Маникюр', Pedicure: 'Педикюр',
  Makeup: 'Макияж', Eyebrows: 'Брови',
  Eyelashes: 'Ресницы', Massage: 'Массаж', Other: 'Прочее',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  Pending:   { label: 'Ожидает',        color: '#d46b08', bg: '#fff7e6' },
  Confirmed: { label: 'Подтверждено',   color: '#389e0d', bg: '#f6ffed' },
  Cancelled: { label: 'Отменено',       color: '#cf1322', bg: '#fff1f0' },
  Completed: { label: 'Услуга оказана', color: '#1677ff', bg: '#e6f4ff' },
  NoShow:    { label: 'Неявка',         color: '#722ed1', bg: '#f9f0ff' },
};

//  Stat Card 
function StatCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string | number; color: string;
}) {
  return (
    <Card
      style={{ borderRadius: 16, border: 'none', background: '#fff', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
      bodyStyle={{ padding: '20px 24px' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
        <div style={{
          width: 48, height: 48, borderRadius: 14,
          background: color + '18',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, color,
        }}>
          {icon}
        </div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 700, lineHeight: 1.2, color: '#1a1a2e' }}>{value}</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{label}</div>
        </div>
      </div>
    </Card>
  );
}

//  Draggable Service Card 
function ServiceCard({
  service, index,
  onEdit, onDelete,
  onDragStart, onDragOver, onDrop,
  draggable: isDraggable = true,
}: {
  service: ServiceDto; index: number;
  onEdit: (s: ServiceDto) => void;
  onDelete: (id: string) => void;
  onDragStart: (i: number) => void;
  onDragOver: (e: React.DragEvent, i: number) => void;
  onDrop: (i: number) => void;
  draggable?: boolean;
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [isOver, setIsOver] = useState(false);

  return (
    <div
      draggable={isDraggable}
      onDragStart={() => { setIsDragging(true); onDragStart(index); }}
      onDragEnd={() => setIsDragging(false)}
      onDragOver={(e) => { e.preventDefault(); if (isDraggable) { setIsOver(true); onDragOver(e, index); } }}
      onDragLeave={() => setIsOver(false)}
      onDrop={() => { setIsOver(false); if (isDraggable) onDrop(index); }}
      style={{ opacity: isDragging ? 0.4 : 1, transition: 'all 0.2s' }}
    >
      <Card
        style={{
          borderRadius: 14,
          border: isOver ? '2px solid #ff6b9d' : '1px solid #f0f0f0',
          boxShadow: isDragging ? '0 8px 24px rgba(255,107,157,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
          transition: 'all 0.2s',
          transform: isOver ? 'scale(1.01)' : 'scale(1)',
        }}
        bodyStyle={{ padding: '16px 20px' }}
      >
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ cursor: isDraggable ? 'grab' : 'default', color: isDraggable ? '#ccc' : 'transparent', paddingTop: 4, fontSize: 16, flexShrink: 0, userSelect: 'none' }}>
            <DragOutlined />
          </div>
          <div style={{
            width: 28, height: 28, borderRadius: 8, background: '#fff0f6',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 12, fontWeight: 700, color: '#ff6b9d', flexShrink: 0,
          }}>
            {index + 1}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
              <Text strong style={{ fontSize: 15 }}>{service.name}</Text>
              <Tag color="pink" style={{ fontSize: 11, margin: 0 }}>
                {CATEGORY_LABELS[service.category] || service.category}
              </Tag>
            </div>
            {service.description && (
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 6 }}>
                {service.description}
              </Text>
            )}
            <div style={{ display: 'flex', gap: 16 }}>
              <Text style={{ color: '#ff6b9d', fontWeight: 700, fontSize: 16 }}>
                {service.price.toLocaleString()} ₽
              </Text>
              <Text type="secondary" style={{ fontSize: 13 }}>{service.durationMinutes} мин</Text>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
            <Tooltip title="Редактировать">
              <Button
                icon={<EditOutlined />} size="small"
                style={{ borderRadius: 8, color: '#ff6b9d', borderColor: '#ffb3d1' }}
                onClick={() => onEdit(service)}
              />
            </Tooltip>
            <Popconfirm
              title="Удалить услугу?" description="Это действие нельзя отменить"
              okText="Удалить" cancelText="Отмена" okButtonProps={{ danger: true }}
              onConfirm={() => onDelete(service.id)}
            >
              <Tooltip title="Удалить">
                <Button icon={<DeleteOutlined />} size="small" danger style={{ borderRadius: 8 }} />
              </Tooltip>
            </Popconfirm>
          </div>
        </div>
      </Card>
    </div>
  );
}

//  Service Form Modal 
function ServiceModal({ open, initial, loading, onClose, onSubmit }: {
  open: boolean; initial: ServiceDto | null;
  loading: boolean; onClose: () => void; onSubmit: (v: any) => void;
}) {
  const [form] = Form.useForm();

  useEffect(() => {
    if (open) {
      if (initial) {
        form.setFieldsValue({
          name: initial.name, category: initial.category,
          price: initial.price, durationMinutes: initial.durationMinutes,
          description: initial.description,
        });
      } else {
        form.resetFields();
      }
    }
  }, [open, initial]);

  return (
    <Modal
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <ScissorOutlined style={{ color: '#ff6b9d' }} />
          <span>{initial ? 'Редактировать услугу' : 'Новая услуга'}</span>
        </div>
      }
      open={open} onCancel={onClose} footer={null}
      styles={{ content: { borderRadius: 16 } }}
    >
      <Divider style={{ margin: '12px 0 20px' }} />
      <Form form={form} layout="vertical" onFinish={onSubmit} requiredMark={false}>
        <Form.Item name="name" label="Название" rules={[{ required: true, message: 'Введите название' }]}>
          <Input placeholder="Например: Стрижка женская" size="large" style={{ borderRadius: 10 }} />
        </Form.Item>
        <Row gutter={12}>
          <Col span={12}>
            <Form.Item name="category" label="Категория" rules={[{ required: true }]}>
              <Select options={CATEGORIES} placeholder="Категория" size="large" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="durationMinutes" label="Длительность (мин)" rules={[{ required: true }]}>
              <InputNumber min={5} step={5} style={{ width: '100%' }} size="large" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="price" label="Цена (₽)" rules={[{ required: true }]}>
          <InputNumber
            min={1} style={{ width: '100%' }} size="large"
            formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
          />
        </Form.Item>
        <Form.Item name="description" label="Описание (необязательно)">
          <Input.TextArea rows={3} placeholder="Подробности об услуге..." style={{ borderRadius: 10 }} />
        </Form.Item>
        <Button
          type="primary" htmlType="submit" loading={loading} block size="large"
          style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 10, height: 44, marginTop: 8 }}
        >
          {initial ? 'Сохранить изменения' : 'Добавить услугу'}
        </Button>
      </Form>
    </Modal>
  );
}

//  Services Tab 
type SortKey = 'default' | 'price_asc' | 'price_desc' | 'name' | 'duration';

function ServicesTab({
  services, onAdd, onEdit, onDelete,
  onDragStart, onDragOver, onDrop,
}: {
  services: ServiceDto[];
  onAdd: () => void;
  onEdit: (s: ServiceDto) => void;
  onDelete: (id: string) => void;
  onDragStart: (i: number) => void;
  onDragOver: (e: React.DragEvent, i: number) => void;
  onDrop: (i: number) => void;
}) {
  const [search, setSearch] = useState('');
  const [catFilter, setCatFilter] = useState<string>('all');
  const [sort, setSort] = useState<SortKey>('default');

  // Category breakdown
  const catCounts = CATEGORIES.reduce<Record<string, number>>((acc, c) => {
    acc[c.value] = services.filter(s => s.category === c.value).length;
    return acc;
  }, {});
  const usedCategories = CATEGORIES.filter(c => catCounts[c.value] > 0);

  // Filter + sort
  const filtered = services
    .filter(s => {
      const q = search.toLowerCase();
      const matchSearch = !q || s.name.toLowerCase().includes(q) || (s.description || '').toLowerCase().includes(q);
      const matchCat = catFilter === 'all' || s.category === catFilter;
      return matchSearch && matchCat;
    })
    .sort((a, b) => {
      if (sort === 'price_asc') return a.price - b.price;
      if (sort === 'price_desc') return b.price - a.price;
      if (sort === 'name') return a.name.localeCompare(b.name, 'ru');
      if (sort === 'duration') return a.durationMinutes - b.durationMinutes;
      return 0;
    });

  const minPrice = services.length ? Math.min(...services.map(s => s.price)) : 0;
  const maxPrice = services.length ? Math.max(...services.map(s => s.price)) : 0;
  const totalRevenuePotential = services.reduce((sum, s) => sum + s.price, 0);

  return (
    <div style={{ padding: 24 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
        <div>
          <Text strong style={{ fontSize: 16 }}>Управление услугами</Text>
          <Text type="secondary" style={{ fontSize: 13, marginLeft: 8 }}>
            {services.length} {services.length === 1 ? 'услуга' : services.length < 5 ? 'услуги' : 'услуг'}
          </Text>
        </div>
        <Button
          type="primary" icon={<PlusOutlined />} onClick={onAdd}
          style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 10 }}
        >Добавить услугу</Button>
      </div>

      {services.length === 0 ? (
        <Empty description="Услуг пока нет" style={{ padding: 48 }}>
          <Button
            type="primary" icon={<PlusOutlined />} onClick={onAdd}
            style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 10 }}
          >Добавить первую услугу</Button>
        </Empty>
      ) : (
        <>
          {/* Stats row */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 20,
          }}>
            {[
              { label: 'Диапазон цен', value: services.length > 1 ? `${minPrice.toLocaleString()} – ${maxPrice.toLocaleString()} ₽` : `${minPrice.toLocaleString()} ₽`, color: '#ff6b9d' },
              { label: 'Категорий', value: usedCategories.length, color: '#722ed1' },
              { label: 'Сумма прайса', value: `${totalRevenuePotential.toLocaleString()} ₽`, color: '#13c2c2' },
            ].map(s => (
              <div key={s.label} style={{
                background: '#fafafa', borderRadius: 12, padding: '12px 16px',
                border: '1px solid #f0f0f0',
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* Category breakdown chips */}
          {usedCategories.length > 1 && (
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
              <button
                onClick={() => setCatFilter('all')}
                style={{
                  padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                  fontSize: 13, fontWeight: catFilter === 'all' ? 700 : 400,
                  background: catFilter === 'all' ? '#ff6b9d' : '#f5f5f5',
                  color: catFilter === 'all' ? '#fff' : '#555',
                  transition: 'all 0.15s',
                }}
              >
                Все · {services.length}
              </button>
              {usedCategories.map(c => (
                <button
                  key={c.value}
                  onClick={() => setCatFilter(catFilter === c.value ? 'all' : c.value)}
                  style={{
                    padding: '5px 14px', borderRadius: 20, border: 'none', cursor: 'pointer',
                    fontSize: 13, fontWeight: catFilter === c.value ? 700 : 400,
                    background: catFilter === c.value ? '#ff6b9d' : '#f5f5f5',
                    color: catFilter === c.value ? '#fff' : '#555',
                    transition: 'all 0.15s',
                  }}
                >
                  {c.label} · {catCounts[c.value]}
                </button>
              ))}
            </div>
          )}

          {/* Search + Sort toolbar */}
          <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
            <Input
              prefix={<span style={{ color: '#ccc' }}></span>}
              placeholder="Поиск по названию или описанию..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              allowClear
              style={{ flex: 1, minWidth: 200, borderRadius: 10 }}
            />
            <Select
              value={sort}
              onChange={setSort}
              style={{ width: 190 }}
              options={[
                { label: 'По умолчанию', value: 'default' },
                { label: 'Цена: дешевле', value: 'price_asc' },
                { label: 'Цена: дороже', value: 'price_desc' },
                { label: 'А–Я Название', value: 'name' },
                { label: 'По длительности', value: 'duration' },
              ]}
            />
          </div>

          {/* Service list */}
          {filtered.length === 0 ? (
            <Empty description="Ничего не найдено" style={{ padding: 32 }} />
          ) : (
            <>
              {sort === 'default' && search === '' && catFilter === 'all' && (
                <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
                   Перетащите карточки чтобы изменить порядок отображения клиентам
                </Text>
              )}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filtered.map((s, i) => {
                  // Find original index for drag-drop (only when no filter/sort)
                  const originalIndex = sort === 'default' && search === '' && catFilter === 'all' ? i : -1;
                  return (
                    <ServiceCard
                      key={s.id} service={s} index={i}
                      draggable={originalIndex !== -1}
                      onEdit={onEdit}
                      onDelete={onDelete}
                      onDragStart={originalIndex !== -1 ? onDragStart : () => {}}
                      onDragOver={originalIndex !== -1 ? onDragOver : () => {}}
                      onDrop={originalIndex !== -1 ? onDrop : () => {}}
                    />
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

//  Master Dashboard 
function MasterDashboard() {
  const [bookings, setBookings] = useState<BookingDto[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [masterProfile, setMasterProfile] = useState<MasterProfileDto | null>(null);
  const [portfolio, setPortfolio] = useState<PortfolioPhotoDto[]>([]);
  const [portfolioUploading, setPortfolioUploading] = useState(false);
  const [schedule, setSchedule] = useState<WorkScheduleItem[]>([]);
  const [scheduleLoading, setScheduleLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('bookings');
  const [bookingFilter, setBookingFilter] = useState('all');
  const [serviceModal, setServiceModal] = useState(false);
  const [editingService, setEditingService] = useState<ServiceDto | null>(null);
  const [serviceLoading, setServiceLoading] = useState(false);
  const [profileModal, setProfileModal] = useState(false);
  const [profileForm] = Form.useForm();
  const dragIndex = useRef<number | null>(null);

  useEffect(() => {
    Promise.all([
      bookingsApi.getIncoming(),
      mastersApi.getMyProfile().catch(() => null),
      scheduleApi.getMine().catch(() => []),
    ]).then(([b, profile, sched]) => {
      setBookings(b);
      setMasterProfile(profile);
      if (profile) {
        setServices(profile.services);
        setPortfolio(profile.portfolio || []);
      }
      setSchedule(sched);
    }).finally(() => setLoading(false));
  }, []);

  const pendingCount   = bookings.filter(b => b.status === 'Pending').length;
  const confirmedCount = bookings.filter(b => b.status === 'Confirmed').length;
  const completedCount = bookings.filter(b => b.status === 'Completed').length;
  const revenue = bookings.filter(b => b.status === 'Completed').reduce((s, b) => s + b.servicePrice, 0);
  const filteredBookings = bookingFilter === 'all' ? bookings : bookings.filter(b => b.status === bookingFilter);

  const handleStatusChange = async (id: string, status: string) => {
    try {
      const updated = await bookingsApi.updateStatus(id, status);
      setBookings(prev => prev.map(b => b.id === id ? updated : b));
      message.success('Статус обновлён');
    } catch { message.error('Ошибка'); }
  };

  const handleServiceSubmit = async (values: any) => {
    setServiceLoading(true);
    try {
      if (editingService) {
        const updated = await servicesApi.update(editingService.id, values);
        setServices(prev => prev.map(s => s.id === editingService.id ? updated : s));
        message.success('Услуга обновлена');
      } else {
        const created = await servicesApi.create(values);
        setServices(prev => [created, ...prev]);
        message.success('Услуга добавлена');
      }
      setServiceModal(false);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Ошибка');
    } finally { setServiceLoading(false); }
  };

  const handleDeleteService = async (id: string) => {
    try {
      await servicesApi.delete(id);
      setServices(prev => prev.filter(s => s.id !== id));
      message.success('Услуга удалена');
    } catch { message.error('Ошибка'); }
  };

  const handleDragStart = (i: number) => { dragIndex.current = i; };
  const handleDragOver = (e: React.DragEvent, _i: number) => { e.preventDefault(); };
  const handleDrop = (dropIndex: number) => {
    if (dragIndex.current === null || dragIndex.current === dropIndex) return;
    const arr = [...services];
    const [moved] = arr.splice(dragIndex.current, 1);
    arr.splice(dropIndex, 0, moved);
    setServices(arr);
    dragIndex.current = null;
  };

  const handleSaveProfile = async (values: any) => {
    try {
      const result = masterProfile
        ? await mastersApi.updateProfile(values)
        : await mastersApi.createProfile(values);
      setMasterProfile(result);
      setProfileModal(false);
      message.success('Профиль сохранён');
    } catch (e: any) { message.error(e.response?.data?.message || 'Ошибка'); }
  };

  const handleSaveSchedule = async () => {
    setScheduleLoading(true);
    try {
      await scheduleApi.save({ days: schedule });
      message.success('Расписание сохранено');
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Ошибка сохранения');
    } finally { setScheduleLoading(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;

  return (
    <div>
      {!masterProfile && (
        <Card style={{
          marginBottom: 24, borderRadius: 14,
          background: 'linear-gradient(135deg, #fff0f6, #fff7fb)',
          border: '1px solid #ffb3d1',
        }} bodyStyle={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
            <div>
              <Text strong style={{ color: '#ff6b9d' }}>Профиль мастера не заполнен</Text>
              <br />
              <Text type="secondary" style={{ fontSize: 13 }}>Клиенты не смогут вас найти в каталоге</Text>
            </div>
            <Button
              type="primary"
              style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 8 }}
              onClick={() => { profileForm.resetFields(); setProfileModal(true); }}
            >
              Заполнить профиль
            </Button>
          </div>
        </Card>
      )}

      {/* Stats */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard icon={<ScissorOutlined />} label="Услуг" value={services.length} color="#ff6b9d" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard icon={<CalendarOutlined />} label="Новых заявок" value={pendingCount} color="#fa8c16" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard icon={<TeamOutlined />} label="Подтверждено" value={confirmedCount} color="#52c41a" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard icon={<RiseOutlined />} label="Выручка" value={`${revenue.toLocaleString()} ₽`} color="#722ed1" />
        </Col>
      </Row>

      {/* Main card */}
      <Card
        style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }}
        bodyStyle={{ padding: 0 }}
      >
        <div style={{
          padding: '0 24px', borderBottom: '1px solid #f5f5f5',
          display: 'flex', alignItems: 'center',
        }}>
          <Segmented
            value={activeTab}
            onChange={v => setActiveTab(v as string)}
            options={[
              {
                label: (
                  <Badge count={pendingCount} offset={[6, -2]} size="small" color="#fa8c16">
                    <span style={{ padding: '0 4px' }}>Заявки</span>
                  </Badge>
                ),
                value: 'bookings',
              },
              { label: `Услуги (${services.length})`, value: 'services' },
              { label: 'Портфолио', value: 'portfolio' },
              { label: 'Расписание', value: 'schedule' },
              { label: `Отзывы (${masterProfile?.reviews?.length ?? 0})`, value: 'reviews' },
              { label: 'Профиль', value: 'profile' },
            ]}
            style={{ margin: '12px 0', background: 'transparent' }}
          />
        </div>

        {/* Bookings */}
        {activeTab === 'bookings' && (
          <div style={{ padding: 24 }}>
            <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {[
                { key: 'all',       label: `Все (${bookings.length})` },
                { key: 'Pending',   label: `Ожидают (${pendingCount})` },
                { key: 'Confirmed', label: `Подтверждено (${confirmedCount})` },
                { key: 'Completed', label: `Оказано (${completedCount})` },
                { key: 'Cancelled', label: `Отменено (${bookings.filter(b => b.status === 'Cancelled').length})` },
                { key: 'NoShow',    label: `Неявка (${bookings.filter(b => b.status === 'NoShow').length})` },
              ].map(f => (
                <Button
                  key={f.key} size="small"
                  type={bookingFilter === f.key ? 'primary' : 'default'}
                  onClick={() => setBookingFilter(f.key)}
                  style={{
                    borderRadius: 20,
                    ...(bookingFilter === f.key ? { background: '#ff6b9d', borderColor: '#ff6b9d' } : {}),
                  }}
                >{f.label}</Button>
              ))}
            </div>

            {filteredBookings.length === 0 ? (
              <Empty description="Заявок нет" style={{ padding: 40 }} />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {filteredBookings.map(b => {
                  const cfg = STATUS_CONFIG[b.status];
                  return (
                    <Card key={b.id} style={{ borderRadius: 12, border: '1px solid #f0f0f0' }} bodyStyle={{ padding: '14px 18px' }}>
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', gap: 12, flex: 1, minWidth: 200 }}>
                          <Avatar icon={<UserOutlined />} style={{ background: '#ff6b9d', flexShrink: 0 }} />
                          <div>
                            <Text strong>{b.clientName}</Text>
                            <div style={{ fontSize: 13, color: '#666', marginTop: 2 }}>
                              {b.serviceName} · <span style={{ color: '#ff6b9d', fontWeight: 600 }}>{b.servicePrice.toLocaleString()} ₽</span>
                            </div>
                            <div style={{ fontSize: 13, color: '#888', marginTop: 2 }}>{b.bookingDate}</div>
                            {b.comment && (
                              <div style={{ marginTop: 6, padding: '6px 10px', background: '#fafafa', borderRadius: 8, fontSize: 13, color: '#555' }}>
                                {b.comment}
                              </div>
                            )}
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
                          <span style={{
                            padding: '3px 10px', borderRadius: 20, fontSize: 12, fontWeight: 600,
                            color: cfg.color, background: cfg.bg,
                          }}>{cfg.label}</span>
                          {b.status === 'Pending' && (
                            <Space size={6}>
                              <Button
                                size="small" type="primary" icon={<CheckOutlined />}
                                onClick={() => handleStatusChange(b.id, 'Confirmed')}
                                style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: 8 }}
                              >Принять</Button>
                              <Button
                                size="small" danger icon={<CloseOutlined />}
                                onClick={() => handleStatusChange(b.id, 'Cancelled')}
                                style={{ borderRadius: 8 }}
                              >Отклонить</Button>
                            </Space>
                          )}
                          {b.status === 'Confirmed' && (
                            <Space size={6} wrap>
                              <Popconfirm
                                title="Отметить услугу как оказанную?"
                                description="Клиент получит уведомление и сможет оставить отзыв."
                                okText="Да, оказана"
                                cancelText="Нет"
                                okButtonProps={{ style: { background: '#1677ff', borderColor: '#1677ff' } }}
                                onConfirm={() => handleStatusChange(b.id, 'Completed')}
                              >
                                <Button
                                  size="small" icon={<CheckCircleOutlined />}
                                  style={{ borderRadius: 8, color: '#1677ff', borderColor: '#91caff' }}
                                >Услуга оказана</Button>
                              </Popconfirm>
                              <Popconfirm
                                title="Отметить неявку клиента?"
                                description="Запись будет помечена как несостоявшаяся."
                                okText="Да, неявка"
                                cancelText="Нет"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => handleStatusChange(b.id, 'NoShow')}
                              >
                                <Button
                                  size="small" icon={<StopOutlined />}
                                  style={{ borderRadius: 8, color: '#722ed1', borderColor: '#d3adf7' }}
                                >Не состоялась</Button>
                              </Popconfirm>
                              <Popconfirm
                                title="Отменить запись?"
                                okText="Да, отменить"
                                cancelText="Нет"
                                okButtonProps={{ danger: true }}
                                onConfirm={() => handleStatusChange(b.id, 'Cancelled')}
                              >
                                <Button
                                  size="small" danger icon={<CloseOutlined />}
                                  style={{ borderRadius: 8 }}
                                >Отменить</Button>
                              </Popconfirm>
                            </Space>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Services */}
        {activeTab === 'services' && (
          <ServicesTab
            services={services}
            onAdd={() => { setEditingService(null); setServiceModal(true); }}
            onEdit={(svc) => { setEditingService(svc); setServiceModal(true); }}
            onDelete={handleDeleteService}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          />
        )}

        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div style={{ padding: 24 }}>
            {masterProfile ? (
              <div>
                <div style={{ padding: 20, background: '#fafafa', borderRadius: 14, marginBottom: 16 }}>
                  <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>Адрес</Text>
                  <div style={{ marginTop: 4, fontWeight: 500 }}>{masterProfile.address || '—'}</div>
                  <Divider style={{ margin: '12px 0' }} />
                  <Text type="secondary" style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5 }}>О себе</Text>
                  <div style={{ marginTop: 4 }}>{masterProfile.bio || '—'}</div>
                </div>
                <Button
                  icon={<EditOutlined />} style={{ borderRadius: 10 }}
                  onClick={() => { profileForm.setFieldsValue(masterProfile); setProfileModal(true); }}
                >Редактировать профиль</Button>
              </div>
            ) : (
              <Empty description="Профиль не заполнен">
                <Button
                  type="primary" style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 10 }}
                  onClick={() => setProfileModal(true)}
                >Создать профиль</Button>
              </Empty>
            )}
          </div>
        )}

        {/* Schedule */}
        {activeTab === 'schedule' && (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <Text strong style={{ fontSize: 15 }}>Рабочее расписание</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Укажите рабочие дни и часы — клиенты увидят доступные слоты для записи
                </Text>
              </div>
              <Button
                type="primary" loading={scheduleLoading}
                icon={<CheckOutlined />}
                onClick={handleSaveSchedule}
                style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 10 }}
              >
                Сохранить расписание
              </Button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { dow: 1, label: 'Понедельник' }, { dow: 2, label: 'Вторник' },
                { dow: 3, label: 'Среда' },       { dow: 4, label: 'Четверг' },
                { dow: 5, label: 'Пятница' },     { dow: 6, label: 'Суббота' },
                { dow: 0, label: 'Воскресенье' },
              ].map(({ dow, label }) => {
                const item = schedule.find(s => s.dayOfWeek === dow);
                const isWorking = item?.isWorking ?? false;
                const startTime = item?.startTime ?? '09:00';
                const endTime = item?.endTime ?? '20:00';

                const updateDay = (patch: Partial<WorkScheduleItem>) => {
                  setSchedule(prev => {
                    const exists = prev.find(s => s.dayOfWeek === dow);
                    if (exists) return prev.map(s => s.dayOfWeek === dow ? { ...s, ...patch } : s);
                    return [...prev, { dayOfWeek: dow, startTime: '09:00', endTime: '20:00', isWorking: false, ...patch }];
                  });
                };

                return (
                  <Card
                    key={dow}
                    style={{
                      borderRadius: 12,
                      border: isWorking ? '1px solid #ffb3d1' : '1px solid #f0f0f0',
                      background: isWorking ? '#fff' : '#fafafa',
                      transition: 'all 0.2s',
                    }}
                    bodyStyle={{ padding: '14px 20px' }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
                      <Switch
                        checked={isWorking}
                        onChange={v => updateDay({ isWorking: v })}
                        style={{ flexShrink: 0, ...(isWorking ? { background: '#ff6b9d' } : {}) }}
                      />
                      <Text style={{
                        width: 120, fontWeight: isWorking ? 600 : 400,
                        color: isWorking ? '#1a1a2e' : '#bbb', flexShrink: 0,
                      }}>
                        {label}
                      </Text>

                      {isWorking ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
                          <ClockCircleOutlined style={{ color: '#ff6b9d' }} />
                          <TimePicker
                            value={dayjs(startTime, 'HH:mm')}
                            format="HH:mm" minuteStep={30} allowClear={false} size="small"
                            style={{ width: 90, borderRadius: 8 }}
                            onChange={t => t && updateDay({ startTime: t.format('HH:mm') })}
                          />
                          <Text type="secondary">—</Text>
                          <TimePicker
                            value={dayjs(endTime, 'HH:mm')}
                            format="HH:mm" minuteStep={30} allowClear={false} size="small"
                            style={{ width: 90, borderRadius: 8 }}
                            onChange={t => t && updateDay({ endTime: t.format('HH:mm') })}
                          />
                        </div>
                      ) : (
                        <Text type="secondary" style={{ fontSize: 13 }}>Выходной</Text>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>

            <div style={{
              marginTop: 16, padding: '12px 16px', borderRadius: 10,
              background: '#f0f4ff', fontSize: 13, color: '#666',
            }}>
              Слоты генерируются по длительности каждой услуги. Занятые слоты блокируются автоматически.
            </div>
          </div>
        )}

        {/* Reviews Tab */}
        {activeTab === 'reviews' && (
          <div style={{ padding: 24 }}>
            {(!masterProfile?.reviews || masterProfile.reviews.length === 0) ? (
              <div style={{ textAlign: 'center', padding: '48px 0' }}>
                <StarOutlined style={{ fontSize: 48, color: '#e0e0e0', display: 'block', marginBottom: 12 }} />
                <Text type="secondary">Отзывов пока нет</Text>
              </div>
            ) : (
              <>
                {/* Сводка */}
                <div style={{
                  display: 'flex', alignItems: 'center', gap: 32,
                  padding: '20px 24px', background: '#fff7fb', borderRadius: 16,
                  marginBottom: 24, flexWrap: 'wrap',
                }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 48, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>
                      {masterProfile.averageRating.toFixed(1)}
                    </div>
                    <Rate disabled value={masterProfile.averageRating} allowHalf style={{ fontSize: 16 }} />
                    <div style={{ fontSize: 13, color: '#999', marginTop: 4 }}>
                      {masterProfile.reviews.length} отзывов
                    </div>
                  </div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    {[5, 4, 3, 2, 1].map(star => {
                      const count = masterProfile.reviews.filter(r => r.rating === star).length;
                      const pct = masterProfile.reviews.length > 0 ? (count / masterProfile.reviews.length) * 100 : 0;
                      return (
                        <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
                          <Text style={{ fontSize: 12, color: '#666', width: 8 }}>{star}</Text>
                          <StarFilled style={{ fontSize: 11, color: '#faad14' }} />
                          <div style={{ flex: 1, height: 8, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                            <div style={{
                              width: `${pct}%`, height: '100%', borderRadius: 4,
                              background: 'linear-gradient(90deg, #faad14, #ff6b9d)',
                            }} />
                          </div>
                          <Text style={{ fontSize: 12, color: '#999', width: 22 }}>{count}</Text>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Список отзывов */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[...masterProfile.reviews]
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
                    .map(review => (
                    <div key={review.id} style={{
                      background: '#fff', borderRadius: 14, padding: '16px 20px',
                      boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    }}>
                      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                        <Avatar
                          src={review.clientAvatarUrl ? `${API_BASE}${review.clientAvatarUrl}` : undefined}
                          icon={<UserOutlined />} size={42}
                          style={{ backgroundColor: '#ff6b9d', flexShrink: 0 }}
                        />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                            <div>
                              <Text strong style={{ fontSize: 14 }}>{review.clientName}</Text>
                              <div style={{ marginTop: 2 }}>
                                <Rate disabled value={review.rating} style={{ fontSize: 13 }} />
                              </div>
                            </div>
                            <Text type="secondary" style={{ fontSize: 12, flexShrink: 0 }}>
                              {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                            </Text>
                          </div>
                          {review.comment && (
                            <Text style={{ fontSize: 13, color: '#555', display: 'block', marginTop: 8, lineHeight: 1.5 }}>
                              {review.comment}
                            </Text>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <div style={{ padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20, flexWrap: 'wrap', gap: 12 }}>
              <div>
                <Text strong style={{ fontSize: 15 }}>Портфолио</Text>
                <br />
                <Text type="secondary" style={{ fontSize: 13 }}>
                  Добавьте до 10 фотографий своих работ
                </Text>
              </div>
              <Upload
                accept="image/jpeg,image/png,image/webp"
                showUploadList={false}
                customRequest={async ({ file }) => {
                  if (portfolio.length >= 10) { message.warning('Максимум 10 фото'); return; }
                  setPortfolioUploading(true);
                  try {
                    const photo = await mastersApi.addPortfolioPhoto(file as File);
                    setPortfolio(prev => [...prev, photo]);
                    message.success('Фото добавлено');
                  } catch { message.error('Ошибка загрузки'); }
                  finally { setPortfolioUploading(false); }
                }}
              >
                <Button
                  type="primary" icon={<UploadOutlined />}
                  loading={portfolioUploading}
                  disabled={portfolio.length >= 10}
                  style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 10 }}
                >
                  Загрузить фото
                </Button>
              </Upload>
            </div>

            {portfolio.length === 0 ? (
              <Empty
                image={<PictureOutlined style={{ fontSize: 48, color: '#ffb3d1' }} />}
                description="Фотографий пока нет"
                style={{ padding: 40 }}
              >
                <Upload
                  accept="image/jpeg,image/png,image/webp"
                  showUploadList={false}
                  customRequest={async ({ file }) => {
                    setPortfolioUploading(true);
                    try {
                      const photo = await mastersApi.addPortfolioPhoto(file as File);
                      setPortfolio(prev => [...prev, photo]);
                      message.success('Фото добавлено');
                    } catch { message.error('Ошибка загрузки'); }
                    finally { setPortfolioUploading(false); }
                  }}
                >
                  <Button icon={<PlusOutlined />} style={{ borderRadius: 10 }}>
                    Добавить первое фото
                  </Button>
                </Upload>
              </Empty>
            ) : (
              <>
                <Image.PreviewGroup>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: 8,
                  }}>
                    {portfolio.map(photo => (
                      <div key={photo.id} style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', aspectRatio: '1 / 1' }}>
                        <Image
                          src={`http://localhost:5000${photo.url}`}
                          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                          wrapperStyle={{ width: '100%', height: '100%' }}
                          preview={{ mask: 'Просмотр' }}
                        />
                        <Popconfirm
                          title="Удалить фото?"
                          okText="Удалить" cancelText="Отмена"
                          okButtonProps={{ danger: true }}
                          onConfirm={async () => {
                            try {
                              await mastersApi.deletePortfolioPhoto(photo.id);
                              setPortfolio(prev => prev.filter(p => p.id !== photo.id));
                              message.success('Фото удалено');
                            } catch { message.error('Ошибка'); }
                          }}
                        >
                          <button style={{
                            position: 'absolute', top: 8, right: 8,
                            width: 28, height: 28, borderRadius: '50%',
                            background: 'rgba(0,0,0,0.55)', border: 'none',
                            cursor: 'pointer', display: 'flex',
                            alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontSize: 13,
                          }}></button>
                        </Popconfirm>
                      </div>
                    ))}
                  </div>
                </Image.PreviewGroup>
                <Text type="secondary" style={{ fontSize: 12, marginTop: 12, display: 'block' }}>
                  {portfolio.length} / 10 фотографий
                </Text>
              </>
            )}
          </div>
        )}

      </Card>

      <ServiceModal
        open={serviceModal} initial={editingService} loading={serviceLoading}
        onClose={() => setServiceModal(false)} onSubmit={handleServiceSubmit}
      />

      <Modal
        title={<><SettingOutlined style={{ color: '#ff6b9d', marginRight: 8 }} />{masterProfile ? 'Редактировать профиль' : 'Создать профиль мастера'}</>}
        open={profileModal} onCancel={() => setProfileModal(false)} footer={null}
        styles={{ content: { borderRadius: 16 } }}
      >
        <Divider style={{ margin: '12px 0 20px' }} />
        <Form form={profileForm} layout="vertical" onFinish={handleSaveProfile} requiredMark={false}>
          <Form.Item name="bio" label="О себе">
            <Input.TextArea rows={3} placeholder="Опишите опыт и специализацию" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Form.Item name="address" label="Адрес / район">
            <Input placeholder="Например: Москва, м. Арбатская" style={{ borderRadius: 10 }} />
          </Form.Item>
          <Button type="primary" htmlType="submit" block
            style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 10, height: 44 }}>
            Сохранить
          </Button>
        </Form>
      </Modal>
    </div>
  );
}

//  Client Dashboard 
// Category labels and icons (emoji)

// Status timeline definition
const STATUS_STEPS = [
  { key: 'Pending',   label: 'Ожидает',   icon: '🕐' },
  { key: 'Confirmed', label: 'Принято',   icon: '✅' },
  { key: 'Completed', label: 'Оказано',   icon: '🎉' },
];
const STATUS_TERMINAL: Record<string, { label: string; icon: string; color: string }> = {
  Cancelled: { label: 'Отменено',    icon: '❌', color: '#cf1322' },
  NoShow:    { label: 'Неявка',      icon: '🚫', color: '#722ed1' },
};

function BookingStatusTimeline({ status }: { status: string }) {
  const terminal = STATUS_TERMINAL[status];
  if (terminal) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '10px 0' }}>
        <span style={{ fontSize: 18 }}>{terminal.icon}</span>
        <span style={{ color: terminal.color, fontWeight: 600, fontSize: 13 }}>{terminal.label}</span>
      </div>
    );
  }
  const currentIdx = STATUS_STEPS.findIndex(s => s.key === status);
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, padding: '10px 0' }}>
      {STATUS_STEPS.map((step, i) => {
        const done    = i < currentIdx;
        const current = i === currentIdx;
        const color   = done || current ? '#ff6b9d' : '#d9d9d9';
        return (
          <div key={step.key} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{
                width: 32, height: 32, borderRadius: '50%',
                background: done || current ? '#ff6b9d' : '#f0f0f0',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, border: current ? '2px solid #ff6b9d' : 'none',
                boxShadow: current ? '0 0 0 3px rgba(255,107,157,0.2)' : 'none',
              }}>
                {done ? '✓' : <span style={{ fontSize: 14 }}>{step.icon}</span>}
              </div>
              <span style={{ fontSize: 11, color: done || current ? '#ff6b9d' : '#999', fontWeight: current ? 600 : 400, whiteSpace: 'nowrap' }}>
                {step.label}
              </span>
            </div>
            {i < STATUS_STEPS.length - 1 && (
              <div style={{ flex: 1, height: 2, background: done ? '#ff6b9d' : '#f0f0f0', margin: '0 4px', marginBottom: 20 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

function ClientDashboard() {
  const [bookings, setBookings]           = useState<BookingDto[]>([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all');
  const [reviewTarget, setReviewTarget]   = useState<BookingDto | null>(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewForm]                      = Form.useForm();
  const [reviewPhotos,    setReviewPhotos]    = useState<File[]>([]);
  const [reviewPhotoUrls, setReviewPhotoUrls] = useState<string[]>([]);
  const [cancellingId, setCancellingId]   = useState<string | null>(null);
  const [detailBooking, setDetailBooking] = useState<BookingDto | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const navigate = useNavigate();

  const openDetail = async (b: BookingDto) => {
    setDetailBooking(b);
    setDetailLoading(true);
    try {
      const full = await bookingsApi.getById(b.id);
      setDetailBooking(full);
    } catch { /* используем данные из списка */ }
    finally { setDetailLoading(false); }
  };

  useEffect(() => {
    bookingsApi.getMine().then(setBookings).finally(() => setLoading(false));
  }, []);

  const handleCancel = async (id: string) => {
    setCancellingId(id);
    try {
      const updated = await bookingsApi.cancelByClient(id);
      setBookings(prev => prev.map(b => b.id === id ? updated : b));
      if (detailBooking?.id === id) setDetailBooking(updated);
      message.success('Запись отменена');
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Ошибка при отмене');
    } finally { setCancellingId(null); }
  };

  const handleSubmitReview = async (values: { rating: number; comment?: string }) => {
    if (!reviewTarget) return;
    setReviewLoading(true);
    try {
      await reviewsApi.create({
        masterId: reviewTarget.masterProfileId,
        rating: values.rating,
        comment: values.comment,
        bookingId: reviewTarget.id,
      }, reviewPhotos);
      setBookings(prev => prev.map(b => b.id === reviewTarget.id ? { ...b, hasReview: true } : b));
      message.success('Отзыв оставлен, спасибо!');
      setReviewTarget(null);
      setReviewPhotos([]);
      setReviewPhotoUrls([]);
      reviewForm.resetFields();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Ошибка');
    } finally { setReviewLoading(false); }
  };

  const completed = bookings.filter(b => b.status === 'Completed');
  const pending   = bookings.filter(b => b.status === 'Pending' || b.status === 'Confirmed');
  const filtered  = filter === 'all' ? bookings : bookings.filter(b => b.status === filter);

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;

  return (
    <div>
      {/* Stat cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={12} sm={6}>
          <StatCard icon={<CalendarOutlined />} label="Всего записей" value={bookings.length} color="#ff6b9d" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard icon={<ClockCircleOutlined />} label="Активных" value={pending.length} color="#d46b08" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard icon={<CheckCircleOutlined />} label="Оказано услуг" value={completed.length} color="#52c41a" />
        </Col>
        <Col xs={12} sm={6}>
          <StatCard icon={<RiseOutlined />} label="Потрачено" value={`${completed.reduce((s, b) => s + b.servicePrice, 0).toLocaleString()} ₽`} color="#722ed1" />
        </Col>
      </Row>

      <Card style={{ borderRadius: 16, border: 'none', boxShadow: '0 2px 16px rgba(0,0,0,0.06)' }} bodyStyle={{ padding: 24 }}>
        {/* Filters */}
        <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {[
            { key: 'all',       label: `Все (${bookings.length})` },
            { key: 'Pending',   label: `Ожидают (${bookings.filter(b => b.status === 'Pending').length})` },
            { key: 'Confirmed', label: `Подтверждено (${bookings.filter(b => b.status === 'Confirmed').length})` },
            { key: 'Completed', label: `Оказано (${completed.length})` },
            { key: 'Cancelled', label: `Отменено (${bookings.filter(b => b.status === 'Cancelled').length})` },
            { key: 'NoShow',    label: `Неявка (${bookings.filter(b => b.status === 'NoShow').length})` },
          ].map(f => (
            <Button
              key={f.key} size="small"
              type={filter === f.key ? 'primary' : 'default'}
              onClick={() => setFilter(f.key)}
              style={{ borderRadius: 20, ...(filter === f.key ? { background: '#ff6b9d', borderColor: '#ff6b9d' } : {}) }}
            >{f.label}</Button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <Empty description="Записей нет" style={{ padding: 40 }} />
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {filtered.map(b => {
              const cfg = STATUS_CONFIG[b.status];
              const canCancel = b.status === 'Pending' || b.status === 'Confirmed';
              return (
                <Card
                  key={b.id}
                  hoverable
                  onClick={() => openDetail(b)}
                  style={{ borderRadius: 12, border: '1px solid #f0f0f0', cursor: 'pointer' }}
                  bodyStyle={{ padding: '14px 18px' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, flexWrap: 'wrap' }}>
                    {/* Left: info */}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 15 }}>{b.serviceName}</Text>
                        {b.serviceCategory && (
                          <span style={{ fontSize: 11, color: '#888', background: '#f5f5f5', padding: '1px 8px', borderRadius: 10 }}>
                            {CATEGORY_LABELS[b.serviceCategory] ?? b.serviceCategory}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: 13, color: '#666', marginBottom: 4 }}>
                        👤 {b.masterName}
                        {b.masterAddress && <span style={{ color: '#aaa', marginLeft: 8 }}>📍 {b.masterAddress}</span>}
                      </div>
                      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                        <span style={{ color: '#ff6b9d', fontWeight: 700, fontSize: 14 }}>{b.servicePrice.toLocaleString()} ₽</span>
                        <span style={{ color: '#888', fontSize: 13 }}>🕐 {b.bookingDate}</span>
                        <span style={{ color: '#aaa', fontSize: 12 }}>⏱ {b.serviceDurationMinutes} мин</span>
                      </div>
                    </div>

                    {/* Right: status + actions */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }} onClick={e => e.stopPropagation()}>
                      <span style={{ padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600, color: cfg.color, background: cfg.bg }}>
                        {cfg.label}
                      </span>
                      {b.status === 'Completed' && !b.hasReview && (
                        <Button
                          size="small" icon={<StarOutlined />}
                          onClick={() => setReviewTarget(b)}
                          style={{ borderRadius: 8, color: '#faad14', borderColor: '#faad14', fontSize: 12 }}
                        >Оставить отзыв</Button>
                      )}
                      {b.status === 'Completed' && b.hasReview && (
                        <Text type="secondary" style={{ fontSize: 12 }}>Отзыв оставлен ✓</Text>
                      )}
                      {canCancel && (
                        <Popconfirm
                          title="Отменить запись?"
                          description={b.status === 'Confirmed'
                            ? 'Запись уже подтверждена мастером. Мастер получит уведомление.'
                            : 'Мастер получит уведомление об отмене.'}
                          okText="Да, отменить" cancelText="Нет"
                          okButtonProps={{ danger: true }}
                          onConfirm={() => handleCancel(b.id)}
                        >
                          <Button
                            size="small" icon={<CloseOutlined />}
                            loading={cancellingId === b.id}
                            style={{ borderRadius: 8, color: '#cf1322', borderColor: '#ffa39e', fontSize: 12 }}
                          >Отменить</Button>
                        </Popconfirm>
                      )}
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </Card>

      {/* ── Booking Detail Modal ────────────────────────────── */}
      <Modal
        title={null}
        open={!!detailBooking}
        onCancel={() => setDetailBooking(null)}
        footer={null}
        width={540}
        styles={{ content: { borderRadius: 16, padding: 0, overflow: 'hidden' } }}
      >
        {detailBooking && (() => {
          const cfg = STATUS_CONFIG[detailBooking.status];
          const canCancel = detailBooking.status === 'Pending' || detailBooking.status === 'Confirmed';
          return (
            <>
              {/* Gradient header */}
              <div style={{ background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)', padding: '22px 28px 20px' }}>
                <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 11, display: 'block', marginBottom: 2, letterSpacing: 1, textTransform: 'uppercase' }}>
                  {CATEGORY_LABELS[detailBooking.serviceCategory] ?? detailBooking.serviceCategory}
                </Text>
                <Text strong style={{ color: '#fff', fontSize: 20, display: 'block', marginBottom: 10 }}>
                  {detailBooking.serviceName}
                </Text>
                <span style={{ background: 'rgba(255,255,255,0.22)', color: '#fff', padding: '3px 12px', borderRadius: 20, fontSize: 12, fontWeight: 600 }}>
                  {cfg.label}
                </span>
              </div>

              <div style={{ padding: '20px 28px 28px' }}>
                {detailLoading ? (
                  <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
                ) : (
                  <>
                    {/* Status timeline */}
                    <div style={{ marginBottom: 20, padding: '12px 16px', background: '#fafafa', borderRadius: 12 }}>
                      <Text type="secondary" style={{ fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 }}>Статус заявки</Text>
                      <BookingStatusTimeline status={detailBooking.status} />
                    </div>

                    {/* Master block */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20, padding: '14px 16px', background: '#fff7fb', border: '1px solid #ffd6e7', borderRadius: 12 }}>
                      <Avatar size={52} src={detailBooking.masterAvatarUrl} style={{ background: '#ff6b9d', fontSize: 20, flexShrink: 0 }}>
                        {detailBooking.masterName[0]}
                      </Avatar>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <Text strong style={{ fontSize: 15, display: 'block' }}>{detailBooking.masterName}</Text>
                        {detailBooking.masterAddress && (
                          <Text type="secondary" style={{ fontSize: 12 }}>📍 {detailBooking.masterAddress}</Text>
                        )}
                        {detailBooking.masterPhone && (
                          <div style={{ marginTop: 2 }}>
                            <a href={`tel:${detailBooking.masterPhone}`} style={{ fontSize: 13, color: '#ff6b9d' }}>
                              📞 {detailBooking.masterPhone}
                            </a>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                        <Button
                          size="small"
                          onClick={() => { setDetailBooking(null); navigate(`/chat/${detailBooking.masterUserId}`); }}
                          style={{ borderRadius: 8, borderColor: '#ff6b9d', color: '#ff6b9d' }}
                        >💬 Написать</Button>
                        <Button
                          size="small"
                          onClick={() => { setDetailBooking(null); navigate(`/masters/${detailBooking.masterProfileId}`); }}
                          style={{ borderRadius: 8, borderColor: '#d9d9d9', color: '#666' }}
                        >👤 Профиль</Button>
                      </div>
                    </div>

                    {/* Details rows */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 0, marginBottom: 20, border: '1px solid #f0f0f0', borderRadius: 12, overflow: 'hidden' }}>
                      {[
                        { label: '📅 Дата и время',   value: detailBooking.bookingDate },
                        { label: '⏱ Длительность',    value: `${detailBooking.serviceDurationMinutes} мин` },
                        { label: '💰 Стоимость',       value: <Text strong style={{ color: '#ff6b9d' }}>{detailBooking.servicePrice.toLocaleString()} ₽</Text> },
                        ...(detailBooking.serviceDescription ? [{ label: '📋 Описание',   value: detailBooking.serviceDescription }] : []),
                        ...(detailBooking.comment           ? [{ label: '💬 Ваш комментарий', value: detailBooking.comment }]           : []),
                        { label: '🗓 Создана',          value: new Date(detailBooking.createdAt).toLocaleString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) },
                      ].map((row, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, padding: '10px 16px', background: i % 2 === 0 ? '#fff' : '#fafafa', alignItems: 'flex-start' }}>
                          <Text type="secondary" style={{ fontSize: 13, whiteSpace: 'nowrap' }}>{row.label}</Text>
                          <Text style={{ fontSize: 13, fontWeight: 500, textAlign: 'right', maxWidth: 300 }}>{row.value}</Text>
                        </div>
                      ))}
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                      {detailBooking.status === 'Completed' && !detailBooking.hasReview && (
                        <Button
                          icon={<StarOutlined />} style={{ borderRadius: 10, color: '#faad14', borderColor: '#faad14', flex: 1 }}
                          onClick={() => { setDetailBooking(null); setReviewTarget(detailBooking); }}
                        >⭐ Оставить отзыв</Button>
                      )}
                      {detailBooking.status === 'Completed' && detailBooking.hasReview && (
                        <div style={{ flex: 1, textAlign: 'center', padding: '8px 0', color: '#52c41a', fontWeight: 600 }}>✓ Отзыв оставлен</div>
                      )}
                      {canCancel && (
                        <Popconfirm
                          title="Отменить запись?"
                          description={detailBooking.status === 'Confirmed'
                            ? 'Запись подтверждена мастером. Мастер получит уведомление.'
                            : 'Мастер получит уведомление об отмене.'}
                          onConfirm={() => handleCancel(detailBooking.id)}
                          okText="Да, отменить" cancelText="Нет"
                          okButtonProps={{ danger: true }}
                        >
                          <Button danger style={{ borderRadius: 10, flex: 1 }} loading={cancellingId === detailBooking.id}>
                            Отменить запись
                          </Button>
                        </Popconfirm>
                      )}
                    </div>
                  </>
                )}
              </div>
            </>
          );
        })()}
      </Modal>

      {/* ── Review Modal ────────────────────────────────────── */}
      <Modal
        title={null}
        open={!!reviewTarget}
        onCancel={() => { setReviewTarget(null); setReviewPhotos([]); setReviewPhotoUrls([]); reviewForm.resetFields(); }}
        footer={null}
        width={440}
        styles={{ content: { borderRadius: 16, padding: 0, overflow: 'hidden' } }}
      >
        {/* Шапка */}
        <div style={{ background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)', padding: '22px 28px 18px' }}>
          {reviewTarget && (
            <div>
              <Text style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, display: 'block' }}>Ваш отзыв о визите</Text>
              <Text strong style={{ color: '#fff', fontSize: 17 }}>{reviewTarget.serviceName}</Text>
              <Text style={{ color: 'rgba(255,255,255,0.85)', fontSize: 13, display: 'block', marginTop: 2 }}>
                Мастер: {reviewTarget.masterName} · {reviewTarget.bookingDate}
              </Text>
            </div>
          )}
        </div>

        {/* Форма */}
        <div style={{ padding: '22px 28px 28px' }}>
          <Form form={reviewForm} layout="vertical" onFinish={handleSubmitReview}>
            <Form.Item
              name="rating"
              label={<Text strong>Ваша оценка</Text>}
              rules={[{ required: true, message: 'Поставьте оценку' }]}
            >
              <RatingPicker />
            </Form.Item>
            <Form.Item name="comment" label={<Text strong>Комментарий</Text>}>
              <Input.TextArea
                placeholder="Расскажите о своём опыте — это поможет другим клиентам"
                rows={4}
                style={{ borderRadius: 10 }}
                maxLength={500}
                showCount
              />
            </Form.Item>
            {/* Photo upload */}
            <Form.Item label={<span style={{ fontWeight: 600 }}>Фото к отзыву <span style={{ color: '#aaa', fontWeight: 400 }}>(до 5)</span></span>}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, marginBottom: 8 }}>
                {reviewPhotoUrls.map((url, i) => (
                  <div key={i} style={{ position: 'relative', width: 72, height: 72 }}>
                    <img src={url} alt="" style={{
                      width: 72, height: 72, objectFit: 'cover',
                      borderRadius: 8, border: '1px solid #f0f0f0',
                    }} />
                    <button onClick={() => {
                      setReviewPhotos(prev => prev.filter((_, j) => j !== i));
                      setReviewPhotoUrls(prev => prev.filter((_, j) => j !== i));
                    }} style={{
                      position: 'absolute', top: -6, right: -6,
                      width: 18, height: 18, borderRadius: '50%',
                      background: '#ff4d4f', border: 'none', cursor: 'pointer',
                      color: '#fff', fontSize: 10, display: 'flex',
                      alignItems: 'center', justifyContent: 'center', padding: 0,
                    }}>x</button>
                  </div>
                ))}
                {reviewPhotos.length < 5 && (
                  <label style={{ cursor: 'pointer' }}>
                    <div style={{
                      width: 72, height: 72, borderRadius: 8,
                      border: '2px dashed #ffb3d0', display: 'flex',
                      flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                      background: '#fff7fb', color: '#ff6b9d',
                    }}>
                      <span style={{ fontSize: 20 }}>+</span>
                      <span style={{ fontSize: 10, marginTop: 2 }}>Фото</span>
                    </div>
                    <input type="file" accept="image/jpeg,image/png,image/webp"
                      multiple style={{ display: 'none' }}
                      onChange={e => {
                        const files = Array.from(e.target.files || []);
                        const remaining = 5 - reviewPhotos.length;
                        const toAdd = files.slice(0, remaining);
                        setReviewPhotos(prev => [...prev, ...toAdd]);
                        setReviewPhotoUrls(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))]);
                        e.target.value = '';
                      }} />
                  </label>
                )}
              </div>
              <span style={{ fontSize: 11, color: '#aaa' }}>JPG, PNG, WebP — максимум 5 фото</span>
            </Form.Item>
            <Button
              type="primary" htmlType="submit" loading={reviewLoading} block size="large"
              style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 10, height: 46 }}
            >
              Опубликовать отзыв
            </Button>
          </Form>
        </div>
      </Modal>
    </div>
  );
}

//  Main 
export default function DashboardPage() {
  const isMobile = useIsMobile();
  const { role, name, isAuthenticated } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isAuthenticated) navigate('/login', { replace: true });
  }, [isAuthenticated]);

  return (
    <div style={{ background: '#f8f8fb', minHeight: 'calc(100vh - 64px)' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '32px 24px' }}>
        <div style={{ marginBottom: 28 }}>
          <Title level={3} style={{ margin: 0, color: '#1a1a2e' }}>
            {role === 'Master' ? 'Кабинет мастера' : 'Личный кабинет'}
          </Title>
          <Text type="secondary">Добро пожаловать, {name}</Text>
        </div>
        {role === 'Master' ? <MasterDashboard /> : <ClientDashboard />}
      </div>
    </div>
  );
}
