export type PaymentSession = {
  invoiceId: string;
  qrText: string | null;
  qrImage: string | null;
  deeplink: string | null;
};

export function buildFallbackQrUrl(value: string, size = 260): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
}

export function waitForImageReady(src: string | null, timeoutMs = 2800): Promise<boolean> {
  if (!src) return Promise.resolve(false);
  return new Promise((resolve) => {
    const img = new Image();
    const timeout = window.setTimeout(() => resolve(false), timeoutMs);
    img.onload = () => {
      window.clearTimeout(timeout);
      resolve(true);
    };
    img.onerror = () => {
      window.clearTimeout(timeout);
      resolve(false);
    };
    img.src = src;
  });
}

export async function readJsonSafe(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

export function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function hasPaidStatus(payload: unknown): boolean {
  if (!payload || typeof payload !== 'object') return false;
  const stack: unknown[] = [payload];
  while (stack.length) {
    const current = stack.pop();
    if (!current || typeof current !== 'object') continue;
    const record = current as Record<string, unknown>;
    for (const [key, value] of Object.entries(record)) {
      const keyLooksLikeStatus = /status|state|result$/i.test(key);
      if (typeof value === 'string') {
        const normalized = value.toUpperCase().trim();
        if (['PAID', 'SUCCESS', 'COMPLETED', 'SETTLED', 'CLOSED', 'DONE'].includes(normalized)) {
          return true;
        }
        if (keyLooksLikeStatus && normalized.includes('PAID')) return true;
      } else if (typeof value === 'number') {
        const kn = key.toLowerCase();
        if (
          (kn.includes('payment_status') || kn.includes('invoice_status')) &&
          (value === 1 || value === 2)
        ) {
          return true;
        }
      } else if (Array.isArray(value)) {
        stack.push(...value);
      } else if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }
  return false;
}

/** Client-side: Firestore `qpayEvents` doc considered paid / fulfilled. */
export function isFirestoreQpayPaid(data: Record<string, unknown>): boolean {
  if (data.processed === true) return true;
  return String(data.status || '').toLowerCase().trim() === 'paid';
}
