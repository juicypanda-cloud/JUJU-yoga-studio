import { FieldValue } from 'firebase-admin/firestore';
import type { DocumentReference, DocumentSnapshot } from 'firebase-admin/firestore';
import { extractInvoiceId, pickString, qpayRequest } from '../../api/qpay/_lib';
import { hasPaidStatus } from '../../src/lib/qpayHelpers';
import { getServerFirestore } from './firebaseAdmin';

export const QPAY_EVENTS_COLLECTION = 'qpayEvents';

export type PaymentIntent =
  | { kind: 'class_month'; classId: string; monthKey: string }
  | { kind: 'schedule_slot'; scheduleId: string; weekKey: string }
  | { kind: 'subscription'; planId: string; durationDays?: number };

/** Stored on Firestore under `paymentIntent` (extensible map). */
export type QPayEventPaymentIntent = {
  kind: string;
  classId?: string;
  monthKey?: string;
  scheduleId?: string;
  weekKey?: string;
  planId?: string;
  durationDays?: number;
};

export function bookingDocIdForInvoice(invoiceId: string): string {
  return `qpay_${String(invoiceId).replace(/\//g, '_')}`;
}

export function serializePaymentIntent(intent: PaymentIntent): QPayEventPaymentIntent {
  if (intent.kind === 'class_month') {
    return { kind: 'class_month', classId: intent.classId, monthKey: intent.monthKey };
  }
  if (intent.kind === 'schedule_slot') {
    return { kind: 'schedule_slot', scheduleId: intent.scheduleId, weekKey: intent.weekKey };
  }
  return { kind: 'subscription', planId: intent.planId, durationDays: intent.durationDays };
}

