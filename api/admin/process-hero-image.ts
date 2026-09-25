import { assertMethod, getBody, jsonResponse } from '../qpay/_lib.js';
import { getServerAuth, getServerFirestore } from '../../lib/server/firebaseAdmin.js';
import { generateResponsiveVariants } from '../../lib/server/imageVariants.js';

export const config = {
  runtime: 'nodejs',
};

/**
 * Regenerates the responsive AVIF/WebP srcset for the homepage hero image
 * (siteContent/homeHero) — same gap as class cover images: a single
 * full-resolution admin upload with no responsive sizing, on the single
 * most prominent image on the site.
 */
export default async function handler(req: any, res: any) {
  if (!assertMethod(req, res, 'POST')) return;

  try {
    const body = getBody(req);
    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';

    if (!idToken) {
      return jsonResponse(res, 400, { error: 'idToken is required' });
    }

    const auth = getServerAuth();
    const decoded = await auth.verifyIdToken(idToken);
    const db = getServerFirestore();

    const callerSnap = await db.collection('users').doc(decoded.uid).get();
    if (String(callerSnap.data()?.role || '') !== 'admin') {
      return jsonResponse(res, 403, { error: 'Forbidden: Only administrators can process the hero image' });
    }

    const heroRef = db.collection('siteContent').doc('homeHero');
    const heroSnap = await heroRef.get();
    if (!heroSnap.exists) {
      return jsonResponse(res, 404, { error: 'Hero content not found' });
    }

    const imageUrl = String(heroSnap.data()?.image || '').trim();
    if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
      return jsonResponse(res, 200, { ok: true, skipped: true });
    }

    const response = await fetch(imageUrl);
    if (!response.ok) {
      return jsonResponse(res, 502, { error: 'Failed to download source image' });
    }
    const buffer = Buffer.from(await response.arrayBuffer());

    // A version segment (not just a fixed filename) so a later re-upload
    // gets fresh URLs instead of overwriting bytes at a URL already cached
    // as immutable by browsers/CDNs.
    const variants = await generateResponsiveVariants(buffer, `images/hero/home-hero-${Date.now()}`);
    await heroRef.update({
      imageAvifSrcSet: variants.avifSrcSet,
      imageWebpSrcSet: variants.webpSrcSet,
    });

    return jsonResponse(res, 200, { ok: true, ...variants });
  } catch (error) {
    console.error('[api/admin/process-hero-image] Error:', error);
    return jsonResponse(res, 500, { error: 'Failed to process hero image' });
  }
}
