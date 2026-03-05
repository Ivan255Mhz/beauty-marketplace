import { useEffect, useState, useCallback } from 'react';
import {
  Row, Col, Card, Avatar, Tag, Typography, Select, Spin,
  Empty, Rate, Button, InputNumber, Input, Pagination,
  Drawer, Badge, Divider, Space, Tooltip,
} from 'antd';
import {
  UserOutlined, EnvironmentOutlined, FilterOutlined,
  SearchOutlined, CloseOutlined, StarFilled,
} from '@ant-design/icons';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useIsMobile } from '../hooks/useIsMobile';
import { mastersApi } from '../api/endpoints';
import type { MasterListItemDto } from '../types';

const { Title, Text, Paragraph } = Typography;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
const PAGE_SIZE = 12;

const CATEGORIES = [
  { label: 'Все категории', value: '' },
  { label: 'Стрижки', value: 'Haircut' },
  { label: 'Окрашивание', value: 'Coloring' },
  { label: 'Маникюр', value: 'Manicure' },
  { label: 'Педикюр', value: 'Pedicure' },
  { label: 'Макияж', value: 'Makeup' },
  { label: 'Брови', value: 'Eyebrows' },
  { label: 'Ресницы', value: 'Eyelashes' },
  { label: 'Массаж', value: 'Massage' },
];

const CATEGORY_LABELS: Record<string, string> = {
  Haircut: 'Стрижки', Coloring: 'Окрашивание',
  Manicure: 'Маникюр', Pedicure: 'Педикюр',
  Makeup: 'Макияж', Eyebrows: 'Брови',
  Eyelashes: 'Ресницы', Massage: 'Массаж', Other: 'Прочее',
};

interface Filters {
  category: string;
  priceMin?: number;
  priceMax?: number;
  district: string;
}

const emptyFilters: Filters = { category: '', district: '' };

function activeFilterCount(f: Filters) {
  let n = 0;
  if (f.category) n++;
  if (f.priceMin || f.priceMax) n++;
  if (f.district) n++;
  return n;
}

