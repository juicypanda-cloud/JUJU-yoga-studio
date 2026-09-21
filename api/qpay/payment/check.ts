import { assertMethod, getBody, jsonResponse } from '../_lib.js';
import { getServerAuth, getServerFirestore } from '../../../lib/server/firebaseAdmin.js';
import { fetchQPayPaymentCheckWithRetries, hasPaidStatus, QPAY_EVENTS_COLLECTION } from '../../../lib/server/qpayWebhookCore.js';

export const config = {
  runtime: 'nodejs',
};

export async function handlePaymentCheckRequest(body: Record<string, unknown>, authHeader?: string): Promise<{ status: number; payload: Record<string, unknown> }> {
  const invoiceId = typeof body.invoiceId === 'string' ? body.invoiceId.trim() : '';
  let idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
  if (!idToken && authHeader?.startsWith('Bearer ')) {
    idToken = authHeader.slice(7).trim();
  }

  if (!invoiceId) {
    return { status: 400, payload: { error: 'invoiceId is required' } };
  }
  if (!idToken) {
    return { status: 401, payload: { error: 'Authentication required' } };
  }

  const auth = getServerAuth();
  const decoded = await auth.verifyIdToken(idToken);
  const uid = decoded.uid;

  const db = getServerFirestore();
  const eventSnap = await db.collection(QPAY_EVENTS_COLLECTION).doc(invoiceId).get();
  if (!eventSnap.exists) {
    return { status: 404, payload: { error: 'Invoice event not found' } };
  }

  const eventData = eventSnap.data() as Record<string, unknown>;
  const userSnap = await db.collection('users').doc(uid).get();
  const role = String(userSnap.data()?.role || '');

  const isOwner = String(eventData.userId || '') === uid;
  const isAdmin = role === 'admin';

  if (!isOwner && !isAdmin) {
    return { status: 403, payload: { error: 'Forbidden: You can only check your own invoices' } };
  }

  const checkPayload = await fetchQPayPaymentCheckWithRetries(invoiceId);
  const paid = hasPaidStatus(checkPayload);
  const statusStr = paid ? 'paid' : String(eventData.status || 'pending');

  return {
    status: 200,
    payload: {
      ok: true,
      invoiceId,
      paid,
      status: statusStr,
    },
  };
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'POST')) return;

  try {
    const body = getBody(req);
    const authHeader = typeof req.headers?.authorization === 'string' ? req.headers.authorization : undefined;
    const { status, payload } = await handlePaymentCheckRequest(body, authHeader);
    return jsonResponse(res, status, payload);
  } catch (error) {
    return jsonResponse(res, 500, { error: 'Payment check failed' });
  }
}

