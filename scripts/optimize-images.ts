import { type Dirent } from 'node:fs';
import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const ROOT = process.cwd();
// Scoped to /images (not all of /public): favicons and the OG preview image
// are referenced directly by exact filename from index.html, not through the
// manifest/SmartImage pipeline, so they don't need multi-format variants.
const TARGET_DIRS = ['public/images', 'src/assets'];
const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg']);
const BASE_WIDTH = 1200;
// Only widths smaller than BASE_WIDTH, so the base (<=1200px) variant is
// always the largest generated file — simple, predictable, no upscaling.
const EXTRA_WIDTHS = [480, 800];
const WEBP_QUALITY = 75;
const AVIF_QUALITY = 60;

type Variant = {
  width: number;
  webpAbsolute: string;
  avifAbsolute: string;
  webpPublicPath: string;
  avifPublicPath: string;
};

type OptimizationEntry = {
  sourceAbsolute: string;
  sourcePublicPath: string;
  sourceBytes: number;
  /** The unsuffixed, <=1200px-wide variant: kept as the plain single-image fallback. */
  base: Variant;
  baseBytes: number;
  /** All generated widths, smallest to largest, including `base`. */
  variants: Variant[];
  optimizedBytes: number;
};

const formatBytes = (bytes: number) => {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;
  return `${value.toFixed(index === 0 ? 0 : 2)} ${units[index]}`;
};

const toPosixPath = (value: string) => value.split(path.sep).join('/');

const toPublicPath = (absolutePath: string) => {
  const relative = toPosixPath(path.relative(ROOT, absolutePath));
  return relative.startsWith('public/') ? `/${relative.slice('public/'.length)}` : `/${relative}`;
};

const walkFiles = async (directory: string): Promise<string[]> => {
  let entries: Dirent[] = [];
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch {
    return [];
  }

  const files = await Promise.all(
    entries.map(async (entry) => {
      const absolute = path.join(directory, entry.name);
      if (entry.isDirectory()) return walkFiles(absolute);
      return [absolute];
    })
  );

  return files.flat();
};

const isOptimizableImage = (absolutePath: string) => {
  const ext = path.extname(absolutePath).toLowerCase();
  if (!IMAGE_EXTENSIONS.has(ext)) return false;
  if (absolutePath.toLowerCase().endsWith('.webp')) return false;
  return true;
};

/**
 * Generates one WebP + one AVIF file per target width, so the app can serve a
 * real `srcset` instead of a single full-resolution image to every viewport.
 * The unsuffixed width (<=1200px, matching the previous single-size output)
 * stays the plain fallback so any code holding just that path keeps working.
 */
const generateVariants = async (sourceAbsolute: string): Promise<Variant[]> => {
  const parsed = path.parse(sourceAbsolute);
  const metadata = await sharp(sourceAbsolute).metadata();
  const originalWidth = metadata.width ?? BASE_WIDTH;
  const baseWidth = Math.min(BASE_WIDTH, originalWidth);
  const widths = Array.from(new Set([baseWidth, ...EXTRA_WIDTHS.filter((w) => w < baseWidth)])).sort(
    (a, b) => a - b
  );

  const variants: Variant[] = [];
  for (const width of widths) {
    const suffix = width === baseWidth ? '' : `-${width}w`;
    const webpAbsolute = path.join(parsed.dir, `${parsed.name}${suffix}.webp`);
    const avifAbsolute = path.join(parsed.dir, `${parsed.name}${suffix}.avif`);

    await sharp(sourceAbsolute)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: WEBP_QUALITY })
      .toFile(webpAbsolute);

    // AVIF gets comparable visual quality at a lower quality setting than WebP.
    await sharp(sourceAbsolute)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .avif({ quality: AVIF_QUALITY })
      .toFile(avifAbsolute);

    variants.push({
      width,
      webpAbsolute,
      avifAbsolute,
      webpPublicPath: toPublicPath(webpAbsolute),
      avifPublicPath: toPublicPath(avifAbsolute),
    });
  }

  return variants;
};

