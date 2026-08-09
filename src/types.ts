export type UserRole = 'admin' | 'teacher' | 'client' | 'user';

export interface UserDocument {
  uid: string;
  email: string;
  displayName?: string;
  name?: string;
  photoURL?: string;
  role: UserRole;
  phone?: string;
  bio?: string;
  subscriptionStatus?: 'active' | 'inactive' | 'expired' | 'none';
  subscriptionPlanId?: string;
  subscriptionExpiresAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ClassDocument {
  id: string;
  title: string;
  description?: string;
  category?: string;
  durationMinutes?: number;
  instructorId?: string;
  instructorName?: string;
  price?: number;
  isFree?: boolean;
  imageUrl?: string;
  level?: string;
  schedule?: string;
}

export interface ScheduleDocument {
  id: string;
  classId: string;
  className: string;
  teacherId: string;
  teacherName: string;
  date: string;
  time: string;
  startIso?: string;
  endIso?: string;
  room?: string;
  capacity: number;
  bookedCount: number;
  price?: number;
  isFree?: boolean;
  status: 'Active' | 'Cancelled' | 'active' | 'cancelled';
}

export interface BookingDocument {
  id: string;
  userId: string;
  userEmail?: string;
  classId?: string;
  scheduleId?: string;
  itemId?: string;
  type: 'class_month' | 'schedule_slot' | 'subscription';
  monthKey?: string;
  weekKey?: string;
  status: 'confirmed' | 'cancelled' | 'pending';
  amountPaid: number;
  createdAt: string;
  fulfillment?: string;
}

export interface PaymentEventDocument {
  invoiceId: string;
  userId: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled' | string;
  amount: number;
  currency: string;
  paymentIntent: {
    kind: 'class_month' | 'schedule_slot' | 'subscription';
    classId?: string;
    monthKey?: string;
    scheduleId?: string;
    weekKey?: string;
    planId?: string;
    durationDays?: number;
  };
  processed: boolean;
  createdAt: unknown;
  paidAt?: unknown;
  metadata?: {
    orderId?: string;
    description?: string;
    senderBranchCode?: string;
  };
}
