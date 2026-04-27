import React, { Suspense, lazy, useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { Layout } from './components/Layout';
import { ScrollToTop } from './components/ScrollToTop';
import { Toaster } from 'sonner';
import { ErrorBoundary } from './components/ErrorBoundary';

// Safe lazy load helper
const safeLazy = (importFn: () => Promise<any>) => 
  lazy(() => importFn().catch((err) => {
    console.error('[App] Lazy load failed:', err);
    return { default: () => (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white">
        <div className="text-center">
          <h2 className="text-xl font-serif text-brand-ink mb-4">Хуудсыг ачаалахад алдаа гарлаа</h2>
          <button 
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-brand-ink text-white rounded-full text-xs font-black uppercase tracking-widest"
          >
            Дахин ачаалах
          </button>
        </div>
      </div>
    )};
  }));

// Lazy load pages
const Home = safeLazy(() => import('./pages/Home').then(m => ({ default: m.Home })));
const OnlineClasses = safeLazy(() => import('./pages/OnlineClasses').then(m => ({ default: m.OnlineClasses })));
const Schedule = safeLazy(() => import('./pages/Schedule').then(m => ({ default: m.Schedule })));
const Retreats = safeLazy(() => import('./pages/Retreats').then(m => ({ default: m.Retreats })));
const Mindfulness = safeLazy(() => import('./pages/Mindfulness').then(m => ({ default: m.Mindfulness })));
const Classes = safeLazy(() => import('./pages/Classes').then(m => ({ default: m.Classes })));
const ClassDetail = safeLazy(() => import('./pages/ClassDetail').then(m => ({ default: m.ClassDetail })));
const Teachers = safeLazy(() => import('./pages/Teachers').then(m => ({ default: m.Teachers })));
const Gallery = safeLazy(() => import('./pages/Gallery').then(m => ({ default: m.Gallery })));
const Pricing = safeLazy(() => import('./pages/Pricing').then(m => ({ default: m.Pricing })));
const Checkout = safeLazy(() => import('./pages/Checkout').then(m => ({ default: m.Checkout })));
const Profile = safeLazy(() => import('./pages/Profile').then(m => ({ default: m.Profile })));
const TeacherAttendance = safeLazy(() => import('./pages/TeacherAttendance').then(m => ({ default: m.TeacherAttendance })));
const TeacherSchedule = safeLazy(() => import('./pages/TeacherSchedule').then(m => ({ default: m.TeacherSchedule })));
const Rules = safeLazy(() => import('./pages/Rules').then(m => ({ default: m.Rules })));
const About = safeLazy(() => import('./pages/About').then(m => ({ default: m.About })));
const Contact = safeLazy(() => import('./pages/Contact').then(m => ({ default: m.Contact })));
const Blog = safeLazy(() => import('./pages/Blog').then(m => ({ default: m.Blog })));
const BlogDetail = safeLazy(() => import('./pages/BlogDetail').then(m => ({ default: m.BlogDetail })));
const RetreatDetail = safeLazy(() => import('./pages/RetreatDetail').then(m => ({ default: m.RetreatDetail })));
const Login = safeLazy(() => import('./pages/Login').then(m => ({ default: m.Login })));
const SignUp = safeLazy(() => import('./pages/SignUp').then(m => ({ default: m.SignUp })));
const ForgotPassword = safeLazy(() => import('./pages/ForgotPassword').then(m => ({ default: m.ForgotPassword })));
const AdminLayout = safeLazy(() => import('./admin/AdminLayout').then(m => ({ default: m.AdminLayout })));

const LoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-white">
    <div className="flex flex-col items-center gap-4">
      <div className="w-12 h-12 border-4 border-brand-icon/20 border-t-brand-icon rounded-full animate-spin" />
      <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-ink/40">Уншиж байна...</p>
    </div>
  </div>
);

