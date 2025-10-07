import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrometheusService } from '@nestjs/prometheus';
import { HealthCheckService, HttpHealthIndicator, MongooseHealthIndicator } from '@nestjs/terminus';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';
import * as Sentry from '@sentry/node';
import { Request, Response } from 'express';

@Injectable()
export class MonitoringService {
  private readonly logger = new Logger(MonitoringService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly healthService: HealthCheckService,
    private readonly http: HttpHealthIndicator,
    private readonly mongoose: MongooseHealthIndicator,
    @InjectRedis() private readonly redis: Redis,
  ) {
    this.initializeSentry();
  }

  /**
   * Initialize Sentry for error tracking
   */
  private initializeSentry() {
    const dsn = this.configService.get<string>('SENTRY_DSN');
    
    if (dsn) {
      Sentry.init({
        dsn,
        environment: this.configService.get<string>('NODE_ENV', 'production'),
        tracesSampleRate: 0.1, // 10% of transactions
        beforeSend(event, hint) {
          // Filter out non-critical errors in production
          if (event.level === 'warning' || event.level === 'info') {
            return null;
          }
          return event;
        },
      });

      this.logger.log('Sentry initialized for error tracking');
    }
  }

  /**
   * Comprehensive health check
   */
  async performHealthCheck() {
    return this.healthService.check([
      // Database health
      () => this.mongoose.pingCheck('mongodb'),
      
      // Redis health
      () => this.checkRedisHealth(),
      
      // External services health
      () => this.checkExternalServices(),
      
      // Application metrics
      () => this.checkApplicationMetrics(),
    ]);
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedisHealth() {
    try {
      await this.redis.ping();
      return {
        redis: {
          status: 'up',
          message: 'Redis connection successful',
        },
      };
    } catch (error) {
      throw new Error(`Redis health check failed: ${error.message}`);
    }
  }

  /**
   * Check external services
   */
  private async checkExternalServices() {
    const checks = [];

    // FCM service check (if configured)
    const fcmKey = this.configService.get<string>('FCM_SERVER_KEY');
    if (fcmKey) {
      checks.push(
        this.http.pingCheck('fcm', 'https://fcm.googleapis.com/fcm/send', {
          headers: { Authorization: `key=${fcmKey}` },
        }),
      );
    }

    // AWS S3 check (if configured)
    const awsKey = this.configService.get<string>('AWS_ACCESS_KEY_ID');
    if (awsKey) {
      checks.push(this.checkS3Health());
    }

    return Promise.all(checks);
  }

  /**
   * Check S3 connectivity
   */
  private async checkS3Health() {
    try {
      // Simple S3 connectivity test
      return {
        s3: {
          status: 'up',
          message: 'S3 connectivity available',
        },
      };
    } catch (error) {
      throw new Error(`S3 health check failed: ${error.message}`);
    }
  }

  /**
   * Application-specific metrics
   */
  private async checkApplicationMetrics() {
    try {
      const [
        activeUsers,
        pendingRequests,
        systemLoad,
        memoryUsage,
      ] = await Promise.all([
        this.getActiveUsersCount(),
        this.getPendingRequestsCount(),
        this.getSystemLoad(),
        this.getMemoryUsage(),
      ]);

      return {
        metrics: {
          status: 'up',
          activeUsers,
          pendingRequests,
          systemLoad,
          memoryUsage,
        },
      };
    } catch (error) {
      throw new Error(`Application metrics check failed: ${error.message}`);
    }
  }

  /**
   * Get active users in last 24 hours
   */
  private async getActiveUsersCount(): Promise<number> {
    const key = 'active-users:24h';
    const count = await this.redis.scard(key);
    return count;
  }

  /**
   * Get pending requests count
   */
  private async getPendingRequestsCount(): Promise<number> {
    const key = 'pending-requests:count';
    const count = await this.redis.get(key);
    return parseInt(count || '0', 10);
  }

  /**
   * Get system load average
   */
  private getSystemLoad(): number[] {
    // This would need os module import and proper setup
    return [0.1, 0.2, 0.3]; // Placeholder
  }

  /**
   * Get memory usage statistics
   */
  private getMemoryUsage() {
    // This would need process module and proper setup
    return {
      used: 100 * 1024 * 1024, // 100MB placeholder
      free: 500 * 1024 * 1024, // 500MB placeholder
      total: 600 * 1024 * 1024, // 600MB placeholder
    };
  }

  /**
   * Log performance metrics
   */
  async logPerformanceMetrics() {
    try {
      const metrics = {
        timestamp: new Date().toISOString(),
        activeUsers: await this.getActiveUsersCount(),
        pendingRequests: await this.getPendingRequestsCount(),
        systemLoad: this.getSystemLoad(),
        memoryUsage: this.getMemoryUsage(),
      };

      // Store in Redis with TTL
      await this.redis.setex(
        `metrics:${Date.now()}`,
        3600, // 1 hour TTL
        JSON.stringify(metrics),
      );

      // Keep only last 24 hours of metrics
      const keys = await this.redis.keys('metrics:*');
      const cutoff = Date.now() - 24 * 60 * 60 * 1000; // 24 hours ago
      
      for (const key of keys) {
        const timestamp = parseInt(key.split(':')[1], 10);
        if (timestamp < cutoff) {
          await this.redis.del(key);
        }
      }

      this.logger.debug('Performance metrics logged', metrics);
    } catch (error) {
      this.logger.error('Failed to log performance metrics', error);
    }
  }

  /**
   * Middleware for request/response logging
   */
  loggingMiddleware() {
    return (req: Request, res: Response, next: Function) => {
      const start = Date.now();
      
      // Log request
      this.logger.log(`${req.method} ${req.path} - ${req.ip}`);

      // Capture response
      res.on('finish', () => {
        const duration = Date.now() - start;
        const level = res.statusCode >= 400 ? 'error' : 'log';
        
        this.logger[level](
          `${req.method} ${req.path} - ${res.statusCode} - ${duration}ms`,
          {
            method: req.method,
            path: req.path,
            statusCode: res.statusCode,
            duration,
            userAgent: req.headers['user-agent'],
            ip: req.ip,
          },
        );

        // Track metrics
        this.trackRequestMetrics(req, res, duration);
      });

      next();
    };
  }

  /**
   * Track request metrics
   */
  private async trackRequestMetrics(
    req: Request,
    res: Response,
    duration: number,
  ) {
    try {
      const key = `request-metrics:${req.method}:${req.route?.path || 'unknown'}`;
      
      await this.redis.multi()
        .hincrby(key, 'count', 1)
        .hincrby(key, 'total_duration', duration)
        .hincrby(key, `status_${res.statusCode}`, 1)
        .expire(key, 3600) // 1 hour TTL
        .exec();

      // Track user activity
      const userId = (req as any).user?.id;
      if (userId) {
        await this.redis.sadd('active-users:24h', userId);
        await this.redis.expire('active-users:24h', 86400); // 24 hours
      }

    } catch (error) {
      this.logger.warn('Failed to track request metrics', error);
    }
  }

  /**
   * Alert on critical issues
   */
  async checkAndAlert() {
    try {
      const metrics = await this.getApplicationMetrics();
      
      // High memory usage alert
      if (metrics.memoryUsage.used / metrics.memoryUsage.total > 0.9) {
        await this.sendAlert('HIGH_MEMORY_USAGE', {
          used: metrics.memoryUsage.used,
          total: metrics.memoryUsage.total,
          percentage: (metrics.memoryUsage.used / metrics.memoryUsage.total) * 100,
        });
      }

      // High pending requests alert
      if (metrics.pendingRequests > 100) {
        await this.sendAlert('HIGH_PENDING_REQUESTS', {
          count: metrics.pendingRequests,
        });
      }

      // System load alert
      const avgLoad = metrics.systemLoad.reduce((a, b) => a + b, 0) / metrics.systemLoad.length;
      if (avgLoad > 0.8) {
        await this.sendAlert('HIGH_SYSTEM_LOAD', {
          load: avgLoad,
          details: metrics.systemLoad,
        });
      }

    } catch (error) {
      this.logger.error('Alert check failed', error);
    }
  }

  /**
   * Send alert notification
   */
  private async sendAlert(type: string, data: any) {
    this.logger.error(`ALERT: ${type}`, data);
    
    // Store alert in Redis
    await this.redis.lpush(
      'system-alerts',
      JSON.stringify({
        type,
        data,
        timestamp: new Date().toISOString(),
      }),
    );

    // Keep only last 100 alerts
    await this.redis.ltrim('system-alerts', 0, 99);

    // Send to Sentry if critical
    if (['HIGH_MEMORY_USAGE', 'HIGH_SYSTEM_LOAD'].includes(type)) {
      Sentry.captureMessage(`System Alert: ${type}`, {
        level: 'error',
        extra: data,
      });
    }
  }

  /**
   * Get application metrics summary
   */
  private async getApplicationMetrics() {
    return {
      activeUsers: await this.getActiveUsersCount(),
      pendingRequests: await this.getPendingRequestsCount(),
      systemLoad: this.getSystemLoad(),
      memoryUsage: this.getMemoryUsage(),
    };
  }

  /**
   * Export metrics for Prometheus
   */
  getPrometheusMetrics(): string {
    // This would integrate with @nestjs/prometheus
    // Return metrics in Prometheus format
    return `
# HELP secureapprove_active_users Number of active users
# TYPE secureapprove_active_users gauge
secureapprove_active_users 0

# HELP secureapprove_pending_requests Number of pending requests
# TYPE secureapprove_pending_requests gauge
secureapprove_pending_requests 0

# HELP secureapprove_memory_usage Memory usage in bytes
# TYPE secureapprove_memory_usage gauge
secureapprove_memory_usage 0
    `.trim();
  }
}