import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRedis } from '@liaoliaots/nestjs-redis';
import { Redis } from 'ioredis';
import * as bcrypt from 'bcrypt';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';

interface SecurityAuditLog {
  id: string;
  userId: string;
  action: string;
  details: Record<string, any>;
  risk: 'low' | 'medium' | 'high' | 'critical';
  ip: string;
  userAgent: string;
  timestamp: Date;
}

@Injectable()
export class SecurityAuditService {
  private readonly logger = new Logger(SecurityAuditService.name);

  constructor(
    private readonly configService: ConfigService,
    private readonly jwtService: JwtService,
    @InjectRedis() private readonly redis: Redis,
  ) {}

  /**
   * Log security event
   */
  async logSecurityEvent(
    userId: string,
    action: string,
    details: Record<string, any>,
    req?: any,
  ): Promise<void> {
    const auditLog: SecurityAuditLog = {
      id: this.generateId(),
      userId,
      action,
      details,
      risk: this.assessRisk(action, details),
      ip: req?.ip || 'unknown',
      userAgent: req?.headers?.['user-agent'] || 'unknown',
      timestamp: new Date(),
    };

    // Store in Redis for real-time monitoring
    await this.redis.lpush('security-audit-logs', JSON.stringify(auditLog));
    
    // Keep only last 10,000 entries
    await this.redis.ltrim('security-audit-logs', 0, 9999);

    // Store in MongoDB for long-term analysis (would need AuditLog model)
    // await this.auditLogModel.create(auditLog);

    this.logger.log(`Security Event: ${action}`, {
      userId,
      risk: auditLog.risk,
      ip: auditLog.ip,
    });

    // Trigger alerts for high/critical risk events
    if (auditLog.risk === 'high' || auditLog.risk === 'critical') {
      await this.triggerSecurityAlert(auditLog);
    }
  }

  /**
   * Assess risk level of security event
   */
  private assessRisk(action: string, details: Record<string, any>): 'low' | 'medium' | 'high' | 'critical' {
    // Critical risk events
    if ([
      'MULTIPLE_FAILED_WEBAUTHN_ATTEMPTS',
      'CREDENTIAL_COMPROMISE_DETECTED',
      'SUSPICIOUS_DEVICE_ACCESS',
      'UNAUTHORIZED_ADMIN_ACCESS',
    ].includes(action)) {
      return 'critical';
    }

    // High risk events
    if ([
      'WEBAUTHN_REGISTRATION_FAILED',
      'INVALID_JWT_TOKEN',
      'RATE_LIMIT_EXCEEDED',
      'UNUSUAL_REQUEST_PATTERN',
    ].includes(action)) {
      return 'high';
    }

    // Medium risk events
    if ([
      'FAILED_AUTHENTICATION',
      'PERMISSION_DENIED',
      'INVALID_REQUEST_FORMAT',
    ].includes(action)) {
      return 'medium';
    }

    return 'low';
  }

