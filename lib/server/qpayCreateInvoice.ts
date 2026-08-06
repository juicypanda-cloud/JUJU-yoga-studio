import { assertQPayInvoiceConfig, getQPayInvoiceConfig, qpayRequest } from '../../api/qpay/_lib.js';
import { getServerAuth, getServerFirestore } from './firebaseAdmin.js';
import { extractInvoiceIdFromQPayInvoiceResponse, savePendingQPayEvent, type PaymentIntent } from './qpayWebhookCore.js';
import { classData as staticClasses } from '../../src/data/classes.js';

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
    const classSnap = await db.collection('classes').doc(intent.classId).get();
    let price: number | undefined;
    let title = 'Yoga Class';

    if (classSnap.exists) {
      const d = classSnap.data() as Record<string, unknown>;
      title = String(d.title || title);
      if (typeof d.price === 'number') {
        price = d.price;
      }
    } else {
      const staticMatch = staticClasses.find((c) => c.id === intent.classId);
      if (staticMatch) {
        title = staticMatch.title;
        price = (staticMatch as any).price ?? 0;
      }
    }

    if (price === undefined || price < 0) {
      throw new Error('INVALID_PRODUCT');
    }

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
    const scheduleSnap = await db.collection('schedule').doc(intent.scheduleId).get();
    if (!scheduleSnap.exists) {
      throw new Error('INVALID_SCHEDULE');
    }
    const sData = scheduleSnap.data() as Record<string, unknown>;
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
    let price = 0;
    let title = String(sData.className || 'Schedule Slot');

    if (classId) {
      const classSnap = await db.collection('classes').doc(classId).get();
      if (classSnap.exists) {
        const cData = classSnap.data() as Record<string, unknown>;
        if (typeof cData.price === 'number') price = cData.price;
        if (cData.title) title = String(cData.title);
      }
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

    // Security boundary: Authenticate user using Firebase Admin Auth
    let uid: string;
    try {
      const decoded = await getServerAuth().verifyIdToken(idToken);
      uid = decoded.uid;
    } catch (authErr) {
      console.error('[QPay invoice] Invalid ID token:', authErr);
      return { status: 401, payload: { error: 'Invalid authentication token' } };
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

    // Security boundary: Calculate item price & duration server-side, ignoring client-provided amount
    let itemDetails: { amount: number; validatedIntent: PaymentIntent; description: string };
    try {
      itemDetails = await resolveServerItemPriceAndIntent(rawIntent);
    } catch (itemErr: any) {
      const code = itemErr?.message || '';
      console.error('[QPay invoice] Item resolution failed:', code);
      if (code === 'SLOT_FULL') {
        return { status: 400, payload: { error: 'The selected class slot is fully booked' } };
      }
      return { status: 400, payload: { error: 'Invalid, inactive, or unavailable product requested' } };
    }

    const { amount, validatedIntent, description } = itemDetails;

    // Handle free ($0) items directly server-side without generating QPay invoice
    if (amount === 0) {
      const db = getServerFirestore();
      if (validatedIntent.kind === 'class_month') {
        const bookingId = `free_${uid}_${validatedIntent.classId}_${validatedIntent.monthKey}`;
        await db.collection('bookings').doc(bookingId).set({
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
        return { status: 200, payload: { free: true, fulfilled: true, bookingId } };
      }
    }

    const { invoiceCode, callbackUrl } = getQPayInvoiceConfig();
    const receiverCode = typeof body.receiverCode === 'string' ? body.receiverCode : 'terminal';
    const senderBranchCode = typeof body.senderBranchCode === 'string' ? body.senderBranchCode : 'ONLINE';
    const receiverData = body.receiverData && typeof body.receiverData === 'object' ? body.receiverData : undefined;

    const qpayBody = {
      invoice_code: invoiceCode,
      sender_invoice_no: senderInvoiceNo,
      invoice_receiver_code: receiverCode,
      sender_branch_code: senderBranchCode,
      invoice_description: description,
      amount,
      callback_url: `${callbackUrl}?orderId=${encodeURIComponent(senderInvoiceNo)}`,
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
