import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  Menu, X, User, LogOut, LayoutDashboard, 
  Book, Users, Shield, Mail, 
  Sprout, Flame, Star, Calendar,
  Play, Radio, Wind, PenTool,
  ChevronRight, ChevronDown,
  Heart, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { Button } from './ui/button';
import { Logo } from './ui/Logo';

const megaMenus = [
  {
    name: 'Бидний тухай',
    path: '/about',
    links: [
      { name: 'Бидний түүх', desc: 'Студийн үүсэл', icon: Book, path: '/about#story' },
      { name: 'Бидний үнэт зүйлс', desc: 'Зарчим, соёл', icon: Heart, path: '/about#values' },
      { name: 'Багш нар', desc: 'Манай багш нартай танилц', icon: Users, path: '/teachers' },
      { name: 'Холбоо барих', desc: 'Бидэнтэй нэгдээрэй', icon: Mail, path: '/contact' },
    ]
  },
  {
    name: 'Хичээлүүд',
    path: '/classes',
    links: [
      { name: 'Бүх хичээл', desc: 'Нийт хөтөлбөрүүд', icon: Book, path: '/classes' },
      { name: 'Йог', desc: 'Бие махбодийн тэнцвэр', icon: Flame, path: '/classes?category=Yoga' },
      { name: 'Бясалгал', desc: 'Сэтгэл амар амгалан', icon: Wind, path: '/classes?category=Meditation' },
      { name: 'Хуваарь', desc: 'Цагийн хуваарь', icon: Calendar, path: '/schedule' },
    ]
  },
  {
    name: 'Онлайн',
    path: '/online',
    links: [
      { name: 'Видео сан', desc: 'Бүх хичээлүүд', icon: Play, path: '/online' },
      { name: 'Бясалгал', desc: 'Сэтгэл амар амгалан', icon: Wind, path: '/mindfulness' },
      { name: 'Блог', desc: 'Зөвлөгөө, нийтлэл', icon: PenTool, path: '/blog' },
    ]
  }
];

