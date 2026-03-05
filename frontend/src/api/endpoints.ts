import api from './client';
import type {
  AuthResponse, LoginRequest, RegisterRequest,
  MasterListItemDto, MasterProfileDto, UpsertMasterProfileRequest,
  ServiceDto, CreateServiceRequest, UpdateServiceRequest,
  PagedResult,
  WorkScheduleItem, TimeSlotDto, SaveScheduleRequest,
  BookingDto, CreateBookingRequest,
  UserDto, UpdateProfileRequest,
  ReviewDto, CreateReviewRequest,
  PortfolioPhotoDto,
  NotificationsResponse,
  MessageDto,
  ConversationDto,
} from '../types';

export const authApi = {
  login:              (data: LoginRequest)     => api.post<AuthResponse>('/api/auth/login', data).then(r => r.data),
  register:           (data: RegisterRequest)  => api.post<{ message: string }>('/api/auth/register', data).then(r => r.data),
  confirmEmail:       (token: string)          => api.get<{ message: string }>(`/api/auth/confirm-email?token=${token}`).then(r => r.data),
  resendConfirmation: (email: string)          => api.post<{ message: string }>('/api/auth/resend-confirmation', { email }).then(r => r.data),
};

export const usersApi = {
  getMe: () => api.get<UserDto>('/api/users/me').then(r => r.data),
  updateMe: (data: UpdateProfileRequest) => api.put<UserDto>('/api/users/me', data).then(r => r.data),
  uploadAvatar: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post<{ url: string }>('/api/users/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  search: (q: string) =>
    api.get<{ id: string; name: string; avatarUrl?: string; role: string }[]>(`/api/users/search?q=${encodeURIComponent(q)}`).then(r => r.data),
};

export const mastersApi = {
  getAll: (params: {
    category?: string;
    priceMin?: number;
    priceMax?: number;
    district?: string;
    page?: number;
    pageSize?: number;
  } = {}) =>
    api.get<PagedResult<MasterListItemDto>>('/api/masters', { params }).then(r => r.data),
  getById: (id: string) => api.get<MasterProfileDto>(`/api/masters/${id}`).then(r => r.data),
  getMyProfile: () => api.get<MasterProfileDto>('/api/masters/me').then(r => r.data),
  createProfile: (data: UpsertMasterProfileRequest) => api.post<MasterProfileDto>('/api/masters/profile', data).then(r => r.data),
  updateProfile: (data: UpsertMasterProfileRequest) => api.put<MasterProfileDto>('/api/masters/profile', data).then(r => r.data),
  uploadAvatar: (file: File) => {
    const fd = new FormData(); fd.append('file', file);
    return api.post<{ url: string }>('/api/masters/avatar', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  addPortfolioPhoto: (file: File, caption?: string) => {
    const fd = new FormData(); fd.append('file', file); if (caption) fd.append('caption', caption);
    return api.post<PortfolioPhotoDto>('/api/masters/portfolio', fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
  },
  deletePortfolioPhoto: (photoId: string) => api.delete(`/api/masters/portfolio/${photoId}`),
};

export const notificationsApi = {
  getAll: () => api.get<NotificationsResponse>('/api/notifications').then(r => r.data),
  markRead: (id: string) => api.post(`/api/notifications/${id}/read`),
  markAllRead: () => api.post('/api/notifications/read-all'),
};

export const servicesApi = {
  getByMaster: (masterId: string) => api.get<ServiceDto[]>(`/api/services/master/${masterId}`).then(r => r.data),
  create: (data: CreateServiceRequest) => api.post<ServiceDto>('/api/services', data).then(r => r.data),
  update: (id: string, data: UpdateServiceRequest) => api.put<ServiceDto>(`/api/services/${id}`, data).then(r => r.data),
  delete: (id: string) => api.delete(`/api/services/${id}`),
};

export const bookingsApi = {
  create: (data: CreateBookingRequest) => api.post<BookingDto>('/api/bookings', data).then(r => r.data),
  getMine: () => api.get<BookingDto[]>('/api/bookings/my').then(r => r.data),
  getIncoming: () => api.get<BookingDto[]>('/api/bookings/incoming').then(r => r.data),
  getById: (id: string) => api.get<BookingDto>(`/api/bookings/${id}`).then(r => r.data),
  updateStatus: (id: string, status: string) => api.patch<BookingDto>(`/api/bookings/${id}/status`, { status }).then(r => r.data),
  cancelByClient: (id: string) => api.post<BookingDto>(`/api/bookings/${id}/cancel`).then(r => r.data),
};

export const reviewsApi = {
  getByMaster: (masterId: string) => api.get<ReviewDto[]>(`/api/reviews/master/${masterId}`).then(r => r.data),
  create: (data: CreateReviewRequest, photos?: File[]) => {
    const form = new FormData();
    form.append('masterId', data.masterId);
    form.append('rating', String(data.rating));
    if (data.comment) form.append('comment', data.comment);
    if (data.bookingId) form.append('bookingId', data.bookingId);
    if (photos) photos.forEach(f => form.append('photos', f));
    return api.post<ReviewDto>('/api/reviews', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }).then(r => r.data);
  },
};

// ─── Schedule ─────────────────────────────────────────
export const scheduleApi = {
  getMine: () =>
    api.get<WorkScheduleItem[]>('/api/schedule/me').then(r => r.data),

  getByMaster: (masterId: string) =>
    api.get<WorkScheduleItem[]>(`/api/schedule/master/${masterId}`).then(r => r.data),

  save: (data: SaveScheduleRequest) =>
    api.post('/api/schedule', data).then(r => r.data),

  getSlots: (masterId: string, date: string, durationMinutes: number) =>
    api.get<TimeSlotDto[]>(`/api/schedule/slots/${masterId}`, {
      params: { date, durationMinutes }
    }).then(r => r.data),
};

export const messagesApi = {
  getConversations: () =>
    api.get<ConversationDto[]>('/api/messages/conversations').then(r => r.data),
  getUnreadCount: () =>
    api.get<{ count: number }>('/api/messages/unread-count').then(r => r.data),
  getConversation: (partnerId: string) =>
    api.get<MessageDto[]>(`/api/messages/${partnerId}`).then(r => r.data),
  send: (receiverId: string, text: string) =>
    api.post<MessageDto>('/api/messages', { receiverId, text }).then(r => r.data),
};
