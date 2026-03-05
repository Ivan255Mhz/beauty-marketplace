import { useState, useEffect } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider, Radio, Result, Spin } from 'antd';
import {
  MailOutlined, LockOutlined, UserOutlined, PhoneOutlined,
  CheckCircleOutlined, CloseCircleOutlined, ReloadOutlined,
} from '@ant-design/icons';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { useAuthStore } from '../context/authStore';

const { Title, Text } = Typography;

// ─── Login ────────────────────────────────────────────────────────────────────
export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate  = useNavigate();
  const location  = useLocation();
  const returnTo  = (location.state as any)?.returnTo || '/dashboard';
  const [unconfirmedEmail, setUnconfirmedEmail] = useState<string | null>(null);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Countdown timer for resend cooldown
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    setUnconfirmedEmail(null);
    try {
      const data = await authApi.login(values);
      login(data);
      message.success(`Добро пожаловать, ${data.name}!`);
      navigate(returnTo, { replace: true });
    } catch (e: any) {
      const resp = e.response;
      if (resp?.status === 403 && resp?.data?.code === 'EMAIL_NOT_CONFIRMED') {
        setUnconfirmedEmail(resp.data.email || values.email);
      } else {
        message.error(resp?.data?.message || 'Неверный email или пароль');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!unconfirmedEmail || resendCooldown > 0) return;
    setResendLoading(true);
    try {
      await authApi.resendConfirmation(unconfirmedEmail);
      message.success('Письмо отправлено! Проверьте почту.');
      setResendCooldown(120); // 2 min cooldown
    } catch {
      message.error('Не удалось отправить письмо');
    } finally {
      setResendLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 400, borderRadius: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ color: '#ff6b9d', marginBottom: 4 }}>Вход в BeautyBook</Title>
          <Text type="secondary">Введите свои данные</Text>
        </div>

        {unconfirmedEmail && (
          <div style={{
            background: '#fffbe6', border: '1px solid #ffe58f',
            borderRadius: 10, padding: '14px 16px', marginBottom: 20,
          }}>
            <Text style={{ color: '#ad6800', display: 'block', marginBottom: 8 }}>
              📧 Email <strong>{unconfirmedEmail}</strong> не подтверждён.
              Проверьте папку «Входящие» или «Спам».
            </Text>
            <Button
              size="small" icon={<ReloadOutlined />}
              loading={resendLoading}
              disabled={resendCooldown > 0}
              onClick={handleResend}
              style={{ color: '#ff6b9d', borderColor: '#ff6b9d' }}
            >
              {resendCooldown > 0
                ? `Повторить через ${resendCooldown} сек`
                : 'Отправить письмо повторно'}
            </Button>
          </div>
        )}

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}
              style={{ background: '#ff6b9d', borderColor: '#ff6b9d' }}>
              Войти
            </Button>
          </Form.Item>
        </Form>

        <Divider />
        <Text type="secondary">Нет аккаунта? </Text>
        <Link to="/register" style={{ color: '#ff6b9d' }}>Зарегистрироваться</Link>
      </Card>
    </div>
  );
}

