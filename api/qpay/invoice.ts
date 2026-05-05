import { assertMethod, getBody, jsonResponse } from './_lib';
import { handleCreateInvoiceRequest } from '../../lib/server/qpayCreateInvoice';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'POST')) return;

  try {
    const { status, payload } = await handleCreateInvoiceRequest(getBody(req) as Record<string, unknown>);
    return jsonResponse(res, status, payload);
  } catch (error) {
    console.error('[api/qpay/invoice]', error);
    return jsonResponse(res, 500, {
      error: 'invoice handler failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
