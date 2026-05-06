import { assertMethod, getBody, jsonResponse } from './_lib.js';
import { getServerAuth, getServerFirestore } from '../../lib/server/firebaseAdmin.js';
import { processQPayWebhook, QPAY_EVENTS_COLLECTION } from '../../lib/server/qpayWebhookCore.js';

export const config = {
  runtime: 'nodejs',
};

/**
 * Re-run QPay payment/check + fulfillment for a stuck `qpayEvents` row (e.g. webhook raced or missed).
 * Caller must be the paying user or an admin.
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'POST')) return;

  try {
    const body = getBody(req);
    const idToken = typeof body.idToken === 'string' ? body.idToken : '';
    const invoiceId = typeof body.invoiceId === 'string' ? body.invoiceId.trim() : '';
    if (!idToken || !invoiceId) {
      return jsonResponse(res, 400, { error: 'idToken and invoiceId are required' });
    }

    const auth = getServerAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const db = getServerFirestore();
    const eventRef = db.collection(QPAY_EVENTS_COLLECTION).doc(invoiceId);
    const evSnap = await eventRef.get();
    if (!evSnap.exists) {
      return jsonResponse(res, 404, { error: 'payment event not found' });
    }

    const ev = evSnap.data() as Record<string, unknown>;
    const uid = decoded.uid;
    const userSnap = await db.collection('users').doc(uid).get();
    const role = String(userSnap.data()?.role || '');
    const isAdmin = role === 'admin';
    const isOwner = String(ev.userId || '') === uid;

    if (!isOwner && !isAdmin) {
      return jsonResponse(res, 403, { error: 'forbidden' });
    }

    const { status, json } = await processQPayWebhook({ invoice_id: invoiceId });
    return jsonResponse(res, status, json);
  } catch (error) {
    console.error('[api/qpay/reconcile]', error);
    return jsonResponse(res, 500, {
      error: 'reconcile failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
