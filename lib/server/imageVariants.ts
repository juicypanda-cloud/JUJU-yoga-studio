import sharp from 'sharp';
import { getServerStorageBucket } from './firebaseAdmin.js';

const WIDTHS = [480, 800, 1200];
const WEBP_QUALITY = 75;
const AVIF_QUALITY = 60;

export type ResponsiveVariants = {
  avifSrcSet: string;
  webpSrcSet: string;
};

/**
 * Resizes a source image into a handful of widths in both AVIF and WebP,
 * uploads each as a public object, and returns ready-to-use `srcset` strings —
 * the same responsive treatment scripts/optimize-images.ts gives local
 * /public/images assets, but for images that live in Firebase Storage
 * (admin-uploaded content), which a build-time script can't reach.
 */
export async function generateResponsiveVariants(
  source: Buffer,
  storagePathPrefix: string
): Promise<ResponsiveVariants> {
  const metadata = await sharp(source).metadata();
  const originalWidth = metadata.width ?? WIDTHS[WIDTHS.length - 1];
  const widths = WIDTHS.filter((w) => w <= originalWidth);
  if (widths.length === 0) widths.push(originalWidth);

  const bucket = getServerStorageBucket();
  const avifEntries: string[] = [];
  const webpEntries: string[] = [];

  for (const width of widths) {
    const [webpBuffer, avifBuffer] = await Promise.all([
      sharp(source).rotate().resize({ width, withoutEnlargement: true }).webp({ quality: WEBP_QUALITY }).toBuffer(),
      sharp(source).rotate().resize({ width, withoutEnlargement: true }).avif({ quality: AVIF_QUALITY }).toBuffer(),
    ]);

    const webpPath = `${storagePathPrefix}-${width}w.webp`;
    const avifPath = `${storagePathPrefix}-${width}w.avif`;
    const webpFile = bucket.file(webpPath);
    const avifFile = bucket.file(avifPath);

    await Promise.all([
      webpFile.save(webpBuffer, {
        metadata: { contentType: 'image/webp', cacheControl: 'public, max-age=31536000, immutable' },
      }),
      avifFile.save(avifBuffer, {
        metadata: { contentType: 'image/avif', cacheControl: 'public, max-age=31536000, immutable' },
      }),
    ]);
    await Promise.all([webpFile.makePublic(), avifFile.makePublic()]);

    webpEntries.push(`https://storage.googleapis.com/${bucket.name}/${webpPath} ${width}w`);
    avifEntries.push(`https://storage.googleapis.com/${bucket.name}/${avifPath} ${width}w`);
  }

  return { avifSrcSet: avifEntries.join(', '), webpSrcSet: webpEntries.join(', ') };
}
