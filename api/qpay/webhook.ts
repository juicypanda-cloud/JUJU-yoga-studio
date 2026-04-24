import { assertMethod, extractInvoiceId, getBody, jsonResponse, qpayRequest } from './_lib.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'POST')) return;

  try {
    const payload = getBody(req);
    console.log('QPay webhook received:', payload);

    const invoiceId = extractInvoiceId(payload);
    if (!invoiceId) {
      return jsonResponse(res, 200, {
        ok: true,
        checked: false,
        reason: 'invoice_id not found in callback payload',
      });
    }

    const { status, data } = await qpayRequest<Record<string, unknown>>('/v2/payment/check', {
      method: 'POST',
      body: JSON.stringify({
        object_type: 'INVOICE',
        object_id: invoiceId,
        offset: { page_number: 1, page_limit: 100 },
      }),
    });

    return jsonResponse(res, 200, {
      ok: true,
      checked: true,
      invoiceId,
      qpayStatus: status,
      paymentCheck: data,
    });
  } catch (error) {
    console.error('QPay webhook handling failed:', error);
    return jsonResponse(res, 500, { error: 'QPay webhook handling failed' });
  }
}
