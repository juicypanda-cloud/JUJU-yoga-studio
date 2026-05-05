import { assertMethod, jsonResponse, qpayRequest } from '../_lib';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'GET')) return;

  try {
    const paymentId = req.query?.paymentId;
    const id = Array.isArray(paymentId) ? paymentId[0] : paymentId;

    if (!id || typeof id !== 'string') {
      return jsonResponse(res, 400, { error: 'paymentId is required' });
    }

    const { status, data } = await qpayRequest<Record<string, unknown>>(`/v2/payment/${id}`, {
      method: 'GET',
    });

    return jsonResponse(res, status, data);
  } catch (error) {
    console.error('QPay payment get failed:', error);
    return jsonResponse(res, 500, { error: 'QPay payment get failed' });
  }
}
