import { useState } from 'react';
import { Form, Input, Button, Card, Typography, message, Divider, Radio } from 'antd';
import { MailOutlined, LockOutlined, UserOutlined, PhoneOutlined } from '@ant-design/icons';
import { Link, useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { authApi } from '../api/endpoints';
import { useAuthStore } from '../context/authStore';

const { Title, Text } = Typography;

// ─── Login ────────────────────────────────────────────
export function LoginPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const returnTo = (location.state as any)?.returnTo || '/dashboard';

  const onFinish = async (values: { email: string; password: string }) => {
    setLoading(true);
    try {
      const data = await authApi.login(values);
      login(data);
      message.success(`Добро пожаловать, ${data.name}!`);
      navigate(returnTo, { replace: true });
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Неверный email или пароль');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <Card style={{ width: '100%', maxWidth: 400, borderRadius: 16 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Title level={3} style={{ color: '#ff6b9d', marginBottom: 4 }}>Вход в BeautyBook</Title>
          <Text type="secondary">Введите свои данные</Text>
        </div>

        <Form layout="vertical" onFinish={onFinish} requiredMark={false}>
          <Form.Item name="email" rules={[{ required: true, type: 'email', message: 'Введите корректный email' }]}>
            <Input prefix={<MailOutlined />} placeholder="Email" size="large" />
          </Form.Item>
          <Form.Item name="password" rules={[{ required: true, message: 'Введите пароль' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="Пароль" size="large" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary" htmlType="submit" block size="large"
              loading={loading}
              style={{ background: '#ff6b9d', borderColor: '#ff6b9d' }}
            >
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

// ─── Register ─────────────────────────────────────────
export function RegisterPage() {
  const [loading, setLoading] = useState(false);
  const { login } = useAuthStore();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const defaultRole = searchParams.get('role') === 'Master' ? 'Master' : 'Client';

  const onFinish = async (values: any) => {
    setLoading(true);
    try {
      const data = await authApi.register(values);
      login(data);
      message.success('Аккаунт создан! Добро пожаловать!');
      navigate('/dashboard', { replace: true });
    } catch (e: any) {
      message.error(e.response?.data?.message || 'Ошибка при регистрации');
    } finally {
      setLoading(false);
    }
  };

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
            <Button
              type="primary" htmlType="submit" block size="large"
              loading={loading}
              style={{ background: '#ff6b9d', borderColor: '#ff6b9d' }}
            >
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