const otherLinks = [
  { name: 'Ретрит', path: '/retreats' },
  { name: 'Галерей', path: '/gallery' },
  { name: 'Гишүүнчлэл', path: '/pricing' },
];

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const location = useLocation();
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
      setHoveredIndex(null);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    setHoveredIndex(null);
  }, [location.pathname]);

  const handleLogout = () => signOut(auth);

  const isHomePage = location.pathname === '/';

  const handleNavClick = (path: string) => {
    setIsOpen(false);
    setHoveredIndex(null);
    if (path.includes('#')) {
      const [pathname, hash] = path.split('#');
      if (location.pathname === pathname) {
        const element = document.getElementById(hash);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    }
  };

  return (
    <nav
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled
          ? 'bg-secondary/90 backdrop-blur-md py-2 shadow-sm'
          : 'bg-transparent py-4'
      }`}
      onMouseLeave={() => setHoveredIndex(null)}
    >
      <div className="container mx-auto px-6 flex items-center">
        <div className="flex-1 flex justify-start" onMouseEnter={() => setHoveredIndex(null)}>
          <Link to="/" className="z-50">
            <Logo light={!scrolled && isHomePage} />
          </Link>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden xl:flex items-center gap-10">
          <div className="flex items-center gap-12">
            {megaMenus.map((menu, idx) => (
              <div 
                key={menu.name}
                className="relative"
                onMouseEnter={() => setHoveredIndex(idx)}
              >
                <Link
                  to={menu.path}
                  className={`text-[12px] tracking-[0.2em] uppercase transition-all duration-300 ease-out flex items-center gap-1.5 h-6 origin-center hover:scale-105 ${
                    location.pathname.startsWith(menu.path) ? 'font-black' : 'font-bold hover:font-black'
                  } ${
                    location.pathname.startsWith(menu.path) || hoveredIndex === idx
                      ? (scrolled || !isHomePage) ? 'text-brand-ink' : 'text-white'
                      : (scrolled || !isHomePage) ? 'text-brand-ink/60' : 'text-white/60'
                  }`}
                >
                  {menu.name}
                  <ChevronDown 
                    size={12} 
                    className={`transition-transform duration-300 ${hoveredIndex === idx ? 'rotate-180' : ''}`} 
                  />
                </Link>
              </div>
            ))}
            {otherLinks.map((link) => (
              <div key={link.path} className="relative flex items-center" onMouseEnter={() => setHoveredIndex(null)}>
                <Link
                  to={link.path}
                  onClick={() => handleNavClick(link.path)}
                  className={`text-[12px] tracking-[0.2em] uppercase transition-all duration-300 ease-out h-6 flex items-center origin-center hover:scale-105 ${
                    location.pathname === link.path ? 'font-black' : 'font-bold hover:font-black'
                  } ${
                    location.pathname === link.path 
                      ? (scrolled || !isHomePage) ? 'text-brand-ink' : 'text-white'
                      : (scrolled || !isHomePage) ? 'text-brand-ink/60' : 'text-white/60'
                  }`}
                >
                  {link.name}
                </Link>
              </div>
            ))}
          </div>
          
          {/* Admin Link */}
          {isAdmin && (
            <div onMouseEnter={() => setHoveredIndex(null)}>
            <Link
              to="/admin"
              className={`text-[12px] tracking-[0.2em] uppercase transition-all duration-300 ease-out h-6 flex items-center origin-center hover:scale-105 ${
                location.pathname.startsWith('/admin') ? 'font-black' : 'font-bold hover:font-black'
              } ${
                location.pathname.startsWith('/admin')
                  ? (scrolled || !isHomePage) ? 'text-brand-ink' : 'text-white'
                  : (scrolled || !isHomePage) ? 'text-brand-ink/60 hover:text-brand-ink' : 'text-white/60 hover:text-white'
              }`}
            >
              Менежер
            </Link>
            </div>
          )}
        </div>

        {/* Auth Button */}
        <div className="flex-1 hidden xl:flex items-center justify-end gap-6 z-50" onMouseEnter={() => setHoveredIndex(null)}>
          {user ? (
            <div className="flex items-center">
              <Link 
                to="/profile" 
                className={`text-[12px] tracking-[0.2em] uppercase transition-all duration-300 ease-out h-6 flex items-center origin-center hover:scale-105 ${
                  location.pathname === '/profile' ? 'font-black' : 'font-bold hover:font-black'
                } ${
                  (scrolled || !isHomePage) ? 'text-brand-ink hover:text-primary' : 'text-white hover:text-white/80'
                }`}
              >
                Миний бүртгэл
              </Link>
            </div>
          ) : (
            <Link to="/login">
              <Button 
                variant="ghost" 
                className={`text-[12px] font-bold tracking-[0.2em] uppercase rounded-full px-8 py-5 transition-all duration-300 ease-out hover:scale-105 hover:font-black ${
                  (scrolled || !isHomePage) 
                    ? 'text-brand-ink hover:bg-primary/10 hover:text-primary' 
                    : 'text-white hover:bg-white/10 hover:text-white'
                }`}
              >
                Нэвтрэх
              </Button>
            </Link>
          )}
        </div>

        {/* Mobile Toggle */}
        <button
          className={`xl:hidden z-50 p-2 ml-auto transition-colors ${
            (scrolled || !isHomePage) || isOpen ? 'text-brand-ink' : 'text-white'
          }`}
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Mega Menu Panel */}
      <AnimatePresence>
        {hoveredIndex !== null && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -10 }}
            transition={{ type: 'spring', damping: 20, stiffness: 100 }}
            className="absolute top-full left-0 right-0 px-6 pb-6 hidden xl:block"
          >
            <div className="container mx-auto bg-white rounded-[32px] shadow-2xl border border-secondary overflow-hidden p-12">
              <div className="grid grid-cols-4 gap-x-12 gap-y-8 bg-white">
                {megaMenus[hoveredIndex].links.map((link) => (
                  <Link 
                    key={link.name} 
                    to={link.path}
                    onClick={() => handleNavClick(link.path)}
                    className="flex items-start gap-4 group transition-transform duration-300 ease-out hover:scale-[1.02] origin-left"
                  >
                    <div className="w-12 h-12 rounded-full bg-white text-brand-icon flex items-center justify-center group-hover:bg-brand-icon group-hover:text-white border border-secondary/20 transition-all duration-500">
                      {typeof link.icon !== 'string' && <link.icon size={20} />}
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-brand-ink transition-colors duration-300 group-hover:text-primary group-hover:font-bold">
                        {link.name}
                      </h4>
                      <p className="text-sm text-brand-ink/40 font-light mt-1">
                        {link.desc}
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsOpen(false)}
              className="fixed inset-0 bg-brand-ink/20 backdrop-blur-sm z-40 xl:hidden"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-secondary z-50 xl:hidden p-8 flex flex-col shadow-2xl"
            >
              <div className="flex justify-end mb-12">
                <button onClick={() => setIsOpen(false)} className="p-2 text-brand-ink">
                  <X size={32} />
                </button>
              </div>

              <div className="flex flex-col gap-8 overflow-y-auto pb-12">
                {megaMenus.map((menu) => (
                  <div key={menu.name} className="flex flex-col gap-4">
                    <h3 className="text-[12px] font-bold tracking-[0.2em] uppercase text-brand-ink/40">
                      {menu.name}
                    </h3>
                    <div className="flex flex-wrap gap-2">
                      {menu.links.map((link) => (
                        <Link
                          key={link.name}
                          to={link.path}
                          onClick={() => handleNavClick(link.path)}
                          className="px-4 py-2 bg-white rounded-full text-sm font-medium text-brand-ink hover:bg-primary/10 hover:text-primary transition-all duration-300 ease-out hover:scale-105 hover:font-semibold border border-primary/20 origin-center"
                        >
                          {link.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ))}
                
                <div className="flex flex-col gap-4 pt-4 border-t border-primary/10">
                  {otherLinks.map((link) => (
                    <Link
                      key={link.path}
                      to={link.path}
                      onClick={() => handleNavClick(link.path)}
                      className="text-2xl font-serif font-medium italic text-brand-ink hover:text-primary transition-all duration-300 ease-out hover:scale-[1.03] hover:font-semibold origin-left inline-block"
                    >
                      {link.name}
                    </Link>
                  ))}
                </div>
              </div>

              <div className="mt-auto pt-8 border-t border-primary/10 flex flex-col gap-4">
                {user ? (
                  <>
                    <Link to="/profile" onClick={() => setIsOpen(false)} className="text-lg font-medium text-brand-ink transition-all duration-300 ease-out hover:scale-105 hover:font-semibold origin-left inline-block">
                      Миний бүртгэл
                    </Link>
                    {isAdmin && <Link to="/admin" onClick={() => setIsOpen(false)} className="text-lg font-medium text-brand-ink transition-all duration-300 ease-out hover:scale-105 hover:font-semibold origin-left inline-block">Менежер</Link>}
                    <Button variant="outline" onClick={handleLogout} className="w-full justify-start text-red-500 border-red-100 rounded-full py-6">
                      <LogOut className="mr-2 h-4 w-4" /> Гарах
                    </Button>
                  </>
                ) : (
                  <Link to="/login" onClick={() => setIsOpen(false)}>
                    <Button 
                      className="w-full bg-brand-ink text-white rounded-full py-8 text-lg font-medium transition-all duration-300 ease-out hover:scale-[1.02] hover:font-semibold"
                    >
                      Нэвтрэх
                    </Button>
                  </Link>
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </nav>
  );
};
