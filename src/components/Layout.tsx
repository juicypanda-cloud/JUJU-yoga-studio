import React from 'react';
import { Navbar } from './Navbar';
import { Link } from 'react-router-dom';

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <main className="flex-grow">
        {children}
      </main>
      <footer className="bg-brand-ink text-white py-24 px-6">
        <div className="container mx-auto grid grid-cols-1 md:grid-cols-4 gap-16">
          <div className="space-y-6">
            <h3 className="text-xl font-serif tracking-tight">MYA WELLBEING</h3>
            <p className="text-white/40 text-sm leading-relaxed font-light">
              Майндфүлнэс, йог болон цогц эрүүл мэндийн ариун дагшин газар. Манай нийгэмлэгт нэгдэж, өөрийгөө нээх аялалд гараарай.
            </p>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 text-white/30">Шуурхай холбоос</h4>
            <ul className="space-y-4 text-sm text-white/60 font-light">
              <li><Link to="/retreats" className="hover:text-white transition-colors">Ретрит</Link></li>
              <li><Link to="/gallery" className="hover:text-white transition-colors">Галерей</Link></li>
              <li><Link to="/classes" className="hover:text-white transition-colors">Хичээлүүд</Link></li>
              <li><Link to="/online" className="hover:text-white transition-colors">Онлайн хичээл</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Блог</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 text-white/30">Тусламж</h4>
            <ul className="space-y-4 text-sm text-white/60 font-light">
              <li><Link to="/about" className="hover:text-white transition-colors">Бидний тухай</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Холбоо барих</Link></li>
              <li><Link to="/rules" className="hover:text-white transition-colors">Студийн дүрэм</Link></li>
              <li><Link to="/about" className="hover:text-white transition-colors">Нууцлалын бодлого</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] mb-8 text-white/30">Мэдээлэл хүлээн авах</h4>
            <p className="text-sm text-white/60 mb-8 font-light leading-relaxed">Ретрит болон шинэ хичээлүүдийн талаарх хамгийн сүүлийн үеийн мэдээллийг аваарай.</p>
            <div className="flex flex-col gap-3">
              <input 
                type="email" 
                placeholder="Имэйл хаяг" 
                className="bg-white/5 border border-white/10 rounded-full px-6 py-4 text-sm w-full focus:outline-none focus:border-white/30 transition-colors placeholder:text-white/20 outline-none"
              />
              <button className="bg-white text-brand-ink hover:bg-brand-icon hover:text-white rounded-full px-6 py-4 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-500 focus:outline-none">
                Нэгдэх
              </button>
            </div>
          </div>
        </div>
        <div className="container mx-auto mt-24 pt-12 border-t border-white/5 text-center text-[10px] font-black uppercase tracking-[0.2em] text-white/20">
          © {new Date().getFullYear()} Mya Wellbeing. Бүх эрх хуулиар хамгаалагдсан.
        </div>
      </footer>
    </div>
  );
};
