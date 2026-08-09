import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';

type SmartImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  wrapperClassName?: string;
  fallbackSrc?: string;
};

const buildResponsiveSrcSet = (rawSrc: string) => {
  const src = rawSrc.trim();
  if (!src) return '';

  // Unsplash supports width query params.
  if (src.includes('images.unsplash.com/')) {
    const widths = [480, 768, 1024, 1440];
    return widths
      .map((w) => {
        try {
          const url = new URL(src);
          url.searchParams.set('w', String(w));
          return `${url.toString()} ${w}w`;
        } catch {
          return `${src} ${w}w`;
        }
      })
      .join(', ');
  }

  // YouTube thumbnails: mqdefault (320w) and hqdefault (480w) are universally supported.
  if (src.includes('i.ytimg.com/vi/') || src.includes('img.youtube.com/vi/')) {
    const bases = [
      ['mqdefault.jpg', '320w'],
      ['hqdefault.jpg', '480w'],
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

const DEFAULT_FALLBACK = 'https://picsum.photos/seed/juju-fallback/800/600';

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
  fallbackSrc = DEFAULT_FALLBACK,
  onLoad,
  onError,
  ...rest
}) => {
  const initialSrc = String(src || '').trim();
  const effectiveFallback = fallbackSrc || DEFAULT_FALLBACK;
  const [currentSrc, setCurrentSrc] = useState<string>(() => initialSrc || effectiveFallback);
  const [hasFailed, setHasFailed] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const fresh = String(src || '').trim();
    setCurrentSrc(fresh || effectiveFallback);
    setHasFailed(!fresh);
    setLoaded(false);
  }, [src, effectiveFallback]);

  const activeSrc = currentSrc || effectiveFallback;
  if (!activeSrc) return null;

  const computedSrcSet = !hasFailed ? (srcSet || buildResponsiveSrcSet(activeSrc)) : undefined;
  const computedSizes = sizes || '(max-width: 768px) 100vw, 50vw';

  const handleError = (event: React.SyntheticEvent<HTMLImageElement, Event>) => {
    setLoaded(true);
    if (!hasFailed) {
      setHasFailed(true);
      if (activeSrc.includes('maxresdefault.jpg') || activeSrc.includes('sddefault.jpg')) {
        setCurrentSrc(activeSrc.replace(/(maxresdefault|sddefault)\.jpg$/, 'hqdefault.jpg'));
      } else if (effectiveFallback && activeSrc !== effectiveFallback) {
        setCurrentSrc(effectiveFallback);
      }
    }
    onError?.(event);
  };

  return (
    <div className={cn('relative overflow-hidden bg-gray-100', className, wrapperClassName)}>
      <div
        aria-hidden
        className={cn(
          'absolute inset-0 z-[1] transition-opacity duration-500 pointer-events-none',
          loaded ? 'opacity-0' : 'opacity-100'
        )}
      >
        <div className="h-full w-full animate-pulse bg-gray-200" />
      </div>

      <img
        src={activeSrc}
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
        onError={handleError}
        {...rest}
      />
    </div>
  );
};
