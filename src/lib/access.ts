import type { User } from 'firebase/auth';

export type UserProfile = {
  uid: string;
  role?: 'admin' | 'user';
  subscriptionStatus?: 'active' | 'inactive';
  subscriptionPlan?: string;
  subscriptionEndDate?: any;
};

export const hasActiveSubscription = (profile?: UserProfile | null): boolean => {
  if (!profile) return false;
  if (profile.role === 'admin') return true;
  if (!profile.subscriptionEndDate) return false;

  const endDate = new Date(profile.subscriptionEndDate);
  if (Number.isNaN(endDate.getTime())) return false;
  return endDate > new Date();
};

export type CanAccessInput = {
  user: User | null;
  profile?: UserProfile | null;
};

/**
 * Premium / subscription-only content (matches AuthContext flags + explicit admin role).
 */
export function canAccess(input: CanAccessInput): boolean {
  if (!input?.user) return false;
  return hasActiveSubscription(input.profile);
}

export type OnlineContentType = 'video' | 'audio';

/**
 * Plan-scoped access for online library content.
 * Legacy plans (`monthly`, `yearly`) keep full access for backward compatibility.
 */
export function canAccessOnlineContentType(
  profile: UserProfile | null | undefined,
  contentType: OnlineContentType
): boolean {
  if (!hasActiveSubscription(profile)) return false;
  if (profile?.role === 'admin') return true;

  const plan = String(profile?.subscriptionPlan || '').trim().toLowerCase();
  if (!plan || plan === 'monthly' || plan === 'yearly') return true;
  if (plan === 'online-video') return contentType === 'video';
  if (plan === 'online-audio') return contentType === 'audio';
  return false;
}

export type PremiumClassLike = {
  type?: string;
  premium?: boolean;
  requiresSubscription?: boolean;
  price?: number;
};

/** Classes that should be locked or gated in listings (not full public previews). */
export function isPremiumClassLike(raw: PremiumClassLike): boolean {
  const t = String(raw?.type || '').trim().toLowerCase();
  if (t === 'online' || t === 'audio') return true;
  if (raw?.premium === true || raw?.requiresSubscription === true) return true;
  if (typeof raw?.price === 'number' && raw.price > 0) return true;
  return false;
}
