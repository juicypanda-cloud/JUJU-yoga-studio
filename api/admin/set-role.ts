import { assertMethod, getBody, jsonResponse } from '../qpay/_lib.js';
import { getServerAuth, getServerFirestore } from '../../lib/server/firebaseAdmin.js';

export const config = {
  runtime: 'nodejs',
};

/**
 * Security boundary: Secure server-only workflow for user role updates.
 * Requires caller to be an authenticated admin. Uses Firebase Admin SDK to write to Firestore.
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'POST')) return;

  try {
    const body = getBody(req);
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
    const targetUserId = typeof body.targetUserId === 'string' ? body.targetUserId.trim() : '';
    const newRole = typeof body.newRole === 'string' ? body.newRole.trim() : '';

    if (!idToken || !targetUserId || !newRole) {
      return jsonResponse(res, 400, { error: 'idToken, targetUserId, and newRole are required' });
    }

    const validRoles = ['admin', 'teacher', 'client', 'user'];
    if (!validRoles.includes(newRole)) {
      return jsonResponse(res, 400, { error: 'Invalid role specified' });
    }

    const auth = getServerAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const db = getServerFirestore();

    const callerSnap = await db.collection('users').doc(decoded.uid).get();
    if (String(callerSnap.data()?.role || '') !== 'admin') {
      return jsonResponse(res, 403, { error: 'Forbidden: Only administrators can assign roles' });
    }

    await db.collection('users').doc(targetUserId).update({ role: newRole });

    return jsonResponse(res, 200, { ok: true, userId: targetUserId, role: newRole });
  } catch (error) {
    console.error('[api/admin/set-role] Error:', error);
    return jsonResponse(res, 500, { error: 'Role update failed' });
  }
}