const optimizeImage = async (sourceAbsolute: string): Promise<OptimizationEntry> => {
  const sourceStat = await fs.stat(sourceAbsolute);
  const variants = await generateVariants(sourceAbsolute);
  // The base variant is always the largest generated width (<=1200px), since
  // EXTRA_WIDTHS only ever contributes widths smaller than BASE_WIDTH.
  const base = variants[variants.length - 1];

  const variantStats = await Promise.all(
    variants.flatMap((v) => [fs.stat(v.webpAbsolute), fs.stat(v.avifAbsolute)])
  );
  const optimizedBytes = variantStats.reduce((sum, stat) => sum + stat.size, 0);
  const baseBytes = (await fs.stat(base.webpAbsolute)).size;

  return {
    sourceAbsolute,
    sourcePublicPath: toPublicPath(sourceAbsolute),
    sourceBytes: sourceStat.size,
    base,
    baseBytes,
    variants,
    optimizedBytes,
  };
};

const writeManifest = async (entries: OptimizationEntry[]) => {
  const manifestPath = path.join(ROOT, 'src/generated/image-manifest.ts');

  const mapping = Object.fromEntries(
    entries.map((entry) => [entry.sourcePublicPath, entry.base.webpPublicPath]).sort(([a], [b]) => a.localeCompare(b))
  );

  const responsiveSources = Object.fromEntries(
    entries
      .map((entry) => [
        entry.base.webpPublicPath,
        {
          avifSrcSet: entry.variants.map((v) => `${v.avifPublicPath} ${v.width}w`).join(', '),
          webpSrcSet: entry.variants.map((v) => `${v.webpPublicPath} ${v.width}w`).join(', '),
        },
      ])
      .sort(([a], [b]) => (a as string).localeCompare(b as string))
  );

  const fileContent = `// Auto-generated by scripts/optimize-images.ts
// Do not edit manually.

/** Original path -> best single-size WebP fallback (<=1200px wide). */
export const imageOptimizationManifest: Record<string, string> = ${JSON.stringify(mapping, null, 2)};

/** Fallback WebP path -> responsive AVIF/WebP srcset across all generated widths. */
export const imageResponsiveSources: Record<string, { avifSrcSet: string; webpSrcSet: string }> = ${JSON.stringify(
    responsiveSources,
    null,
    2
  )};
`;

  await fs.mkdir(path.dirname(manifestPath), { recursive: true });
  await fs.writeFile(manifestPath, fileContent, 'utf8');
};

const run = async () => {
  const targets = TARGET_DIRS.map((directory) => path.join(ROOT, directory));
  const allFiles = (await Promise.all(targets.map((directory) => walkFiles(directory)))).flat();
  const sourceImages = allFiles.filter(isOptimizableImage);

  if (sourceImages.length === 0) {
    console.log('No images found in /public or /src/assets.');
    await writeManifest([]);
    return;
  }

  const entries: OptimizationEntry[] = [];
  for (const sourceAbsolute of sourceImages) {
    const entry = await optimizeImage(sourceAbsolute);
    entries.push(entry);

    const savedBytes = entry.sourceBytes - entry.baseBytes;
    const savedPercent = entry.sourceBytes > 0 ? (savedBytes / entry.sourceBytes) * 100 : 0;

    console.log(
      `✅ ${toPosixPath(path.relative(ROOT, sourceAbsolute))} | ` +
        `${formatBytes(entry.sourceBytes)} -> ${entry.variants.length} widths x2 formats, ` +
        `base ${formatBytes(entry.baseBytes)} ` +
        `(${savedPercent.toFixed(1)}% saved vs. original)`
    );
  }

  await writeManifest(entries);

  const totalSourceBytes = entries.reduce((sum, entry) => sum + entry.sourceBytes, 0);
  const totalOptimizedBytes = entries.reduce((sum, entry) => sum + entry.optimizedBytes, 0);

  console.log('\nImage optimization summary');
  console.log(`- scanned images: ${sourceImages.length}`);
  console.log(`- generated variants: ${entries.reduce((sum, e) => sum + e.variants.length * 2, 0)} files (webp+avif)`);
  console.log(`- original total: ${formatBytes(totalSourceBytes)}`);
  console.log(`- all generated variants total: ${formatBytes(totalOptimizedBytes)}`);
};

run().catch((error) => {
  console.error('Image optimization failed:', error);
  process.exit(1);
});
