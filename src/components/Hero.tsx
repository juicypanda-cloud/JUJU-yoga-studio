import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

type HeroSlide = {
  image: string;
  imageVersion: string;
  /** Responsive AVIF/WebP srcset for `image`, generated server-side (see api/admin/process-hero-image.ts). */
  imageAvifSrcSet?: string;
  imageWebpSrcSet?: string;
  title: string;
  subtitle: string;
  cta1: { text: string; link: string };
  cta2: { text: string; link: string };
};

const defaultSlide: HeroSlide = {
  image: '',
  imageVersion: 'default',
  title: '',
  subtitle: '',
  cta1: { text: '', link: '/online' },
  cta2: { text: '', link: '/classes' },
};

const HERO_SESSION_KEY = 'homeHero:lastSlide:v2';
const HERO_LOCAL_KEY = 'homeHero:lastSlide:local:v1';

function clearPersistedSlideCache() {
  try {
    sessionStorage.removeItem(HERO_SESSION_KEY);
    localStorage.removeItem(HERO_LOCAL_KEY);
  } catch {
    /* ignore storage access issues */
  }
}

function toVersionString(value: unknown): string {
  if (!value) return String(Date.now());
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  if (typeof (value as { toMillis?: () => number }).toMillis === 'function') {
    return String((value as { toMillis: () => number }).toMillis());
  }
  if (typeof (value as { seconds?: number }).seconds === 'number') {
    const raw = value as { seconds: number; nanoseconds?: number };
    return `${raw.seconds}-${raw.nanoseconds || 0}`;
  }
  return String(Date.now());
}

function withHeroVersion(url: string, version: string): string {
  if (!url) return url;
  const clean = url.trim();
  if (!clean) return clean;
  const join = clean.includes('?') ? '&' : '?';
  return `${clean}${join}v=${encodeURIComponent(version)}`;
}

function normalizeHeroLink(raw: string, fallback: string): string {
  const trimmed = String(raw || '').trim();
  if (!trimmed) return fallback;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
}

function slideFromSnapshot(snapshot: DocumentSnapshot): HeroSlide {
  if (!snapshot.exists()) return defaultSlide;
  const data = snapshot.data() as Record<string, unknown>;
  const updatedAt = data.updatedAt;
  return {
    image: (typeof data.image === 'string' ? data.image.trim() : '') || defaultSlide.image,
    imageVersion: toVersionString(updatedAt),
    imageAvifSrcSet: typeof data.imageAvifSrcSet === 'string' ? data.imageAvifSrcSet : undefined,
    imageWebpSrcSet: typeof data.imageWebpSrcSet === 'string' ? data.imageWebpSrcSet : undefined,
    title: (typeof data.title === 'string' && data.title) || defaultSlide.title,
    subtitle: (typeof data.subtitle === 'string' && data.subtitle) || defaultSlide.subtitle,
    cta1: {
      text: (typeof data.cta1Text === 'string' && data.cta1Text) || defaultSlide.cta1.text,
      link: (typeof data.cta1Link === 'string' && data.cta1Link) || defaultSlide.cta1.link,
    },
    cta2: {
      text: (typeof data.cta2Text === 'string' && data.cta2Text) || defaultSlide.cta2.text,
      link: (typeof data.cta2Link === 'string' && data.cta2Link) || defaultSlide.cta2.link,
    },
  };
}

function readCachedSlide(): HeroSlide {
  try {
    const cached = sessionStorage.getItem(HERO_SESSION_KEY) || localStorage.getItem(HERO_LOCAL_KEY);
    if (cached) {
      const parsed = JSON.parse(cached) as Partial<HeroSlide>;
      if (parsed && typeof parsed.image === 'string' && parsed.image) {
        return { ...defaultSlide, ...parsed };
      }
    }
  } catch {
    /* ignore storage access issues */
  }
  return defaultSlide;
}

function persistSlideCache(slide: HeroSlide) {
  try {
    const serialized = JSON.stringify(slide);
    sessionStorage.setItem(HERO_SESSION_KEY, serialized);
    localStorage.setItem(HERO_LOCAL_KEY, serialized);
  } catch {
    /* ignore storage access issues */
  }
}

