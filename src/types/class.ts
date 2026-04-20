export type ClassItem = {
  id: string;
  title: string;
  type: 'offline' | 'online' | 'audio';
  image?: string;
  videoUrl?: string;
  audioUrl?: string;
  createdAt?: any;
};