const RouteLoadingOverlay: React.FC = () => {
  const location = useLocation();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);

    let cancelled = false;
    const main = document.querySelector('main');
    if (!main) {
      setVisible(false);
      return;
    }

    const cleanupCallbacks: Array<() => void> = [];
    const tracked = new WeakSet<HTMLImageElement>();
    let pending = 0;
    let settleTimer: number | null = null;
    let lastMutationAt = Date.now();

    const finishWhenStable = () => {
      if (cancelled || pending > 0) return;
      if (settleTimer) window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        const quietForMs = Date.now() - lastMutationAt;
        if (!cancelled && quietForMs >= 120) {
          setVisible(false);
        } else {
          finishWhenStable();
        }
      }, 120);
    };

    const trackImage = (img: HTMLImageElement) => {
      if (tracked.has(img)) return;
      tracked.add(img);

      const loadingMode = (img.getAttribute('loading') || '').toLowerCase();
      // Keep transitions fast: don't wait for below-the-fold lazy images.
      if (loadingMode === 'lazy' && !img.complete) return;

      if (img.complete) return;

      pending += 1;
      const resolve = () => {
        pending = Math.max(0, pending - 1);
        img.removeEventListener('load', resolve);
        img.removeEventListener('error', resolve);
        finishWhenStable();
      };

      img.addEventListener('load', resolve, { once: true });
      img.addEventListener('error', resolve, { once: true });
      cleanupCallbacks.push(() => {
        img.removeEventListener('load', resolve);
        img.removeEventListener('error', resolve);
      });
    };

    const scanImages = (root: ParentNode) => {
      root.querySelectorAll('img').forEach((node) => trackImage(node as HTMLImageElement));
      finishWhenStable();
    };

    // Wait one frame so the next route content mounts before scanning.
    const frame = window.requestAnimationFrame(() => {
      if (cancelled) return;
      scanImages(main);
    });
    cleanupCallbacks.push(() => window.cancelAnimationFrame(frame));

    const observer = new MutationObserver((mutations) => {
      lastMutationAt = Date.now();
      mutations.forEach((mutation) => {
        if (mutation.type === 'attributes' && mutation.target instanceof HTMLImageElement) {
          trackImage(mutation.target);
          return;
        }
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof HTMLElement)) return;
          if (node.tagName === 'IMG') {
            trackImage(node as HTMLImageElement);
          } else {
            scanImages(node);
          }
        });
      });
      finishWhenStable();
    });
    observer.observe(main, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['src', 'srcset', 'loading'],
    });
    cleanupCallbacks.push(() => observer.disconnect());

    const hardTimeout = window.setTimeout(() => {
      if (!cancelled) setVisible(false);
    }, 8000);
    cleanupCallbacks.push(() => window.clearTimeout(hardTimeout));

    return () => {
      cancelled = true;
      if (settleTimer) window.clearTimeout(settleTimer);
      cleanupCallbacks.forEach((cb) => cb());
    };
  }, [location.pathname, location.search]);

  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-white">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-brand-icon/20 border-t-brand-icon rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-ink/40">Уншиж байна...</p>
      </div>
    </div>
  );
};

export default function App() {
  console.log('[App] Rendering');
  
  return (
    <ErrorBoundary>
      <AuthProvider>
        <Router>
          <ScrollToTop />
          <RouteLoadingOverlay />
          <Layout>
            <ErrorBoundary>
              <Suspense fallback={<LoadingScreen />}>
                <Routes>
                  <Route path="/" element={<Home />} />
                  <Route path="/retreats" element={<Retreats />} />
                  <Route path="/retreats/:id" element={<RetreatDetail />} />
                  <Route path="/classes" element={<Classes />} />
                  <Route path="/classes/:id" element={<ClassDetail />} />
                  <Route path="/schedule" element={<Schedule />} />
                  <Route path="/online" element={<OnlineClasses />} />
                  <Route path="/pricing" element={<Pricing />} />
                  <Route path="/checkout" element={<Checkout />} />
                  <Route path="/profile" element={<Profile />} />
                  <Route path="/teacher/attendance" element={<TeacherAttendance />} />
                  <Route path="/teacher/schedule" element={<TeacherSchedule />} />
                  <Route path="/teachers" element={<Teachers />} />
                  <Route path="/gallery" element={<Gallery />} />
                  <Route path="/mindfulness" element={<Mindfulness />} />
                  <Route path="/rules" element={<Rules />} />
                  <Route path="/about" element={<About />} />
                  <Route path="/contact" element={<Contact />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/blog/:id" element={<BlogDetail />} />
                  <Route path="/login" element={<Login />} />
                  <Route path="/signup" element={<SignUp />} />
                  <Route path="/forgot-password" element={<ForgotPassword />} />
                  <Route path="/admin/*" element={<AdminLayout />} />
                </Routes>
              </Suspense>
            </ErrorBoundary>
          </Layout>
          <Toaster position="top-center" />
        </Router>
      </AuthProvider>
    </ErrorBoundary>
  );
}
