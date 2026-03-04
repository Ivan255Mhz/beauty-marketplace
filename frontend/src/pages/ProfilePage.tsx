import { useEffect, useState } from 'react';
import { Card, Form, Input, Button, Avatar, Upload, Typography, Divider, message, Spin } from 'antd';
import { UserOutlined, UploadOutlined } from '@ant-design/icons';
import { usersApi } from '../api/endpoints';
import { useAuthStore } from '../context/authStore';
import type { UserDto } from '../types';

const { Title, Text } = Typography;
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export default function ProfilePage() {
  const [user, setUser] = useState<UserDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { updateName } = useAuthStore();
  const [form] = Form.useForm();

  useEffect(() => {
    usersApi.getMe()
      .then(u => { setUser(u); form.setFieldsValue({ name: u.name, phone: u.phone }); })
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async (values: { name: string; phone?: string }) => {
    setSaving(true);
    try {
      const updated = await usersApi.updateMe(values);
      setUser(updated);
      updateName(updated.name);
      message.success('Профиль обновлён');
    } catch {
      message.error('Ошибка при сохранении');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (file: File) => {
    try {
      const { url } = await usersApi.uploadAvatar(file);
      setUser(prev => prev ? { ...prev, avatarUrl: url } : prev);
      message.success('Аватар обновлён');
    } catch {
      message.error('Ошибка при загрузке аватара');
    }
    return false; // prevent default upload
  };

  if (loading) return <div style={{ textAlign: 'center', padding: 80 }}><Spin size="large" /></div>;
  if (!user) return null;

  return (
    <div style={{ maxWidth: 520, margin: '40px auto', padding: '0 24px' }}>
      <Title level={3} style={{ marginBottom: 24 }}>Настройки профиля</Title>

      <Card style={{ borderRadius: 16 }}>
        {/* Avatar */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Avatar
            src={user.avatarUrl ? `${API_BASE}${user.avatarUrl}` : undefined}
            icon={<UserOutlined />}
            size={96}
            style={{ backgroundColor: '#ff6b9d', marginBottom: 12 }}
          />
          <br />
          <Upload
            showUploadList={false}
            accept="image/jpeg,image/png,image/webp"
            beforeUpload={handleAvatarUpload}
          >
            <Button icon={<UploadOutlined />} size="small">Загрузить фото</Button>
          </Upload>
        </div>

        <Divider />

        <Form form={form} layout="vertical" onFinish={handleSave}>
          <Form.Item label="Email">
            <Text>{user.email}</Text>
          </Form.Item>
          <Form.Item
            name="name"
            label="Имя"
            rules={[{ required: true, message: 'Введите имя' }]}
          >
            <Input size="large" />
          </Form.Item>
          <Form.Item name="phone" label="Телефон">
            <Input size="large" placeholder="+7 (999) 000-00-00" />
          </Form.Item>
          <Form.Item>
            <Button
              type="primary"
              htmlType="submit"
              loading={saving}
              block
              size="large"
              style={{ background: '#ff6b9d', borderColor: '#ff6b9d' }}
            >
              Сохранить изменения
            </Button>
          </Form.Item>
        </Form>
      </Card>
    </div>
  );
}
