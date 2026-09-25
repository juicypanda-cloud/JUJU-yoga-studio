// One-off/re-runnable backfill: generates the responsive AVIF/WebP srcset for
// the homepage hero image (siteContent/homeHero), same gap as class covers.
// Safe to re-run: always regenerates, never touches the original `image`
// field or deletes anything.
import 'dotenv/config';
import { getServerFirestore } from '../lib/server/firebaseAdmin.ts';
import { generateResponsiveVariants } from '../lib/server/imageVariants.ts';

const run = async () => {
  const db = getServerFirestore();
  const heroRef = db.collection('siteContent').doc('homeHero');
  const heroSnap = await heroRef.get();

  if (!heroSnap.exists) {
    console.log('No siteContent/homeHero doc found.');
    return;
  }

  const imageUrl = String(heroSnap.data()?.image || '').trim();
  if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
    console.log('Hero image is not a Firebase Storage URL, skipping:', imageUrl);
    return;
  }

  const response = await fetch(imageUrl);
  if (!response.ok) {
    throw new Error(`Download failed: ${response.status}`);
  }
  const buffer = Buffer.from(await response.arrayBuffer());

  const variants = await generateResponsiveVariants(buffer, `images/hero/home-hero-${Date.now()}`);
  await heroRef.update({
    imageAvifSrcSet: variants.avifSrcSet,
    imageWebpSrcSet: variants.webpSrcSet,
  });

  console.log('✅ Hero image variants generated');
  console.log('avif:', variants.avifSrcSet);
  console.log('webp:', variants.webpSrcSet);
};

run().catch((error) => {
  console.error('Hero image migration failed:', error);
  process.exit(1);
});
