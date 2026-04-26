import React, { useState } from 'react';
import { cn } from '@/lib/utils';

type SmartImageProps = React.ImgHTMLAttributes<HTMLImageElement> & {
  wrapperClassName?: string;
};

export const SmartImage: React.FC<SmartImageProps> = ({
  src,
  alt,
  className,
  wrapperClassName,
  loading = 'lazy',
  decoding = 'async',
  fetchPriority = 'auto',
  onLoad,
  onError,
  ...rest
}) => {
  const [loaded, setLoaded] = useState(false);

  if (!src) return null;

  return (
    <div className={cn('relative overflow-hidden bg-gray-100', wrapperClassName)}>
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
        className={cn(
          'relative z-[2] transition-opacity duration-500',
          loaded ? 'opacity-100' : 'opacity-0',
          className
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
