import { assertMethod, getBody, jsonResponse, qpayRequest } from '../_lib.js';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'POST')) return;

  try {
    const body = getBody(req);
    const invoiceId = body.invoiceId;
    const pageNumber = Number(body.pageNumber ?? 1);
    const pageLimit = Number(body.pageLimit ?? 100);

    if (!invoiceId || typeof invoiceId !== 'string') {
      return jsonResponse(res, 400, { error: 'invoiceId is required' });
    }

    const { status, data } = await qpayRequest<Record<string, unknown>>('/v2/payment/check', {
      method: 'POST',
      body: JSON.stringify({
        object_type: 'INVOICE',
        object_id: invoiceId,
        offset: { page_number: pageNumber, page_limit: pageLimit },
      }),
    });

    return jsonResponse(res, status, data);
  } catch (error) {
    console.error('QPay payment check failed:', error);
    return jsonResponse(res, 500, { error: 'QPay payment check failed' });
  }
}
