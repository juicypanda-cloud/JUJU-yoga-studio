import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu, X, LogOut,
  Book, Users, Mail,
  Flame, Calendar,
  Play, Wind, PenTool,
  ChevronDown,
  Heart, Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';
import { cn } from '../lib/utils';
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
      { name: 'Иог', desc: 'Бие махбодийн тэнцвэр', icon: Flame, path: '/classes?category=Yoga' },
      { name: 'Бясалгал', desc: 'Сэтгэл амар амгалан', icon: Wind, path: '/classes?category=Meditation' },
      { name: 'Миний хуваарь', desc: 'Бүртгэлтэй хичээл, огноо', icon: Calendar, path: '/schedule' },
    ]
  },
  {
    name: 'Онлайн',
    path: '/online',
    links: [
      { name: 'Видео сан', desc: 'Бүх хичээлүүд', icon: Play, path: '/online' },
      {
        name: 'Оксфордын Майндфүлнэс',
        desc: 'Албан ёсны хөтөлбөр, практик',
        icon: Sparkles,
        path: '/mindfulness',
      },
      { name: 'Блог', desc: 'Зөвлөгөө, нийтлэл', icon: PenTool, path: '/blog' },
    ]
  }
];

const otherLinks = [
  { name: 'Ретрит', path: '/retreats' },
  { name: 'Галерей', path: '/gallery' },
  { name: 'Гишүүнчлэл', path: '/pricing' },
];

/**
 * Every top-level desktop nav link (mega-menu triggers, plain links, admin,
 * profile) renders through this so the hover/active treatment can't drift
 * out of sync between them. Weight stays constant (no font-bold -> font-black
 * jump, which read as an overly heavy hover and doesn't animate smoothly
 * between discrete weights) — emphasis comes from color plus a thin underline
 * that never affects layout width.
 */
const NavLink: React.FC<{
  to: string;
  isActive: boolean;
  light: boolean;
  onMouseEnter?: () => void;
  onClick?: () => void;
  className?: string;
  children: React.ReactNode;
}> = ({ to, isActive, light, onMouseEnter, onClick, className, children }) => (
  <Link
    to={to}
    onMouseEnter={onMouseEnter}
    onClick={onClick}
    className={cn(
      'group relative inline-flex h-6 items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.2em] transition-colors duration-300 ease-out',
      isActive
        ? light ? 'text-white' : 'text-brand-ink'
        : light ? 'text-white/60 hover:text-white' : 'text-brand-ink/60 hover:text-brand-ink',
      className
    )}
  >
    {children}
    <span
      aria-hidden
      className={cn(
        'absolute -bottom-1 left-0 h-px w-full origin-left scale-x-0 bg-current transition-transform duration-300 ease-out group-hover:scale-x-100',
        isActive && 'scale-x-100'
      )}
    />
  </Link>
);

/** Mobile drawer links: constant weight, tap feedback via opacity (real hover rarely applies on touch). */
const MOBILE_LINK_CLASS = 'transition-colors duration-300 ease-out hover:text-primary active:opacity-60';

