import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';

type HeroSlide = {
  image: string;
  imageVersion: string;
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

export const Hero: React.FC = () => {
  const initialSlide = defaultSlide;
  const [slide, setSlide] = useState<HeroSlide>(initialSlide);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    clearPersistedSlideCache();

    if (initialSlide.image) {
      try {
        const preload = document.createElement('link');
        preload.rel = 'preload';
        preload.as = 'image';
        preload.href = initialSlide.image;
        preload.setAttribute('fetchpriority', 'high');
        document.head.appendChild(preload);
      } catch {
        /* ignore */
      }
    }

    const heroDocRef = doc(db, 'siteContent', 'homeHero');

    const apply = (snapshot: DocumentSnapshot) => {
      const next = slideFromSnapshot(snapshot);
      setSlide(next);
      clearPersistedSlideCache();
    };

    void getDoc(heroDocRef).then(apply).catch(() => {
      setSlide(defaultSlide);
    });

    const unsubscribe = onSnapshot(heroDocRef, apply, () => {
      setSlide(defaultSlide);
    });

    return () => unsubscribe();
  }, []);

  const heroUrl = withHeroVersion(slide.image?.trim(), slide.imageVersion);
  const activeHeroUrl = !imageFailed && heroUrl ? heroUrl : '';
  const cta1Href = normalizeHeroLink(slide.cta1.link, '/online');
  const cta2Href = normalizeHeroLink(slide.cta2.link, '/classes');

  useEffect(() => {
    // Never keep old/fallback hero image when source changes.
    setImageFailed(false);
  }, [heroUrl]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-brand-ink">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {activeHeroUrl ? (
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
        ) : null}
      </div>
      <div className="absolute inset-0 z-[1] bg-black/20" />

      <div className="relative z-[2] container mx-auto px-6 min-h-screen flex flex-col justify-end pb-24 md:pb-32 text-left text-white">
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
