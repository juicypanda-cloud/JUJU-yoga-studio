import { assertMethod, getBody, jsonResponse } from './_lib';
import { processQPayWebhook } from '../../lib/server/qpayWebhookCore';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'POST')) return;

  try {
    const { status, json } = await processQPayWebhook(getBody(req));
    return jsonResponse(res, status, json);
  } catch (error) {
    console.error('[api/qpay/webhook]', error);
    return jsonResponse(res, 500, {
      ok: false,
      error: 'webhook failed',
      details: error instanceof Error ? error.message : String(error),
    });
  }
}
