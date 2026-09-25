import React from 'react';
import { CLASS_FALLBACK_IMAGE, resolveClassImageUrl } from '../lib/classImage';
import { SmartImage } from './SmartImage';

type ClassCoverImageProps = {
  src?: unknown;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
  sizes?: string;
  /** Responsive AVIF/WebP srcset generated for this class's cover image (see api/admin/process-class-image.ts). */
  avifSrcSet?: string;
  webpSrcSet?: string;
};

export const ClassCoverImage: React.FC<ClassCoverImageProps> = ({
  src,
  alt,
  className,
  loading = 'lazy',
  fetchPriority = 'auto',
  sizes,
  avifSrcSet,
  webpSrcSet,
}) => {
  const resolved = resolveClassImageUrl(src);
  const pictureSources = avifSrcSet && webpSrcSet ? { avifSrcSet, webpSrcSet } : undefined;

  return (
    <SmartImage
      src={resolved}
      alt={alt}
      fallbackSrc={CLASS_FALLBACK_IMAGE}
      className={className}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      sizes={sizes}
      pictureSources={pictureSources}
    />
  );
};
