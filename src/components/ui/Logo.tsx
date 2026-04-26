import React from 'react';
import { cn } from '@/lib/utils';
import { resolveLocalImage } from '@/lib/local-image';

/** Wordmark PNG with transparent background (`public/images/logo-luju-wordmark.png`). */
const LOGO_SRC = resolveLocalImage('/images/logo-luju-wordmark.png');

export const Logo: React.FC<{ className?: string; light?: boolean }> = ({ className, light }) => {
  return (
    <div className={cn('flex shrink-0 items-center transition-[filter,transform] duration-500 ease-out', className)}>
      <img
        src={LOGO_SRC}
        alt="luju Yoga Studio"
        className={cn(
          'h-12 w-auto object-contain object-left sm:h-14 md:h-16 lg:h-[4.75rem]',
          light && 'drop-shadow-[0_2px_12px_rgba(0,0,0,0.55)]'
        )}
        loading="eager"
        fetchPriority="high"
        decoding="async"
      />
    </div>
  );
};