  /**
   * Generate unique audit log ID
   */
  private generateId(): string {
    return `audit_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Trigger security alert
   */
  private async triggerSecurityAlert(auditLog: SecurityAuditLog): Promise<void> {
    // Store alert for monitoring dashboard
    await this.redis.lpush('security-alerts', JSON.stringify({
      ...auditLog,
      alertId: `alert_${Date.now()}`,
    }));

    // Keep only last 1000 alerts
    await this.redis.ltrim('security-alerts', 0, 999);

    this.logger.error(`SECURITY ALERT: ${auditLog.action}`, auditLog);

    // Could integrate with external alerting systems (PagerDuty, Slack, etc.)
  }

  /**
   * Detect suspicious patterns
   */
  async detectSuspiciousActivity(userId: string, ip: string): Promise<boolean> {
    const timeWindow = 3600; // 1 hour in seconds
    const maxAttempts = 10;

    const key = `suspicious:${userId}:${ip}`;
    const attempts = await this.redis.incr(key);
    
    if (attempts === 1) {
      await this.redis.expire(key, timeWindow);
    }

    if (attempts > maxAttempts) {
      await this.logSecurityEvent(userId, 'SUSPICIOUS_ACTIVITY_DETECTED', {
        attempts,
        timeWindow,
        ip,
      });

      return true;
    }

    return false;
  }

  /**
   * Validate JWT token security
   */
  async validateTokenSecurity(token: string, userId: string): Promise<boolean> {
    try {
      const decoded = this.jwtService.verify(token);
      
      // Check if token is blacklisted
      const isBlacklisted = await this.redis.exists(`blacklist:${token}`);
      if (isBlacklisted) {
        await this.logSecurityEvent(userId, 'BLACKLISTED_TOKEN_USED', { token: token.substr(0, 10) + '...' });
        return false;
      }

      // Check token age
      const tokenAge = Date.now() - (decoded.iat * 1000);
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      if (tokenAge > maxAge) {
        await this.logSecurityEvent(userId, 'EXPIRED_TOKEN_USED', { tokenAge, maxAge });
        return false;
      }

      return true;
    } catch (error) {
      await this.logSecurityEvent(userId, 'INVALID_JWT_TOKEN', { error: error.message });
      return false;
    }
  }

  /**
   * Blacklist JWT token
   */
  async blacklistToken(token: string, reason: string): Promise<void> {
    const decoded = this.jwtService.decode(token) as any;
    const expiry = decoded?.exp ? decoded.exp - Math.floor(Date.now() / 1000) : 86400;
    
    await this.redis.setex(`blacklist:${token}`, expiry, reason);
    
    this.logger.log(`Token blacklisted: ${reason}`);
  }

  /**
   * Generate TOTP backup codes
   */
  generateBackupCodes(): string[] {
    const codes = [];
    for (let i = 0; i < 10; i++) {
      codes.push(Math.random().toString(36).substr(2, 8).toUpperCase());
    }
    return codes;
  }

  /**
   * Hash backup codes
   */
  async hashBackupCodes(codes: string[]): Promise<string[]> {
    const saltRounds = 12;
    return Promise.all(codes.map(code => bcrypt.hash(code, saltRounds)));
  }

  /**
   * Verify backup code
   */
  async verifyBackupCode(code: string, hashedCodes: string[]): Promise<boolean> {
    for (const hashedCode of hashedCodes) {
      if (await bcrypt.compare(code, hashedCode)) {
        return true;
      }
    }
    return false;
  }

  /**
   * Generate TOTP secret and QR code
   */
  async generateTOTPSecret(userId: string, userEmail: string): Promise<{
    secret: string;
    qrCodeUrl: string;
    backupCodes: string[];
  }> {
    const secret = speakeasy.generateSecret({
      name: `SecureApprove (${userEmail})`,
      issuer: 'SecureApprove',
      length: 32,
    });

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url);
    const backupCodes = this.generateBackupCodes();

    await this.logSecurityEvent(userId, 'TOTP_SECRET_GENERATED', {
      email: userEmail,
    });

    return {
      secret: secret.base32,
      qrCodeUrl,
      backupCodes,
    };
  }

  /**
   * Verify TOTP token
   */
  verifyTOTPToken(token: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token,
      window: 2, // Allow 2 time steps of variance
    });
  }

  /**
   * Get security metrics
   */
  async getSecurityMetrics(timeframe: 'hour' | 'day' | 'week' = 'day'): Promise<{
    totalEvents: number;
    riskDistribution: Record<string, number>;
    topActions: Array<{ action: string; count: number }>;
    alertsTriggered: number;
  }> {
    const cutoff = new Date();
    
    switch (timeframe) {
      case 'hour':
        cutoff.setHours(cutoff.getHours() - 1);
        break;
      case 'day':
        cutoff.setDate(cutoff.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(cutoff.getDate() - 7);
        break;
    }

    // Get logs from Redis (in production, would query MongoDB)
    const logs = await this.redis.lrange('security-audit-logs', 0, -1);
    const parsedLogs = logs
      .map(log => JSON.parse(log))
      .filter(log => new Date(log.timestamp) >= cutoff);

    const riskDistribution = parsedLogs.reduce((acc, log) => {
      acc[log.risk] = (acc[log.risk] || 0) + 1;
      return acc;
    }, {});

    const actionCounts = parsedLogs.reduce((acc, log) => {
      acc[log.action] = (acc[log.action] || 0) + 1;
      return acc;
    }, {});

    const topActions = Object.entries(actionCounts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([action, count]) => ({ action, count }));

    const alerts = await this.redis.lrange('security-alerts', 0, -1);
    const recentAlerts = alerts
      .map(alert => JSON.parse(alert))
      .filter(alert => new Date(alert.timestamp) >= cutoff);

    return {
      totalEvents: parsedLogs.length,
      riskDistribution,
      topActions,
      alertsTriggered: recentAlerts.length,
    };
  }

  /**
   * Perform security health check
   */
  async performSecurityHealthCheck(): Promise<{
    status: 'healthy' | 'warning' | 'critical';
    issues: string[];
    metrics: any;
  }> {
    const issues: string[] = [];
    const metrics = await this.getSecurityMetrics('hour');

    // Check for high alert volume
    if (metrics.alertsTriggered > 10) {
      issues.push(`High alert volume: ${metrics.alertsTriggered} alerts in last hour`);
    }

    // Check for critical risk events
    if (metrics.riskDistribution.critical > 0) {
      issues.push(`${metrics.riskDistribution.critical} critical risk events detected`);
    }

    // Check Redis connectivity
    try {
      await this.redis.ping();
    } catch (error) {
      issues.push('Redis connectivity issues detected');
    }

    const status = issues.length === 0 
      ? 'healthy' 
      : metrics.riskDistribution.critical > 0 
        ? 'critical' 
        : 'warning';

    return {
      status,
      issues,
      metrics,
    };
  }
}