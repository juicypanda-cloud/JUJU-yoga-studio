import { assertMethod, getErrorMessage, getValidatedQPayUrl, jsonResponse } from './_lib.js';

export const config = {
  runtime: 'nodejs',
};

function parseJsonSafe(text: string): Record<string, unknown> {
  if (!text.trim()) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { raw: text };
  }
}

async function fetchQPayToken() {
  const clientId = process.env.QPAY_CLIENT_ID;
  const clientSecret = process.env.QPAY_CLIENT_SECRET;
  const tokenUrl = getValidatedQPayUrl('https://merchant.qpay.mn/v2/auth/token');

  if (!clientId || !clientSecret) {
    throw new Error('Missing QPAY_CLIENT_ID or QPAY_CLIENT_SECRET');
  }

  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch(tokenUrl, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${basicAuth}`,
    },
  });

  const tokenText = await response.text();
  console.log('[QPay] token response status:', response.status);
  console.log('[QPay] token response text:', tokenText);

  const tokenParsed = parseJsonSafe(tokenText);
  if (!response.ok) {
    return {
      ok: false as const,
      status: response.status,
      parsed: tokenParsed,
      message: 'QPay token request failed',
    };
  }

  const accessToken = typeof tokenParsed.access_token === 'string' ? tokenParsed.access_token : null;
  if (!accessToken) {
    return {
      ok: false as const,
      status: 502,
      parsed: tokenParsed,
      message: 'QPay token missing access_token',
    };
  }

  return {
    ok: true as const,
    status: response.status,
    accessToken,
    parsed: tokenParsed,
  };
}

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'POST')) return;

  try {
    const invoiceCode = process.env.QPAY_INVOICE_CODE;
    const callbackUrl = process.env.QPAY_CALLBACK_URL;
    const invoiceUrl = getValidatedQPayUrl('https://merchant.qpay.mn/v2/invoice');

    if (!invoiceCode || !callbackUrl) {
      return jsonResponse(res, 500, {
        error: 'Missing QPAY_INVOICE_CODE or QPAY_CALLBACK_URL',
      });
    }

    const tokenResult = await fetchQPayToken();
    if (!tokenResult.ok) {
      return jsonResponse(res, tokenResult.status, {
        error: tokenResult.message,
        details: tokenResult.parsed,
      });
    }

    const senderInvoiceNo = String(Date.now());
    const payload = {
      invoice_code: invoiceCode,
      sender_invoice_no: senderInvoiceNo,
      invoice_receiver_code: 'terminal',
      invoice_description: 'Yoga payment',
      amount: 45000,
      callback_url: callbackUrl,
    };
    console.log('[QPay] invoice request body:', payload);

    const invoiceResponse = await fetch(invoiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${tokenResult.accessToken}`,
      },
      body: JSON.stringify(payload),
    });

    const invoiceText = await invoiceResponse.text();
    console.log('[QPay] invoice response status:', invoiceResponse.status);
    console.log('[QPay] invoice response text:', invoiceText);
    const invoiceParsed = parseJsonSafe(invoiceText);

    if (!invoiceResponse.ok) {
      return jsonResponse(res, invoiceResponse.status, {
        error: 'QPay invoice request failed',
        details: invoiceParsed,
      });
    }

    return jsonResponse(res, 200, invoiceParsed);
  } catch (error) {
    console.error('QPay invoice create failed:', error);
    return jsonResponse(res, 500, {
      error: 'QPay invoice create failed',
      details: getErrorMessage(error),
    });
  }
}
