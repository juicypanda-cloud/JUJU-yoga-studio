import { assertMethod, assertQPayCredentials, fetchQPayToken, jsonResponse } from './_lib';

export const config = {
  runtime: 'nodejs',
};

export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'POST')) return;

  try {
    assertQPayCredentials();
    const accessToken = await fetchQPayToken(true);
    return jsonResponse(res, 200, {
      access_token: accessToken,
      token_type: 'Bearer',
    });
  } catch (error) {
    console.error('QPay token fetch failed:', error);
    return jsonResponse(res, 500, { error: 'QPay token fetch failed' });
  }
}
