import { useEffect, useState } from 'react';
import { Button, Typography, Row, Col, Card, Tag, Spin } from 'antd';
import {
  SearchOutlined, CalendarOutlined, StarFilled, CheckOutlined,
  UserOutlined, EnvironmentOutlined, CheckCircleFilled,
  ScissorOutlined, BgColorsOutlined, StarOutlined, SkinOutlined,
  EyeOutlined, HeartOutlined, ThunderboltOutlined,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import { mastersApi } from '../api/endpoints';
import type { MasterListItemDto } from '../types';

const { Title, Text, Paragraph } = Typography;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

const CATEGORIES = [
  { label: 'Маникюр',     value: 'Manicure',   color: '#ff6b9d', Icon: StarOutlined },
  { label: 'Стрижки',     value: 'Haircut',    color: '#f97316', Icon: ScissorOutlined },
  { label: 'Окрашивание', value: 'Coloring',   color: '#a855f7', Icon: BgColorsOutlined },
  { label: 'Макияж',      value: 'Makeup',     color: '#ec4899', Icon: SkinOutlined },
  { label: 'Брови',       value: 'Eyebrows',   color: '#8b5cf6', Icon: EyeOutlined },
  { label: 'Ресницы',     value: 'Eyelashes',  color: '#06b6d4', Icon: EyeOutlined },
  { label: 'Массаж',      value: 'Massage',    color: '#10b981', Icon: HeartOutlined },
  { label: 'Педикюр',     value: 'Pedicure',   color: '#f59e0b', Icon: ThunderboltOutlined },
];

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Выберите услугу',
    desc: 'Найдите мастера по категории, цене или районе. Фильтры помогут сузить поиск.',
    Icon: SearchOutlined,
    color: '#ff6b9d',
  },
  {
    step: '02',
    title: 'Выберите время',
    desc: 'Посмотрите расписание мастера и выберите удобный слот — всё онлайн за пару кликов.',
    Icon: CalendarOutlined,
    color: '#a855f7',
  },
  {
    step: '03',
    title: 'Приходите и наслаждайтесь',
    desc: 'Получите подтверждение и просто придите в назначенное время. Всё готово!',
    Icon: CheckOutlined,
    color: '#10b981',
  },
];

const STATS = [
  { value: '500+', label: 'Мастеров' },
  { value: '10 000+', label: 'Записей в месяц' },
  { value: '4.9', label: 'Средний рейтинг' },
  { value: '0 ₽', label: 'Комиссия' },
];

