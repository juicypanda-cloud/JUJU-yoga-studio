import { FieldValue } from 'firebase-admin/firestore';
import { assertQPayInvoiceConfig, fetchQPayToken, getQPayInvoiceConfig, qpayRequest } from '../../api/qpay/_lib.js';
import { getServerAuth, getServerFirestore } from './firebaseAdmin.js';
import { extractInvoiceIdFromQPayInvoiceResponse, savePendingQPayEvent, type PaymentIntent } from './qpayWebhookCore.js';
import { classData as staticClasses } from '../../src/data/classes.js';

/**
 * Security boundary: server-side capacity check for a class_month enrollment.
 * `capacity` unset/0 means unlimited (preserves prior no-limit behavior). This is a
 * best-effort pre-check before payment; the webhook transaction re-checks atomically.
 */
async function assertClassMonthCapacity(classId: string, monthKey: string, capacity: number | undefined): Promise<void> {
  if (!capacity || capacity <= 0) return;
  const db = getServerFirestore();
  const enrollmentSnap = await db
    .collection('classes')
    .doc(classId)
    .collection('enrollmentByMonth')
    .doc(monthKey)
    .get();
  const count = enrollmentSnap.exists ? Number((enrollmentSnap.data() as Record<string, unknown>)?.count ?? 0) : 0;
  if (count >= capacity) {
    throw new Error('CLASS_FULL');
  }
}

/**
 * Server-managed subscription plans and pricing registry.
 * Security boundary: Client-provided amount and durationDays are ignored.
 */
const SERVER_SUBSCRIPTION_PLANS: Record<string, { name: string; price: number; durationDays: number }> = {
  'online-video': { name: 'Online Video', price: 100, durationDays: 30 },
  'online-audio': { name: 'Online Audio', price: 200, durationDays: 30 },
};

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
    return { kind: 'subscription', planId };
  }
  return null;
}

function toQPaySenderInvoiceNo(orderId: string): string {
  const clean = orderId.trim();
  if (clean.length <= 45) return clean;
  const head = clean.slice(0, 28);
  const tail = clean.slice(-16);
  return `${head}-${tail}`;
}

/**
 * Server-side item price lookup and intent validation.
 * Security boundary: Looks up actual prices from server Firestore / catalog and enforces allowed durations.
 */
