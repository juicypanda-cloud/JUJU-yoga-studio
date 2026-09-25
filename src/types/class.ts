export type ClassItem = {
  id: string;
  title: string;
  type: 'offline' | 'online' | 'audio';
  image?: string;
  /** Responsive AVIF/WebP srcset for `image`, generated server-side (see api/admin/process-class-image.ts). */
  imageAvifSrcSet?: string;
  imageWebpSrcSet?: string;
  videoUrl?: string;
  audioUrl?: string;
  createdAt?: any;
};
