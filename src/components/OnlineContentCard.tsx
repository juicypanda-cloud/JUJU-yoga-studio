import React from 'react';
import { Play, Lock } from 'lucide-react';
import { Card } from './ui/card';
import { isYouTubeThumbnailUrl } from '../lib/online-video-thumb';
interface OnlineContentCardProps {
  content: {
    id: string;
    title: string;
    type: 'video' | 'audio';
    thumbnailURL: string;
    duration?: string;
    category: string;
    teacherName: string;
    description?: string;
    mediaURL?: string;
  };
  onClick?: () => void;
  priority?: boolean;
  /** Thumbnail/browse allowed, but playback requires subscription — show lock affordance */
  accessLocked?: boolean;
}

const FALLBACK_THUMBNAIL = 'https://picsum.photos/seed/online-content-fallback/1280/720';

export const OnlineContentCard: React.FC<OnlineContentCardProps> = ({ content, onClick, priority = false, accessLocked = false }) => {
  const thumb = content.thumbnailURL?.trim() || FALLBACK_THUMBNAIL;
  const isYouTubeThumb = isYouTubeThumbnailUrl(thumb);

  return (
    <div className="group cursor-pointer" onClick={onClick}>
      <Card
        className="border-none shadow-2xl shadow-brand-ink/10 overflow-hidden rounded-[2rem] bg-brand-ink relative mb-8 group-hover:-translate-y-2 transition-all duration-500"
        style={{ aspectRatio: '16 / 9' }}
      >
        <img
          key={`${content.id}-${thumb}`}
          src={thumb}
          alt={content.title}
          className={`absolute inset-0 h-full w-full block ${isYouTubeThumb ? 'object-contain bg-black' : 'object-cover'}`}
          loading="eager"
          fetchPriority="high"
          decoding="async"
        />

        {/* Gradient Overlay */}
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-brand-ink/60 via-transparent to-transparent opacity-60" />

        {/* Glassy Play / lock affordance */}
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <div className="w-16 h-16 rounded-full bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center text-white shadow-2xl">
            {accessLocked ? (
              <Lock size={22} strokeWidth={1.75} />
            ) : (
              <Play fill="currentColor" size={24} className="ml-1" />
            )}
          </div>
        </div>

        {/* Duration Badge */}
        <div className="pointer-events-none absolute bottom-6 left-6">
          <span className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-[9px] font-black tracking-widest uppercase text-white/80">
            {content.duration || '—'}
          </span>
        </div>
      </Card>
      <div className="px-2">
        <div className="flex items-center gap-3 mb-3">
          <span className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-icon">
            {content.category === 'Yoga' ? 'Йог' : 'Бясалгал'}
          </span>
        </div>
        <h3 className="text-2xl font-serif text-brand-ink mb-3 group-hover:text-brand-icon transition-colors duration-150 leading-tight">
          {content.title}
        </h3>
        <p className="text-brand-ink/60 text-[14px] font-light leading-relaxed line-clamp-2 mb-4">
          {content.description}
        </p>
        <p className="text-brand-ink/30 text-[10px] font-black uppercase tracking-widest">
          Багш: {content.teacherName}
        </p>
      </div>
    </div>
  );
};
