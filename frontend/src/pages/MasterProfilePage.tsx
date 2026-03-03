import { useEffect, useState } from 'react';
import {
  Row, Col, Card, Avatar, Button, Tag, Typography, Spin,
  Divider, Modal, Input, Form, message, Rate, Image, Empty,
} from 'antd';
import {
  UserOutlined, EnvironmentOutlined, ClockCircleOutlined,
  DollarOutlined, CalendarOutlined, StarOutlined, StarFilled,
  PictureOutlined, MessageOutlined,
} from '@ant-design/icons';
import { useParams, useNavigate } from 'react-router-dom';
import { mastersApi, bookingsApi, reviewsApi } from '../api/endpoints';
import { useAuthStore } from '../context/authStore';
import type { MasterProfileDto, ServiceDto, BookingDto } from '../types';
import SlotPicker from '../components/SlotPicker';
import RatingPicker from '../components/RatingPicker';

const { Title, Text, Paragraph } = Typography;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORY_LABELS: Record<string, string> = {
  Haircut: 'Стрижки', Coloring: 'Окрашивание',
  Manicure: 'Маникюр', Pedicure: 'Педикюр',
  Makeup: 'Макияж', Eyebrows: 'Брови',
  Eyelashes: 'Ресницы', Massage: 'Массаж', Other: 'Прочее',
};

