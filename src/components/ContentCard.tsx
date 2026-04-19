import React from 'react';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { MapPin, Calendar, ArrowRight } from 'lucide-react';

const RETREAT_COVER_FALLBACK = 'https://picsum.photos/seed/retreat-card/1200/800';

interface ContentCardProps {
  item: {
    id: string;
    title: string;
    description: string;
    location?: string;
    date: string;
    price?: number;
    /** Local seed data */
    imageURL?: string;
    /** Firestore / admin (same as retreats admin) */
    image?: string;
    thumbnail?: string;
  };
  type: 'retreat';
  variant?: 'vertical' | 'horizontal';
  onAction?: () => void;
}

const retreatCoverSrc = (item: ContentCardProps['item']) => {
  const src = String(item.imageURL || item.image || item.thumbnail || '').trim();
  return src || RETREAT_COVER_FALLBACK;
};

export const ContentCard: React.FC<ContentCardProps> = ({ item, type, variant = 'vertical', onAction }) => {
  const coverSrc = retreatCoverSrc(item);
  const priceLabel = Number(item.price ?? 0).toLocaleString();

  if (variant === 'horizontal') {
    return (
      <div 
        onClick={onAction}
        className="shadow-2xl shadow-brand-ink/5 hover:shadow-brand-ink/10 hover:-translate-y-1 transition-all duration-500 group cursor-pointer overflow-hidden rounded-[2rem] bg-white flex flex-col md:flex-row max-w-4xl mx-auto md:h-[420px]"
      >
        <div className="md:w-2/5 relative overflow-hidden h-[300px] md:h-full flex">
          <img
            src={coverSrc}
            alt={item.title}
            className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
            loading="lazy"
            decoding="async"
          />
          {item.location && (
            <div className="absolute top-4 left-4">
              <div className="bg-white/90 backdrop-blur-md px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest flex items-center gap-2 text-brand-ink shadow-xl">
                <MapPin size={10} className="text-brand-icon" />
                {item.location}
              </div>
            </div>
          )}
        </div>
        <div className="md:w-3/5 p-8 md:p-12 flex flex-col justify-between bg-white h-full">
          <div>
            <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-brand-icon font-black mb-4">
              <Calendar size={12} />
              <span>{item.date}</span>
            </div>
            <h3 className="text-2xl md:text-3xl font-serif mb-4 text-brand-ink group-hover:text-brand-icon transition-colors duration-500 leading-tight">
              {item.title}
            </h3>
            <p className="text-brand-ink/60 text-sm font-light line-clamp-3 leading-relaxed">
              {item.description}
            </p>
          </div>
          
          <div className="pt-6 border-t border-brand-ink/5 flex justify-between items-center mt-auto">
            <div className="flex flex-col">
              <span className="text-[10px] uppercase tracking-[0.2em] text-brand-ink/30 font-black mb-1">Төлбөр</span>
              <span className="text-xl font-medium text-brand-ink">₮{priceLabel}</span>
            </div>
            <Button 
              onClick={onAction}
              className="rounded-full bg-brand-ink text-white hover:bg-brand-icon transition-all duration-500 group/btn px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl focus:outline-none"
            >
              Бүртгүүлэх
              <ArrowRight size={16} className="ml-2 group-hover/btn:translate-x-1 transition-transform duration-500" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      onClick={onAction}
      className="shadow-2xl shadow-brand-ink/5 hover:shadow-brand-ink/10 hover:-translate-y-2 transition-all duration-500 group cursor-pointer overflow-hidden rounded-[2.5rem] bg-white"
    >
      <div className="relative aspect-[4/5] overflow-hidden flex">
        <img
          src={coverSrc}
          alt={item.title}
          className="absolute inset-0 h-full w-full object-cover transition-transform duration-1000 group-hover:scale-110"
          loading="lazy"
          decoding="async"
        />
        {item.location && (
          <div className="absolute top-6 left-6">
            <div className="bg-white/90 backdrop-blur-md px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-brand-ink shadow-xl">
              <MapPin size={12} className="text-brand-icon" />
              {item.location}
            </div>
          </div>
        )}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-ink/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
      </div>
      <div className="p-10">
        <div className="flex items-center gap-3 text-[10px] uppercase tracking-[0.2em] text-brand-icon font-black mb-6">
          <Calendar size={14} />
          <span>{item.date}</span>
        </div>
        <h3 className="text-3xl font-serif mb-4 text-brand-ink group-hover:text-brand-icon transition-colors duration-500 leading-tight">
          {item.title}
        </h3>
        <p className="text-brand-ink/60 text-sm font-light mb-10 line-clamp-3 leading-relaxed">
          {item.description}
        </p>
        <div className="flex justify-between items-center pt-8 border-t border-brand-ink/5">
          <div className="flex flex-col">
            <span className="text-[10px] uppercase tracking-[0.2em] text-brand-ink/30 font-black mb-1">Төлбөр</span>
            <span className="text-2xl font-medium text-brand-ink">₮{priceLabel}</span>
          </div>
          <Button 
            onClick={onAction}
            className="rounded-full bg-brand-ink text-white hover:bg-brand-icon transition-all duration-500 group/btn px-8 py-6 text-[10px] font-black uppercase tracking-[0.2em] shadow-xl focus:outline-none"
          >
            Бүртгүүлэх
            <ArrowRight size={16} className="ml-2 group-hover/btn:translate-x-1 transition-transform duration-500" />
          </Button>
        </div>
      </div>
    </div>
  );
};
