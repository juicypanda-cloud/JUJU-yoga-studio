import React, { useState } from 'react';
import { cn } from '@/lib/utils';

type SmartImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  wrapperClassName?: string;
};

const buildResponsiveSrcSet = (rawSrc: string) => {
  const src = rawSrc.trim();
  if (!src) return '';

  // Unsplash supports width query params.
  if (src.includes('images.unsplash.com/')) {
    const widths = [480, 768, 1024, 1440];
    return widths
      .map((w) => {
        const url = new URL(src);
        url.searchParams.set('w', String(w));
        return `${url.toString()} ${w}w`;
      })
      .join(', ');
  }

  // YouTube thumbnails can be requested in multiple fixed sizes.
  if (src.includes('i.ytimg.com/vi/')) {
    const bases = [
      ['mqdefault.jpg', '320w'],
      ['hqdefault.jpg', '480w'],
      ['sddefault.jpg', '640w'],
      ['maxresdefault.jpg', '1280w'],
    ] as const;
    return bases.map(([name, width]) => `${src.replace(/[^/]+$/, name)} ${width}`).join(', ');
  }

  // Picsum supports width/height in path.
  if (src.includes('picsum.photos/')) {
    const widths = [400, 800, 1200];
    return widths
      .map((w) => src.replace(/\/(\d+)(?:\/(\d+))?(\?.*)?$/, `/${w}$3`) + ` ${w}w`)
      .join(', ');
  }

  return '';
};

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className,
  wrapperClassName,
  srcSet,
  sizes,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority = 'auto',
  onLoad,
  onError,
  ...rest
}) => {
  const [loaded, setLoaded] = useState(false);

  if (!src) return null;
  const computedSrcSet = srcSet || buildResponsiveSrcSet(String(src));
  const computedSizes = sizes || '(max-width: 768px) 100vw, 50vw';

  return (
    <div className={cn('relative overflow-hidden bg-gray-100', className, wrapperClassName)}>
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 z-[1] transition-opacity duration-500',
          loaded ? 'opacity-0' : 'opacity-100'
        )}
      >
        <div className="h-full w-full animate-pulse bg-gray-200" />
      </div>

      <img
        src={src}
        alt={alt ?? ''}
        srcSet={computedSrcSet || undefined}
        sizes={computedSrcSet ? computedSizes : undefined}
        className={cn(
          'relative z-[2] h-full w-full object-cover transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0'
        )}
        loading={loading}
        decoding={decoding}
        fetchPriority={fetchPriority}
        onLoad={(event) => {
          setLoaded(true);
          onLoad?.(event);
        }}
        onError={(event) => {
          setLoaded(true);
          onError?.(event);
        }}
        {...rest}
      />
    </div>
  );
};
