import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Button } from './ui/button';
import { Link } from 'react-router-dom';
import { doc, getDoc, onSnapshot, type DocumentSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { resolveLocalImage } from '../lib/local-image';

type HeroSlide = {
  image: string;
  title: string;
  subtitle: string;
  cta1: { text: string; link: string };
  cta2: { text: string; link: string };
};

const defaultSlide: HeroSlide = {
  image: resolveLocalImage('/images/home-hero-source-latest.png'),
  title: 'Ретрит Аялал',
  subtitle: 'Хамгийн үзэсгэлэнтэй газруудад дотоод амар амгалангаа олоорой.',
  cta1: { text: 'ОНЛАЙНААР ХИЧЭЭЛЛЭХ', link: '/online' },
  cta2: { text: 'СТУДИД ХИЧЭЭЛЛЭХ', link: '/classes' },
};

const HERO_SESSION_KEY = 'homeHero:lastSlide:v2';
const HERO_LOCAL_KEY = 'homeHero:lastSlide:local:v1';

function parsePersistedSlide(raw: string | null): HeroSlide | null {
  if (!raw) return null;
  try {
    const o = JSON.parse(raw) as Partial<HeroSlide> & { cta1?: Partial<HeroSlide['cta1']>; cta2?: Partial<HeroSlide['cta2']> };
    if (typeof o.image !== 'string' || !o.image.trim()) return null;
    return {
      image: o.image.trim(),
      title: typeof o.title === 'string' ? o.title : defaultSlide.title,
      subtitle: typeof o.subtitle === 'string' ? o.subtitle : defaultSlide.subtitle,
      cta1: {
        text: typeof o.cta1?.text === 'string' ? o.cta1.text : defaultSlide.cta1.text,
        link: typeof o.cta1?.link === 'string' ? o.cta1.link : defaultSlide.cta1.link,
      },
      cta2: {
        text: typeof o.cta2?.text === 'string' ? o.cta2.text : defaultSlide.cta2.text,
        link: typeof o.cta2?.link === 'string' ? o.cta2.link : defaultSlide.cta2.link,
      },
    };
  } catch {
    return null;
  }
}

function readPersistedSlide(): HeroSlide | null {
  if (typeof window === 'undefined') return null;
  const sessionSlide = parsePersistedSlide(window.sessionStorage.getItem(HERO_SESSION_KEY));
  if (sessionSlide) return sessionSlide;
  return parsePersistedSlide(window.localStorage.getItem(HERO_LOCAL_KEY));
}

function persistSlide(slide: HeroSlide) {
  if (!slide.image?.trim()) return;
  try {
    sessionStorage.setItem(HERO_SESSION_KEY, JSON.stringify(slide));
    localStorage.setItem(HERO_LOCAL_KEY, JSON.stringify(slide));
  } catch {
    /* quota / private mode */
  }
}

function slideFromSnapshot(snapshot: DocumentSnapshot): HeroSlide {
  if (!snapshot.exists()) return defaultSlide;
  const data = snapshot.data() as Record<string, unknown>;
  return {
    image: (typeof data.image === 'string' ? data.image.trim() : '') || defaultSlide.image,
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
  const initialSlide = readPersistedSlide() ?? defaultSlide;
  const [slide, setSlide] = useState<HeroSlide>(initialSlide);
  /** Only URL that has finished loading — avoids old image under / beside the next one. */
  const [shownHeroUrl, setShownHeroUrl] = useState(initialSlide.image || '');
  const fallbackHeroImage = resolveLocalImage('/images/home-hero-source-latest.png');

  useEffect(() => {
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
      persistSlide(next);
    };

    void getDoc(heroDocRef).then(apply).catch(() => {
      setSlide(defaultSlide);
    });

    const unsubscribe = onSnapshot(heroDocRef, apply, () => {
      setSlide(defaultSlide);
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const url = slide.image?.trim();
    if (!url) return;

    let cancelled = false;
    let preload: HTMLLinkElement | null = null;

    const finish = (next: string) => {
      if (!cancelled) setShownHeroUrl(next);
    };

    try {
      preload = document.createElement('link');
      preload.rel = 'preload';
      preload.as = 'image';
      preload.href = url;
      preload.setAttribute('fetchpriority', 'high');
      document.head.appendChild(preload);
    } catch {
      preload = null;
    }

    const probe = new Image();
    probe.fetchPriority = 'high';
    probe.onload = () => {
      if (cancelled) return;
      const d = (probe as HTMLImageElement & { decode?: () => Promise<void> }).decode?.();
      if (d && typeof d.then === 'function') {
        void d.then(() => finish(url)).catch(() => finish(url));
      } else {
        finish(url);
      }
    };
    probe.onerror = () => {
      if (!cancelled) setShownHeroUrl((prev) => prev || fallbackHeroImage);
    };
    probe.src = url;

    return () => {
      cancelled = true;
      probe.onload = null;
      probe.onerror = null;
      probe.removeAttribute('src');
      if (preload?.parentNode) preload.parentNode.removeChild(preload);
    };
  }, [fallbackHeroImage, slide.image]);

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-brand-ink">
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        {shownHeroUrl ? (
          <img
            key={shownHeroUrl}
            src={shownHeroUrl}
            alt={slide.title}
            className="absolute inset-0 h-full w-full object-cover contrast-105 brightness-105"
            loading="eager"
            fetchPriority="high"
            decoding="async"
            onError={() => {
              if (shownHeroUrl !== fallbackHeroImage) {
                setShownHeroUrl(fallbackHeroImage);
              }
            }}
          />
        ) : null}
      </div>
      <div className="absolute inset-0 z-[1] bg-black/20" />

      <div className="relative z-[2] container mx-auto px-6 min-h-screen flex flex-col justify-end pb-24 md:pb-32 text-left text-white">
        <motion.h1
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
          className="text-5xl md:text-8xl font-light tracking-tight mb-6 max-w-4xl"
        >
          {slide.title}
        </motion.h1>
        <motion.p
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-lg md:text-2xl text-white/90 max-w-xl mb-10 font-light leading-relaxed"
        >
          {slide.subtitle}
        </motion.p>
        <motion.div
          initial={{ x: -20, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-col sm:flex-row gap-4"
        >
          <Button className="bg-white text-brand-ink hover:bg-brand-icon hover:text-white rounded-full px-10 py-6 text-[11px] font-black tracking-[0.2em] uppercase shadow-xl shadow-black/20 border-none transition-all duration-300">
            <Link to={slide.cta1.link} className="flex items-center">
              {slide.cta1.text}
            </Link>
          </Button>
          <Button variant="outline" className="bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-brand-icon hover:border-brand-icon/80 hover:text-white rounded-full px-10 py-6 text-[11px] font-black tracking-[0.2em] uppercase transition-all duration-500">
            <Link to={slide.cta2.link} className="flex items-center">
              {slide.cta2.text}
            </Link>
          </Button>
        </motion.div>
      </div>
    </div>
  );
};