export default function MasterProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated, role } = useAuthStore();
  const [master, setMaster] = useState<MasterProfileDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedService, setSelectedService] = useState<ServiceDto | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [reviewModal, setReviewModal] = useState(false);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [completedBookings, setCompletedBookings] = useState<BookingDto[]>([]);
  const [reviewBookingId, setReviewBookingId] = useState<string | null>(null);
  const [bookingForm] = Form.useForm();
  const [reviewForm] = Form.useForm();

  useEffect(() => {
    if (!id) return;
    mastersApi.getById(id)
      .then(setMaster).catch(() => navigate('/masters')).finally(() => setLoading(false));
  }, [id]);

  // Загружаем завершённые брони у этого мастера (для привязки отзыва)
  useEffect(() => {
    if (!isAuthenticated || role !== 'Client' || !id) return;
    bookingsApi.getMine().then(all => {
      const done = all.filter(b => b.status === 'Completed' && b.masterProfileId === id && !b.hasReview);
      setCompletedBookings(done);
    }).catch(() => {});
  }, [isAuthenticated, role, id]);

  const handleBook = (service: ServiceDto) => {
    if (!isAuthenticated) {
      message.info('Войдите или зарегистрируйтесь, чтобы записаться');
      navigate('/login', { state: { returnTo: `/masters/${id}` } });
      return;
    }
    if (role === 'Master') { message.warning('Мастера не могут бронировать услуги'); return; }
    setSelectedService(service);
  };

  const handleSubmitBooking = async (values: { comment?: string }) => {
    if (!selectedService) return;
    if (!selectedSlot) { message.warning('Выберите время записи'); return; }
    setBookingLoading(true);
    try {
      await bookingsApi.create({
        serviceId: selectedService.id,
        slotDateTime: selectedSlot,
        comment: values.comment,
      });
      message.success('Запись оформлена! Мастер получит уведомление.');
      setSelectedService(null);
      setSelectedSlot(null);
      bookingForm.resetFields();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Ошибка при записи');
    } finally { setBookingLoading(false); }
  };

  const handleSubmitReview = async (values: { rating: number; comment?: string }) => {
    if (!master || !reviewBookingId) return;
    setReviewLoading(true);
    try {
      const review = await reviewsApi.create({
        masterId: master.id,
        rating: values.rating,
        comment: values.comment,
        bookingId: reviewBookingId,
      });
      setMaster(prev => prev ? {
        ...prev,
        reviews: [review, ...prev.reviews],
        reviewCount: prev.reviewCount + 1,
        averageRating: parseFloat(((prev.averageRating * prev.reviewCount + values.rating) / (prev.reviewCount + 1)).toFixed(1)),
      } : prev);
      // Убираем использованную бронь из списка
      setCompletedBookings(prev => prev.filter(b => b.id !== reviewBookingId));
      message.success('Отзыв оставлен, спасибо!');
      setReviewModal(false);
      setReviewBookingId(null);
      reviewForm.resetFields();
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Ошибка');
    } finally { setReviewLoading(false); }
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>;
  if (!master) return null;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: '32px 24px' }}>
      <Row gutter={[32, 32]}>
        {/* Sidebar */}
        <Col xs={24} md={8}>
          <Card style={{ borderRadius: 16, textAlign: 'center' }}>
            <Avatar
              src={master.avatarUrl ? `${API_BASE}${master.avatarUrl}` : undefined}
              icon={<UserOutlined />} size={120}
              style={{ backgroundColor: '#ff6b9d', marginBottom: 16 }}
            />
            <Title level={4} style={{ marginBottom: 4 }}>{master.masterName}</Title>

            {/* Рейтинг — сводка */}
            {master.reviewCount > 0 ? (
              <div style={{ marginBottom: 16 }}>
                {/* Большая цифра + звёзды */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, marginBottom: 10 }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 40, fontWeight: 800, color: '#1a1a2e', lineHeight: 1 }}>
                      {master.averageRating.toFixed(1)}
                    </div>
                    <Rate disabled value={master.averageRating} allowHalf style={{ fontSize: 14, marginTop: 4 }} />
                    <div style={{ fontSize: 12, color: '#999', marginTop: 2 }}>{master.reviewCount} отзывов</div>
                  </div>
                </div>
                {/* Разбивка по звёздам */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {[5, 4, 3, 2, 1].map(star => {
                    const count = master.reviews.filter(r => r.rating === star).length;
                    const pct = master.reviewCount > 0 ? (count / master.reviewCount) * 100 : 0;
                    return (
                      <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 12, color: '#666', width: 10, textAlign: 'right' }}>{star}</Text>
                        <StarFilled style={{ fontSize: 11, color: '#faad14' }} />
                        <div style={{ flex: 1, height: 6, background: '#f0f0f0', borderRadius: 3, overflow: 'hidden' }}>
                          <div style={{
                            width: `${pct}%`, height: '100%', borderRadius: 3,
                            background: pct > 0 ? '#faad14' : 'transparent',
                            transition: 'width 0.4s ease',
                          }} />
                        </div>
                        <Text style={{ fontSize: 11, color: '#999', width: 18, textAlign: 'left' }}>{count}</Text>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div style={{ marginBottom: 12 }}>
                <Rate disabled value={0} style={{ fontSize: 14 }} />
                <div style={{ fontSize: 12, color: '#bbb', marginTop: 2 }}>Отзывов пока нет</div>
              </div>
            )}

            {master.address && (
              <div style={{ color: '#666', marginBottom: 8 }}>
                <EnvironmentOutlined /> {master.address}
              </div>
            )}
            {master.priceFrom && (
              <Tag color="pink" style={{ fontSize: 14, padding: '4px 12px', marginBottom: 8 }}>
                от {master.priceFrom} ₽
              </Tag>
            )}
            {master.bio && (
              <>
                <Divider />
                <Paragraph style={{ color: '#666', textAlign: 'left' }}>{master.bio}</Paragraph>
              </>
            )}

            {isAuthenticated && role === 'Client' && completedBookings.length > 0 && (
              <>
                <Divider />
                <Button
                  icon={<StarOutlined />}
                  onClick={() => {
                    // Если одна завершённая бронь — выбираем автоматически
                    if (completedBookings.length === 1) setReviewBookingId(completedBookings[0].id);
                    setReviewModal(true);
                  }}
                  style={{ color: '#ff6b9d', borderColor: '#ff6b9d' }}
                  block
                >
                  Оставить отзыв
                </Button>
                <Button
                  icon={<MessageOutlined />}
                  onClick={() => navigate(`/chat?master=${master.id}`)}
                  style={{ marginTop: 8 }}
                  block
                >
                  Написать мастеру
                </Button>
              </>
            )}
          </Card>
        </Col>

        {/* Main content */}
        <Col xs={24} md={16}>
          {/* Услуги */}
          <Title level={4}>Услуги</Title>
          {master.services.length === 0 ? (
            <Text type="secondary">Услуги пока не добавлены</Text>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 32 }}>
              {master.services.map(service => (
                <Card key={service.id} style={{ borderRadius: 12 }} bodyStyle={{ padding: '16px 20px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                        <Text strong style={{ fontSize: 15 }}>{service.name}</Text>
                        <Tag color="pink" style={{ fontSize: 11 }}>{CATEGORY_LABELS[service.category] || service.category}</Tag>
                      </div>
                      {service.description && <Text type="secondary" style={{ fontSize: 13 }}>{service.description}</Text>}
                      <div style={{ marginTop: 8, display: 'flex', gap: 16 }}>
                        <Text style={{ color: '#ff6b9d', fontWeight: 600 }}>
                          <DollarOutlined /> {service.price} ₽
                        </Text>
                        <Text type="secondary" style={{ fontSize: 13 }}>
                          <ClockCircleOutlined /> {service.durationMinutes} мин
                        </Text>
                      </div>
                    </div>
                    <Button type="primary" onClick={() => handleBook(service)}
                      style={{ background: '#ff6b9d', borderColor: '#ff6b9d', marginLeft: 16 }}>
                      Записаться
                    </Button>
                  </div>
                </Card>
              ))}
            </div>
          )}

          {/* Портфолио */}
          {master.portfolio.length > 0 && (
            <div style={{ marginBottom: 32 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <Title level={4} style={{ margin: 0 }}>
                  Портфолио
                </Title>
                <Text type="secondary" style={{ fontSize: 13 }}>{master.portfolio.length} фото</Text>
              </div>
              <Image.PreviewGroup>
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(3, 1fr)',
                  gap: 8,
                }}>
                  {master.portfolio.map((photo, idx) => (
                    <div key={photo.id} style={{ borderRadius: 12, overflow: 'hidden', aspectRatio: '1 / 1' }}>
                      <Image
                        src={`${API_BASE}${photo.url}`}
                        alt={photo.caption || `Работа ${idx + 1}`}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                        preview={{ mask: 'Просмотр' }}
                        wrapperStyle={{ width: '100%', height: '100%' }}
                      />
                    </div>
                  ))}
                </div>
              </Image.PreviewGroup>
            </div>
          )}

          {/* Отзывы */}
          <Title level={4}>Отзывы ({master.reviewCount})</Title>
          {master.reviews.length === 0 ? (
            <Empty description="Отзывов пока нет" />
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {master.reviews.map(review => (
                <Card key={review.id} size="small" style={{ borderRadius: 12 }}>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <Avatar
                      src={review.clientAvatarUrl ? `${API_BASE}${review.clientAvatarUrl}` : undefined}
                      icon={<UserOutlined />} size={40}
                      style={{ backgroundColor: '#ff6b9d', flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text strong>{review.clientName}</Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(review.createdAt).toLocaleDateString('ru-RU')}
                        </Text>
                      </div>
                      <Rate disabled value={review.rating} style={{ fontSize: 13 }} />
                      {review.comment && <Paragraph style={{ marginTop: 4, marginBottom: 0, color: '#555' }}>{review.comment}</Paragraph>}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </Col>
      </Row>

      {/* Booking Modal */}
      <Modal
        title={<div><CalendarOutlined style={{ color: '#ff6b9d', marginRight: 8 }} />Запись на «{selectedService?.name}»</div>}
        open={!!selectedService}
        onCancel={() => { setSelectedService(null); setSelectedSlot(null); bookingForm.resetFields(); }}
        footer={null}
        width={480}
        styles={{ content: { borderRadius: 16 } }}
      >
        <Divider />
        {selectedService && (
          <>
            <div style={{ marginBottom: 16, padding: '12px 16px', background: '#fff7fb', borderRadius: 12 }}>
              <Text strong>{selectedService.name}</Text><br />
              <Text style={{ color: '#ff6b9d', fontWeight: 700 }}>{selectedService.price.toLocaleString()} ₽</Text>
              <Text type="secondary"> · {selectedService.durationMinutes} мин</Text>
            </div>

            <Text strong style={{ display: 'block', marginBottom: 12 }}>Выберите дату и время</Text>
            <SlotPicker
              masterId={id!}
              durationMinutes={selectedService.durationMinutes}
              selectedSlot={selectedSlot}
              onSelect={setSelectedSlot}
            />

            {selectedSlot && (
              <div style={{
                marginTop: 12, padding: '10px 14px', borderRadius: 10,
                background: '#f6ffed', border: '1px solid #b7eb8f',
                color: '#389e0d', fontSize: 14, fontWeight: 500,
              }}>
                Выбрано: {new Date(selectedSlot).toLocaleString('ru', {
                  day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit'
                })}
              </div>
            )}

            <Divider />
            <Form form={bookingForm} layout="vertical" onFinish={handleSubmitBooking}>
              <Form.Item name="comment" label="Комментарий (необязательно)">
                <Input.TextArea placeholder="Ваши пожелания..." rows={2} style={{ borderRadius: 10 }} />
              </Form.Item>
              <Button
                type="primary" htmlType="submit" loading={bookingLoading} block size="large"
                disabled={!selectedSlot}
                style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 10 }}
              >
                {selectedSlot ? 'Записаться' : 'Выберите время'}
              </Button>
            </Form>
          </>
        )}
      </Modal>

      {/* Review Modal */}
      <Modal
        title={null}
        open={reviewModal}
        onCancel={() => { setReviewModal(false); setReviewBookingId(null); reviewForm.resetFields(); }}
        footer={null}
        width={440}
        styles={{ content: { borderRadius: 16, padding: 0, overflow: 'hidden' } }}
      >
        {/* Шапка модалки */}
        <div style={{ background: 'linear-gradient(135deg, #ff6b9d 0%, #c44569 100%)', padding: '24px 28px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <Avatar
              src={master.avatarUrl ? `${API_BASE}${master.avatarUrl}` : undefined}
              icon={<UserOutlined />} size={52}
              style={{ backgroundColor: 'rgba(255,255,255,0.3)', flexShrink: 0 }}
            />
            <div>
              <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 12, display: 'block' }}>Оставить отзыв о мастере</Text>
              <Text strong style={{ color: '#fff', fontSize: 18 }}>{master.masterName}</Text>
            </div>
          </div>
        </div>

        {/* Форма */}
        <div style={{ padding: '24px 28px 28px' }}>
          {/* Выбор визита — если завершённых броней несколько */}
          {completedBookings.length > 1 && (
            <div style={{ marginBottom: 20 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>Выберите визит</Text>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {completedBookings.map(b => (
                  <div
                    key={b.id}
                    onClick={() => setReviewBookingId(b.id)}
                    style={{
                      padding: '10px 14px', borderRadius: 10, cursor: 'pointer',
                      border: `2px solid ${reviewBookingId === b.id ? '#ff6b9d' : '#f0f0f0'}`,
                      background: reviewBookingId === b.id ? '#fff7fb' : '#fafafa',
                    }}
                  >
                    <Text strong style={{ fontSize: 13 }}>{b.serviceName}</Text>
                    <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>{b.bookingDate}</Text>
                  </div>
                ))}
              </div>
            </div>
          )}

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
            <Button
              type="primary" htmlType="submit" loading={reviewLoading} block size="large"
              disabled={!reviewBookingId}
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