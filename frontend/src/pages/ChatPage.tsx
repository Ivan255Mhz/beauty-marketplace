import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Avatar, Typography, Input, Button, Spin, Badge, Modal, List } from 'antd';
import {
  SendOutlined, UserOutlined, ArrowLeftOutlined,
  MessageOutlined, PlusOutlined, SearchOutlined,
} from '@ant-design/icons';
import * as signalR from '@microsoft/signalr';
import { messagesApi, mastersApi } from '../api/endpoints';
import { useAuthStore } from '../context/authStore';
import type { ConversationDto, MessageDto, MasterListItemDto } from '../types';

const { Text } = Typography;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function timeLabel(dateStr: string): string {
  const d    = new Date(dateStr);
  const now  = new Date();
  const diff = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (diff === 0) return d.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  if (diff === 1) return 'вчера';
  if (diff < 7)   return d.toLocaleDateString('ru-RU', { weekday: 'short' });
  return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' });
}

function groupByDate(messages: MessageDto[]) {
  const groups: { date: string; items: MessageDto[] }[] = [];
  messages.forEach(m => {
    const label = new Date(m.createdAt).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
    const last  = groups[groups.length - 1];
    if (!last || last.date !== label) groups.push({ date: label, items: [m] });
    else last.items.push(m);
  });
  return groups;
}

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '2px 6px' }}>
      {[0, 1, 2].map(i => (
        <span key={i} style={{
          width: 6, height: 6, borderRadius: '50%', background: '#bbb',
          display: 'inline-block',
          animation: 'tbounce 1.2s infinite',
          animationDelay: `${i * 0.2}s`,
        }} />
      ))}
      <style>{`
        @keyframes tbounce {
          0%,80%,100% { transform:translateY(0); opacity:.4; }
          40% { transform:translateY(-5px); opacity:1; }
        }
      `}</style>
    </div>
  );
}

// Normalize Guid for comparison (lowercase)
const norm = (s: string) => String(s).toLowerCase();

