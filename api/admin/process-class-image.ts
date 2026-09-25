import { assertMethod, getBody, jsonResponse } from '../qpay/_lib.js';
import { getServerAuth, getServerFirestore } from '../../lib/server/firebaseAdmin.js';
import { generateResponsiveVariants } from '../../lib/server/imageVariants.js';

export const config = {
  runtime: 'nodejs',
};

/**
 * Regenerates the responsive AVIF/WebP srcset for one class's cover image.
 * Admin-uploaded class images live in Firebase Storage as a single
 * full-resolution file (see MediaLibrary.tsx) with no responsive sizing —
 * this fills that gap for a specific class, called after ClassesAdmin saves
 * a new/changed cover image.
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'POST')) return;

  try {
    const body = getBody(req);
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
    const classId = typeof body.classId === 'string' ? body.classId.trim() : '';

    if (!idToken || !classId) {
      return jsonResponse(res, 400, { error: 'idToken and classId are required' });
    }

    const auth = getServerAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const db = getServerFirestore();

    const callerSnap = await db.collection('users').doc(decoded.uid).get();
    if (String(callerSnap.data()?.role || '') !== 'admin') {
      return jsonResponse(res, 403, { error: 'Forbidden: Only administrators can process class images' });
    }

    const classRef = db.collection('classes').doc(classId);
    const classSnap = await classRef.get();
    if (!classSnap.exists) {
      return jsonResponse(res, 404, { error: 'Class not found' });
    }

    const imageUrl = String(classSnap.data()?.image || '').trim();
    if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
      return jsonResponse(res, 200, { ok: true, skipped: true });
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return jsonResponse(res, 502, { error: 'Failed to download source image' });
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    const variants = await generateResponsiveVariants(buffer, `images/classes/${classId}/cover`);
    await classRef.update({
      imageAvifSrcSet: variants.avifSrcSet,
      imageWebpSrcSet: variants.webpSrcSet,
    });

    return jsonResponse(res, 200, { ok: true, ...variants });
  } catch (error) {
    console.error('[api/admin/process-class-image] Error:', error);
    return jsonResponse(res, 500, { error: 'Failed to process class image' });
  }
}
