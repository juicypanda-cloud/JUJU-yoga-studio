import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import { collection, onSnapshot, orderBy, query } from 'firebase/firestore';
import { db } from '../firebase';
import { Button } from '../components/ui/button';
import { Image as ImageIcon, Loader2, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

type MediaDoc = {
  id: string;
  url?: string;
  type?: string;
  filename?: string;
  name?: string;
};

function isImageMedia(m: MediaDoc): boolean {
  const t = String(m?.type || '').toLowerCase();
  if (t === 'image' && m.url) return true;
  if (!m.type && m.url && /\.(png|jpe?g|webp|gif|avif)(\?|$)/i.test(m.url)) return true;
  return false;
}

type MediaImagePickerModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (url: string) => void;
  title?: string;
};

/**
 * Portal-based picker (not Base UI Dialog): controlled-only open from a plain
 * button avoids DialogPortal `mounted` + trigger edge cases that left the modal empty.
 */
export const MediaImagePickerModal: React.FC<MediaImagePickerModalProps> = ({
  open,
  onOpenChange,
  onSelect,
  title = 'Зураг сонгох',
}) => {
  const [items, setItems] = useState<MediaDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    const q = query(collection(db, 'media'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setItems(snap.docs.map((d) => ({ id: d.id, ...(d.data() as object) })) as MediaDoc[]);
        setLoading(false);
      },
      (err) => {
        setLoading(false);
        console.error('[MediaImagePicker] media list error:', err);
        toast.error('Медиа сан ачаалахад алдаа гарлаа. Firestore «media» дүрэм эсвэл индексийг шалгана уу.');
      }
    );
    return () => unsub();
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onOpenChange]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const images = items.filter(isImageMedia);

  const modal = (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="media-picker-title"
    >
      <button
        type="button"
        aria-label="Хаах"
        className="absolute inset-0 bg-black/50 backdrop-blur-[1px]"
        onClick={() => onOpenChange(false)}
      />
      <div
        className="relative z-[9999] flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-2xl border border-border bg-background text-foreground shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div className="min-w-0 text-left">
            <h2 id="media-picker-title" className="font-serif text-xl text-foreground">
              {title}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Медиа сангаас зураг дарж сонгоно уу. Шинэ файл оруулах:{' '}
              <Link
                to="/admin/media"
                className="font-medium text-brand-icon underline-offset-2 hover:underline"
                onClick={() => onOpenChange(false)}
              >
                Медиа сан
              </Link>
              .
            </p>
          </div>
          <Button type="button" variant="ghost" size="icon-sm" className="shrink-0 rounded-full" onClick={() => onOpenChange(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {loading ? (
            <div className="flex justify-center py-16 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : images.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
              Зураг олдсонгүй.{' '}
              <Link
                to="/admin/media"
                className="font-medium text-brand-icon underline-offset-2 hover:underline"
                onClick={() => onOpenChange(false)}
              >
                Медиа сан
              </Link>
              д зураг оруулна уу.
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {images.map((file) => (
                <button
                  key={file.id}
                  type="button"
                  onClick={() => {
                    if (file.url) {
                      onSelect(file.url);
                      onOpenChange(false);
                    }
                  }}
                  className={cn(
                    'group relative aspect-square overflow-hidden rounded-xl border border-border bg-muted text-left',
                    'ring-offset-background transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-icon focus-visible:ring-offset-2',
                    'hover:border-brand-icon/50 hover:shadow-md'
                  )}
                >
                  <img
                    src={file.url}
                    alt={file.filename || file.name || ''}
                    loading="lazy"
                    decoding="async"
                    className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-2 pt-8">
                    <p className="truncate text-[10px] font-medium text-white/95">
                      {file.filename || file.name || 'Зураг'}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
};

type MediaImageFieldProps = {
  label: string;
  value: string;
  onChange: (url: string) => void;
  description?: string;
  className?: string;
};

export const MediaImageField: React.FC<MediaImageFieldProps> = ({
  label,
  value,
  onChange,
  description,
  className,
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className={cn('space-y-2', className)}>
      <MediaImagePickerModal open={pickerOpen} onOpenChange={setPickerOpen} onSelect={onChange} title={label} />
      <label className="text-xs font-black uppercase tracking-widest text-accent/40">{label}</label>
      {description ? <p className="text-xs text-muted-foreground">{description}</p> : null}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex h-20 w-20 shrink-0 overflow-hidden rounded-xl border border-border bg-muted">
          {value ? (
            <img src={value} alt="" decoding="async" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-muted-foreground">
              <ImageIcon className="h-8 w-8 opacity-40" />
            </div>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center">
          <Button type="button" variant="outline" className="rounded-xl" onClick={() => setPickerOpen(true)}>
            Медиа сангаас сонгох
          </Button>
          {value ? (
            <Button type="button" variant="ghost" className="rounded-xl text-muted-foreground" onClick={() => onChange('')}>
              Арилгах
            </Button>
          ) : null}
        </div>
      </div>
      {value ? (
        <p className="truncate text-[10px] text-muted-foreground" title={value}>
          {value}
        </p>
      ) : null}
    </div>
  );
};
