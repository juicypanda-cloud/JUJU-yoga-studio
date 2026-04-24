type QPayTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
};

type CachedToken = {
  value: string;
  expiresAt: number;
};

const QPAY_BASE_URL = process.env.QPAY_BASE_URL ?? 'https://merchant.qpay.mn';
const QPAY_CLIENT_ID = process.env.QPAY_CLIENT_ID;
const QPAY_CLIENT_SECRET = process.env.QPAY_CLIENT_SECRET;
const QPAY_INVOICE_CODE = process.env.QPAY_INVOICE_CODE;
const QPAY_CALLBACK_URL = process.env.QPAY_CALLBACK_URL;

let cachedToken: CachedToken | null = null;
let tokenFetchInFlight: Promise<string> | null = null;

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function parseJsonSafe(text: string): Record<string, unknown> {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { message: text };
  }
}

export function jsonResponse(res: any, status: number, payload: unknown) {
  return res.status(status).json(payload);
}

export function getBody(req: any): Record<string, unknown> {
  if (!req?.body) return {};
  if (typeof req.body === 'string') {
    try {
      return JSON.parse(req.body) as Record<string, unknown>;
    } catch {
      return {};
    }
  }
  if (typeof req.body === 'object') {
    return req.body as Record<string, unknown>;
  }
  return {};
}

export function assertMethod(req: any, res: any, method: string): boolean {
  if (req.method !== method) {
    jsonResponse(res, 405, { error: 'Method Not Allowed' });
    return false;
  }
  return true;
}

function decodeJwtExp(token: string): number | null {
  try {
    const [, payloadBase64Url] = token.split('.');
    if (!payloadBase64Url) return null;
    const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

export function assertQPayCredentials() {
  if (!QPAY_CLIENT_ID || !QPAY_CLIENT_SECRET) {
    throw new Error('Missing QPay credentials: set QPAY_CLIENT_ID and QPAY_CLIENT_SECRET');
  }
}

export function assertQPayInvoiceConfig() {
  if (!QPAY_INVOICE_CODE) {
    throw new Error('Missing QPAY_INVOICE_CODE in environment');
  }
  if (!QPAY_CALLBACK_URL) {
    throw new Error('Missing QPAY_CALLBACK_URL in environment');
  }
}

export async function fetchQPayToken(forceRefresh = false): Promise<string> {
  assertQPayCredentials();

  if (!forceRefresh && cachedToken && Date.now() < cachedToken.expiresAt) {
    return cachedToken.value;
  }

  if (!forceRefresh && tokenFetchInFlight) {
    return tokenFetchInFlight;
  }

  tokenFetchInFlight = (async () => {
    const auth = Buffer.from(`${QPAY_CLIENT_ID}:${QPAY_CLIENT_SECRET}`).toString('base64');
    const response = await fetch(`${QPAY_BASE_URL}/v2/auth/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
      },
    });

    const text = await response.text();
    const payload = parseJsonSafe(text);

    if (!response.ok) {
      throw new Error(`QPay token request failed (${response.status}): ${JSON.stringify(payload)}`);
    }

    const data = payload as QPayTokenResponse;
    const nowMs = Date.now();
    const jwtExpSeconds = decodeJwtExp(data.access_token);
    const expiresAtFromJwt = jwtExpSeconds ? jwtExpSeconds * 1000 : null;
    const expiresAtFromResponse = nowMs + Math.max(Number(data.expires_in ?? 3600) - 60, 60) * 1000;

    cachedToken = {
      value: data.access_token,
      expiresAt: (expiresAtFromJwt ?? expiresAtFromResponse) - 60_000,
    };

    return data.access_token;
  })();

  try {
    return await tokenFetchInFlight;
  } finally {
    tokenFetchInFlight = null;
  }
}

export async function qpayRequest<T>(endpoint: string, init?: RequestInit): Promise<{ status: number; data: T }> {
  const token = await fetchQPayToken();
  let response = await fetch(`${QPAY_BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    const refreshedToken = await fetchQPayToken(true);
    response = await fetch(`${QPAY_BASE_URL}${endpoint}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshedToken}`,
        ...(init?.headers ?? {}),
      },
    });
  }

  const text = await response.text();
  const parsed = text
    ? (() => {
        try {
          return JSON.parse(text);
        } catch {
          return { message: text };
        }
      })()
    : {};

  return { status: response.status, data: parsed as T };
}

export function getQPayInvoiceConfig() {
  return {
    invoiceCode: QPAY_INVOICE_CODE!,
    callbackUrl: QPAY_CALLBACK_URL!,
  };
}

export function pickString(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

export function extractInvoiceId(payload: unknown): string | null {
  if (!payload || typeof payload !== 'object') return null;
  const data = payload as Record<string, unknown>;
  const payment = (data.payment ?? {}) as Record<string, unknown>;
  const candidates = [data.invoice_id, data.object_id, data.invoiceId, payment.invoice_id, payment.object_id];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c;
  }
  return null;
}
