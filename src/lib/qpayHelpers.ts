export type PaymentSession = {
  invoiceId: string;
  qrText: string | null;
  qrImage: string | null;
  deeplink: string | null;
};

export function buildFallbackQrUrl(value: string, size = 260): string {
  return `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}`;
}

export function waitForImageReady(src: string | null, timeoutMs = 12000): Promise<boolean> {
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
    for (const value of Object.values(current as Record<string, unknown>)) {
      if (typeof value === 'string') {
        const normalized = value.toUpperCase();
        if (['PAID', 'SUCCESS', 'COMPLETED', 'SETTLED'].includes(normalized)) return true;
      } else if (Array.isArray(value)) {
        stack.push(...value);
      } else if (value && typeof value === 'object') {
        stack.push(value);
      }
    }
  }
  return false;
}