function parsePaymentIntentFromStored(raw: unknown): PaymentIntent | null {
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

async function fetchQPayPaymentCheckPayload(invoiceId: string): Promise<unknown> {
  const { data } = await qpayRequest<Record<string, unknown>>('/v2/payment/check', {
    method: 'POST',
    body: JSON.stringify({
      object_type: 'INVOICE',
      object_id: invoiceId,
      offset: { page_number: 1, page_limit: 100 },
    }),
  });
  return data;
}

export async function savePendingQPayEvent(params: {
  invoiceId: string;
  userId: string;
  orderId: string;
  amount: number;
  description?: string | null;
  senderBranchCode?: string | null;
  intent: PaymentIntent;
}): Promise<void> {
  const db = getServerFirestore();
  const paymentIntent = serializePaymentIntent(params.intent);
  await db.collection(QPAY_EVENTS_COLLECTION).doc(params.invoiceId).set({
    invoiceId: params.invoiceId,
    userId: params.userId,
    status: 'pending',
    amount: params.amount,
    currency: 'MNT',
    paymentIntent,
    processed: false,
    createdAt: FieldValue.serverTimestamp(),
    paidAt: null,
    metadata: {
      orderId: params.orderId,
      description: params.description ?? null,
      senderBranchCode: params.senderBranchCode ?? null,
    },
  });
}

export async function processQPayWebhook(body: unknown): Promise<{ status: number; json: Record<string, unknown> }> {
  const invoiceId = extractInvoiceId(body);
  if (!invoiceId) {
    return { status: 400, json: { ok: false, error: 'invoice_id missing' } };
  }

  const db = getServerFirestore();
  const eventRef = db.collection(QPAY_EVENTS_COLLECTION).doc(invoiceId);
  const pre = await eventRef.get();
  if (!pre.exists) {
    return { status: 404, json: { ok: false, error: 'payment event not found' } };
  }
  const preData = pre.data() as Record<string, unknown>;
  if (preData.processed === true) {
    return { status: 200, json: { ok: true, idempotent: true, invoiceId } };
  }

  const paidPayload = await fetchQPayPaymentCheckPayload(invoiceId);
  if (!hasPaidStatus(paidPayload)) {
    return { status: 200, json: { ok: true, paid: false, invoiceId } };
  }

  try {
    await db.runTransaction(async (t) => {
      const snap = await t.get(eventRef);
      if (!snap.exists) {
        throw new Error('EVENT_MISSING');
      }
      const d = snap.data() as Record<string, unknown>;
      if (d.processed === true) {
        return;
      }

      const userId = String(d.userId || '');
      if (!userId) {
        throw new Error('USER_ID_MISSING');
      }
      const intent = parsePaymentIntentFromStored(d.paymentIntent);
      if (!intent) {
        throw new Error('INTENT_INVALID');
      }
      const amount = Number(d.amount ?? 0);

      let scheduleRef: DocumentReference | null = null;
      let scheduleSnap: DocumentSnapshot | null = null;
      let userRef: DocumentReference | null = null;
      let userSnap: DocumentSnapshot | null = null;

      if (intent.kind === 'schedule_slot') {
        scheduleRef = db.collection('schedule').doc(intent.scheduleId);
        scheduleSnap = await t.get(scheduleRef);
      } else if (intent.kind === 'subscription') {
        userRef = db.collection('users').doc(userId);
        userSnap = await t.get(userRef);
      }

      // All document reads must complete before any write (Firestore transaction rule).
      t.update(eventRef, {
        status: 'paid',
        processed: true,
        paidAt: FieldValue.serverTimestamp(),
      });

      if (intent.kind === 'class_month') {
        const classId = String(intent.classId || '').trim();
        const monthKey = String(intent.monthKey || '').trim();
        if (!classId) throw new Error('CLASS_ID_MISSING');
        if (!/^\d{4}-\d{2}$/.test(monthKey)) throw new Error('MONTH_KEY_INVALID');
        const bookingRef = db.collection('bookings').doc(bookingDocIdForInvoice(invoiceId));
        t.set(bookingRef, {
          userId,
          classId,
          itemId: classId,
          type: 'class_month',
          monthKey,
          status: 'confirmed',
          invoiceId,
          source: 'class-month',
          amountPaid: amount,
          createdAt: FieldValue.serverTimestamp(),
          fulfillment: 'qpay_webhook',
        });
        return;
      }

      if (intent.kind === 'schedule_slot') {
        const scheduleId = String(intent.scheduleId || '').trim();
        const weekKey = String(intent.weekKey || '').trim();
        if (!scheduleId || !weekKey) throw new Error('SCHEDULE_FIELDS_MISSING');
        if (!scheduleRef || !scheduleSnap) throw new Error('SCHEDULE_READ_MISSING');
        if (!scheduleSnap.exists) {
          throw new Error('SCHEDULE_NOT_FOUND');
        }
        const sData = scheduleSnap.data() as Record<string, unknown>;
        const cap = Number(sData.capacity ?? 0);
        const booked = Number(sData.bookedCount ?? 0);
        if (booked >= cap) {
          throw new Error('CAPACITY_FULL');
        }
        t.update(scheduleRef, { bookedCount: FieldValue.increment(1) });
        const bookingRef = db.collection('bookings').doc(bookingDocIdForInvoice(invoiceId));
        t.set(bookingRef, {
          userId,
          scheduleId,
          type: 'class',
          status: 'confirmed',
          weekKey,
          invoiceId,
          createdAt: FieldValue.serverTimestamp(),
          fulfillment: 'qpay_webhook',
        });
        return;
      }

      if (intent.kind === 'subscription') {
        const planId = String(intent.planId || '').trim();
        if (!planId) throw new Error('PLAN_ID_MISSING');
        if (!userRef || !userSnap) throw new Error('USER_READ_MISSING');
        if (!userSnap.exists) {
          throw new Error('USER_NOT_FOUND');
        }
        const days = Math.max(1, Number(intent.durationDays ?? 30));
        const startIso = new Date().toISOString();
        const endIso = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
        t.update(userRef, {
          subscriptionStatus: 'active',
          subscriptionPlan: planId,
          subscriptionStartDate: startIso,
          subscriptionEndDate: endIso,
        });
        return;
      }

      throw new Error('UNKNOWN_INTENT_KIND');
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error('[QPay webhook] fulfillment failed:', msg, e);
    return { status: 500, json: { ok: false, error: 'fulfillment_failed', detail: msg } };
  }

  return { status: 200, json: { ok: true, paid: true, invoiceId } };
}

export function extractInvoiceIdFromQPayInvoiceResponse(data: Record<string, unknown>): string | null {
  return (
    pickString(data.invoice_id) ??
    pickString(data.invoiceId) ??
    pickString(data.id) ??
    pickString((data.invoice as Record<string, unknown> | undefined)?.invoice_id) ??
    null
  );
}
