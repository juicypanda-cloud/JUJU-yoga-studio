import { imageOptimizationManifest, imageResponsiveSources } from '../generated/image-manifest';

/**
 * Prefer locally generated WebP variants when available.
 * Falls back to original image paths if optimization hasn't run yet.
 */
export const resolveLocalImage = (src: string): string => {
  if (!src) return src;
  return imageOptimizationManifest[src] || src;
};

/**
 * Looks up the generated AVIF/WebP srcset for an already-resolved local image
 * path (i.e. the string `resolveLocalImage` returns), so a plain <img src>
 * can be upgraded to a responsive <picture> without changing call sites.
 */
export const getLocalImageSrcSet = (resolvedSrc: string) => imageResponsiveSources[resolvedSrc];
