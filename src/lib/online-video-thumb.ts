/**
 * YouTube / online library thumbnail & embed helpers with in-memory memoization.
 */

const videoIdCache = new Map<string, string>();
const thumbnailCache = new Map<string, string>();
const embedUrlCache = new Map<string, string>();

export const getYouTubeVideoId = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (videoIdCache.has(trimmed)) {
    return videoIdCache.get(trimmed)!;
  }

  let result = '';
  try {
    const parsedUrl = new URL(trimmed);
    const cleanPath = parsedUrl.pathname.replace(/\/+$/, '');

    if (parsedUrl.hostname.includes('youtube.com') || parsedUrl.hostname.includes('youtube-nocookie.com')) {
      const id = parsedUrl.searchParams.get('v');
      if (id) {
        result = id;
      } else {
        const pathParts = cleanPath.split('/').filter(Boolean);
        const shortsIndex = pathParts.indexOf('shorts');
        const embedIndex = pathParts.indexOf('embed');
        result = (shortsIndex >= 0 ? pathParts[shortsIndex + 1] : '') || (embedIndex >= 0 ? pathParts[embedIndex + 1] : '');
      }
    } else if (parsedUrl.hostname.includes('youtu.be')) {
      result = cleanPath.slice(1).split('/')[0] || '';
    }
  } catch {
    result = '';
  }

  videoIdCache.set(trimmed, result);
  return result;
};

/** `mq` ≈320px wide — fast for lists; `hq` ≈480px — better detail; `maxres` ≈1280px */
export type YouTubePosterSize = 'list' | 'detail' | 'maxres';

const YT_POSTER_FILE: Record<YouTubePosterSize, string> = {
  list: 'mqdefault.jpg',
  detail: 'hqdefault.jpg',
  maxres: 'hqdefault.jpg',
};

export const getYouTubePosterUrl = (videoId: string, size: YouTubePosterSize = 'list') =>
  videoId ? `https://i.ytimg.com/vi/${videoId}/${YT_POSTER_FILE[size]}` : '';

export const getYouTubeEmbedUrl = (url: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (embedUrlCache.has(trimmed)) {
    return embedUrlCache.get(trimmed)!;
  }
  const id = getYouTubeVideoId(trimmed);
  const result = id ? `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` : '';
  embedUrlCache.set(trimmed, result);
  return result;
};

export const isYouTubeThumbnailUrl = (url?: string) => {
  const normalized = String(url || '').toLowerCase();
  return normalized.includes('img.youtube.com/vi/') || normalized.includes('i.ytimg.com/vi/');
};

export const getYouTubeThumbnailFromMediaUrl = (mediaUrl: string) => {
  const id = getYouTubeVideoId(mediaUrl);
  return getYouTubePosterUrl(id, 'list');
};

export const getYoutubeIdFromStoredThumb = (url: string) => {
  const m = url.match(/(?:img\.youtube\.com|i\.ytimg\.com)\/vi\/([^/]+)\//i);
  return m?.[1] || '';
};

/** Use smaller YouTube JPEG for list UIs (admin may save hq/maxres URLs). */
export const toListYouTubePosterUrl = (url: string) => {
  const trimmed = String(url || '').trim();
  if (!isYouTubeThumbnailUrl(trimmed)) return trimmed;
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
  const cacheKey = `${item?.mediaURL || ''}|${item?.thumbnailURL || ''}|${item?.thumbnail || ''}|${item?.image || ''}`;
  if (thumbnailCache.has(cacheKey)) {
    return thumbnailCache.get(cacheKey)!;
  }

  const mediaUrl = String(item?.mediaURL || '').trim();
  const stored = String(item?.thumbnailURL || item?.thumbnail || item?.image || '').trim();
  const mediaYtId = mediaUrl ? getYouTubeVideoId(mediaUrl) : '';

  let result = '';
  if (mediaYtId) {
    const derived = getYouTubePosterUrl(mediaYtId, 'detail');
    if (!stored) {
      result = derived;
    } else if (isYouTubeThumbnailUrl(stored)) {
      const thumbYtId = getYoutubeIdFromStoredThumb(stored);
      if (thumbYtId && thumbYtId !== mediaYtId) {
        result = derived;
      } else {
        result = getYouTubePosterUrl(mediaYtId, 'detail');
      }
    } else {
      result = stored;
    }
  } else if (stored) {
    result = toListYouTubePosterUrl(stored);
  } else if (isLikelyImageUrl(mediaUrl)) {
    result = mediaUrl;
  }

  if (!result) {
    result = 'https://picsum.photos/seed/online-content-fallback/1280/720';
  }

  thumbnailCache.set(cacheKey, result);
  return result;
};
