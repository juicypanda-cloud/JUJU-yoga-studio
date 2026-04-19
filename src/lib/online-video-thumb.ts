/**
 * YouTube / online library thumbnail helpers (shared by Home + OnlineClasses).
 */

export const getYouTubeVideoId = (url: string) => {
  if (!url) return '';
  try {
    const parsedUrl = new URL(url.trim());
    const cleanPath = parsedUrl.pathname.replace(/\/+$/, '');

    if (parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtube-nocookie.com')) {
      const id = parsedUrl.searchParams.get('v');
      if (id) return id;

      const pathParts = cleanPath.split('/').filter(Boolean);
      const shortsIndex = pathParts.indexOf('shorts');
      const embedIndex = pathParts.indexOf('embed');
      return (shortsIndex >= 0 ? pathParts[shortsIndex + 1] : '') || (embedIndex >= 0 ? pathParts[embedIndex + 1] : '');
    }

    if (parsedUrl.hostname.includes('youtu.be')) {
      return cleanPath.slice(1).split('/')[0];
    }

    return '';
  } catch {
    return '';
  }
};

/** `mq` ≈320px wide — fast for grids; `hq` ≈480px — detail / hero */
export type YouTubePosterSize = 'list' | 'detail';

const YT_POSTER_FILE: Record<YouTubePosterSize, string> = {
  list: 'mqdefault.jpg',
  detail: 'hqdefault.jpg',
};

export const getYouTubePosterUrl = (videoId: string, size: YouTubePosterSize = 'list') =>
  videoId ? `https://img.youtube.com/vi/${videoId}/${YT_POSTER_FILE[size]}` : '';

export const getYouTubeThumbnailFromMediaUrl = (mediaUrl: string) => {
  const id = getYouTubeVideoId(mediaUrl);
  return getYouTubePosterUrl(id, 'list');
};

export const getYoutubeIdFromStoredThumb = (url: string) => {
  const m = url.match(/img\.youtube\.com\/vi\/([^/]+)\//i);
  return m?.[1] || '';
};

/** Use smaller YouTube JPEG for list UIs (admin may save hq/maxres URLs). */
export const toListYouTubePosterUrl = (url: string) => {
  const trimmed = String(url || '').trim();
  if (!trimmed.toLowerCase().includes('img.youtube.com/vi/')) return trimmed;
  const id = getYoutubeIdFromStoredThumb(trimmed);
  return id ? getYouTubePosterUrl(id, 'list') : trimmed;
};

const isLikelyImageUrl = (url?: string) => {
  if (!url) return false;
  const normalized = url.toLowerCase();
  if (/\.(png|jpe?g|webp|gif|avif)(\?|$)/.test(normalized)) return true;
  return (
    normalized.includes('firebasestorage.googleapis.com') &&
    (normalized.includes('image') ||
      normalized.includes('images%2f') ||
      normalized.includes('thumbnails%2f'))
  );
};

/**
 * Prefer a poster that matches `mediaURL`. If media is YouTube, use that video's
 * poster unless `thumbnailURL` is a non-YouTube URL (custom Firebase / CDN art).
 * Mismatched YouTube thumb vs media (common in seed data) is corrected here.
 */
export const resolveOnlineContentThumbnail = (item: {
  mediaURL?: string;
  thumbnailURL?: string;
  thumbnail?: string;
  image?: string;
}): string => {
  const mediaUrl = String(item?.mediaURL || '').trim();
  const stored = String(item?.thumbnailURL || item?.thumbnail || item?.image || '').trim();
  const mediaYtId = mediaUrl ? getYouTubeVideoId(mediaUrl) : '';

  if (mediaYtId) {
    const derived = getYouTubePosterUrl(mediaYtId, 'list');
    if (!stored) return derived;
    if (stored.toLowerCase().includes('img.youtube.com/vi/')) {
      const thumbYtId = getYoutubeIdFromStoredThumb(stored);
      if (thumbYtId && thumbYtId !== mediaYtId) return derived;
      return toListYouTubePosterUrl(stored);
    }
    return stored;
  }

  if (stored) return toListYouTubePosterUrl(stored);
  if (isLikelyImageUrl(mediaUrl)) return mediaUrl;
  return '';
};
