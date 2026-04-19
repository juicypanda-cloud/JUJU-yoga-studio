import { getMultiFactorResolver, TotpMultiFactorGenerator } from 'firebase/auth';
import type { MultiFactorError, MultiFactorResolver } from 'firebase/auth';
import { auth } from '../firebase';

export const MFA_REQUIRED_CODE = 'auth/multi-factor-auth-required' as const;

export function isMultiFactorRequiredError(error: unknown): error is MultiFactorError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    (error as { code?: string }).code === MFA_REQUIRED_CODE
  );
}

export function getMfaResolver(error: MultiFactorError): MultiFactorResolver {
  return getMultiFactorResolver(auth, error);
}

/** Enrollment ID for the enrolled TOTP factor (use with `assertionForSignIn`). */
export function getTotpEnrollmentId(resolver: MultiFactorResolver): string | null {
  const hint = resolver.hints.find((h) => h.factorId === TotpMultiFactorGenerator.FACTOR_ID);
  return hint?.uid ?? null;
}

export function normalizeTotpInput(otp: string): string {
  return otp.replace(/\s/g, '');
}

export async function completeTotpMfaSignIn(
  resolver: MultiFactorResolver,
  enrollmentId: string,
  otp: string
) {
  const assertion = TotpMultiFactorGenerator.assertionForSignIn(enrollmentId, normalizeTotpInput(otp));
  return resolver.resolveSignIn(assertion);
}
