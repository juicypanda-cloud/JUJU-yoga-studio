import { imageOptimizationManifest } from '../generated/image-manifest';

/**
 * Prefer locally generated WebP variants when available.
 * Falls back to original image paths if optimization hasn't run yet.
 */
export const resolveLocalImage = (src: string): string => {
  if (!src) return src;
  return imageOptimizationManifest[src] || src;
};
