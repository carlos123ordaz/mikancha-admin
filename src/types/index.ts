export enum ReservationStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  USED = 'used',
}

export enum UserRole {
  USER = 'user',
  ADMIN = 'admin',
}

export enum PaymentMethod {
  YAPE = 'yape',
  TRANSFER = 'transfer',
}

export interface TimeSlot {
  startTime: string;
  endTime: string;
}

export interface IUser {
  _id: string;
  googleId: string;
  email: string;
  name: string;
  avatar?: string;
  role: UserRole;
  createdAt: string;
}

export interface ICourt {
  _id: string;
  name: string;
  location: string;
  coordinates?: { lat: number; lng: number };
  pricePerHour: number;
  availableSlots: TimeSlot[];
  images: string[];
  description?: string;
  isActive: boolean;
  createdAt: string;
}

export interface IReservation {
  _id: string;
  userId: string | IUser;
  courtId: string | ICourt;
  date: string;
  startTime: string;
  endTime: string;
  durationHours: number;
  status: ReservationStatus;
  paymentMethod: PaymentMethod;
  proofUrl?: string;
  reservationCode: string;
  qrToken?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}