export default function HomePage() {
  const navigate = useNavigate();
  const [popularMasters, setPopularMasters] = useState<MasterListItemDto[]>([]);
  const [mastersLoading, setMastersLoading] = useState(true);

  useEffect(() => {
    mastersApi.getAll({ pageSize: 6 })
      .then(r => setPopularMasters(r.items))
      .catch(() => {})
      .finally(() => setMastersLoading(false));
  }, []);

  return (
    <div style={{ background: '#fff' }}>

      {/*  Hero  */}
      <div style={{
        background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
        padding: '90px 24px 80px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative circles */}
        {[
          { size: 400, top: -100, right: -100, opacity: 0.06 },
          { size: 250, bottom: -80, left: -60, opacity: 0.05 },
          { size: 150, top: 40, left: '40%', opacity: 0.04 },
        ].map((c, i) => (
          <div key={i} style={{
            position: 'absolute',
            width: c.size, height: c.size, borderRadius: '50%',
            background: '#ff6b9d',
            top: c.top, bottom: c.bottom, left: c.left, right: c.right,
            opacity: c.opacity,
            pointerEvents: 'none',
          }} />
        ))}

        <div style={{ maxWidth: 720, margin: '0 auto', textAlign: 'center', position: 'relative' }}>
          <div style={{
            display: 'inline-block',
            background: 'rgba(255,107,157,0.15)',
            border: '1px solid rgba(255,107,157,0.3)',
            borderRadius: 20, padding: '6px 16px',
            marginBottom: 20,
          }}>
            <Text style={{ color: '#ff6b9d', fontSize: 13, fontWeight: 600 }}>
              Запись к мастеру онлайн
            </Text>
          </div>

          <Title level={1} style={{
            color: '#fff', marginBottom: 16, fontSize: 'clamp(32px, 5vw, 56px)',
            lineHeight: 1.15, fontWeight: 800,
          }}>
            Найди своего{' '}
            <span style={{ color: '#ff6b9d' }}>мастера красоты</span>
          </Title>

          <Paragraph style={{
            color: 'rgba(255,255,255,0.7)', fontSize: 18,
            marginBottom: 40, maxWidth: 520, margin: '0 auto 40px',
          }}>
            Маникюр, стрижки, макияж, брови — выбери мастера и запишись онлайн за 2 минуты
          </Paragraph>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button
              size="large" type="primary"
              icon={<SearchOutlined />}
              onClick={() => navigate('/masters')}
              style={{
                background: '#ff6b9d', borderColor: '#ff6b9d',
                borderRadius: 12, height: 52, padding: '0 32px',
                fontSize: 16, fontWeight: 600,
                boxShadow: '0 8px 24px rgba(255,107,157,0.4)',
              }}
            >
              Найти мастера
            </Button>
            <Button
              size="large"
              onClick={() => navigate('/register')}
              style={{
                borderRadius: 12, height: 52, padding: '0 28px',
                fontSize: 16, background: 'rgba(255,255,255,0.08)',
                borderColor: 'rgba(255,255,255,0.2)', color: '#fff',
              }}
            >
              Я мастер
            </Button>
          </div>
        </div>
      </div>

      {/*  Stats bar  */}
      <div style={{ background: '#ff6b9d' }}>
        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '20px 24px' }}>
          <Row gutter={0} justify="space-around">
            {STATS.map(s => (
              <Col key={s.label} xs={12} sm={6} style={{ textAlign: 'center', padding: '12px 0' }}>
                <div style={{ fontSize: 24, fontWeight: 800, color: '#fff', lineHeight: 1 }}>{s.value}</div>
                <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 4 }}>{s.label}</div>
              </Col>
            ))}
          </Row>
        </div>
      </div>

      {/*  Categories  */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 40 }}>
          <Title level={2} style={{ marginBottom: 8 }}>Популярные категории</Title>
          <Text type="secondary" style={{ fontSize: 16 }}>Выберите нужную услугу и найдите лучшего мастера</Text>
        </div>

        <Row gutter={[16, 16]}>
          {CATEGORIES.map(cat => (
            <Col xs={12} sm={8} md={6} key={cat.value}>
              <Card
                hoverable
                onClick={() => navigate(`/masters?category=${cat.value}`)}
                style={{
                  borderRadius: 16, border: 'none', cursor: 'pointer',
                  boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
                  transition: 'all 0.2s',
                }}
                bodyStyle={{ padding: '20px 16px', textAlign: 'center' }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(-4px)';
                  (e.currentTarget as HTMLElement).style.boxShadow = `0 12px 32px ${cat.color}30`;
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLElement).style.transform = 'translateY(0)';
                  (e.currentTarget as HTMLElement).style.boxShadow = '0 2px 12px rgba(0,0,0,0.06)';
                }}
              >
                <div style={{
                  width: 56, height: 56, borderRadius: 16,
                  background: cat.color + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 12px', fontSize: 22, color: cat.color,
                }}>
                  <cat.Icon />
                </div>
                <Text strong style={{ fontSize: 14 }}>{cat.label}</Text>
              </Card>
            </Col>
          ))}
        </Row>
      </div>

      {/*  How it works  */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 24px 0' }}>
        <div style={{ textAlign: 'center', marginBottom: 48 }}>
          <Title level={2} style={{ marginBottom: 8 }}>Как это работает</Title>
          <Text type="secondary" style={{ fontSize: 16 }}>Три простых шага до идеального образа</Text>
        </div>

        <Row gutter={[32, 32]}>
          {HOW_IT_WORKS.map((step, i) => (
            <Col xs={24} md={8} key={i}>
              <div style={{ textAlign: 'center', padding: '0 16px' }}>
                <div style={{
                  width: 80, height: 80, borderRadius: '50%',
                  background: step.color + '15',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  margin: '0 auto 20px', fontSize: 28, color: step.color,
                  border: `2px solid ${step.color}30`,
                }}>
                  <step.Icon />
                </div>
                <div style={{
                  display: 'inline-block',
                  background: step.color + '15', color: step.color,
                  borderRadius: 8, padding: '2px 10px',
                  fontSize: 12, fontWeight: 700, marginBottom: 12,
                }}>
                  ШАГ {step.step}
                </div>
                <Title level={4} style={{ marginBottom: 8 }}>{step.title}</Title>
                <Text type="secondary" style={{ fontSize: 14, lineHeight: 1.6 }}>{step.desc}</Text>

                {/* Connector arrow (not on last) */}
                {i < 2 && (
                  <div style={{
                    display: 'none', // shown only on desktop via md breakpoint workaround
                  }} />
                )}
              </div>
            </Col>
          ))}
        </Row>
      </div>

      {/*  Popular Masters  */}
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '72px 24px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32, flexWrap: 'wrap', gap: 12 }}>
          <div>
            <Title level={2} style={{ marginBottom: 4 }}>Мастера на платформе</Title>
            <Text type="secondary">Выбирайте из лучших специалистов</Text>
          </div>
          <Button
            onClick={() => navigate('/masters')}
            style={{ borderRadius: 10 }}
          >
            Смотреть всех
          </Button>
        </div>

        {mastersLoading ? (
          <div style={{ textAlign: 'center', padding: 60 }}><Spin size="large" /></div>
        ) : popularMasters.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '60px 24px',
            background: '#f8f8fb', borderRadius: 16,
          }}>
            <Text type="secondary" style={{ fontSize: 16 }}>
              Мастера ещё не зарегистрировались. Будь первым!
            </Text>
            <br />
            <Button
              type="primary" style={{ marginTop: 16, background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 10 }}
              onClick={() => navigate('/register')}
            >
              Зарегистрироваться как мастер
            </Button>
          </div>
        ) : (
          <Row gutter={[20, 20]}>
            {popularMasters.map(master => (
              <Col xs={24} sm={12} lg={8} key={master.profileId}>
                <MasterCard master={master} onClick={() => navigate(`/masters/${master.profileId}`)} />
              </Col>
            ))}
          </Row>
        )}
      </div>

      {/*  Master CTA  */}
      <div style={{ maxWidth: 1200, margin: '72px auto 0', padding: '0 24px' }}>
        <div style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
          borderRadius: 24, padding: '56px 48px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexWrap: 'wrap', gap: 32, position: 'relative', overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute', width: 300, height: 300, borderRadius: '50%',
            background: '#ff6b9d', opacity: 0.06, right: -60, top: -80,
          }} />
          <div style={{ flex: 1, minWidth: 280 }}>
            <Title level={2} style={{ color: '#fff', marginBottom: 12 }}>
              Вы мастер красоты?
            </Title>
            <Paragraph style={{ color: 'rgba(255,255,255,0.7)', fontSize: 16, marginBottom: 0 }}>
              Создайте профиль бесплатно, добавьте услуги и расписание — клиенты сами найдут вас и запишутся онлайн
            </Paragraph>
            <div style={{ marginTop: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {['Бесплатная регистрация', 'Управление расписанием', 'Приём заявок онлайн'].map(f => (
                <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <CheckCircleFilled style={{ color: '#ff6b9d', fontSize: 16 }} />
                  <Text style={{ color: 'rgba(255,255,255,0.8)', fontSize: 14 }}>{f}</Text>
                </div>
              ))}
            </div>
          </div>
          <Button
            type="primary" size="large"
            onClick={() => navigate('/register')}
            style={{
              background: '#ff6b9d', borderColor: '#ff6b9d',
              borderRadius: 12, height: 52, padding: '0 36px',
              fontSize: 16, fontWeight: 600,
              boxShadow: '0 8px 24px rgba(255,107,157,0.4)',
              flexShrink: 0,
            }}
          >
            Начать бесплатно
          </Button>
        </div>
      </div>

      {/*  Footer padding  */}
      <div style={{ height: 72 }} />
    </div>
  );
}