export default function ChatPage() {
  const { partnerId } = useParams<{ partnerId?: string }>();
  const navigate      = useNavigate();
  const { userId, isAuthenticated } = useAuthStore() as any;

  const [conversations,  setConversations]  = useState<ConversationDto[]>([]);
  const [messages,       setMessages]       = useState<MessageDto[]>([]);
  const [activePartner,  setActivePartner]  = useState<ConversationDto | null>(null);
  const [text,           setText]           = useState('');
  const [sending,        setSending]        = useState(false);
  const [loadingConvs,   setLoadingConvs]   = useState(true);
  const [loadingMsgs,    setLoadingMsgs]    = useState(false);
  const [connected,      setConnected]      = useState(false);
  const [onlineUsers,    setOnlineUsers]    = useState<Set<string>>(new Set());
  const [partnerTyping,  setPartnerTyping]  = useState(false);

  const [newDialogOpen,  setNewDialogOpen]  = useState(false);
  const [masters,        setMasters]        = useState<MasterListItemDto[]>([]);
  const [mastersLoading, setMastersLoading] = useState(false);
  const [search,         setSearch]         = useState('');

  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const hubRef       = useRef<signalR.HubConnection | null>(null);
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pidRef       = useRef<string | undefined>(partnerId);
  useEffect(() => { pidRef.current = partnerId; }, [partnerId]);

  useEffect(() => { if (!isAuthenticated) navigate('/login'); }, [isAuthenticated]);

  // ── SignalR: запускаем когда токен точно есть в localStorage ─────────────
  useEffect(() => {
    // zustand hydrates asynchronously — read directly from localStorage
    const token = localStorage.getItem('token');
    if (!token) return;

    const hubUrl = window.location.origin + '/hubs/chat';

    const hub = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem('token') ?? '',
        // Allow all transports; nginx will upgrade to WS
        transport: signalR.HttpTransportType.WebSockets |
                   signalR.HttpTransportType.ServerSentEvents |
                   signalR.HttpTransportType.LongPolling,
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.Warning)
      .build();

    hubRef.current = hub;

    // ── Events ───────────────────────────────────────────────────────────────

    hub.on('ReceiveMessage', (msg: MessageDto) => {
      const pid = pidRef.current;
      // Compare case-insensitively
      const involvedInChat = pid && (
        norm(msg.senderId) === norm(pid) ||
        norm(msg.receiverId) === norm(pid)
      );
      if (involvedInChat) {
        setMessages(prev =>
          prev.some(m => norm(m.id) === norm(msg.id)) ? prev : [...prev, msg]
        );
        // Auto-mark read if partner sent it
        if (norm(msg.senderId) === norm(pid!)) {
          hub.invoke('MarkRead', pid).catch(() => {});
        }
      }
      // Always refresh conversation list (unread count + last message)
      messagesApi.getConversations().then(setConversations).catch(() => {});
    });

    hub.on('MessagesRead', (readerId: string) => {
      setMessages(prev =>
        prev.map(m => norm(m.receiverId) === norm(readerId) ? { ...m, isRead: true } : m)
      );
    });

    hub.on('OnlineUsers', (ids: string[]) => {
      setOnlineUsers(new Set(ids.map(norm)));
    });
    hub.on('UserOnline', (uid: string) => {
      setOnlineUsers(prev => new Set([...prev, norm(uid)]));
    });
    hub.on('UserOffline', (uid: string) => {
      setOnlineUsers(prev => { const s = new Set(prev); s.delete(norm(uid)); return s; });
    });

    hub.on('UserTyping', (uid: string) => {
      if (pidRef.current && norm(uid) === norm(pidRef.current)) setPartnerTyping(true);
    });
    hub.on('UserStoppedTyping', (uid: string) => {
      if (pidRef.current && norm(uid) === norm(pidRef.current)) setPartnerTyping(false);
    });

    hub.onreconnecting(() => setConnected(false));
    hub.onreconnected(() => {
      setConnected(true);
      // Re-fetch online list after reconnect
      messagesApi.getConversations().then(setConversations).catch(() => {});
    });
    hub.onclose(() => setConnected(false));

    // ── Start ────────────────────────────────────────────────────────────────
    hub.start()
      .then(() => {
        console.log('[SignalR] Connected:', hubUrl);
        setConnected(true);
      })
      .catch(err => {
        console.error('[SignalR] Failed to connect:', err);
      });

    return () => {
      hub.stop().catch(() => {});
      hubRef.current = null;
      setConnected(false);
    };
  }, [isAuthenticated]); // Re-run if auth changes (login/logout)

  // ── Conversations ─────────────────────────────────────────────────────────
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

  // ── Messages when partner changes ─────────────────────────────────────────
  useEffect(() => {
    if (!partnerId) { setMessages([]); setActivePartner(null); return; }
    setLoadingMsgs(true);
    setPartnerTyping(false);
    messagesApi.getConversation(partnerId)
      .then(msgs => {
        setMessages(msgs);
        hubRef.current?.invoke('MarkRead', partnerId).catch(() => {});
        loadConversations();
      })
      .catch(() => {})
      .finally(() => setLoadingMsgs(false));
  }, [partnerId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, partnerTyping]);

  // ── Send ──────────────────────────────────────────────────────────────────
  const handleSend = async () => {
    if (!text.trim() || !partnerId || sending) return;
    const msgText = text.trim();
    setText('');
    setSending(true);
    if (typingTimer.current) clearTimeout(typingTimer.current);
    hubRef.current?.invoke('StopTyping', partnerId).catch(() => {});
    try {
      const hub = hubRef.current;
      if (hub && hub.state === signalR.HubConnectionState.Connected) {
        await hub.invoke('SendMessage', partnerId, msgText);
      } else {
        // Fallback: REST + manual append
        const sent = await messagesApi.send(partnerId, msgText);
        setMessages(prev => [...prev, sent]);
        loadConversations();
      }
    } catch {
      try {
        const sent = await messagesApi.send(partnerId, msgText);
        setMessages(prev => [...prev, sent]);
      } catch {}
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  // ── Typing ────────────────────────────────────────────────────────────────
  const handleTextChange = (val: string) => {
    setText(val);
    const hub = hubRef.current;
    if (!partnerId || !hub || hub.state !== signalR.HubConnectionState.Connected) return;
    hub.invoke('StartTyping', partnerId).catch(() => {});
    if (typingTimer.current) clearTimeout(typingTimer.current);
    typingTimer.current = setTimeout(() => {
      hub.invoke('StopTyping', partnerId).catch(() => {});
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── New dialog ────────────────────────────────────────────────────────────
  const openNewDialog = async () => {
    setNewDialogOpen(true); setSearch(''); setMastersLoading(true);
    try { const r = await mastersApi.getAll({ pageSize: 100 }); setMasters(r.items); }
    catch {} finally { setMastersLoading(false); }
  };
  const startDialog = (m: MasterListItemDto) => {
    setNewDialogOpen(false);
    navigate(`/chat/${m.userId}`);
  };
  const filteredMasters = masters.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase())
  );

  const isPartnerOnline = partnerId ? onlineUsers.has(norm(partnerId)) : false;
  const totalUnread     = conversations.reduce((s, c) => s + c.unreadCount, 0);

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ height: 'calc(100vh - 64px)', display: 'flex', background: '#f5f5f5' }}>

      {/* Left panel */}
      <div style={{ width: 320, flexShrink: 0, background: '#fff', borderRight: '1px solid #f0f0f0', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 16px', borderBottom: '1px solid #f0f0f0', display: 'flex', alignItems: 'center', gap: 10 }}>
          <MessageOutlined style={{ color: '#ff6b9d', fontSize: 18 }} />
          <Text strong style={{ fontSize: 15, flex: 1 }}>Сообщения</Text>
          {totalUnread > 0 && <Badge count={totalUnread} color="#ff6b9d" style={{ marginRight: 4 }} />}
          <span title={connected ? 'Подключено' : 'Соединение...'} style={{ display: 'flex', alignItems: 'center', marginRight: 6 }}>
            <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%',
              background: connected ? '#52c41a' : '#faad14',
              boxShadow: connected ? '0 0 4px #52c41a' : 'none',
              transition: 'background 0.3s' }} />
          </span>
          <Button type="primary" shape="circle" size="small" icon={<PlusOutlined />}
            onClick={openNewDialog} style={{ background: '#ff6b9d', borderColor: '#ff6b9d', flexShrink: 0 }} />
        </div>

        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loadingConvs ? (
            <div style={{ padding: 40, textAlign: 'center' }}><Spin /></div>
          ) : conversations.length === 0 ? (
            <div style={{ padding: '48px 20px', textAlign: 'center' }}>
              <MessageOutlined style={{ fontSize: 40, color: '#e0e0e0', display: 'block', marginBottom: 12 }} />
              <Text type="secondary" style={{ fontSize: 13, display: 'block', marginBottom: 16 }}>Диалогов пока нет</Text>
              <Button type="primary" size="small" icon={<PlusOutlined />} onClick={openNewDialog}
                style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 20 }}>Написать мастеру</Button>
            </div>
          ) : conversations.map(conv => {
            const isActive = conv.partnerId === partnerId;
            const isOnline = onlineUsers.has(norm(conv.partnerId));
            return (
              <div key={conv.partnerId}
                onClick={() => { setActivePartner(conv); navigate(`/chat/${conv.partnerId}`); }}
                style={{ padding: '12px 16px', cursor: 'pointer',
                  background: isActive ? '#fff0f5' : '#fff',
                  borderLeft: isActive ? '3px solid #ff6b9d' : '3px solid transparent',
                  display: 'flex', gap: 12, alignItems: 'center' }}
                onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = '#fafafa'; }}
                onMouseLeave={e => { e.currentTarget.style.background = isActive ? '#fff0f5' : '#fff'; }}
              >
                <div style={{ position: 'relative', flexShrink: 0 }}>
                  <Avatar src={conv.partnerAvatarUrl ? `${API_BASE}${conv.partnerAvatarUrl}` : undefined}
                    icon={<UserOutlined />} size={44} style={{ backgroundColor: '#ff6b9d' }} />
                  <span style={{ position: 'absolute', bottom: 1, right: 1,
                    width: 11, height: 11, borderRadius: '50%',
                    background: isOnline ? '#52c41a' : '#d9d9d9',
                    border: '2px solid #fff',
                    transition: 'background 0.3s' }} />
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
                  <Text type="secondary" style={{ fontSize: 12, display: 'block',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    fontWeight: conv.unreadCount > 0 ? 600 : 400,
                    color: isOnline && conv.unreadCount === 0 ? '#52c41a' : undefined }}>
                    {isOnline && conv.unreadCount === 0
                      ? 'онлайн'
                      : `${conv.lastMessageIsOwn ? 'Вы: ' : ''}${conv.lastMessage}`}
                  </Text>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right panel */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {!partnerId ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <MessageOutlined style={{ fontSize: 64, color: '#e0e0e0', marginBottom: 16 }} />
            <Text type="secondary" style={{ fontSize: 16, marginBottom: 20 }}>
              Выберите диалог или начните новый
            </Text>
            <Button type="primary" icon={<PlusOutlined />} onClick={openNewDialog}
              style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 20, height: 40, paddingInline: 24 }}>
              Написать мастеру
            </Button>
          </div>
        ) : (
          <>
            {/* Header */}
            <div style={{ padding: '12px 20px', background: '#fff', borderBottom: '1px solid #f0f0f0',
              display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
              <Button type="text" size="small" icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/chat')} style={{ color: '#888' }} />
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <Avatar src={activePartner?.partnerAvatarUrl ? `${API_BASE}${activePartner.partnerAvatarUrl}` : undefined}
                  icon={<UserOutlined />} size={38} style={{ backgroundColor: '#ff6b9d' }} />
                <span style={{ position: 'absolute', bottom: 1, right: 1,
                  width: 11, height: 11, borderRadius: '50%',
                  background: isPartnerOnline ? '#52c41a' : '#d9d9d9',
                  border: '2px solid #fff', transition: 'background 0.3s' }} />
              </div>
              <div style={{ flex: 1 }}>
                <Text strong style={{ fontSize: 15, display: 'block', lineHeight: 1.2 }}>
                  {activePartner?.partnerName || '...'}
                </Text>
                <Text style={{ fontSize: 12, color: partnerTyping ? '#ff6b9d' : isPartnerOnline ? '#52c41a' : '#aaa',
                  transition: 'color 0.2s' }}>
                  {partnerTyping ? '✍️ печатает...' : isPartnerOnline ? 'онлайн' : 'не в сети'}
                </Text>
              </div>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
              {loadingMsgs ? (
                <div style={{ textAlign: 'center', padding: 40 }}><Spin /></div>
              ) : messages.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '60px 0' }}>
                  <Text type="secondary">Напишите первое сообщение</Text>
                </div>
              ) : groupByDate(messages).map(group => (
                <div key={group.date}>
                  <div style={{ textAlign: 'center', margin: '16px 0 12px' }}>
                    <Text type="secondary" style={{ fontSize: 11, background: '#efefef',
                      padding: '2px 10px', borderRadius: 10 }}>{group.date}</Text>
                  </div>
                  {group.items.map((msg, i) => {
                    const isOwn      = norm(msg.senderId) === norm(userId);
                    const showAvatar = !isOwn && (i === 0 || norm(group.items[i-1].senderId) !== norm(msg.senderId));
                    return (
                      <div key={msg.id} style={{ display: 'flex',
                        justifyContent: isOwn ? 'flex-end' : 'flex-start',
                        alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
                        {!isOwn && (
                          <div style={{ width: 30, flexShrink: 0 }}>
                            {showAvatar && (
                              <Avatar src={activePartner?.partnerAvatarUrl ? `${API_BASE}${activePartner.partnerAvatarUrl}` : undefined}
                                icon={<UserOutlined />} size={28} style={{ backgroundColor: '#ff6b9d' }} />
                            )}
                          </div>
                        )}
                        <div style={{ maxWidth: '68%' }}>
                          <div style={{ padding: '8px 14px',
                            borderRadius: isOwn ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                            background: isOwn ? 'linear-gradient(135deg,#ff6b9d,#c44569)' : '#fff',
                            color: isOwn ? '#fff' : '#333',
                            boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                            fontSize: 14, lineHeight: 1.5, wordBreak: 'break-word' }}>
                            {msg.text}
                          </div>
                          <Text type="secondary" style={{ fontSize: 10, display: 'block',
                            textAlign: isOwn ? 'right' : 'left', marginTop: 2,
                            paddingLeft: isOwn ? 0 : 4, paddingRight: isOwn ? 4 : 0 }}>
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
              ))}

              {partnerTyping && (
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, marginBottom: 4 }}>
                  <div style={{ width: 30, flexShrink: 0 }}>
                    <Avatar src={activePartner?.partnerAvatarUrl ? `${API_BASE}${activePartner.partnerAvatarUrl}` : undefined}
                      icon={<UserOutlined />} size={28} style={{ backgroundColor: '#ff6b9d' }} />
                  </div>
                  <div style={{ padding: '8px 14px', borderRadius: '18px 18px 18px 4px',
                    background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
                    <TypingIndicator />
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', background: '#fff', borderTop: '1px solid #f0f0f0',
              display: 'flex', gap: 10, alignItems: 'flex-end', flexShrink: 0 }}>
              <Input.TextArea ref={inputRef} value={text}
                onChange={e => handleTextChange(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Написать сообщение... (Enter — отправить, Shift+Enter — новая строка)"
                autoSize={{ minRows: 1, maxRows: 5 }}
                style={{ borderRadius: 20, resize: 'none', flex: 1 }} maxLength={2000} />
              <Button type="primary" shape="circle" icon={<SendOutlined />}
                onClick={handleSend} loading={sending} disabled={!text.trim()}
                style={{ background: text.trim() ? '#ff6b9d' : undefined,
                  borderColor: text.trim() ? '#ff6b9d' : undefined,
                  width: 40, height: 40, flexShrink: 0 }} />
            </div>
          </>
        )}
      </div>

      {/* New dialog modal */}
      <Modal open={newDialogOpen} onCancel={() => setNewDialogOpen(false)}
        footer={null} title="Выберите мастера" width={440}
        styles={{ body: { padding: '12px 0 0' } }}>
        <Input prefix={<SearchOutlined style={{ color: '#ccc' }} />} placeholder="Поиск по имени..."
          value={search} onChange={e => setSearch(e.target.value)}
          style={{ margin: '0 24px 12px', width: 'calc(100% - 48px)' }} allowClear />
        {mastersLoading ? (
          <div style={{ textAlign: 'center', padding: 32 }}><Spin /></div>
        ) : (
          <List style={{ maxHeight: 400, overflowY: 'auto' }} dataSource={filteredMasters}
            locale={{ emptyText: 'Мастера не найдены' }}
            renderItem={master => (
              <List.Item style={{ padding: '10px 24px', cursor: 'pointer' }}
                onClick={() => startDialog(master)}
                onMouseEnter={e => { e.currentTarget.style.background = '#fff0f5'; }}
                onMouseLeave={e => { e.currentTarget.style.background = '#fff'; }}>
                <List.Item.Meta
                  avatar={
                    <div style={{ position: 'relative' }}>
                      <Avatar src={master.avatarUrl ? `${API_BASE}${master.avatarUrl}` : undefined}
                        icon={<UserOutlined />} style={{ backgroundColor: '#ff6b9d' }} />
                      <span style={{ position: 'absolute', bottom: 1, right: 1,
                        width: 10, height: 10, borderRadius: '50%',
                        background: onlineUsers.has(norm(master.userId)) ? '#52c41a' : '#d9d9d9',
                        border: '2px solid #fff' }} />
                    </div>
                  }
                  title={
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Text strong>{master.name}</Text>
                      {onlineUsers.has(norm(master.userId)) && (
                        <Text style={{ fontSize: 11, color: '#52c41a' }}>онлайн</Text>
                      )}
                    </div>
                  }
                  description={
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      {master.categories?.join(', ') || master.address || ''}
                    </Text>
                  }
                />
              </List.Item>
            )} />
        )}
      </Modal>
    </div>
  );
}