export const Navbar: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [openMobileMenu, setOpenMobileMenu] = useState<string | null>(null);
  const location = useLocation();
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
    setOpenMobileMenu(null);
  }, [location.pathname]);

  useEffect(() => {
    if (!isOpen) {
      setOpenMobileMenu(null);
    }
  }, [isOpen]);

  useEffect(() => {
    // Plain `overflow: hidden` on body doesn't stop background scroll/bounce
    // on iOS Safari. Pinning the body via `position: fixed` at its current
    // scroll offset (and restoring it on close) is the standard fix.
    if (!isOpen) return;
    const scrollY = window.scrollY;
    const body = document.body;
    const previous = {
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      overflow: body.style.overflow,
    };
    body.style.position = 'fixed';
    body.style.top = `-${scrollY}px`;
    body.style.left = '0';
    body.style.right = '0';
    body.style.overflow = 'hidden';
    return () => {
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.overflow = previous.overflow;
      window.scrollTo(0, scrollY);
    };
  }, [isOpen]);

  const handleLogout = () => signOut(auth);

  const isHomePage = location.pathname === '/';
  const light = !scrolled && isHomePage;

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
    <>
      <nav
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
          scrolled
            ? 'bg-secondary/90 backdrop-blur-md pb-2 pt-[calc(0.5rem+env(safe-area-inset-top))]'
            : 'bg-transparent pb-4 pt-[calc(1rem+env(safe-area-inset-top))]'
        }`}
        onMouseLeave={() => setHoveredIndex(null)}
      >
      <div className="container mx-auto px-6 flex items-center">
        <div className="flex-1 flex justify-start" onMouseEnter={() => setHoveredIndex(null)}>
          <Link to="/" className="z-50">
            <Logo light={light} />
          </Link>
        </div>

        {/* Desktop Nav Links */}
        <div className="hidden xl:flex items-center gap-10">
          <div className="flex items-center gap-12">
            {megaMenus.map((menu, idx) => (
              <div key={menu.name} className="relative" onMouseEnter={() => setHoveredIndex(idx)}>
                <NavLink
                  to={menu.path}
                  isActive={location.pathname.startsWith(menu.path) || hoveredIndex === idx}
                  light={light}
                >
                  {menu.name}
                  <ChevronDown
                    size={12}
                    className={`transition-transform duration-300 ${hoveredIndex === idx ? 'rotate-180' : ''}`}
                  />
                </NavLink>
              </div>
            ))}
            {otherLinks.map((link) => (
              <div key={link.path} className="relative flex items-center" onMouseEnter={() => setHoveredIndex(null)}>
                <NavLink
                  to={link.path}
                  isActive={location.pathname === link.path}
                  light={light}
                  onClick={() => handleNavClick(link.path)}
                >
                  {link.name}
                </NavLink>
              </div>
            ))}
          </div>

          {/* Admin Link */}
          {isAdmin && (
            <div onMouseEnter={() => setHoveredIndex(null)}>
              <NavLink to="/admin" isActive={location.pathname.startsWith('/admin')} light={light}>
                Менежер
              </NavLink>
            </div>
          )}
        </div>

        {/* Auth Button */}
        <div className="flex-1 hidden xl:flex items-center justify-end gap-6 z-50" onMouseEnter={() => setHoveredIndex(null)}>
          {user ? (
            <NavLink to="/profile" isActive={location.pathname === '/profile'} light={light}>
              Миний бүртгэл
            </NavLink>
          ) : (
            <Link to="/login">
              <Button
                variant="ghost"
                className={`text-[12px] font-semibold tracking-[0.2em] uppercase rounded-full px-8 py-5 transition-colors duration-300 ease-out ${
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
                      <h4 className="text-lg font-semibold text-brand-ink transition-colors duration-300 group-hover:text-primary">
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
    </nav>

    {/* Mobile Drawer outside fixed nav to avoid backdrop-filter stacking context truncation */}
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsOpen(false)}
            className="fixed inset-0 bg-brand-ink/40 z-[60] xl:hidden touch-none"
          />
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'tween', duration: 0.4, ease: [0.32, 0.72, 0, 1] }}
            style={{ willChange: 'transform' }}
            className="fixed top-0 right-0 bottom-0 w-[85%] max-w-sm bg-white border-l border-brand-ink/10 z-[70] xl:hidden px-8 pt-[calc(2rem+env(safe-area-inset-top))] pb-[calc(2rem+env(safe-area-inset-bottom))] flex flex-col shadow-2xl"
          >
            <div className="flex justify-end mb-8 shrink-0">
              <button onClick={() => setIsOpen(false)} className="p-2 text-brand-ink">
                <X size={32} />
              </button>
            </div>

            <div className="flex flex-col gap-8 overflow-y-auto overscroll-contain pb-12 flex-1 min-h-0">
              {megaMenus.map((menu) => (
                <div key={menu.name} className="flex flex-col gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setOpenMobileMenu((current) => (current === menu.name ? null : menu.name))
                    }
                    aria-expanded={openMobileMenu === menu.name}
                    aria-controls={`mobile-submenu-${menu.path.replace(/\//g, '')}`}
                    className={cn(
                      'flex w-full items-center justify-between text-left text-2xl font-serif font-medium italic text-brand-ink',
                      MOBILE_LINK_CLASS
                    )}
                  >
                    <span>{menu.name}</span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 transition-transform duration-300 ${
                        openMobileMenu === menu.name ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {/* CSS grid-rows trick instead of animating height: 'auto' — avoids
                      per-frame JS layout measurement, which was causing jank and
                      visible reflow of the links below as the panel expanded. The
                      content stays mounted for a smooth transition, so `inert` keeps
                      it out of tab order and the accessibility tree while collapsed. */}
                  <div
                    id={`mobile-submenu-${menu.path.replace(/\//g, '')}`}
                    inert={openMobileMenu !== menu.name}
                    className={`grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out ${
                      openMobileMenu === menu.name ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'
                    }`}
                  >
                    <div className="min-h-0">
                      <div className="flex flex-col gap-3 pl-4 pt-1">
                        {menu.links.map((link) => (
                          <Link
                            key={link.name}
                            to={link.path}
                            onClick={() => handleNavClick(link.path)}
                            className={cn('block text-lg font-medium text-brand-ink/70', MOBILE_LINK_CLASS)}
                          >
                            {link.name}
                          </Link>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}

              <div className="flex flex-col gap-4 pt-4 border-t border-primary/10">
                {otherLinks.map((link) => (
                  <Link
                    key={link.path}
                    to={link.path}
                    onClick={() => handleNavClick(link.path)}
                    className={cn('text-2xl font-serif font-medium italic text-brand-ink inline-block', MOBILE_LINK_CLASS)}
                  >
                    {link.name}
                  </Link>
                ))}
              </div>
            </div>

            <div className="mt-auto pt-8 border-t border-primary/10 flex flex-col gap-4 shrink-0">
              {user ? (
                <>
                  <Link to="/profile" onClick={() => setIsOpen(false)} className={cn('text-lg font-medium text-brand-ink inline-block', MOBILE_LINK_CLASS)}>
                    Миний бүртгэл
                  </Link>
                  {isAdmin && (
                    <Link to="/admin" onClick={() => setIsOpen(false)} className={cn('text-lg font-medium text-brand-ink inline-block', MOBILE_LINK_CLASS)}>
                      Менежер
                    </Link>
                  )}
                  <Button variant="outline" onClick={handleLogout} className="w-full justify-start text-red-500 border-red-100 rounded-full py-6">
                    <LogOut className="mr-2 h-4 w-4" /> Гарах
                  </Button>
                </>
              ) : (
                <Link to="/login" onClick={() => setIsOpen(false)}>
                  <Button className="w-full bg-brand-ink text-white rounded-full py-8 text-lg font-medium transition-colors duration-300 ease-out">
                    Нэвтрэх
                  </Button>
                </Link>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  </>
);
};