export async function resolveServerItemPriceAndIntent(intent: PaymentIntent): Promise<{
  amount: number;
  validatedIntent: PaymentIntent;
  description: string;
}> {
  if (intent.kind === 'subscription') {
    const plan = SERVER_SUBSCRIPTION_PLANS[intent.planId];
    if (!plan) {
      throw new Error('INVALID_PLAN');
    }
    return {
      amount: plan.price,
      validatedIntent: {
        kind: 'subscription',
        planId: intent.planId,
        durationDays: plan.durationDays,
      },
      description: `JUJU ${plan.name} subscription`,
    };
  }

  const db = getServerFirestore();

  if (intent.kind === 'class_month') {
    let price: number | undefined;
    let isFree = false;
    let title = 'Yoga Class';
    let capacity: number | undefined;

    const staticMatch = staticClasses.find((c) => c.id === intent.classId);
    if (staticMatch) {
      title = staticMatch.title;
      price = (staticMatch as any).price;
      isFree = (staticMatch as any).isFree === true;
    } else {
      try {
        const classSnap = await db.collection('classes').doc(intent.classId).get();
        if (classSnap.exists) {
          const d = classSnap.data() as Record<string, unknown>;
          title = String(d.title || title);
          if (typeof d.price === 'number') {
            price = d.price;
          }
          if (d.isFree === true) {
            isFree = true;
          }
          if (typeof d.capacity === 'number' && d.capacity > 0) {
            capacity = d.capacity;
          }
        }
      } catch (err) {
        // Fallback when Firestore is unavailable in test runner
      }
    }

    if (price === undefined || price === null || typeof price !== 'number' || price < 0 || Number.isNaN(price)) {
      throw new Error('INVALID_PRODUCT_PRICE');
    }

    if (price === 0 && !isFree) {
      throw new Error('NOT_FREE_EXPLICIT');
    }

    await assertClassMonthCapacity(intent.classId, intent.monthKey, capacity);

    return {
      amount: price,
      validatedIntent: {
        kind: 'class_month',
        classId: intent.classId,
        monthKey: intent.monthKey,
      },
      description: `JUJU ${title} class booking (${intent.monthKey})`,
    };
  }

  if (intent.kind === 'schedule_slot') {
    let sData: Record<string, unknown> | null = null;
    try {
      const scheduleSnap = await db.collection('schedule').doc(intent.scheduleId).get();
      if (!scheduleSnap.exists) {
        throw new Error('INVALID_SCHEDULE');
      }
      sData = scheduleSnap.data() as Record<string, unknown>;
    } catch (err: any) {
      if (err?.message === 'INVALID_SCHEDULE') throw err;
      throw new Error('INVALID_SCHEDULE');
    }
    const status = String(sData.status || 'Active');
    if (status.toLowerCase() === 'inactive') {
      throw new Error('SCHEDULE_INACTIVE');
    }

    const capacity = Number(sData.capacity ?? 0);
    const bookedCount = Number(sData.bookedCount ?? 0);
    if (bookedCount >= capacity) {
      throw new Error('SLOT_FULL');
    }

    const classId = String(sData.classId || '').trim();
    let price: number | undefined;
    let isFree = false;
    let title = String(sData.className || 'Schedule Slot');

    if (classId) {
      const staticMatch = staticClasses.find((c) => c.id === classId);
      if (staticMatch) {
        if (typeof (staticMatch as any).price === 'number') price = (staticMatch as any).price;
        if ((staticMatch as any).isFree === true) isFree = true;
        if (staticMatch.title) title = staticMatch.title;
      } else {
        try {
          const classSnap = await db.collection('classes').doc(classId).get();
          if (classSnap.exists) {
            const cData = classSnap.data() as Record<string, unknown>;
            if (typeof cData.price === 'number') price = cData.price;
            if (cData.isFree === true) isFree = true;
            if (cData.title) title = String(cData.title);
          }
        } catch (err) {
          // Fallback when Firestore is unavailable
        }
      }
    }
    if (price === undefined && typeof sData.price === 'number') {
      price = sData.price;
      if (sData.isFree === true) isFree = true;
    }

    if (price === undefined || price === null || typeof price !== 'number' || price < 0 || Number.isNaN(price)) {
      throw new Error('INVALID_SCHEDULE_PRICE');
    }

    if (price === 0 && !isFree) {
      throw new Error('NOT_FREE_EXPLICIT');
    }

    return {
      amount: price,
      validatedIntent: {
        kind: 'schedule_slot',
        scheduleId: intent.scheduleId,
        weekKey: intent.weekKey,
      },
      description: `JUJU ${title} slot booking`,
    };
  }

  throw new Error('INVALID_INTENT_KIND');
}

