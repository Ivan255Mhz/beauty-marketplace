import { useState } from 'react';
import { Typography } from 'antd';

const { Text } = Typography;

const LABELS: Record<number, { text: string; color: string }> = {
  1: { text: 'Ужасно',   color: '#ff4d4f' },
  2: { text: 'Плохо',    color: '#ff7a45' },
  3: { text: 'Нормально',color: '#faad14' },
  4: { text: 'Хорошо',   color: '#52c41a' },
  5: { text: 'Отлично',  color: '#13c2c2' },
};

interface Props {
  value?: number;
  onChange?: (v: number) => void;
}

export default function RatingPicker({ value = 0, onChange }: Props) {
  const [hovered, setHovered] = useState(0);
  const active = hovered || value;

  return (
    <div>
      <div style={{ display: 'flex', gap: 6, marginBottom: 8 }}>
        {[1, 2, 3, 4, 5].map(star => (
          <div
            key={star}
            onClick={() => onChange?.(star)}
            onMouseEnter={() => setHovered(star)}
            onMouseLeave={() => setHovered(0)}
            style={{
              width: 44, height: 44,
              borderRadius: 10,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer',
              fontSize: 28,
              transition: 'transform 0.15s, background 0.15s',
              transform: active >= star ? 'scale(1.15)' : 'scale(1)',
              background: active >= star ? LABELS[star]?.color + '18' : '#f5f5f5',
              border: active >= star ? `2px solid ${LABELS[star]?.color}44` : '2px solid transparent',
              userSelect: 'none',
            }}
          >
            {active >= star ? '★' : '☆'}
          </div>
        ))}
      </div>
      {active > 0 && (
        <Text style={{
          fontSize: 14, fontWeight: 600,
          color: LABELS[active]?.color,
          display: 'block', marginTop: 2,
          transition: 'color 0.2s',
        }}>
          {LABELS[active]?.text}
        </Text>
      )}
    </div>
  );
}
