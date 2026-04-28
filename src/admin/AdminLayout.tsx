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
  X
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
import { ScheduleAdmin } from './ScheduleAdmin';
import { MindfulnessAdmin } from './MindfulnessAdmin';
import { HomeHeroAdmin } from './HomeHeroAdmin';

// Admin Pages (to be implemented)

const sidebarLinks = [
  { name: 'Хянах самбар', icon: LayoutDashboard, path: '/admin' },
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
];

export const AdminLayout: React.FC = () => {
  const { isAdmin, loading } = useAuth();
  const location = useLocation();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  if (loading) return <div className="pt-32 text-center">Уншиж байна...</div>;
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

  return (
    <div className="admin-panel flex h-screen bg-white">
      {/* Mobile Sidebar Toggle */}
      <button
        type="button"
        onClick={() => setMobileSidebarOpen(true)}
        className="md:hidden fixed left-4 top-24 z-40 rounded-full border border-brand-ink/10 bg-white p-2 text-brand-ink shadow-sm"
        aria-label="Open admin sidebar"
      >
        <Menu size={18} />
      </button>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen ? (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-brand-ink/20 md:hidden"
          onClick={() => setMobileSidebarOpen(false)}
          aria-label="Close admin sidebar overlay"
        />
      ) : null}

      {/* Sidebar */}
      <aside className="w-64 h-screen bg-white border-r border-brand-ink/5 hidden md:flex flex-col pt-20">
        <ScrollArea className="flex-grow py-6 overscroll-contain">
          <div className="px-6 mb-8">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-ink/30">Удирдлага</h2>
          </div>
          <nav className="px-3 space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                    isActive 
                      ? 'bg-brand-ink text-white shadow-lg shadow-brand-ink/10' 
                      : 'text-brand-ink/50 hover:bg-white hover:text-brand-ink'
                  }`}
                >
                  <link.icon size={16} />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <Separator className="bg-brand-ink/5" />
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-ink/30 hover:text-brand-icon transition-colors">
            <Settings size={14} /> Сайт руу буцах
          </Link>
        </div>
      </aside>

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`fixed left-0 top-0 h-screen z-50 w-72 bg-white border-r border-brand-ink/5 flex flex-col pt-20 transition-transform duration-300 md:hidden ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-brand-ink/5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-ink/30">Удирдлага</h2>
          <button
            type="button"
            onClick={() => setMobileSidebarOpen(false)}
            className="rounded-full p-1 text-brand-ink/60 hover:text-brand-ink"
            aria-label="Close admin sidebar"
          >
            <X size={16} />
          </button>
        </div>
        <ScrollArea className="flex-grow py-4 overscroll-contain">
          <nav className="px-3 space-y-1">
            {sidebarLinks.map((link) => {
              const isActive = location.pathname === link.path;
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  onClick={handleMobileNavigate}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold uppercase tracking-widest transition-all duration-300 ${
                    isActive
                      ? 'bg-brand-ink text-white shadow-lg shadow-brand-ink/10'
                      : 'text-brand-ink/50 hover:bg-white hover:text-brand-ink'
                  }`}
                >
                  <link.icon size={16} />
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </ScrollArea>
        <Separator className="bg-brand-ink/5" />
        <div className="p-6">
          <Link
            to="/"
            onClick={handleMobileNavigate}
            className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-brand-ink/30 hover:text-brand-icon transition-colors"
          >
            <Settings size={14} /> Сайт руу буцах
          </Link>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow overflow-auto pt-20">
        <Routes>
          <Route path="/" element={<Dashboard />} />
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
          <Route path="/schedule" element={<ScheduleAdmin />} />
          <Route path="/mindfulness" element={<MindfulnessAdmin />} />
          <Route path="*" element={<div className="p-8">Энэ хэсэг удахгүй нэмэгдэнэ...</div>} />
        </Routes>
      </main>
    </div>
  );
};
