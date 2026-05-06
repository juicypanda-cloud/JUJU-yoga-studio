import React, { useEffect, useState } from 'react';
import { Link, useLocation, Routes, Route, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Image as ImageIcon, 
  MapPin, 
  Calendar, 
  Users, 
  Video, 
  UserCircle, 
  Settings,
  BookOpen,
  Brain,
  Grid,
  Menu,
  X,
  UserCheck,
  TrendingUp,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';

import { MediaLibrary } from './MediaLibrary';
import { OnlineContentAdmin } from './OnlineContentAdmin';
import { Dashboard } from './Dashboard';
import { BlogAdmin } from './BlogAdmin';
import { UsersAdmin } from './UsersAdmin';
import { ClassesAdmin } from './ClassesAdmin';
import { RetreatsAdmin } from './RetreatsAdmin';
import { TeachersAdmin } from './TeachersAdmin';
import { GalleryAdmin } from './GalleryAdmin';
import { BookingsAdmin } from './BookingsAdmin';
import { ClassAttendanceAdmin } from './ClassAttendanceAdmin';
import { ScheduleAdmin } from './ScheduleAdmin';
import { MindfulnessAdmin } from './MindfulnessAdmin';
import { HomeHeroAdmin } from './HomeHeroAdmin';
import { RevenueAdmin } from './RevenueAdmin';

// Admin Pages (to be implemented)

const sidebarLinks = [
  { name: 'Хянах самбар', icon: LayoutDashboard, path: '/admin' },
  { name: 'Орлого', icon: TrendingUp, path: '/admin/revenue' },
  { name: 'Нүүр Hero', icon: ImageIcon, path: '/admin/home-hero' },
  { name: 'Медиа сан', icon: ImageIcon, path: '/admin/media' },
  { name: 'Блог', icon: BookOpen, path: '/admin/blog' },
  { name: 'Ретрит', icon: MapPin, path: '/admin/retreats' },
  { name: 'Хичээлүүд', icon: Grid, path: '/admin/classes' },
  { name: 'Хуваарь', icon: Calendar, path: '/admin/schedule' },
  { name: 'Онлайн хичээл', icon: Video, path: '/admin/online' },
  { name: 'Багш нар', icon: UserCircle, path: '/admin/teachers' },
  { name: 'Галерей', icon: ImageIcon, path: '/admin/gallery' },
  { name: 'Майндфүлнэс', icon: Brain, path: '/admin/mindfulness' },
  { name: 'Хэрэглэгчид', icon: Users, path: '/admin/users' },
  { name: 'Захиалгууд', icon: BookOpen, path: '/admin/bookings' },
  { name: 'Хичээлийн ирц', icon: UserCheck, path: '/admin/class-attendees' },
];

export const AdminLayout: React.FC = () => {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) {
    return (
      <div className="admin-panel flex min-h-screen items-center justify-center bg-gradient-to-br from-stone-100 via-white to-violet-50/50">
        <div className="flex flex-col items-center gap-4 rounded-3xl border border-brand-ink/5 bg-white/80 px-12 py-10 shadow-[0_20px_50px_-20px_rgba(26,26,26,0.15)] backdrop-blur-sm">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-brand-icon/20 border-t-brand-icon" aria-hidden />
          <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-ink/40">Уншиж байна</p>
        </div>
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" />;

  useEffect(() => {
    if (!mobileSidebarOpen) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [mobileSidebarOpen]);

  const handleMobileNavigate = () => {
    setMobileSidebarOpen(false);
  };

  const linkBase =
    'flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all duration-200';
  const linkInactive =
    'text-zinc-400 hover:bg-zinc-800/70 hover:text-white';
  const linkActive =
    'bg-gradient-to-r from-brand-icon to-brand-icon/85 text-white shadow-lg shadow-brand-icon/30 ring-1 ring-white/10';

  return (
    <div className="admin-panel flex h-screen bg-gradient-to-br from-stone-100 via-white to-violet-50/40">
      {/* Mobile Sidebar Toggle */}
      <button
        type="button"
        onClick={() => setMobileSidebarOpen(true)}
        className="md:hidden fixed left-4 top-24 z-40 rounded-2xl border border-brand-ink/10 bg-white/90 p-2.5 text-brand-ink shadow-[0_8px_30px_-8px_rgba(26,26,26,0.2)] backdrop-blur-md"
        aria-label="Open admin sidebar"
      >
        <Menu size={18} />
      </button>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-950/40 backdrop-blur-[2px] md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close admin sidebar overlay"
        />
      ) : null}

      {/* Sidebar */}
      <aside className="relative z-10 hidden h-screen w-64 shrink-0 flex-col border-r border-zinc-800/80 bg-zinc-950 pt-20 shadow-[8px_0_40px_-20px_rgba(0,0,0,0.45)] md:flex">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_90%_50%_at_50%_-10%,rgba(122,106,189,0.18),transparent_55%)]" />
        <ScrollArea className="relative min-h-0 flex-1 overscroll-contain py-6">
          <div className="mb-8 px-6">
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">JUJU</p>
            <h2 className="mt-1 font-serif text-lg font-medium tracking-tight text-white">Удирдлага</h2>
            <div className="mt-3 h-px w-10 bg-gradient-to-r from-brand-icon to-transparent" />
          </div>
          <nav className="space-y-0.5 px-3">
            {sidebarLinks.map((link) => {
              const isActive =
                link.path === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`group ${linkBase} ${isActive ? linkActive : linkInactive}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isActive ? 'bg-white/15 text-white' : 'bg-zinc-800/80 text-zinc-400 group-hover:text-white'
                    }`}
                  >
                    <link.icon size={15} strokeWidth={isActive ? 2.25 : 2} />
                  </span>
                  <span className="min-w-0 leading-snug">{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <Separator className="relative bg-zinc-800/80" />
        <div className="relative p-5">
          <Link
            to="/"
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/50 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-colors hover:border-brand-icon/40 hover:text-brand-icon"
          >
            <Settings size={14} /> Сайт руу буцах
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed left-0 top-0 z-50 flex h-screen min-h-0 w-[min(20rem,88vw)] flex-col border-r border-zinc-800 bg-zinc-950 pt-20 shadow-2xl transition-transform duration-300 md:hidden ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_90%_40%_at_50%_0%,rgba(122,106,189,0.2),transparent_50%)] pointer-events-none" />
        <div className="relative flex items-center justify-between border-b border-zinc-800 px-5 py-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-zinc-500">JUJU</p>
            <h2 className="font-serif text-base font-medium text-white">Удирдлага</h2>
          </div>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-xl p-2 text-zinc-400 transition-colors hover:bg-zinc-800 hover:text-white"
            aria-label="Close admin sidebar"
          >
            <X size={18} />
          </button>
        </div>
        <ScrollArea className="relative min-h-0 flex-1 overscroll-contain py-4">
          <nav className="space-y-0.5 px-3">
            {sidebarLinks.map((link) => {
              const isActive =
                link.path === '/admin'
                  ? location.pathname === '/admin'
                  : location.pathname === link.path || location.pathname.startsWith(`${link.path}/`);
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={handleMobileNavigate}
                  className={`group ${linkBase} ${isActive ? linkActive : linkInactive}`}
                >
                  <span
                    className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-colors ${
                      isActive ? 'bg-white/15 text-white' : 'bg-zinc-800/80 text-zinc-400 group-hover:text-white'
                    }`}
                  >
                    <link.icon size={15} strokeWidth={isActive ? 2.25 : 2} />
                  </span>
                  <span className="min-w-0 leading-snug">{link.name}</span>
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <Separator className="relative bg-zinc-800" />
        <div className="relative p-5">
          <Link
            to="/"
            onClick={handleMobileNavigate}
            className="flex items-center justify-center gap-2 rounded-xl border border-zinc-700/80 bg-zinc-900/50 py-3 text-[10px] font-black uppercase tracking-widest text-zinc-400 transition-colors hover:border-brand-icon/40 hover:text-brand-icon"
          >
            <Settings size={14} /> Сайт руу буцах
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="relative flex-grow overflow-auto pt-20 text-brand-ink">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%231A1A1A' fill-opacity='0.03'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
        <div className="relative">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/revenue" element={<RevenueAdmin />} />
          <Route path="/home-hero" element={<HomeHeroAdmin />} />
          <Route path="/media" element={<MediaLibrary />} />
          <Route path="/online" element={<OnlineContentAdmin />} />
          <Route path="/blog" element={<BlogAdmin />} />
          <Route path="/users" element={<UsersAdmin />} />
          <Route path="/classes" element={<ClassesAdmin />} />
          <Route path="/retreats" element={<RetreatsAdmin />} />
          <Route path="/teachers" element={<TeachersAdmin />} />
          <Route path="/gallery" element={<GalleryAdmin />} />
          <Route path="/bookings" element={<BookingsAdmin />} />
          <Route path="/class-attendees" element={<ClassAttendanceAdmin />} />
          <Route path="/schedule" element={<ScheduleAdmin />} />
          <Route path="/mindfulness" element={<MindfulnessAdmin />} />
          <Route
            path="*"
            element={
              <div className="flex min-h-[50vh] items-center justify-center p-8">
                <div className="max-w-md rounded-3xl border border-brand-ink/8 bg-white/90 px-10 py-12 text-center shadow-[0_20px_50px_-24px_rgba(26,26,26,0.2)] backdrop-blur-sm">
                  <p className="text-[10px] font-black uppercase tracking-[0.25em] text-brand-icon">Удахгүй</p>
                  <p className="mt-3 font-serif text-xl text-brand-ink">Энэ хэсэг хөгжүүлэгдэж байна</p>
                  <p className="mt-2 text-sm text-brand-ink/50">Түр хүлээнэ үү.</p>
                </div>
              </div>
            }
          />
        </Routes>
        </div>
      </main>
    </div>
  );
};
