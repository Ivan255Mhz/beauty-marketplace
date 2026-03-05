import { useState, useMemo } from 'react';
import { Typography, Badge, Button, Tooltip, Modal, Avatar, Space, Tag } from 'antd';
import {
  LeftOutlined, RightOutlined, UserOutlined,
  ClockCircleOutlined, CalendarOutlined, CheckCircleOutlined,
  CloseCircleOutlined, StopOutlined,
} from '@ant-design/icons';
import type { BookingDto } from '../types';
import { useIsMobile } from '../hooks/useIsMobile';

const { Text } = Typography;

const STATUS_CFG: Record<string, { color: string; bg: string; label: string; dot: string }> = {
  Pending:   { color: '#d48806', bg: '#fffbe6', label: 'Ожидает',      dot: '#faad14' },
  Confirmed: { color: '#096dd9', bg: '#e6f4ff', label: 'Подтверждено', dot: '#1677ff' },
  Completed: { color: '#389e0d', bg: '#f6ffed', label: 'Оказано',      dot: '#52c41a' },
  Cancelled: { color: '#cf1322', bg: '#fff1f0', label: 'Отменено',     dot: '#ff4d4f' },
  NoShow:    { color: '#531dab', bg: '#f9f0ff', label: 'Неявка',       dot: '#722ed1' },
};

// Work hours to display
const HOURS = Array.from({ length: 13 }, (_, i) => i + 8); // 8..20

function addDays(date: Date, n: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}

