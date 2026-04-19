import type { User } from 'firebase/auth';

export type CanAccessInput = {
  user: User | null;
  isSubscribed?: boolean;
  isAdmin?: boolean;
  /** Firestore profile role; admin overrides subscription for premium content */
  role?: string | null | undefined;
};

/**
 * Premium / subscription-only content (matches AuthContext flags + explicit admin role).
 */
export function canAccess(input: CanAccessInput): boolean {
  if (!input?.user) return false;
  if (input.isAdmin === true) return true;
  if (input.role === 'admin') return true;
  if (input.isSubscribed === true) return true;
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
