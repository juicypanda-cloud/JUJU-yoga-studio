import {
  assertMethod,
  assertQPayInvoiceConfig,
  getBody,
  getErrorMessage,
  getQPayInvoiceConfig,
  jsonResponse,
  qpayRequest,
} from './_lib.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'POST')) return;

  try {
    assertQPayInvoiceConfig();
    const { invoiceCode, callbackUrl } = getQPayInvoiceConfig();

    const body = getBody(req);
    const amount = Number(body.amount ?? 0);
    const orderId = body.orderId;

    if (!amount || amount <= 0) {
      return jsonResponse(res, 400, { error: 'amount must be a positive number' });
    }
    if (!orderId || typeof orderId !== 'string') {
      return jsonResponse(res, 400, { error: 'orderId is required' });
    }

    const payload = {
      invoice_code: invoiceCode,
      sender_invoice_no: orderId,
      invoice_receiver_code: typeof body.receiverCode === 'string' ? body.receiverCode : 'terminal',
      sender_branch_code: typeof body.senderBranchCode === 'string' ? body.senderBranchCode : 'ONLINE',
      invoice_description: typeof body.description === 'string' ? body.description : `Order ${orderId}`,
      amount,
      callback_url: `${callbackUrl}?orderId=${encodeURIComponent(orderId)}`,
      ...(body.receiverData && typeof body.receiverData === 'object'
        ? { invoice_receiver_data: body.receiverData }
        : {}),
    };

    const { status, data } = await qpayRequest<Record<string, unknown>>('/v2/invoice', {
      method: 'POST',
      body: JSON.stringify(payload),
    });

    return jsonResponse(res, status, data);
  } catch (error) {
    console.error('QPay invoice create failed:', error);
    return jsonResponse(res, 500, {
      error: 'QPay invoice create failed',
      details: getErrorMessage(error),
    });
  }
}
