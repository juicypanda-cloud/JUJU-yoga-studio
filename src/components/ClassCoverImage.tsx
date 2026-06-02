import React, { useEffect, useState } from 'react';
import { CLASS_FALLBACK_IMAGE, resolveClassImageUrl } from '../lib/classImage';
import { cn } from '@/lib/utils';

type ClassCoverImageProps = {
  src?: unknown;
  alt: string;
  className?: string;
  loading?: 'eager' | 'lazy';
  fetchPriority?: 'high' | 'low' | 'auto';
};

export const ClassCoverImage: React.FC<ClassCoverImageProps> = ({
  src,
  alt,
  className,
  loading = 'lazy',
  fetchPriority = 'auto',
}) => {
  const [currentSrc, setCurrentSrc] = useState(() => resolveClassImageUrl(src));

  useEffect(() => {
    setCurrentSrc(resolveClassImageUrl(src));
  }, [src]);

  return (
    <img
      src={currentSrc}
      alt={alt}
      className={cn('block', className)}
      loading={loading}
      fetchPriority={fetchPriority}
      decoding="async"
      onError={() => {
        setCurrentSrc((prev) => (prev === CLASS_FALLBACK_IMAGE ? prev : CLASS_FALLBACK_IMAGE));
      }}
    />
  );
};
