type JsonResponse = {
  status: (code: number) => JsonResponse;
  json: (body: unknown) => void;
  setHeader: (name: string, value: string) => void;
};

type RequestLike = {
  method?: string;
  headers: Record<string, string | string[] | undefined>;
  socket?: { remoteAddress?: string };
};

const WINDOW_MS = 60_000;
const MAX_REQUESTS_PER_WINDOW = 20;
const buckets = new Map<string, { count: number; resetAt: number }>();

const headerValue = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
};

const normalizeHost = (value: string): string => {
  try {
    return new URL(value).hostname.toLowerCase();
  } catch {
    return value.replace(/^https?:\/\//, '').split('/')[0].toLowerCase();
  }
};

const configuredAllowedHosts = (): Set<string> => {
  const defaults = [
    'timbangin.id',
    'www.timbangin.id',
    'timbangin.vercel.app',
    'localhost',
    '127.0.0.1',
  ];

  const configured = (process.env.AI_ALLOWED_REFERRER || process.env.ALLOWED_ORIGINS || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .map(normalizeHost);

  const vercelUrl = process.env.VERCEL_URL ? [normalizeHost(process.env.VERCEL_URL)] : [];
  return new Set([...defaults, ...configured, ...vercelUrl]);
};

const isAllowedHost = (host: string): boolean => {
  if (!host) return false;
  const normalized = normalizeHost(host);
  if (normalized.endsWith('.vercel.app')) return true;
  return configuredAllowedHosts().has(normalized);
};

export const assertRequestAllowed = (req: RequestLike, res: JsonResponse): boolean => {
  res.setHeader('Vary', 'Origin');
  res.setHeader('X-Robots-Tag', 'noindex');

  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return false;
  }

  const origin = headerValue(req.headers.origin);
  const referer = headerValue(req.headers.referer);
  const host = origin || referer;

  if (!isAllowedHost(host)) {
    res.status(403).json({ error: 'Origin not allowed' });
    return false;
  }

  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }

  const forwardedFor = headerValue(req.headers['x-forwarded-for']).split(',')[0].trim();
  const ip = forwardedFor || req.socket?.remoteAddress || 'unknown';
  const now = Date.now();
  const bucket = buckets.get(ip);

  if (!bucket || bucket.resetAt <= now) {
    buckets.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }

  bucket.count += 1;
  if (bucket.count > MAX_REQUESTS_PER_WINDOW) {
    res.status(429).json({ error: 'Too many requests. Please try again shortly.' });
    return false;
  }

  return true;
};

export const assertBodySizeAllowed = (req: RequestLike, res: JsonResponse): boolean => {
  const contentLength = Number(headerValue(req.headers['content-length']) || '0');
  if (contentLength > 50_000) {
    res.status(413).json({ error: 'Request too large' });
    return false;
  }
  return true;
};

export const trimToLimit = (value: unknown, maxLength: number): string => {
  if (typeof value !== 'string') return '';
  return value.trim().slice(0, maxLength);
};
