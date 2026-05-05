import { assertQPayInvoiceConfig, getQPayInvoiceConfig, qpayRequest } from '../../api/qpay/_lib.js';
import { getServerAuth } from './firebaseAdmin.js';
import { extractInvoiceIdFromQPayInvoiceResponse, savePendingQPayEvent, type PaymentIntent } from './qpayWebhookCore.js';

function parseServiceAccountProjectId(): string | null {
  try {
    const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) return null;
    const parsed = JSON.parse(String(raw)) as Record<string, unknown>;
    const pid = typeof parsed.project_id === 'string' ? parsed.project_id.trim() : '';
    return pid || null;
  } catch {
    return null;
  }
}

function parseJwtPayload(token: string): Record<string, unknown> | null {
  try {
    const [, payloadBase64Url] = token.split('.');
    if (!payloadBase64Url) return null;
    const payloadBase64 = payloadBase64Url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = payloadBase64 + '='.repeat((4 - (payloadBase64.length % 4)) % 4);
    return JSON.parse(Buffer.from(padded, 'base64').toString('utf8')) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function parseIntent(raw: unknown): PaymentIntent | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const kind = String(o.kind || '').trim();
  if (kind === 'class_month') {
    const classId = String(o.classId || '').trim();
    const monthKey = String(o.monthKey || '').trim();
    if (!classId || !/^\d{4}-\d{2}$/.test(monthKey)) return null;
    return { kind: 'class_month', classId, monthKey };
  }
  if (kind === 'class_detail') {
    const classId = String(o.classId || '').trim();
    if (!classId) return null;
    const monthKey = String(o.monthKey || '').trim();
    const mk = /^\d{4}-\d{2}$/.test(monthKey) ? monthKey : new Date().toISOString().slice(0, 7);
    return { kind: 'class_month', classId, monthKey: mk };
  }
  if (kind === 'schedule_slot') {
    const scheduleId = String(o.scheduleId || '').trim();
    const weekKey = String(o.weekKey || '').trim();
    if (!scheduleId || !weekKey) return null;
    return { kind: 'schedule_slot', scheduleId, weekKey };
  }
  if (kind === 'subscription') {
    const planId = String(o.planId || '').trim();
    if (!planId) return null;
    const durationDays = typeof o.durationDays === 'number' ? o.durationDays : undefined;
    return { kind: 'subscription', planId, durationDays };
  }
  return null;
}

export async function handleCreateInvoiceRequest(body: Record<string, unknown>): Promise<{
  status: number;
  payload: Record<string, unknown>;
}> {
  assertQPayInvoiceConfig();

  const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
  if (!idToken) {
    return { status: 401, payload: { error: 'idToken is required' } };
  }

  const intent = parseIntent(body.paymentIntent);
  if (!intent) {
    return { status: 400, payload: { error: 'paymentIntent with valid kind is required' } };
  }

  const amount = Number(body.amount);
  if (!amount || amount <= 0) {
    return { status: 400, payload: { error: 'amount must be a positive number' } };
  }

  const orderId = String(body.orderId || '').trim();
  if (!orderId) {
    return { status: 400, payload: { error: 'orderId is required' } };
  }

  let uid: string;
  try {
    const decoded = await getServerAuth().verifyIdToken(idToken);
    uid = decoded.uid;
  } catch (e) {
    const tokenPayload = parseJwtPayload(idToken);
    const tokenAud = typeof tokenPayload?.aud === 'string' ? tokenPayload.aud : null;
    const tokenIss = typeof tokenPayload?.iss === 'string' ? tokenPayload.iss : null;
    const expectedProjectId = parseServiceAccountProjectId();
    const msg = e instanceof Error ? e.message : String(e);
    return {
      status: 401,
      payload: {
        error: 'invalid idToken',
        details: msg,
        tokenAud,
        tokenIss,
        expectedProjectId,
      },
    };
  }

  const { invoiceCode, callbackUrl } = getQPayInvoiceConfig();
  const description = typeof body.description === 'string' ? body.description : `Order ${orderId}`;
  const receiverCode = typeof body.receiverCode === 'string' ? body.receiverCode : 'terminal';
  const senderBranchCode = typeof body.senderBranchCode === 'string' ? body.senderBranchCode : 'ONLINE';
  const receiverData = body.receiverData && typeof body.receiverData === 'object' ? body.receiverData : undefined;

  const qpayBody = {
    invoice_code: invoiceCode,
    sender_invoice_no: orderId,
    invoice_receiver_code: receiverCode,
    sender_branch_code: senderBranchCode,
    invoice_description: description,
    amount,
    callback_url: `${callbackUrl}?orderId=${encodeURIComponent(orderId)}`,
    ...(receiverData ? { invoice_receiver_data: receiverData } : {}),
  };

  let invoiceParsed: Record<string, unknown>;
  let httpStatus: number;
  try {
    const res = await qpayRequest<Record<string, unknown>>('/v2/invoice', {
      method: 'POST',
      body: JSON.stringify(qpayBody),
    });
    httpStatus = res.status;
    invoiceParsed = res.data;
    if (httpStatus >= 400) {
      return { status: httpStatus, payload: { error: 'QPay invoice request failed', details: invoiceParsed } };
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { status: 502, payload: { error: 'QPay invoice failed', details: msg } };
  }

  const invoiceId = extractInvoiceIdFromQPayInvoiceResponse(invoiceParsed);
  if (!invoiceId) {
    return { status: 502, payload: { error: 'invoice_id missing from QPay response', details: invoiceParsed } };
  }

  try {
    await savePendingQPayEvent({
      invoiceId,
      userId: uid,
      orderId,
      amount,
      description,
      senderBranchCode,
      intent,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[QPay invoice] failed to persist payment intent:', msg);
    return { status: 500, payload: { error: 'failed to persist payment intent', details: msg } };
  }

  return { status: 200, payload: invoiceParsed };
}
