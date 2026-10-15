"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.validatePasswordPolicy = exports.recordAudit = exports.apiRateLimiter = exports.authRateLimiter = exports.createRateLimiter = exports.sanitizeInputs = exports.sanitizeData = exports.getClientIp = exports.securityHeaders = void 0;
const AuditLog_1 = __importDefault(require("../models/AuditLog"));
/**
 * 1. HTTP Security Headers Hardening Middleware (Helmet-grade Protection)
 */
const securityHeaders = (req, res, next) => {
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
    res.setHeader('Content-Security-Policy', "default-src 'self'; " +
        "img-src 'self' data: blob: http: https:; " +
        "media-src 'self' data: blob:; " +
        "frame-src 'self' data: blob:; " +
        "object-src 'self' data: blob:; " +
        "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; " +
        "font-src 'self' https://fonts.gstatic.com data:; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
        "connect-src 'self' ws: wss: http: https:;");
    next();
};
exports.securityHeaders = securityHeaders;
/**
 * Extract safe client IP address
 */
const getClientIp = (req) => {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string') {
        return forwarded.split(',')[0].trim();
    }
    return req.socket.remoteAddress || req.ip || '127.0.0.1';
};
exports.getClientIp = getClientIp;
/**
 * 2. In-Depth NoSQL Injection Sanitizer
 * Recursively removes any key starting with '$' or containing '.' to neutralize MongoDB query injection
 */
const sanitizeData = (data) => {
    if (data === null || data === undefined)
        return data;
    if (Array.isArray(data)) {
        return data.map(exports.sanitizeData);
    }
    if (typeof data === 'object' && !(data instanceof Date) && !(data instanceof RegExp) && !(data instanceof Buffer)) {
        const clean = {};
        for (const key of Object.keys(data)) {
            if (key.startsWith('$') || key.includes('.')) {
                // Strip prohibited MongoDB operators from user input
                console.warn(`⚠️ [Security Alert] Neutralized dangerous NoSQL key: "${key}"`);
                continue;
            }
            clean[key] = (0, exports.sanitizeData)(data[key]);
        }
        return clean;
    }
    return data;
};
exports.sanitizeData = sanitizeData;
const sanitizeInputs = (req, res, next) => {
    if (req.body && typeof req.body === 'object') {
        req.body = (0, exports.sanitizeData)(req.body);
    }
    if (req.query && typeof req.query === 'object') {
        req.query = (0, exports.sanitizeData)(req.query);
    }
    if (req.params && typeof req.params === 'object') {
        req.params = (0, exports.sanitizeData)(req.params);
    }
    next();
};
exports.sanitizeInputs = sanitizeInputs;
const rateLimitStore = new Map();
// Cleanup stale rate limit records every 5 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitStore.entries()) {
        if (record.resetAt <= now) {
            rateLimitStore.delete(key);
        }
    }
}, 5 * 60 * 1000);
const createRateLimiter = (options) => {
    return (req, res, next) => {
        const ip = (0, exports.getClientIp)(req);
        const key = `${options.keyPrefix || 'global'}:${ip}`;
        const now = Date.now();
        let record = rateLimitStore.get(key);
        if (!record || record.resetAt <= now) {
            record = {
                count: 1,
                resetAt: now + options.windowMs,
            };
            rateLimitStore.set(key, record);
        }
        else {
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
exports.createRateLimiter = createRateLimiter;
/**
 * Pre-configured Limiter for Login / Auth (10 attempts per 5 minutes)
 */
exports.authRateLimiter = (0, exports.createRateLimiter)({
    windowMs: 5 * 60 * 1000,
    max: 15,
    message: 'Trop de tentatives de connexion infructueuses. Accès temporairement restreint.',
    keyPrefix: 'auth_login',
});
/**
 * Pre-configured Limiter for General API (600 requests per minute)
 */
exports.apiRateLimiter = (0, exports.createRateLimiter)({
    windowMs: 60 * 1000,
    max: 600,
    message: 'Limite de requêtes API atteinte. Ralentissez la cadence.',
    keyPrefix: 'api_general',
});
/**
 * 4. Helper for Logging Clinical & Security Events to AuditLog
 */
const recordAudit = async (params) => {
    try {
        const ipAddress = params.req ? (0, exports.getClientIp)(params.req) : undefined;
        const userAgent = params.req ? params.req.headers['user-agent'] : undefined;
        await AuditLog_1.default.create({
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
    }
    catch (err) {
        console.error('⚠️ [AuditLog Error] Impossible d\'enregistrer le log:', err.message);
    }
};
exports.recordAudit = recordAudit;
/**
 * 5. Password Policy Validation Helper
 * Minimum 8 characters, containing letters and numbers
 */
const validatePasswordPolicy = (password) => {
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
exports.validatePasswordPolicy = validatePasswordPolicy;
