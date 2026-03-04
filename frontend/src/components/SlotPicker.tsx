import { useState, useEffect } from 'react';
import { Button, Spin, Typography, Empty } from 'antd';
import { LeftOutlined, RightOutlined, CalendarOutlined } from '@ant-design/icons';
import { scheduleApi } from '../api/endpoints';
import type { TimeSlotDto } from '../types';

const { Text } = Typography;

const DAY_NAMES = ['Вс', 'Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб'];
const MONTH_NAMES = [
  'январь', 'февраль', 'март', 'апрель', 'май', 'июнь',
  'июль', 'август', 'сентябрь', 'октябрь', 'ноябрь', 'декабрь',
];

function toLocalDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Props {
  masterId: string;
  durationMinutes: number;
  selectedSlot: string | null;         // ISO string
  onSelect: (slot: string) => void;    // ISO string
}

export default function SlotPicker({ masterId, durationMinutes, selectedSlot, onSelect }: Props) {
  // Build 14-day window starting today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const days: Date[] = Array.from({ length: 14 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    return d;
  });

  const [weekOffset, setWeekOffset] = useState(0);
  const [selectedDate, setSelectedDate] = useState<Date>(today);
  const [slots, setSlots] = useState<TimeSlotDto[]>([]);
  const [loading, setLoading] = useState(false);

  const visibleDays = days.slice(weekOffset * 7, weekOffset * 7 + 7);
  const canGoBack = weekOffset > 0;
  const canGoNext = weekOffset < 1; // only 2 weeks

  useEffect(() => {
    if (!masterId) return;
    setLoading(true);
    setSlots([]);
    scheduleApi.getSlots(masterId, toLocalDateString(selectedDate), durationMinutes)
      .then(setSlots)
      .catch(() => setSlots([]))
      .finally(() => setLoading(false));
  }, [masterId, selectedDate, durationMinutes]);

  return (
    <div>
      {/* Date strip */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 16 }}>
        <Button
          icon={<LeftOutlined />} size="small" type="text"
          disabled={!canGoBack}
          onClick={() => setWeekOffset(w => w - 1)}
          style={{ flexShrink: 0 }}
        />
        <div style={{ display: 'flex', gap: 4, flex: 1, overflowX: 'auto', paddingBottom: 2 }}>
          {visibleDays.map(day => {
            const isSelected = toLocalDateString(day) === toLocalDateString(selectedDate);
            const isToday = toLocalDateString(day) === toLocalDateString(today);
            return (
              <button
                key={day.toISOString()}
                onClick={() => setSelectedDate(day)}
                style={{
                  flex: '0 0 auto',
                  width: 52, padding: '8px 4px',
                  borderRadius: 12,
                  border: 'none',
                  cursor: 'pointer',
                  textAlign: 'center',
                  background: isSelected ? '#ff6b9d' : isToday ? '#fff0f6' : '#f5f5f5',
                  color: isSelected ? '#fff' : '#333',
                  transition: 'all 0.15s',
                }}
              >
                <div style={{ fontSize: 11, opacity: isSelected ? 0.85 : 0.6, marginBottom: 2 }}>
                  {DAY_NAMES[day.getDay()]}
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, lineHeight: 1 }}>
                  {day.getDate()}
                </div>
                {isToday && !isSelected && (
                  <div style={{ width: 4, height: 4, borderRadius: '50%', background: '#ff6b9d', margin: '3px auto 0' }} />
                )}
              </button>
            );
          })}
        </div>
        <Button
          icon={<RightOutlined />} size="small" type="text"
          disabled={!canGoNext}
          onClick={() => setWeekOffset(w => w + 1)}
          style={{ flexShrink: 0 }}
        />
      </div>

      {/* Month label */}
      <div style={{ fontSize: 13, color: '#888', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <CalendarOutlined />
        {selectedDate.getDate()} {MONTH_NAMES[selectedDate.getMonth()]} {selectedDate.getFullYear()}
      </div>

      {/* Slots grid */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
      ) : slots.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={<Text type="secondary" style={{ fontSize: 13 }}>Нет доступных слотов на этот день</Text>}
          style={{ margin: '12px 0' }}
        />
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
          {slots.map(slot => {
            const isSelected = slot.dateTime === selectedSlot;
            return (
              <button
                key={slot.dateTime}
                disabled={!slot.available}
                onClick={() => slot.available && onSelect(slot.dateTime)}
                style={{
                  padding: '10px 0',
                  borderRadius: 10,
                  border: isSelected ? '2px solid #ff6b9d' : '1px solid #f0f0f0',
                  background: isSelected ? '#fff0f6' : slot.available ? '#fff' : '#fafafa',
                  color: isSelected ? '#ff6b9d' : slot.available ? '#333' : '#ccc',
                  fontWeight: isSelected ? 700 : 500,
                  fontSize: 15,
                  cursor: slot.available ? 'pointer' : 'not-allowed',
                  transition: 'all 0.15s',
                  textDecoration: !slot.available ? 'line-through' : 'none',
                }}
              >
                {slot.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
