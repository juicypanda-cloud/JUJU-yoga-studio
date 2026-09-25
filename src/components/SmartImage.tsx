import React, { useState, useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { getLocalImageSrcSet } from '@/lib/local-image';

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
  const imgRef = useRef<HTMLImageElement>(null);

  useEffect(() => {
    const fresh = String(src || '').trim();
    setCurrentSrc(fresh || effectiveFallback);
    setHasFailed(!fresh);
    setLoaded(false);
  }, [src, effectiveFallback]);

  useEffect(() => {
    // The browser may serve an already-cached image so fast that the native
    // `load` event fires before this element's onLoad handler is attached
    // (or doesn't fire again at all), leaving the skeleton stuck forever.
    // Catch that case explicitly once the <img> has this src committed.
    if (imgRef.current?.complete && imgRef.current.naturalWidth > 0) {
      setLoaded(true);
    }
  }, [currentSrc]);

  const activeSrc = currentSrc || effectiveFallback;
  if (!activeSrc) return null;

  const computedSrcSet = !hasFailed ? (srcSet || buildResponsiveSrcSet(activeSrc)) : undefined;
  const computedSizes = sizes || '(max-width: 768px) 100vw, 50vw';
  // Locally generated images have their own AVIF/WebP srcset (see
  // scripts/optimize-images.ts); prefer it over a plain <img> so the browser
  // can pick a format/size instead of always downloading the full-res WebP.
  const localSources = !hasFailed && !srcSet ? getLocalImageSrcSet(activeSrc) : undefined;

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

      {localSources ? (
        <picture>
          <source type="image/avif" srcSet={localSources.avifSrcSet} sizes={computedSizes} />
          <source type="image/webp" srcSet={localSources.webpSrcSet} sizes={computedSizes} />
          <img
            ref={imgRef}
            src={activeSrc}
            alt={alt ?? ''}
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
        </picture>
      ) : (
        <img
          ref={imgRef}
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
      )}
    </div>
  );
};
