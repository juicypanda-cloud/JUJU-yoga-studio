import { resolveLocalImage } from './local-image';

export const CLASS_FALLBACK_IMAGE = 'https://picsum.photos/seed/class-fallback/1200/800';

const preloadedUrls = new Set<string>();

/** Resolve class image URL with local WebP manifest + fallback when missing. */
export function resolveClassImageUrl(raw?: unknown): string {
  const trimmed = String(raw ?? '').trim();
  if (!trimmed) return CLASS_FALLBACK_IMAGE;
  return resolveLocalImage(trimmed);
}

/** Preload class images so cards and detail pages paint faster (deduplicated per session). */
export function preloadClassImages(urls: string[]): void {
  urls.forEach((raw) => {
    const src = resolveClassImageUrl(raw);
    if (!src || preloadedUrls.has(src)) return;
    preloadedUrls.add(src);
    const img = new Image();
    img.decoding = 'async';
    img.src = src;
  });
}
