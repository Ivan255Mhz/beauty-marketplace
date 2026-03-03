import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, Typography, Input, Button, Spin, Badge, Modal, List } from 'antd';
import { SendOutlined, UserOutlined, ArrowLeftOutlined, MessageOutlined, PlusOutlined, SearchOutlined } from '@ant-design/icons';
import { messagesApi, mastersApi } from '../api/endpoints';
import { useAuthStore } from '../context/authStore';
import type { ConversationDto, MessageDto, MasterListItemDto } from '../types';

const { Text } = Typography;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function timeLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return 'вчера';
  if (diffDays < 7) return d.toLocaleDateString('ru-RU', { weekday: 'short' });
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function groupByDate(messages: MessageDto[]) {
  const groups: { date: string; items: MessageDto[] }[] = [];
  messages.forEach(m => {
    const d = new Date(m.createdAt);
    const label = d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const last = groups[groups.length - 1];
    if (!last || last.date !== label) groups.push({ date: label, items: [m] });
    else last.items.push(m);
  });
  return groups;
}

export default function ChatPage() {
  const { partnerId } = useParams<{ partnerId?: string }>();
  const navigate = useNavigate();
  const { userId, isAuthenticated } = useAuthStore() as any;

  const [conversations, setConversations] = useState<ConversationDto[]>([]);
  const [messages, setMessages] = useState<MessageDto[]>([]);
  const [activePartner, setActivePartner] = useState<ConversationDto | null>(null);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // New dialog modal
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [masters, setMasters] = useState<MasterListItemDto[]>([]);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [search, setSearch] = useState('');

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) navigate('/login');
  }, [isAuthenticated]);

  const loadConversations = useCallback(async () => {
    try {
      const list = await messagesApi.getConversations();
      setConversations(list);
      if (partnerId) {
        const found = list.find(c => c.partnerId === partnerId);
        if (found) setActivePartner(found);
      }
    } catch {}
  }, [partnerId]);

  useEffect(() => {
    loadConversations().finally(() => setLoadingConvs(false));
  }, [loadConversations]);

  const loadMessages = useCallback(async (pid: string) => {
    try {
      const msgs = await messagesApi.getConversation(pid);
      setMessages(msgs);
      loadConversations();
    } catch {}
  }, [loadConversations]);

  useEffect(() => {
    if (!partnerId) { setMessages([]); setActivePartner(null); return; }
    setLoadingMsgs(true);
    loadMessages(partnerId).finally(() => setLoadingMsgs(false));
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => loadMessages(partnerId), 3000);
    return () => { if (pollingRef.current) clearInterval(pollingRef.current); };
  }, [partnerId, loadMessages]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openNewDialog = async () => {
    setNewDialogOpen(true);
    setSearch('');
    setMastersLoading(true);
    try {
      const res = await mastersApi.getAll({ pageSize: 100 });
      setMasters(res.items);
    } catch {} finally {
      setMastersLoading(false);
    }
  };

  const startDialog = (master: MasterListItemDto) => {
    setNewDialogOpen(false);
    navigate(`/chat/${master.userId}`);
  };

  const filteredMasters = masters.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const handleSend = async () => {
    if (!text.trim() || !partnerId || sending) return;
    const msgText = text.trim();
    setText('');
    setSending(true);
    try {
      const sent = await messagesApi.send(partnerId, msgText);
      setMessages(prev => [...prev, sent]);
      loadConversations();
    } catch {} finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  const totalUnread = conversations.reduce((s, c) => s + c.unreadCount, 0);

  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', background: '#f5f5f5' }}>

      {/* ── Left panel ─────────────────────────────────────────────────── */}
      <div style={{
        width: 320, flexShrink: 0, background: '#fff',
        borderRight: '1px solid #f0f0f0',
        display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          padding: '14px 16px',
          borderBottom: '1px solid #f0f0f0',
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <MessageOutlined style={{ color: '#ff6b9d', fontSize: 18 }} />
          <Text strong style={{ fontSize: 15, flex: 1 }}>Сообщения</Text>
          {totalUnread > 0 && <Badge count={totalUnread} color="#ff6b9d" style={{ marginRight: 4 }} />}
          <Button
            type="primary" shape="circle" size="small"
            icon={<PlusOutlined />}
            onClick={openNewDialog}
            title="Новый диалог"
            style={{ background: '#ff6b9d', borderColor: '#ff6b9d', flexShrink: 0 }}
          />
        </div>

        {/* Conversations */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingConvs ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <MessageOutlined style={{ fontSize: 40, color: '#e0e0e0', display: 'block', marginBottom: 12 }} />
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>
                Диалогов пока нет
              </Text>
              <Button
                type="primary" size="small" icon={<PlusOutlined />}
                onClick={openNewDialog}
                style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 20 }}
              >
                Написать мастеру
              </Button>
            </div>
          ) : (
            conversations.map(conv => {
              const isActive = conv.partnerId === partnerId;
              return (
                <div
                  key={conv.partnerId}
                  onClick={() => { setActivePartner(conv); navigate(`/chat/${conv.partnerId}`); }}
                  style={{
                    padding: '12px 16px', cursor: 'pointer',
                    background: isActive ? '#fff0f5' : '#fff',
                    borderLeft: isActive ? '3px solid #ff6b9d' : '3px solid transparent',
                    display: 'flex', gap: 12, alignItems: 'center',
                  }}
                  onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#fafafa'; }}
                  onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = '#fff'; }}
                >
                  <div style={{ position: 'relative', flexShrink: 0 }}>
                    <Avatar
                      src={conv.partnerAvatarUrl ? `${API_BASE}${conv.partnerAvatarUrl}` : undefined}
                      icon={<UserOutlined />} size={44}
                      style={{ backgroundColor: '#ff6b9d' }}
                    />
                    {conv.unreadCount > 0 && (
                      <Badge count={conv.unreadCount} color="#ff6b9d"
                        style={{ position: 'absolute', top: -4, right: -4 }} />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                      <Text strong style={{ fontSize: 14 }}>{conv.partnerName}</Text>
                      <Text type="secondary" style={{ fontSize: 11, flexShrink: 0, marginLeft: 4 }}>
                        {timeLabel(conv.lastMessageAt)}
                      </Text>
                    </div>
                    <Text type="secondary" style={{
                      fontSize: 12, display: 'block',
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                      fontWeight: conv.unreadCount > 0 ? 600 : 400,
                    }}>
                      {conv.lastMessageIsOwn ? 'Вы: ' : ''}{conv.lastMessage}
                    </Text>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right panel ────────────────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!partnerId ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <MessageOutlined style={{ fontSize: 64, color: '#e0e0e0', marginBottom: 16 }} />
            <Text type="secondary" style={{ fontSize: 16, marginBottom: 20 }}>
              Выберите диалог или начните новый
            </Text>
            <Button
              type="primary" icon={<PlusOutlined />} onClick={openNewDialog}
              style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 20, height: 40, paddingInline: 24 }}
            >
              Написать мастеру
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{
              padding: '12px 20px', background: '#fff',
              borderBottom: '1px solid #f0f0f0',
              display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0,
            }}>
              <Button type="text" size="small" icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/chat')} style={{ color: '#888' }} />
              <Avatar
                src={activePartner?.partnerAvatarUrl ? `${API_BASE}${activePartner.partnerAvatarUrl}` : undefined}
                icon={<UserOutlined />} size={38}
                style={{ backgroundColor: '#ff6b9d', flexShrink: 0 }}
              />
              <Text strong style={{ fontSize: 15 }}>{activePartner?.partnerName || '...'}</Text>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {loadingMsgs ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <Text type="secondary">Напишите первое сообщение</Text>
                </div>
              ) : (
                groupByDate(messages).map(group => (
                  <div key={group.date}>
                    <div style={{ textAlign: 'center', margin: '16px 0 12px' }}>
                      <Text type="secondary" style={{
                        fontSize: 11, background: '#efefef',
                        padding: '2px 10px', borderRadius: 10,
                      }}>{group.date}</Text>
                    </div>
                    {group.items.map((msg, i) => {
                      const isOwn = msg.senderId === userId;
                      const showAvatar = !isOwn && (i === 0 || group.items[i - 1].senderId !== msg.senderId);
                      return (
                        <div key={msg.id} style={{
                          display: 'flex',
                          justifyContent: isOwn ? 'flex-end' : 'flex-start',
                          alignItems: 'flex-end', gap: 8, marginBottom: 4,
                        }}>
                          {!isOwn && (
                            <div style={{ width: 30, flexShrink: 0 }}>
                              {showAvatar && (
                                <Avatar
                                  src={activePartner?.partnerAvatarUrl ? `${API_BASE}${activePartner.partnerAvatarUrl}` : undefined}
                                  icon={<UserOutlined />} size={28}
                                  style={{ backgroundColor: '#ff6b9d' }}
                                />
                              )}
                            </div>
                          )}
                          <div style={{ maxWidth: '68%' }}>
                            <div style={{
                              padding: '8px 14px',
                              borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                              background: isOwn ? 'linear-gradient(135deg, #ff6b9d, #c44569)' : '#fff',
                              color: isOwn ? '#fff' : '#333',
                              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                              fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word',
                            }}>
                              {msg.text}
                            </div>
                            <Text type="secondary" style={{
                              fontSize: 10, display: 'block',
                              textAlign: isOwn ? 'right' : 'left',
                              marginTop: 2,
                              paddingLeft: isOwn ? 0 : 4, paddingRight: isOwn ? 4 : 0,
                            }}>
                              {new Date(msg.createdAt).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                              {isOwn && (
                                <span style={{ marginLeft: 4, color: msg.isRead ? '#52c41a' : '#aaa' }}>
                                  {msg.isRead ? '✓✓' : '✓'}
                                </span>
                              )}
                            </Text>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{
              padding: '12px 16px', background: '#fff',
              borderTop: '1px solid #f0f0f0',
              display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0,
            }}>
              <Input.TextArea
                ref={inputRef}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Написать сообщение... (Enter — отправить, Shift+Enter — новая строка)"
                autoSize={{ minRows: 1, maxRows: 5 }}
                style={{ borderRadius: 20, resize: 'none', flex: 1 }}
                maxLength={2000}
              />
              <Button
                type="primary" shape="circle"
                icon={<SendOutlined />}
                onClick={handleSend} loading={sending}
                disabled={!text.trim()}
                style={{
                  background: text.trim() ? '#ff6b9d' : undefined,
                  borderColor: text.trim() ? '#ff6b9d' : undefined,
                  width: 40, height: 40, flexShrink: 0,
                }}
              />
            </div>
          </>
        )}
      </div>

      {/* ── New dialog modal ────────────────────────────────────────────── */}
      <Modal
        open={newDialogOpen}
        onCancel={() => setNewDialogOpen(false)}
        footer={null}
        title="Выберите мастера"
        width={440}
        styles={{ body: { padding: '12px 0 0' } }}
      >
        <Input
          prefix={<SearchOutlined style={{ color: '#ccc' }} />}
          placeholder="Поиск по имени..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ margin: '0 24px 12px', width: 'calc(100% - 48px)' }}
          allowClear
        />
        {mastersLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
        ) : (
          <List
            style={{ maxHeight: 400, overflowY: 'auto' }}
            dataSource={filteredMasters}
            locale={{ emptyText: 'Мастера не найдены' }}
            renderItem={master => (
              <List.Item
                style={{ padding: '10px 24px', cursor: 'pointer' }}
                onClick={() => startDialog(master)}
                onMouseEnter={e => { e.currentTarget.style.background = '#fff0f5'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}
              >
                <List.Item.Meta
                  avatar={
                    <Avatar
                      src={master.avatarUrl ? `${API_BASE}${master.avatarUrl}` : undefined}
                      icon={<UserOutlined />}
                      style={{ backgroundColor: '#ff6b9d' }}
                    />
                  }
                  title={<Text strong>{master.name}</Text>}
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {master.categories?.join(', ') || master.address || ''}
                    </Text>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Modal>
    </div>
  );
}
