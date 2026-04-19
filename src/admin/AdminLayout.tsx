import React from 'react';
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
  Grid
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

  if (loading) return <div className="pt-32 text-center">Уншиж байна...</div>;
  if (!isAdmin) return <Navigate to="/" />;

  return (
    <div className="admin-panel flex h-screen bg-white pt-20">
      {/* Sidebar */}
      <aside className="w-64 bg-white border-r border-brand-ink/5 hidden md:flex flex-col">
        <ScrollArea className="flex-grow py-6">
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

      {/* Main Content */}
      <main className="flex-grow overflow-auto">
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