function startOfWeek(date: Date) {
  const d = new Date(date);
  const day = d.getDay(); // 0=Sun
  const diff = (day === 0 ? -6 : 1 - day); // Mon
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

function isSameDay(a: Date, b: Date) {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate();
}

const DAY_NAMES = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'];
const DAY_NAMES_FULL = ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'];
const MONTHS = ['янв','фев','мар','апр','май','июн','июл','авг','сен','окт','ноя','дек'];

interface Props {
  bookings: BookingDto[];
  onStatusChange?: (id: string, status: string) => void;
}

export default function WeekCalendar({ bookings, onStatusChange }: Props) {
  const isMobile = useIsMobile();
  const [weekStart, setWeekStart] = useState(() => startOfWeek(new Date()));
  const [selected, setSelected] = useState<BookingDto | null>(null);

  const weekDays = useMemo(() =>
    Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );

  // Only bookings with slotDateTime
  const slotBookings = useMemo(() =>
    bookings.filter(b => b.slotDateTime),
    [bookings]
  );

  // Bookings indexed by day and hour
  const byDayHour = useMemo(() => {
    const map: Record<string, BookingDto[]> = {};
    slotBookings.forEach(b => {
      const d = new Date(b.slotDateTime!);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}-${d.getHours()}`;
      if (!map[key]) map[key] = [];
      map[key].push(b);
    });
    return map;
  }, [slotBookings]);

  const getBookingsAt = (day: Date, hour: number) => {
    const key = `${day.getFullYear()}-${day.getMonth()}-${day.getDate()}-${hour}`;
    return byDayHour[key] || [];
  };

  const today = new Date();
  const weekLabel = (() => {
    const s = weekDays[0];
    const e = weekDays[6];
    if (s.getMonth() === e.getMonth())
      return `${s.getDate()}–${e.getDate()} ${MONTHS[s.getMonth()]} ${s.getFullYear()}`;
    return `${s.getDate()} ${MONTHS[s.getMonth()]} – ${e.getDate()} ${MONTHS[e.getMonth()]} ${e.getFullYear()}`;
  })();

  // Mobile: show single day selector
  const [activeDay, setActiveDay] = useState(() => {
    const todayIdx = weekDays.findIndex(d => isSameDay(d, today));
    return todayIdx >= 0 ? todayIdx : 0;
  });

  const displayDays = isMobile ? [weekDays[activeDay]] : weekDays;

  return (
    <div style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', border: '1px solid #f0f0f0' }}>

      {/* ── Header ── */}
      <div style={{
        padding: '14px 16px', borderBottom: '1px solid #f0f0f0',
        display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
          <CalendarOutlined style={{ color: '#ff6b9d', fontSize: 18 }} />
          <Text strong style={{ fontSize: 15 }}>Расписание</Text>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Button
            type="text" icon={<LeftOutlined />} size="small"
            onClick={() => { setWeekStart(addDays(weekStart, -7)); setActiveDay(0); }}
            style={{ borderRadius: 8 }}
          />
          <Text style={{ fontSize: 13, color: '#666', minWidth: 160, textAlign: 'center' }}>
            {weekLabel}
          </Text>
          <Button
            type="text" icon={<RightOutlined />} size="small"
            onClick={() => { setWeekStart(addDays(weekStart, 7)); setActiveDay(0); }}
            style={{ borderRadius: 8 }}
          />
          <Button
            size="small" style={{ borderRadius: 8, fontSize: 12, borderColor: '#ff6b9d', color: '#ff6b9d' }}
            onClick={() => { setWeekStart(startOfWeek(new Date())); setActiveDay(new Date().getDay() === 0 ? 6 : new Date().getDay() - 1); }}
          >Сегодня</Button>
        </div>
      </div>

      {/* ── Mobile day selector ── */}
      {isMobile && (
        <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', overflowX: 'auto' }}>
          {weekDays.map((day, i) => {
            const isToday = isSameDay(day, today);
            const isActive = i === activeDay;
            const cnt = slotBookings.filter(b => isSameDay(new Date(b.slotDateTime!), day)).length;
            return (
              <button key={i} onClick={() => setActiveDay(i)}
                style={{
                  flex: 1, minWidth: 44, padding: '10px 4px',
                  border: 'none', background: isActive ? '#fff0f6' : '#fff',
                  cursor: 'pointer', display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 2, borderBottom: isActive ? '2px solid #ff6b9d' : '2px solid transparent',
                }}>
                <Text style={{ fontSize: 11, color: isToday ? '#ff6b9d' : '#888' }}>{DAY_NAMES[i]}</Text>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: isToday ? '#ff6b9d' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Text style={{ fontSize: 14, fontWeight: 600, color: isToday ? '#fff' : isActive ? '#ff6b9d' : '#333' }}>
                    {day.getDate()}
                  </Text>
                </div>
                {cnt > 0 && <Badge count={cnt} size="small" color="#ff6b9d" style={{ transform: 'scale(0.8)' }} />}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Grid ── */}
      <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: isMobile ? 'calc(100vh - 300px)' : 580 }}>
        <div style={{ minWidth: isMobile ? 'unset' : 700 }}>

          {/* Day headers (desktop) */}
          {!isMobile && (
            <div style={{ display: 'flex', borderBottom: '1px solid #f0f0f0', position: 'sticky', top: 0, background: '#fff', zIndex: 2 }}>
              <div style={{ width: 52, flexShrink: 0 }} />
              {weekDays.map((day, i) => {
                const isToday = isSameDay(day, today);
                const cnt = slotBookings.filter(b => isSameDay(new Date(b.slotDateTime!), day)).length;
                return (
                  <div key={i} style={{
                    flex: 1, padding: '10px 4px', textAlign: 'center',
                    background: isToday ? '#fff0f6' : '#fafafa',
                    borderLeft: '1px solid #f0f0f0',
                  }}>
                    <Text style={{ fontSize: 12, color: '#888', display: 'block' }}>{DAY_NAMES[i]}</Text>
                    <div style={{
                      width: 32, height: 32, borderRadius: '50%',
                      background: isToday ? '#ff6b9d' : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      margin: '2px auto',
                    }}>
                      <Text style={{ fontSize: 15, fontWeight: 700, color: isToday ? '#fff' : '#333' }}>
                        {day.getDate()}
                      </Text>
                    </div>
                    {cnt > 0 && <Badge count={cnt} size="small" color="#ff6b9d" />}
                  </div>
                );
              })}
            </div>
          )}

          {/* Time rows */}
          {HOURS.map(hour => (
            <div key={hour} style={{ display: 'flex', borderBottom: '1px solid #f9f9f9', minHeight: 56 }}>
              {/* Time label */}
              <div style={{
                width: 52, flexShrink: 0, padding: '4px 8px 0',
                display: 'flex', alignItems: 'flex-start', justifyContent: 'flex-end',
              }}>
                <Text style={{ fontSize: 11, color: '#bbb' }}>{hour}:00</Text>
              </div>

              {/* Day cells */}
              {displayDays.map((day, i) => {
                const slots = getBookingsAt(day, hour);
                const isToday = isSameDay(day, today);
                const isCurrentHour = isToday && new Date().getHours() === hour;

                return (
                  <div key={i} style={{
                    flex: 1, borderLeft: '1px solid #f0f0f0',
                    padding: '3px 4px', minHeight: 56,
                    background: isCurrentHour ? 'rgba(255,107,157,0.04)' : isToday ? 'rgba(255,107,157,0.02)' : 'transparent',
                    position: 'relative',
                  }}>
                    {/* Current time indicator */}
                    {isCurrentHour && (
                      <div style={{
                        position: 'absolute', top: `${(new Date().getMinutes() / 60) * 100}%`,
                        left: 0, right: 0, height: 2, background: '#ff6b9d',
                        zIndex: 1, borderRadius: 1,
                      }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ff6b9d', marginTop: -3, marginLeft: -4 }} />
                      </div>
                    )}

                    {slots.map(b => {
                      const cfg = STATUS_CFG[b.status] || STATUS_CFG.Pending;
                      const startTime = new Date(b.slotDateTime!);
                      const topPct = (startTime.getMinutes() / 60) * 100;
                      const heightPct = Math.max((b.serviceDurationMinutes / 60) * 100, 30);
                      return (
                        <Tooltip
                          key={b.id}
                          title={`${b.clientName} · ${b.serviceName} · ${startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}`}
                        >
                          <div
                            onClick={() => setSelected(b)}
                            style={{
                              position: 'absolute',
                              top: `${topPct}%`,
                              left: 4, right: 4,
                              minHeight: 24,
                              height: `${Math.min(heightPct, 95)}%`,
                              background: cfg.bg,
                              border: `1px solid ${cfg.dot}40`,
                              borderLeft: `3px solid ${cfg.dot}`,
                              borderRadius: 6,
                              padding: '2px 6px',
                              cursor: 'pointer',
                              zIndex: 1,
                              overflow: 'hidden',
                            }}
                          >
                            <Text style={{ fontSize: 11, fontWeight: 600, color: cfg.color, display: 'block', lineHeight: 1.3 }}>
                              {startTime.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                            </Text>
                            {!isMobile && (
                              <Text style={{ fontSize: 10, color: cfg.color, opacity: 0.8, display: 'block', lineHeight: 1.2,
                                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {b.clientName}
                              </Text>
                            )}
                          </div>
                        </Tooltip>
                      );
                    })}
                  </div>
                );
              })}
            </div>
          ))}

        </div>
      </div>

      {/* ── Legend ── */}
      <div style={{ padding: '10px 16px', borderTop: '1px solid #f0f0f0', display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
            <div style={{ width: 10, height: 10, borderRadius: 2, background: v.dot, flexShrink: 0 }} />
            <Text style={{ fontSize: 11, color: '#888' }}>{v.label}</Text>
          </div>
        ))}
      </div>

      {/* ── Booking detail modal ── */}
      <Modal
        open={!!selected}
        onCancel={() => setSelected(null)}
        footer={null}
        title={null}
        width={400}
        styles={{ body: { padding: 0 } }}
      >
        {selected && (() => {
          const cfg = STATUS_CFG[selected.status] || STATUS_CFG.Pending;
          const dt  = selected.slotDateTime ? new Date(selected.slotDateTime) : null;
          return (
            <div>
              {/* Color header */}
              <div style={{ background: cfg.bg, borderBottom: `3px solid ${cfg.dot}`, padding: '20px 24px 16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <Avatar icon={<UserOutlined />} size={48} style={{ background: '#ff6b9d', flexShrink: 0 }} />
                  <div>
                    <Text strong style={{ fontSize: 16, display: 'block' }}>{selected.clientName}</Text>
                    <Tag color={cfg.dot} style={{ marginTop: 4, borderRadius: 10, fontSize: 11 }}>{cfg.label}</Tag>
                  </div>
                </div>
              </div>

              <div style={{ padding: '16px 24px', display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Service */}
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f5f5f5',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <ClockCircleOutlined style={{ color: '#ff6b9d' }} />
                  </div>
                  <div>
                    <Text style={{ fontSize: 12, color: '#888', display: 'block' }}>Услуга</Text>
                    <Text strong style={{ display: 'block' }}>{selected.serviceName}</Text>
                    <Text style={{ fontSize: 13, color: '#ff6b9d', fontWeight: 600 }}>
                      {selected.servicePrice.toLocaleString()} ₽ · {selected.serviceDurationMinutes} мин
                    </Text>
                  </div>
                </div>

                {/* Date/time */}
                {dt && (
                  <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 8, background: '#f5f5f5',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      <CalendarOutlined style={{ color: '#ff6b9d' }} />
                    </div>
                    <div>
                      <Text style={{ fontSize: 12, color: '#888', display: 'block' }}>Дата и время</Text>
                      <Text strong style={{ display: 'block' }}>
                        {dt.toLocaleDateString('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' })}
                      </Text>
                      <Text style={{ fontSize: 13, color: '#666' }}>
                        {dt.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })} –{' '}
                        {new Date(dt.getTime() + selected.serviceDurationMinutes * 60000)
                          .toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                      </Text>
                    </div>
                  </div>
                )}

                {/* Comment */}
                {selected.comment && (
                  <div style={{ background: '#fafafa', borderRadius: 10, padding: '10px 14px' }}>
                    <Text style={{ fontSize: 12, color: '#888', display: 'block', marginBottom: 4 }}>Комментарий клиента</Text>
                    <Text style={{ fontSize: 13 }}>{selected.comment}</Text>
                  </div>
                )}

                {/* Actions */}
                {onStatusChange && (
                  <Space wrap style={{ marginTop: 4 }}>
                    {selected.status === 'Pending' && (<>
                      <Button type="primary" icon={<CheckCircleOutlined />} size="small"
                        style={{ background: '#52c41a', borderColor: '#52c41a', borderRadius: 8 }}
                        onClick={() => { onStatusChange(selected.id, 'Confirmed'); setSelected(null); }}>
                        Принять
                      </Button>
                      <Button danger icon={<CloseCircleOutlined />} size="small" style={{ borderRadius: 8 }}
                        onClick={() => { onStatusChange(selected.id, 'Cancelled'); setSelected(null); }}>
                        Отклонить
                      </Button>
                    </>)}
                    {selected.status === 'Confirmed' && (<>
                      <Button icon={<CheckCircleOutlined />} size="small"
                        style={{ borderRadius: 8, color: '#1677ff', borderColor: '#91caff' }}
                        onClick={() => { onStatusChange(selected.id, 'Completed'); setSelected(null); }}>
                        Услуга оказана
                      </Button>
                      <Button icon={<StopOutlined />} size="small"
                        style={{ borderRadius: 8, color: '#722ed1', borderColor: '#d3adf7' }}
                        onClick={() => { onStatusChange(selected.id, 'NoShow'); setSelected(null); }}>
                        Неявка
                      </Button>
                      <Button danger icon={<CloseCircleOutlined />} size="small" style={{ borderRadius: 8 }}
                        onClick={() => { onStatusChange(selected.id, 'Cancelled'); setSelected(null); }}>
                        Отменить
                      </Button>
                    </>)}
                  </Space>
                )}
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}
