// One-off/re-runnable backfill: generates the responsive AVIF/WebP srcset for
// every class's cover image already in Firebase Storage (admin-uploaded
// images bypass the build-time local-image pipeline entirely — see
// lib/server/imageVariants.ts). Safe to re-run: it always regenerates and
// overwrites, so it's idempotent, and it never touches the original `image`
// field or deletes anything.
import 'dotenv/config';
import { getServerFirestore } from '../lib/server/firebaseAdmin.ts';
import { generateResponsiveVariants } from '../lib/server/imageVariants.ts';

const DRY_RUN = process.argv.includes('--dry-run');

const run = async () => {
  const db = getServerFirestore();
  const snapshot = await db.collection('classes').get();

  console.log(`Found ${snapshot.size} classes.${DRY_RUN ? ' (dry run — no writes)' : ''}`);

  let processed = 0;
  let skipped = 0;
  let failed = 0;

  for (const docSnap of snapshot.docs) {
    const data = docSnap.data();
    const imageUrl = typeof data.image === 'string' ? data.image.trim() : '';

    if (!imageUrl || !imageUrl.includes('firebasestorage.googleapis.com')) {
      console.log(`⏭️  ${docSnap.id} (${data.title || 'untitled'}): no Storage image, skipping`);
      skipped += 1;
      continue;
    }

    if (DRY_RUN) {
      console.log(`🔎 ${docSnap.id} (${data.title || 'untitled'}): would process ${imageUrl}`);
      processed += 1;
      continue;
    }

    try {
      const response = await fetch(imageUrl);
      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }
      const buffer = Buffer.from(await response.arrayBuffer());

      const variants = await generateResponsiveVariants(buffer, `images/classes/${docSnap.id}/cover-${Date.now()}`);
      await docSnap.ref.update({
        imageAvifSrcSet: variants.avifSrcSet,
        imageWebpSrcSet: variants.webpSrcSet,
      });

      console.log(`✅ ${docSnap.id} (${data.title || 'untitled'}): variants generated`);
      processed += 1;
    } catch (error) {
      console.error(`❌ ${docSnap.id} (${data.title || 'untitled'}):`, (error as Error).message);
      failed += 1;
    }
  }

  console.log('\nMigration summary');
  console.log(`- processed: ${processed}`);
  console.log(`- skipped (no Storage image): ${skipped}`);
  console.log(`- failed: ${failed}`);
};

run().catch((error) => {
  console.error('Migration failed:', error);
  process.exit(1);
});