//  Mini Master Card 
const CATEGORY_LABELS: Record<string, string> = {
  Haircut: 'Стрижки', Coloring: 'Окрашивание',
  Manicure: 'Маникюр', Pedicure: 'Педикюр',
  Makeup: 'Макияж', Eyebrows: 'Брови',
  Eyelashes: 'Ресницы', Massage: 'Массаж', Other: 'Прочее',
};

function MasterCard({ master, onClick }: { master: MasterListItemDto; onClick: () => void }) {
  return (
    <Card
      hoverable onClick={onClick}
      style={{
        borderRadius: 16, overflow: 'hidden', border: 'none',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
        transition: 'all 0.2s',
      }}
      bodyStyle={{ padding: 0 }}
    >
      {/* Photo */}
      <div style={{ position: 'relative' }}>
        {master.avatarUrl ? (
          <img
            src={`${API_BASE}${master.avatarUrl}`} alt={master.name}
            style={{ width: '100%', height: 180, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            height: 180,
            background: 'linear-gradient(135deg, #ffb3d1 0%, #ffd6b3 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserOutlined style={{ fontSize: 56, color: '#fff' }} />
          </div>
        )}
        {master.priceFrom && (
          <div style={{
            position: 'absolute', bottom: 10, right: 10,
            background: 'rgba(255,255,255,0.95)', borderRadius: 20,
            padding: '3px 10px', fontSize: 12, fontWeight: 700, color: '#ff6b9d',
          }}>
            от {master.priceFrom.toLocaleString()} ₽
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '14px 16px 16px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
          <Text strong style={{ fontSize: 15 }}>{master.name}</Text>
          {master.averageRating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 3 }}>
              <StarFilled style={{ color: '#faad14', fontSize: 12 }} />
              <Text style={{ fontSize: 13, fontWeight: 600 }}>{master.averageRating}</Text>
            </div>
          )}
        </div>

        {master.address && (
          <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 8 }}>
            <EnvironmentOutlined style={{ marginRight: 4 }} />{master.address}
          </Text>
        )}

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          {master.categories.slice(0, 2).map(cat => (
            <Tag key={cat} color="pink" style={{ fontSize: 11, margin: 0 }}>
              {CATEGORY_LABELS[cat] || cat}
            </Tag>
          ))}
          {master.categories.length > 2 && (
            <Tag style={{ fontSize: 11, margin: 0 }}>+{master.categories.length - 2}</Tag>
          )}
        </div>
      </div>
    </Card>
  );
}