export const Hero: React.FC = () => {
  // Render with the last-known slide immediately so the hero <img> (and its
  // preload) exist on first paint, instead of waiting on a Firestore round
  // trip before the browser even knows the image URL to fetch.
  const [slide, setSlide] = useState<HeroSlide>(readCachedSlide);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    const heroDocRef = doc(db, 'siteContent', 'homeHero');

    const apply = (snapshot: DocumentSnapshot) => {
      const next = slideFromSnapshot(snapshot);
      setSlide(next);
      persistSlideCache(next);
    };

    void getDoc(heroDocRef).then(apply).catch(() => {
      setSlide(defaultSlide);
      clearPersistedSlideCache();
    });

    const unsubscribe = onSnapshot(heroDocRef, apply, () => {
      setSlide(defaultSlide);
      clearPersistedSlideCache();
    });

    return () => unsubscribe();
  }, []);

  const heroUrl = withHeroVersion(slide.image?.trim(), slide.imageVersion);
  const activeHeroUrl = !imageFailed && heroUrl ? heroUrl : '';
  const cta1Href = normalizeHeroLink(slide.cta1.link, '/online');
  const cta2Href = normalizeHeroLink(slide.cta2.link, '/classes');

  useEffect(() => {
    if (!heroUrl) return;
    const preload = document.createElement('link');
    preload.rel = 'preload';
    preload.as = 'image';
    preload.setAttribute('fetchpriority', 'high');
    if (slide.imageAvifSrcSet) {
      // Preload the same responsive AVIF set the <picture> below will pick
      // from, instead of the much larger plain-JPEG fallback — the largest
      // entry still serves as the `href` for browsers that ignore imagesrcset.
      const largest = slide.imageAvifSrcSet.split(', ').pop()?.split(' ')[0];
      preload.href = largest || heroUrl;
      preload.setAttribute('imagesrcset', slide.imageAvifSrcSet);
      preload.setAttribute('imagesizes', '100vw');
      preload.type = 'image/avif';
    } else {
      preload.href = heroUrl;
    }
    document.head.appendChild(preload);
    return () => {
      document.head.removeChild(preload);
    };
  }, [heroUrl, slide.imageAvifSrcSet]);

  useEffect(() => {
    // Never keep old/fallback hero image when source changes.
    setImageFailed(false);
  }, [heroUrl]);

  return (
    // `dvh` (not `vh`) so this doesn't overshoot the real visible viewport on
    // iOS Safari, where `100vh` is sized for the chrome-collapsed state —
    // the mismatch left extra scrollable space right under the fixed navbar.
    <div className="relative min-h-dvh w-full overflow-hidden bg-brand-ink">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {activeHeroUrl ? (
          <picture>
            {slide.imageAvifSrcSet && <source type="image/avif" srcSet={slide.imageAvifSrcSet} sizes="100vw" />}
            {slide.imageWebpSrcSet && <source type="image/webp" srcSet={slide.imageWebpSrcSet} sizes="100vw" />}
            <img
              key={activeHeroUrl}
              src={activeHeroUrl}
              alt={slide.title}
              className="absolute inset-0 h-full w-full object-cover contrast-105 brightness-105"
              loading="eager"
              fetchPriority="high"
              decoding="async"
              onError={() => {
                setImageFailed(true);
              }}
            />
          </picture>
        ) : null}
      </div>
      <div className="absolute inset-0 z-[1] bg-black/20" />

      <div className="relative z-[2] container mx-auto px-6 min-h-dvh flex flex-col justify-end pb-24 md:pb-32 text-left text-white">
        {slide.title ? (
          <motion.h1
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-5xl md:text-8xl font-light tracking-tight mb-6 max-w-4xl"
          >
            {slide.title}
          </motion.h1>
        ) : null}
        {slide.subtitle ? (
          <motion.p
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="text-lg md:text-2xl text-white/90 max-w-xl mb-10 font-light leading-relaxed"
          >
            {slide.subtitle}
          </motion.p>
        ) : null}
        {slide.cta1.text || slide.cta2.text ? (
          <motion.div
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4"
          >
            {slide.cta1.text ? (
              <Button className="bg-white text-brand-ink hover:bg-brand-icon hover:text-white rounded-full px-10 py-6 text-[11px] font-black tracking-[0.2em] uppercase shadow-xl shadow-black/20 border-none transition-all duration-300">
                <Link to={cta1Href} className="flex items-center">
                  {slide.cta1.text}
                </Link>
              </Button>
            ) : null}
            {slide.cta2.text ? (
              <Button variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-brand-icon hover:border-brand-icon/80 hover:text-white rounded-full px-10 py-6 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500">
                <Link to={cta2Href} className="flex items-center">
                  {slide.cta2.text}
                </Link>
              </Button>
            ) : null}
          </motion.div>
        ) : null}
      </div>
    </div>
  );
};
