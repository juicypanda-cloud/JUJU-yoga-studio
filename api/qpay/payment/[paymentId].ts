import { assertMethod, jsonResponse } from '../_lib.js';
import { getServerAuth, getServerFirestore } from '../../../lib/server/firebaseAdmin.js';
import { QPAY_EVENTS_COLLECTION } from '../../../lib/server/qpayWebhookCore.js';

export const config = {
  runtime: 'nodejs',
};

export async function handlePaymentDetailRequest(paymentId: string, authHeader?: string, idTokenQuery?: string): Promise<{ status: number; payload: Record<string, unknown> }> {
  if (!paymentId) {
    return { status: 400, payload: { error: 'paymentId is required' } };
  }

  let idToken = idTokenQuery ? idTokenQuery.trim() : '';
  if (!idToken && authHeader?.startsWith('Bearer ')) {
    idToken = authHeader.slice(7).trim();
  }

  if (!idToken) {
    return { status: 401, payload: { error: 'Authentication required' } };
  }

  const auth = getServerAuth();
  const decoded = await auth.verifyIdToken(idToken);
  const uid = decoded.uid;

  const db = getServerFirestore();
  const eventSnap = await db.collection(QPAY_EVENTS_COLLECTION).doc(paymentId).get();

  if (!eventSnap.exists) {
    return { status: 404, payload: { error: 'Payment record not found' } };
  }

  const eventData = eventSnap.data() as Record<string, unknown>;
  const userSnap = await db.collection('users').doc(uid).get();
  const role = String(userSnap.data()?.role || '');

  const isOwner = String(eventData.userId || '') === uid;
  const isAdmin = role === 'admin';

  if (!isOwner && !isAdmin) {
    return { status: 403, payload: { error: 'Forbidden: Access denied' } };
  }

  // Return ONLY client-safe summary, strictly omitting internal QPay tokens or merchant credentials
  return {
    status: 200,
    payload: {
      ok: true,
      paymentId: eventData.invoiceId || paymentId,
      status: eventData.status || 'pending',
      amount: eventData.amount || 0,
      currency: eventData.currency || 'MNT',
      processed: Boolean(eventData.processed),
    },
  };
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'GET')) return;

  try {
    const rawId = req.query?.paymentId;
    const paymentId = Array.isArray(rawId) ? rawId[0] : rawId;
    const authHeader = typeof req.headers?.authorization === 'string' ? req.headers.authorization : undefined;
    const idTokenQuery = typeof req.query?.idToken === 'string' ? req.query.idToken : undefined;

    const { status, payload } = await handlePaymentDetailRequest(String(paymentId || ''), authHeader, idTokenQuery);
    return jsonResponse(res, status, payload);
  } catch (error) {
    return jsonResponse(res, 500, { error: 'QPay payment query failed' });
  }
}

