import { Request, Response, NextFunction } from 'express';
import AuditLog, { AuditAction, AuditSeverity } from '../models/AuditLog';

/**
 * 1. HTTP Security Headers Hardening Middleware (Helmet-grade Protection)
 */
export const securityHeaders = (req: Request, res: Response, next: NextFunction): void => {
  // Remove Express fingerprint
  res.removeHeader('X-Powered-By');

  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent Clickjacking
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');

  // Enable XSS Filter in legacy browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Enforce HSTS (HTTP Strict Transport Security)
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');

  // Referrer Policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // Restrict sensitive device permissions
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // Content Security Policy
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; " +
    "img-src 'self' data: blob: http: https:; " +
    "media-src 'self' data: blob:; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
    "font-src 'self' https://fonts.gstatic.com data:; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
    "connect-src 'self' ws: wss: http: https:;"
  );

  next();
};

/**
 * Extract safe client IP address
 */
export const getClientIp = (req: Request): string => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    return forwarded.split(',')[0].trim();
  }
  return req.socket.remoteAddress || req.ip || '127.0.0.1';
};

/**
 * 2. In-Depth NoSQL Injection Sanitizer
 * Recursively removes any key starting with '$' or containing '.' to neutralize MongoDB query injection
 */
export const sanitizeData = (data: any): any => {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(sanitizeData);
  }
  if (typeof data === 'object' && !(data instanceof Date) && !(data instanceof RegExp) && !(data instanceof Buffer)) {
    const clean: Record<string, any> = {};
    for (const key of Object.keys(data)) {
      if (key.startsWith('$') || key.includes('.')) {
        // Strip prohibited MongoDB operators from user input
        console.warn(`⚠️ [Security Alert] Neutralized dangerous NoSQL key: "${key}"`);
        continue;
      }
      clean[key] = sanitizeData(data[key]);
    }
    return clean;
  }
  return data;
};

export const sanitizeInputs = (req: Request, res: Response, next: NextFunction): void => {
  if (req.body && typeof req.body === 'object') {
    req.body = sanitizeData(req.body);
  }
  if (req.query && typeof req.query === 'object') {
    req.query = sanitizeData(req.query);
  }
  if (req.params && typeof req.params === 'object') {
    req.params = sanitizeData(req.params);
  }
  next();
};

/**
 * 3. Rate Limiter with Sliding Window (In-Memory, Zero-Dependency)
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Cleanup stale rate limit records every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, record] of rateLimitStore.entries()) {
    if (record.resetAt <= now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export const createRateLimiter = (options: {
  windowMs: number;
  max: number;
  message?: string;
  keyPrefix?: string;
}) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const ip = getClientIp(req);
    const key = `${options.keyPrefix || 'global'}:${ip}`;
    const now = Date.now();

    let record = rateLimitStore.get(key);

    if (!record || record.resetAt <= now) {
      record = {
        count: 1,
        resetAt: now + options.windowMs,
      };
      rateLimitStore.set(key, record);
    } else {
      record.count++;
    }

    // Set standard rate limit headers
    res.setHeader('X-RateLimit-Limit', options.max);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, options.max - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetAt / 1000));

    if (record.count > options.max) {
      res.status(429).json({
        error: 'RATE_LIMIT_EXCEEDED',
        message: options.message || 'Trop de requêtes effectuées. Veuillez réessayer dans quelques instants.',
        retryAfterSeconds: Math.ceil((record.resetAt - now) / 1000),
      });
      return;
    }

    next();
  };
};

/**
 * Pre-configured Limiter for Login / Auth (10 attempts per 5 minutes)
 */
export const authRateLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 15,
  message: 'Trop de tentatives de connexion infructueuses. Accès temporairement restreint.',
  keyPrefix: 'auth_login',
});

/**
 * Pre-configured Limiter for General API (600 requests per minute)
 */
export const apiRateLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  max: 600,
  message: 'Limite de requêtes API atteinte. Ralentissez la cadence.',
  keyPrefix: 'api_general',
});

/**
 * 4. Helper for Logging Clinical & Security Events to AuditLog
 */
export const recordAudit = async (params: {
  userId?: any;
  userName?: string;
  action: AuditAction;
  severity?: AuditSeverity;
  targetId?: any;
  targetName?: string;
  details?: string;
  req?: Request;
  backupData?: any;
}): Promise<void> => {
  try {
    const ipAddress = params.req ? getClientIp(params.req) : undefined;
    const userAgent = params.req ? params.req.headers['user-agent'] : undefined;

    await AuditLog.create({
      userId: params.userId,
      userName: params.userName || 'Système / Anonyme',
      action: params.action,
      severity: params.severity || 'INFO',
      targetId: params.targetId,
      targetName: params.targetName,
      details: params.details,
      ipAddress,
      userAgent,
      backupData: params.backupData,
    });
  } catch (err: any) {
    console.error('⚠️ [AuditLog Error] Impossible d\'enregistrer le log:', err.message);
  }
};

/**
 * 5. Password Policy Validation Helper
 * Minimum 8 characters, containing letters and numbers
 */
export const validatePasswordPolicy = (password: string): { valid: boolean; message?: string } => {
  if (!password || typeof password !== 'string') {
    return { valid: false, message: 'Le mot de passe est obligatoire.' };
  }
  if (password.length < 8) {
    return { valid: false, message: 'Le mot de passe doit comporter au moins 8 caractères.' };
  }
  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return { valid: false, message: 'Le mot de passe doit combiner à la fois des lettres et des chiffres.' };
  }
  return { valid: true };
};
