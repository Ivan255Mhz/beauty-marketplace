export type UserRole = 'Client' | 'Master';
export type BookingStatus = 'Pending' | 'Confirmed' | 'Cancelled' | 'Completed' | 'NoShow';
export type ServiceCategory =
  | 'Haircut' | 'Coloring' | 'Manicure' | 'Pedicure'
  | 'Makeup' | 'Eyebrows' | 'Eyelashes' | 'Massage' | 'Other';

export interface LoginRequest { email: string; password: string; }
export interface RegisterRequest { email: string; password: string; name: string; role: UserRole; phone?: string; }
export interface AuthResponse { token: string; userId: string; name: string; email: string; role: UserRole; }

export interface UserDto { id: string; email: string; name: string; phone?: string; avatarUrl?: string; role: UserRole; }
export interface UpdateProfileRequest { name?: string; phone?: string; }

export interface ReviewDto {
  id: string;
  clientId: string;
  clientName: string;
  clientAvatarUrl?: string;
  rating: number;
  comment?: string;
  createdAt: string;
}

export interface NotificationDto {
  id: string;
  type: 'NewBooking' | 'BookingConfirmed' | 'BookingCancelled' | 'BookingCompleted' | 'BookingNoShow' | 'NewReview' | 'Reminder24h' | 'Reminder2h';
  message: string;
  isRead: boolean;
  refId: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  items: NotificationDto[];
  unreadCount: number;
}

export interface PortfolioPhotoDto {
  id: string;
  url: string;
  caption?: string;
}

export interface MasterListItemDto {
  profileId: string;
  userId: string;
  name: string;
  avatarUrl?: string;
  address?: string;
  bio?: string;
  priceFrom?: number;
  averageRating: number;
  reviewCount: number;
  categories: string[];
}

export interface MasterProfileDto {
  id: string;
  userId: string;
  masterName: string;
  avatarUrl?: string;
  bio?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
  priceFrom?: number;
  averageRating: number;
  reviewCount: number;
  services: ServiceDto[];
  portfolio: PortfolioPhotoDto[];
  reviews: ReviewDto[];
}

export interface UpsertMasterProfileRequest { bio?: string; address?: string; latitude?: number; longitude?: number; }

export interface ServiceDto { id: string; masterId: string; name: string; description?: string; price: number; durationMinutes: number; category: ServiceCategory; }
export interface CreateServiceRequest { name: string; description?: string; price: number; durationMinutes: number; category: ServiceCategory; }
export interface UpdateServiceRequest { name: string; description?: string; price: number; durationMinutes: number; category: ServiceCategory; }

export interface BookingDto {
  id: string;
  clientId: string;
  clientName: string;
  serviceId: string;
  serviceName: string;
  serviceDescription?: string;
  serviceDurationMinutes: number;
  serviceCategory: ServiceCategory;
  masterProfileId: string;
  masterUserId: string;
  masterName: string;
  masterPhone?: string;
  masterAddress?: string;
  masterAvatarUrl?: string;
  servicePrice: number;
  bookingDate: string;
  slotDateTime?: string;
  status: BookingStatus;
  comment?: string;
  createdAt: string;
  hasReview: boolean;
}

export interface CreateBookingRequest {
  serviceId: string;
  slotDateTime?: string;  // ISO — from slot picker
  bookingDate?: string;   // legacy free text fallback
  comment?: string;
}
export interface CreateReviewRequest { masterId: string; rating: number; comment?: string; bookingId?: string; }

export interface PagedResult<T> { items: T[]; total: number; }

// ─── Schedule ─────────────────────────────────────────
export interface WorkScheduleItem {
  dayOfWeek: number; // 0=Sun..6=Sat
  startTime: string; // "HH:mm"
  endTime: string;
  isWorking: boolean;
}

export interface TimeSlotDto {
  dateTime: string;   // ISO
  label: string;      // "14:30"
  available: boolean;
}

export interface SaveScheduleRequest {
  days: WorkScheduleItem[];
}

export interface MessageDto {
  id: string;
  senderId: string;
  receiverId: string;
  text: string;
  isRead: boolean;
  createdAt: string;
}

export interface ConversationDto {
  partnerId: string;
  partnerName: string;
  partnerAvatarUrl?: string;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount: number;
  lastMessageIsOwn: boolean;
}
