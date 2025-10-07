import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import helmet from 'helmet';
import { Request, Response, NextFunction } from 'express';
import rateLimit from 'express-rate-limit';
import slowDown from 'express-slow-down';
import { Redis } from 'ioredis';
import { InjectRedis } from '@liaoliaots/nestjs-redis';

@Injectable()
export class SecurityService {
  private readonly logger = new Logger(SecurityService.name);

  constructor(
    private readonly configService: ConfigService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Configure Helmet security headers
   */
  getHelmetConfig() {
    return helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
          fontSrc: ["'self'", "https://fonts.gstatic.com"],
          imgSrc: ["'self'", "data:", "https:"],
          scriptSrc: ["'self'"],
          connectSrc: ["'self'", "wss:", "https:"],
          frameSrc: ["'none'"],
          objectSrc: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
          frameAncestors: ["'none'"],
          upgradeInsecureRequests: [],
        },
      },
      crossOriginEmbedderPolicy: { policy: 'require-corp' },
      crossOriginOpenerPolicy: { policy: 'same-origin' },
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      dnsPrefetchControl: { allow: false },
      frameguard: { action: 'deny' },
      hidePoweredBy: true,
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      ieNoOpen: true,
      noSniff: true,
      originAgentCluster: true,
      permittedCrossDomainPolicies: false,
      referrerPolicy: { policy: 'no-referrer' },
      xssFilter: true,
    });
  }

  /**
   * Advanced rate limiting configuration
   */
  getRateLimitConfig() {
    const windowMs = this.configService.get<number>('RATE_LIMIT_WINDOW_MS', 900000); // 15 minutes
    const max = this.configService.get<number>('RATE_LIMIT_MAX_REQUESTS', 100);

    return rateLimit({
      windowMs,
      max,
      message: {
        error: 'Too many requests',
        retryAfter: Math.ceil(windowMs / 1000),
      },
      standardHeaders: true,
      legacyHeaders: false,
      store: {
        incr: async (key: string) => {
          const current = await this.redis.incr(key);
          if (current === 1) {
            await this.redis.expire(key, Math.ceil(windowMs / 1000));
          }
          return { totalHits: current };
        },
        decrement: async (key: string) => {
          await this.redis.decr(key);
        },
        resetKey: async (key: string) => {
          await this.redis.del(key);
        },
      },
      keyGenerator: (req: Request) => {
        return `rate-limit:${req.ip}:${req.route?.path || 'unknown'}`;
      },
      handler: (req: Request, res: Response) => {
        this.logger.warn(`Rate limit exceeded for IP: ${req.ip}, Route: ${req.route?.path}`);
        res.status(429).json({
          error: 'Too many requests',
          message: 'Please slow down and try again later',
          retryAfter: Math.ceil(windowMs / 1000),
        });
      },
    });
  }

  /**
   * Speed limiting for brute force protection
   */
  getSpeedLimitConfig() {
    return slowDown({
      windowMs: 900000, // 15 minutes
      delayAfter: 50, // Allow 50 requests per windowMs without delay
      delayMs: 500, // Add 500ms delay after delayAfter requests
      maxDelayMs: 20000, // Max delay of 20 seconds
      store: {
        incr: async (key: string) => {
          const current = await this.redis.incr(key);
          if (current === 1) {
            await this.redis.expire(key, 900); // 15 minutes
          }
          return current;
        },
        decrement: async (key: string) => {
          await this.redis.decr(key);
        },
        resetKey: async (key: string) => {
          await this.redis.del(key);
        },
      },
    });
  }

  /**
   * WebAuthn-specific rate limiting
   */
  getWebAuthnRateLimit() {
    return rateLimit({
      windowMs: 300000, // 5 minutes
      max: 10, // Max 10 WebAuthn attempts per 5 minutes
      message: {
        error: 'Too many authentication attempts',
        message: 'Please wait before trying again',
      },
      keyGenerator: (req: Request) => {
        return `webauthn-limit:${req.ip}`;
      },
    });
  }

  /**
   * Trusted proxy configuration
   */
  getTrustedProxies(): string[] {
    const proxies = this.configService.get<string>('TRUSTED_PROXIES', '');
    return proxies.split(',').filter(Boolean);
  }

  /**
   * Validate request origin
   */
  validateOrigin(req: Request): boolean {
    const origin = req.headers.origin;
    const allowedOrigins = this.configService
      .get<string>('API_CORS_ORIGINS', '')
      .split(',');

    if (!origin || !allowedOrigins.includes(origin)) {
      this.logger.warn(`Invalid origin: ${origin}`);
      return false;
    }

    return true;
  }

  /**
   * Log security events
   */
  async logSecurityEvent(
    event: string,
    details: Record<string, any>,
    req?: Request,
  ) {
    const logData = {
      timestamp: new Date().toISOString(),
      event,
      details,
      ip: req?.ip,
      userAgent: req?.headers['user-agent'],
      path: req?.path,
      method: req?.method,
    };

    this.logger.warn(`Security Event: ${event}`, logData);

    // Store in Redis for monitoring
    await this.redis.lpush(
      'security-events',
      JSON.stringify(logData),
    );

    // Keep only last 1000 events
    await this.redis.ltrim('security-events', 0, 999);
  }

  /**
   * Check for suspicious activity patterns
   */
  async checkSuspiciousActivity(ip: string): Promise<boolean> {
    const key = `suspicious:${ip}`;
    const events = await this.redis.lrange(key, 0, -1);
    
    if (events.length > 20) {
      this.logger.error(`Suspicious activity detected from IP: ${ip}`);
      return true;
    }

    return false;
  }

  /**
   * Middleware for API security
   */
  securityMiddleware() {
    return async (req: Request, res: Response, next: NextFunction) => {
      // Check for suspicious activity
      if (await this.checkSuspiciousActivity(req.ip)) {
        await this.logSecurityEvent('SUSPICIOUS_ACTIVITY_BLOCKED', {
          ip: req.ip,
          path: req.path,
        });
        
        return res.status(403).json({
          error: 'Access denied',
          message: 'Suspicious activity detected',
        });
      }

      // Validate origin for sensitive endpoints
      if (req.path.includes('/api/webauthn') && !this.validateOrigin(req)) {
        await this.logSecurityEvent('INVALID_ORIGIN', {
          origin: req.headers.origin,
          path: req.path,
        });
        
        return res.status(403).json({
          error: 'Invalid origin',
        });
      }

      // Add security headers
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('X-Frame-Options', 'DENY');
      res.setHeader('X-XSS-Protection', '1; mode=block');
      res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
      res.setHeader('Referrer-Policy', 'no-referrer');

      next();
    };
  }
}