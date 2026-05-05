import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { handleCreateInvoiceRequest } from './lib/server/qpayCreateInvoice.ts';
import { processQPayWebhook } from './lib/server/qpayWebhookCore.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

type QPayTokenResponse = {
  access_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
};

const QPAY_BASE_URL = process.env.QPAY_BASE_URL ?? 'https://merchant.qpay.mn';
const QPAY_CLIENT_ID = process.env.QPAY_CLIENT_ID;
const QPAY_CLIENT_SECRET = process.env.QPAY_CLIENT_SECRET;
const QPAY_INVOICE_CODE = process.env.QPAY_INVOICE_CODE;
const QPAY_CALLBACK_URL = process.env.QPAY_CALLBACK_URL;

let cachedToken: { value: string; expiresAt: number } | null = null;
let tokenFetchInFlight: Promise<string> | null = null;

function decodeJwtExp(token: string): number | null {
  try {
    const [, payloadBase64Url] = token.split('.');
    if (!payloadBase64Url) {
      return null;
    }
    const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4);
    const payload = JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as { exp?: number };
    return typeof payload.exp === 'number' ? payload.exp : null;
  } catch {
    return null;
  }
}

function assertQPayCredentials() {
  if (!QPAY_CLIENT_ID || !QPAY_CLIENT_SECRET) {
    throw new Error('Missing QPay credentials: set QPAY_CLIENT_ID and QPAY_CLIENT_SECRET');
  }
}

async function getQPayToken(forceRefresh = false): Promise<string> {
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

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`QPay token request failed (${response.status}): ${text}`);
    }

    const data = (await response.json()) as QPayTokenResponse;
    const nowMs = Date.now();
    const jwtExpSeconds = decodeJwtExp(data.access_token);
    const expiresAtFromJwt = jwtExpSeconds ? jwtExpSeconds * 1000 : null;
    const expiresAtFromResponse = nowMs + Math.max(Number(data.expires_in ?? 3600) - 60, 60) * 1000;

    cachedToken = {
      value: data.access_token,
      // Prefer JWT timestamp (exp), fallback to expires_in.
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

async function checkInvoicePayment(invoiceId: string, pageNumber = 1, pageLimit = 100) {
  return qpayRequest('/v2/payment/check', {
    method: 'POST',
    body: JSON.stringify({
      object_type: 'INVOICE',
      object_id: invoiceId,
      offset: { page_number: pageNumber, page_limit: pageLimit },
    }),
  });
}

async function qpayRequest<T>(endpoint: string, init?: RequestInit): Promise<T> {
  const token = await getQPayToken();
  let response = await fetch(`${QPAY_BASE_URL}${endpoint}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(init?.headers ?? {}),
    },
  });

  if (response.status === 401) {
    const refreshedToken = await getQPayToken(true);
    response = await fetch(`${QPAY_BASE_URL}${endpoint}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${refreshedToken}`,
        ...(init?.headers ?? {}),
      },
    });
  }

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`QPay request failed (${response.status}) for ${endpoint}: ${text}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok' });
  });

  app.post('/api/qpay/token', async (req, res) => {
    try {
      assertQPayCredentials();
      const auth = Buffer.from(`${QPAY_CLIENT_ID}:${QPAY_CLIENT_SECRET}`).toString('base64');

      const response = await fetch(`${QPAY_BASE_URL}/v2/auth/token`, {
        method: 'POST',
        headers: {
          Authorization: `Basic ${auth}`,
        },
      });

      const responseText = await response.text();
      const responseJson = responseText
        ? (() => {
            try {
              return JSON.parse(responseText);
            } catch {
              return { message: responseText };
            }
          })()
        : {};

      if (!response.ok) {
        return res.status(response.status).json(responseJson);
      }

      return res.json({
        access_token: responseJson.access_token,
        token_type: responseJson.token_type,
      });
    } catch (error) {
      console.error('QPay token fetch failed:', error);
      return res.status(500).json({ error: 'QPay token fetch failed' });
    }
  });

  app.post('/api/qpay/invoice', async (req, res) => {
    try {
      const { status, payload } = await handleCreateInvoiceRequest((req.body ?? {}) as Record<string, unknown>);
      return res.status(status).json(payload);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/qpay/payment/check', async (req, res) => {
    try {
      const { invoiceId, pageNumber = 1, pageLimit = 100 } = req.body ?? {};
      if (!invoiceId) {
        return res.status(400).json({ error: 'invoiceId is required' });
      }

      const data = await checkInvoicePayment(String(invoiceId), Number(pageNumber), Number(pageLimit));
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  app.get('/api/qpay/payment/:paymentId', async (req, res) => {
    try {
      const { paymentId } = req.params;
      const data = await qpayRequest(`/v2/payment/${paymentId}`, {
        method: 'GET',
      });
      return res.json(data);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  app.post('/api/qpay/webhook', async (req, res) => {
    try {
      console.log('QPay callback received:', req.body);
      const { status, json } = await processQPayWebhook(req.body);
      return res.status(status).json(json);
    } catch (error) {
      return res.status(500).json({ error: (error as Error).message });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