export default function MastersPage() {
  const isMobile = useIsMobile();
  const [masters, setMasters] = useState<MasterListItemDto[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [draft, setDraft] = useState<Filters>(emptyFilters);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Init filters from URL
  useEffect(() => {
    const f: Filters = {
      category: searchParams.get('category') || '',
      district: searchParams.get('district') || '',
      priceMin: searchParams.get('priceMin') ? Number(searchParams.get('priceMin')) : undefined,
      priceMax: searchParams.get('priceMax') ? Number(searchParams.get('priceMax')) : undefined,
    };
    setFilters(f);
    setDraft(f);
    setPage(Number(searchParams.get('page') || '1'));
  }, []);

  const fetchMasters = useCallback(async (f: Filters, p: number) => {
    setLoading(true);
    try {
      const result = await mastersApi.getAll({
        category: f.category || undefined,
        priceMin: f.priceMin,
        priceMax: f.priceMax,
        district: f.district || undefined,
        page: p,
        pageSize: PAGE_SIZE,
      });
      setMasters(result.items);
      setTotal(result.total);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMasters(filters, page);
  }, [filters, page]);

  const applyFilters = () => {
    setFilters(draft);
    setPage(1);
    setDrawerOpen(false);
    // Sync to URL
    const params: Record<string, string> = {};
    if (draft.category) params.category = draft.category;
    if (draft.district) params.district = draft.district;
    if (draft.priceMin) params.priceMin = String(draft.priceMin);
    if (draft.priceMax) params.priceMax = String(draft.priceMax);
    params.page = '1';
    setSearchParams(params);
  };

  const resetFilters = () => {
    setDraft(emptyFilters);
    setFilters(emptyFilters);
    setPage(1);
    setSearchParams({});
    setDrawerOpen(false);
  };

  const handlePageChange = (p: number) => {
    setPage(p);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filterCount = activeFilterCount(filters);

  return (
    <div style={{ background: '#f8f8fb', minHeight: 'calc(100vh - 64px)' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto', padding: '32px 24px' }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <Title level={3} style={{ margin: 0 }}>
              Мастера
              {total > 0 && <Text type="secondary" style={{ fontSize: 16, fontWeight: 400, marginLeft: 10 }}>{total} найдено</Text>}
            </Title>
          </div>

          {/* Controls */}
          <Space wrap>
            <Select
              value={filters.category || ''}
              onChange={val => {
                const f = { ...filters, category: val };
                setFilters(f);
                setDraft(f);
                setPage(1);
              }}
              options={CATEGORIES.map(c => ({ label: c.label, value: c.value }))}
              style={{ width: 200 }}
              size="large"
            />
            <Badge count={filterCount} color="#ff6b9d">
              <Button
                size="large"
                icon={<FilterOutlined />}
                onClick={() => { setDraft(filters); setDrawerOpen(true); }}
                style={{ borderRadius: 10, ...(filterCount > 0 ? { borderColor: '#ff6b9d', color: '#ff6b9d' } : {}) }}
              >
                Фильтры
              </Button>
            </Badge>
            {filterCount > 0 && (
              <Button size="large" icon={<CloseOutlined />} onClick={resetFilters} style={{ borderRadius: 10 }}>
                Сбросить
              </Button>
            )}
          </Space>
        </div>

        {/* Active filter tags */}
        {filterCount > 0 && (
          <div style={{ marginBottom: 16, display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {filters.category && (
              <Tag
                closable color="pink"
                onClose={() => { const f = { ...filters, category: '' }; setFilters(f); setDraft(f); }}
              >
                {CATEGORY_LABELS[filters.category] || filters.category}
              </Tag>
            )}
            {(filters.priceMin || filters.priceMax) && (
              <Tag
                closable color="purple"
                onClose={() => { const f = { ...filters, priceMin: undefined, priceMax: undefined }; setFilters(f); setDraft(f); }}
              >
                {filters.priceMin ? `от ${filters.priceMin.toLocaleString()} ₽` : ''}
                {filters.priceMax ? ` до ${filters.priceMax.toLocaleString()} ₽` : ''}
              </Tag>
            )}
            {filters.district && (
              <Tag
                closable color="blue"
                onClose={() => { const f = { ...filters, district: '' }; setFilters(f); setDraft(f); }}
              >
                 {filters.district}
              </Tag>
            )}
          </div>
        )}

        {/* Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: 100 }}><Spin size="large" /></div>
        ) : masters.length === 0 ? (
          <Empty
            description="Мастеров по вашим фильтрам не найдено"
            style={{ padding: 80 }}
          >
            <Button onClick={resetFilters} type="primary"
              style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 10 }}>
              Сбросить фильтры
            </Button>
          </Empty>
        ) : (
          <>
            <Row gutter={[20, 20]}>
              {masters.map(master => (
                <Col xs={24} sm={12} lg={8} key={master.profileId}>
                  <MasterCard master={master} onClick={() => navigate(`/masters/${master.profileId}`)} />
                </Col>
              ))}
            </Row>

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div style={{ textAlign: 'center', marginTop: 40 }}>
                <Pagination
                  current={page}
                  total={total}
                  pageSize={PAGE_SIZE}
                  onChange={handlePageChange}
                  showSizeChanger={false}
                  showTotal={(t, [s, e]) => `${s}–${e} из ${t} мастеров`}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* Filter Drawer */}
      <Drawer
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FilterOutlined style={{ color: '#ff6b9d' }} />
            <span>Фильтры</span>
          </div>
        }
        placement="right"
        open={drawerOpen}
        onClose={() => setDrawerOpen(false)}
        width={340}
        extra={
          <Button type="link" onClick={resetFilters} style={{ color: '#999' }}>
            Сбросить всё
          </Button>
        }
        footer={
          <Button
            type="primary" block size="large"
            style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 10 }}
            onClick={applyFilters}
          >
            Применить
          </Button>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>

          {/* Category */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 10 }}>Категория</Text>
            <Select
              value={draft.category || ''}
              onChange={val => setDraft(d => ({ ...d, category: val }))}
              options={CATEGORIES.map(c => ({ label: c.label, value: c.value }))}
              style={{ width: '100%' }}
              size="large"
            />
          </div>

          <Divider style={{ margin: 0 }} />

          {/* Price */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 10 }}>Цена (₽)</Text>
            <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
              <InputNumber
                placeholder="от"
                min={0}
                value={draft.priceMin}
                onChange={val => setDraft(d => ({ ...d, priceMin: val ?? undefined }))}
                style={{ flex: 1 }}
                size="large"
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
              <Text type="secondary">—</Text>
              <InputNumber
                placeholder="до"
                min={0}
                value={draft.priceMax}
                onChange={val => setDraft(d => ({ ...d, priceMax: val ?? undefined }))}
                style={{ flex: 1 }}
                size="large"
                formatter={v => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, ' ')}
              />
            </div>
            {/* Quick presets */}
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
              {[
                { label: 'до 1 000 ₽', max: 1000 },
                { label: '1 000–3 000 ₽', min: 1000, max: 3000 },
                { label: 'от 3 000 ₽', min: 3000 },
              ].map(p => (
                <Button
                  key={p.label} size="small"
                  type={draft.priceMin === p.min && draft.priceMax === p.max ? 'primary' : 'default'}
                  onClick={() => setDraft(d => ({ ...d, priceMin: p.min, priceMax: p.max }))}
                  style={{
                    borderRadius: 20, fontSize: 12,
                    ...(draft.priceMin === p.min && draft.priceMax === p.max
                      ? { background: '#ff6b9d', borderColor: '#ff6b9d' } : {}),
                  }}
                >
                  {p.label}
                </Button>
              ))}
            </div>
          </div>

          <Divider style={{ margin: 0 }} />

          {/* District */}
          <div>
            <Text strong style={{ display: 'block', marginBottom: 10 }}>Район / метро</Text>
            <Input
              prefix={<EnvironmentOutlined style={{ color: '#ccc' }} />}
              placeholder="Например: Арбат, Центр, Митино"
              value={draft.district}
              onChange={e => setDraft(d => ({ ...d, district: e.target.value }))}
              size="large"
              style={{ borderRadius: 10 }}
              allowClear
            />
          </div>
        </div>
      </Drawer>
    </div>
  );
}

//  Master Card 
function MasterCard({ master, onClick }: { master: MasterListItemDto; onClick: () => void }) {
  return (
    <Card
      hoverable
      style={{ borderRadius: 16, overflow: 'hidden', border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.06)', height: '100%' }}
      bodyStyle={{ padding: 0 }}
      onClick={onClick}
    >
      {/* Photo */}
      <div style={{ position: 'relative' }}>
        {master.avatarUrl ? (
          <img
            alt={master.name}
            src={`${API_BASE}${master.avatarUrl}`}
            style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
          />
        ) : (
          <div style={{
            height: 200, background: 'linear-gradient(135deg, #ffb3d1 0%, #ffcba4 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <UserOutlined style={{ fontSize: 64, color: '#fff' }} />
          </div>
        )}
        {/* Price badge */}
        {master.priceFrom && (
          <div style={{
            position: 'absolute', bottom: 12, right: 12,
            background: 'rgba(255,255,255,0.95)', borderRadius: 20,
            padding: '4px 12px', fontSize: 13, fontWeight: 700, color: '#ff6b9d',
            boxShadow: '0 2px 8px rgba(0,0,0,0.12)',
          }}>
            от {master.priceFrom.toLocaleString()} ₽
          </div>
        )}
      </div>

      {/* Info */}
      <div style={{ padding: '16px 18px 18px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
          <Text strong style={{ fontSize: 16 }}>{master.name}</Text>
          {master.averageRating > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexShrink: 0 }}>
              <StarFilled style={{ color: '#faad14', fontSize: 13 }} />
              <Text style={{ fontSize: 13, fontWeight: 600 }}>{master.averageRating}</Text>
              <Text type="secondary" style={{ fontSize: 12 }}>({master.reviewCount})</Text>
            </div>
          )}
        </div>

        {master.address && (
          <div style={{ fontSize: 13, color: '#888', marginBottom: 8 }}>
            <EnvironmentOutlined style={{ marginRight: 4 }} />
            {master.address}
          </div>
        )}

        {master.bio && (
          <Paragraph
            ellipsis={{ rows: 2 }}
            style={{ fontSize: 13, color: '#666', marginBottom: 10, marginTop: 0 }}
          >
            {master.bio}
          </Paragraph>
        )}

        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap', marginBottom: 14 }}>
          {master.categories.slice(0, 3).map(cat => (
            <Tag key={cat} color="pink" style={{ fontSize: 11, margin: 0 }}>
              {CATEGORY_LABELS[cat] || cat}
            </Tag>
          ))}
          {master.categories.length > 3 && (
            <Tag style={{ fontSize: 11, margin: 0 }}>+{master.categories.length - 3}</Tag>
          )}
        </div>

        <Button
          type="primary" block
          style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 10 }}
        >
          Смотреть профиль
        </Button>
      </div>
    </Card>
  );
}
