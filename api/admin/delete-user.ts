import { assertMethod, getBody, jsonResponse } from '../qpay/_lib.js';
import { getServerAuth, getServerFirestore } from '../../lib/server/firebaseAdmin.js';

export const config = {
  runtime: 'nodejs',
};

/**
 * Security boundary: Secure server-only user deletion. Requires caller to be an
 * authenticated admin. Deletes both the Firestore profile and the Firebase Auth
 * account so a "deleted" user can't still sign back in.
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'POST')) return;

  try {
    const body = getBody(req);
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';

    if (!idToken || !targetUserId) {
      return jsonResponse(res, 400, { error: 'idToken and targetUserId are required' });
    }

    const auth = getServerAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const db = getServerFirestore();

    const callerSnap = await db.collection('users').doc(decoded.uid).get();
    if (String(callerSnap.data()?.role || '') !== 'admin') {
      return jsonResponse(res, 403, { error: 'Forbidden: Only administrators can delete users' });
    }

    if (targetUserId === decoded.uid) {
      return jsonResponse(res, 400, { error: 'Cannot delete your own account' });
    }

    await db.collection('users').doc(targetUserId).delete();

    try {
      await auth.deleteUser(targetUserId);
    } catch (authErr: any) {
      // A profile doc without a matching Auth account is fine to treat as already deleted.
      if (authErr?.code !== 'auth/user-not-found') {
        throw authErr;
      }
    }

    return jsonResponse(res, 200, { ok: true, userId: targetUserId });
  } catch (error) {
    console.error('[api/admin/delete-user] Error:', error);
    return jsonResponse(res, 500, { error: 'User deletion failed' });
  }
}
