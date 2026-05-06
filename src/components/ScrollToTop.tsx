import { useEffect, useLayoutEffect, useRef } from 'react';
import { useLocation } from 'react-router-dom';

function scrollWindowTop() {
  window.scrollTo(0, 0);
  document.documentElement.scrollTop = 0;
  document.body.scrollTop = 0;
}

/**
 * Prevents the browser from restoring the previous scroll position on back/forward
 * and re-scrolls after route changes (including lazy-loaded content).
 */
export const ScrollToTop = () => {
  const { pathname, hash, search } = useLocation();
  const didInitRestoration = useRef(false);

  useEffect(() => {
    if (didInitRestoration.current) return;
    didInitRestoration.current = true;
    if ('scrollRestoration' in window.history) {
      window.history.scrollRestoration = 'manual';
    }
  }, []);

  useLayoutEffect(() => {
    if (hash) {
      const id = hash.replace(/^#/, '');
      const element = document.getElementById(id);
      if (element) {
        element.scrollIntoView({ behavior: 'smooth' });
      }
    } else {
      scrollWindowTop();
    }
  }, [pathname, hash, search]);

  // Second pass: lazy routes and loading overlays can mount after the first paint.
  useEffect(() => {
    if (hash) return;
    const t0 = window.setTimeout(() => scrollWindowTop(), 0);
    const t1 = window.setTimeout(() => scrollWindowTop(), 120);
    const t2 = window.setTimeout(() => scrollWindowTop(), 450);
    return () => {
      window.clearTimeout(t0);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [pathname, hash, search]);

  return null;
};