// ─── Register ─────────────────────────────────────────────────────────────────
export function RegisterPage() {
  const [loading, setLoading]     = useState(false);
  const [done, setDone]           = useState(false);
  const [doneEmail, setDoneEmail] = useState('');
  const navigate                  = useNavigate();
  const [searchParams]            = useSearchParams();
  const defaultRole               = searchParams.get('role') === 'Master' ? 'Master' : 'Client';

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      await authApi.register(values);
      setDoneEmail(values.email);
      setDone(true);
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <Card style={{ width: '100%', maxWidth: 480, borderRadius: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 64, marginBottom: 8 }}>📧</div>
          <Title level={3} style={{ color: '#ff6b9d', marginBottom: 8 }}>Проверьте почту!</Title>
          <Text style={{ display: 'block', color: '#555', marginBottom: 16, fontSize: 15 }}>
            Мы отправили письмо с подтверждением на<br />
            <strong style={{ color: '#333' }}>{doneEmail}</strong>
          </Text>
          <Text type="secondary" style={{ display: 'block', marginBottom: 24, fontSize: 13 }}>
            Перейдите по ссылке в письме для активации аккаунта.<br />
            Проверьте папку «Спам», если письмо не пришло.
          </Text>
          <Button type="primary" onClick={() => navigate('/login')}
            style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 20, height: 40, paddingInline: 32 }}>
            Перейти ко входу
          </Button>
          <Divider />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Письмо не пришло? </Text>
          <Button type="link" style={{ color: '#ff6b9d', padding: 0, fontSize: 12 }}
            onClick={() => navigate('/login')}>
            Повторить отправку на странице входа
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 440, borderRadius: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ color: '#ff6b9d', marginBottom: 4 }}>Регистрация</Title>
          <Text type="secondary">Создайте аккаунт бесплатно</Text>
        </div>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}
          initialValues={{ role: defaultRole }}>
          <Form.Item name="role" label="Я регистрируюсь как:">
            <Radio.Group buttonStyle="solid">
              <Radio.Button value="Client">Клиент</Radio.Button>
              <Radio.Button value="Master">Мастер</Radio.Button>
            </Radio.Group>
          </Form.Item>
          <Form.Item name="name" rules={[{ required: true, message: 'Введите имя' }]}>
            <Input prefix={<UserOutlined />} placeholder="Имя и фамилия" size="large" />
          </Form.Item>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="phone">
            <Input prefix={<PhoneOutlined />} placeholder="Телефон (необязательно)" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, min: 6, message: 'Минимум 6 символов' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль (мин. 6 символов)" size="large" />
          </Form.Item>
          <Form.Item>
            <Button type="primary" htmlType="submit" block size="large" loading={loading}
              style={{ background: '#ff6b9d', borderColor: '#ff6b9d' }}>
              Создать аккаунт
            </Button>
          </Form.Item>
        </Form>

        <Divider />
        <Text type="secondary">Уже есть аккаунт? </Text>
        <Link to="/login" style={{ color: '#ff6b9d' }}>Войти</Link>
      </Card>
    </div>
  );
}

// ─── Confirm Email Page ───────────────────────────────────────────────────────
export function ConfirmEmailPage() {
  const [searchParams] = useSearchParams();
  const navigate       = useNavigate();
  const token          = searchParams.get('token') || '';

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [msg,    setMsg]    = useState('');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMsg('Токен подтверждения отсутствует в ссылке.');
      return;
    }
    authApi.confirmEmail(token)
      .then(r => { setStatus('success'); setMsg(r.message); })
      .catch(e => { setStatus('error'); setMsg(e.response?.data?.message || 'Ошибка подтверждения'); });
  }, [token]);

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 440, borderRadius: 16, textAlign: 'center' }}>
        {status === 'loading' && (
          <>
            <Spin size="large" style={{ marginBottom: 16 }} />
            <Title level={4} style={{ color: '#999' }}>Подтверждаем email...</Title>
          </>
        )}
        {status === 'success' && (
          <Result
            icon={<CheckCircleOutlined style={{ color: '#52c41a' }} />}
            title="Email подтверждён!"
            subTitle={msg}
            extra={
              <Button type="primary" onClick={() => navigate('/login')}
                style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 20 }}>
                Войти в аккаунт
              </Button>
            }
          />
        )}
        {status === 'error' && (
          <Result
            icon={<CloseCircleOutlined style={{ color: '#ff4d4f' }} />}
            title="Ссылка недействительна"
            subTitle={msg}
            extra={
              <Button type="primary" onClick={() => navigate('/login')}
                style={{ background: '#ff6b9d', borderColor: '#ff6b9d', borderRadius: 20 }}>
                Запросить новое письмо
              </Button>
            }
          />
        )}
      </Card>
    </div>
  );
}