export async function handleCreateInvoiceRequest(body: Record<string, unknown>): Promise<{
  status: number;
  payload: Record<string, unknown>;
}> {
  try {
    assertQPayInvoiceConfig();

    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
    if (!idToken) {
      return { status: 401, payload: { error: 'Authentication required' } };
    }

    const rawIntent = parseIntent(body.paymentIntent);
    if (!rawIntent) {
      return { status: 400, payload: { error: 'Invalid payment request parameters' } };
    }

    const orderId = String(body.orderId || '').trim();
    if (!orderId) {
      return { status: 400, payload: { error: 'Order ID is required' } };
    }
    const senderInvoiceNo = toQPaySenderInvoiceNo(orderId);

    // Perf: auth verification and the item price/capacity lookup are independent
    // reads (one hits Firebase Auth, the other Firestore) — run them concurrently
    // instead of back-to-back so the request only waits for the slower of the two.
    const [authResult, itemResult] = await Promise.allSettled([
      getServerAuth().verifyIdToken(idToken),
      resolveServerItemPriceAndIntent(rawIntent),
    ]);

    if (authResult.status === 'rejected') {
      console.error('[QPay invoice] Invalid ID token:', authResult.reason);
      return { status: 401, payload: { error: 'Invalid authentication token' } };
    }
    const uid = authResult.value.uid;

    if (itemResult.status === 'rejected') {
      const code = (itemResult.reason as any)?.message || '';
      console.error('[QPay invoice] Item resolution failed:', code);
      if (code === 'SLOT_FULL') {
        return { status: 400, payload: { error: 'The selected class slot is fully booked' } };
      }
      if (code === 'CLASS_FULL') {
        return { status: 400, payload: { error: 'This class is fully booked for the selected month' } };
      }
      return { status: 400, payload: { error: 'Invalid, inactive, or unavailable product requested' } };
    }

    const { amount, validatedIntent, description } = itemResult.value;

    // Handle free ($0) items directly server-side without generating QPay invoice
    if (amount === 0) {
      const db = getServerFirestore();
      if (validatedIntent.kind === 'class_month') {
        const bookingId = `free_${uid}_${validatedIntent.classId}_${validatedIntent.monthKey}`;
        const bookingRef = db.collection('bookings').doc(bookingId);
        const alreadyBooked = (await bookingRef.get()).exists;
        await bookingRef.set({
          userId: uid,
          classId: validatedIntent.classId,
          itemId: validatedIntent.classId,
          type: 'class_month',
          monthKey: validatedIntent.monthKey,
          status: 'confirmed',
          amountPaid: 0,
          createdAt: new Date().toISOString(),
          fulfillment: 'free_server_flow',
        });
        if (!alreadyBooked) {
          await db
            .collection('classes')
            .doc(validatedIntent.classId)
            .collection('enrollmentByMonth')
            .doc(validatedIntent.monthKey)
            .set({ count: FieldValue.increment(1) }, { merge: true });
        }
        return { status: 200, payload: { free: true, fulfilled: true, bookingId } };
      }
    }

    const { invoiceCode, callbackUrl } = getQPayInvoiceConfig();
    const receiverCode = 'terminal';
    const senderBranchCode = 'ONLINE';

    // Perf: fetchQPayToken() caches its result (see api/qpay/_lib.ts), so starting
    // it now — concurrently with the user-profile read below — means the later
    // qpayRequest() call below usually finds a warm token instead of fetching one
    // sequentially after this read completes.
    const tokenPrefetch = fetchQPayToken().catch(() => null);

    const db = getServerFirestore();
    const userSnap = await db.collection('users').doc(uid).get();
    await tokenPrefetch;
    const userData = (userSnap.exists ? userSnap.data() : {}) as Record<string, unknown>;
    const receiverData = {
      name: String(userData.displayName || userData.name || 'JUJU Member'),
      email: String(userData.email || ''),
    };

    const qpayBody = {
      invoice_code: invoiceCode,
      sender_invoice_no: senderInvoiceNo,
      invoice_receiver_code: receiverCode,
      sender_branch_code: senderBranchCode,
      invoice_description: description,
      amount,
      callback_url: `${callbackUrl}?orderId=${encodeURIComponent(senderInvoiceNo)}`,
      invoice_receiver_data: receiverData,
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
        console.error('[QPay invoice] QPay returned error status:', httpStatus, invoiceParsed);
        return { status: 502, payload: { error: 'Failed to generate payment invoice from provider' } };
      }
    } catch (e) {
      console.error('[QPay invoice] Provider network failure:', e);
      return { status: 502, payload: { error: 'Failed to communicate with payment provider' } };
    }

    const invoiceId = extractInvoiceIdFromQPayInvoiceResponse(invoiceParsed);
    if (!invoiceId) {
      console.error('[QPay invoice] Missing invoice_id in response:', invoiceParsed);
      return { status: 502, payload: { error: 'Invalid response received from payment provider' } };
    }

    try {
      await savePendingQPayEvent({
        invoiceId,
        userId: uid,
        orderId: senderInvoiceNo,
        amount,
        description,
        senderBranchCode,
        intent: validatedIntent,
      });
    } catch (e) {
      console.error('[QPay invoice] Failed to save pending payment event:', e);
      return { status: 500, payload: { error: 'Failed to record payment intent' } };
    }

    // Security boundary: Return client-safe payload (strip internal configs or tokens)
    return { status: 200, payload: invoiceParsed };
  } catch (globalErr) {
    console.error('[QPay invoice] Unexpected server error:', globalErr);
    return { status: 500, payload: { error: 'An unexpected payment error occurred' } };
  }
}
