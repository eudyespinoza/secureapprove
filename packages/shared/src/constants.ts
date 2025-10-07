// Constants for SecureApprove

export const APP_NAME = 'SecureApprove';
export const APP_VERSION = '1.0.0';

// API Endpoints
export const API_ENDPOINTS = {
  AUTH: '/api/auth',
  WEBAUTHN: '/api/webauthn',
  USERS: '/api/users',
  REQUESTS: '/api/requests',
  APPROVALS: '/api/approvals',
  NOTIFICATIONS: '/api/notifications',
  POLICIES: '/api/policies',
  AUDIT: '/api/audit',
  HEALTH: '/health',
} as const;

// WebSocket Events
export const WS_EVENTS = {
  REQUEST_CREATED: 'request_created',
  REQUEST_UPDATED: 'request_updated',
  APPROVAL_REQUIRED: 'approval_required',
  NOTIFICATION_SENT: 'notification_sent',
  USER_ONLINE: 'user_online',
  USER_OFFLINE: 'user_offline',
} as const;

// Request Status
export const REQUEST_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
} as const;

// Priority Levels
export const PRIORITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

// User Roles
export const USER_ROLES = {
  USER: 'user',
  APPROVER: 'approver',
  ADMIN: 'admin',
} as const;

// Notification Types
export const NOTIFICATION_TYPES = {
  REQUEST_CREATED: 'request_created',
  REQUEST_APPROVED: 'request_approved',
  REQUEST_REJECTED: 'request_rejected',
  REMINDER: 'reminder',
  SECURITY_ALERT: 'security_alert',
} as const;

// Error Codes
export const ERROR_CODES = {
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  WEBAUTHN_ERROR: 'WEBAUTHN_ERROR',
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

// WebAuthn Configuration
export const WEBAUTHN_CONFIG = {
  TIMEOUT: 60000, // 60 seconds
  USER_VERIFICATION: 'preferred' as const,
  AUTHENTICATOR_ATTACHMENT: 'platform' as const,
  RESIDENT_KEY: 'preferred' as const,
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 25,
  MAX_LIMIT: 100,
} as const;

// Date Formats
export const DATE_FORMATS = {
  SHORT: 'DD/MM/YYYY',
  LONG: 'DD/MM/YYYY HH:mm',
  ISO: 'YYYY-MM-DDTHH:mm:ss.SSSZ',
} as const;

// File Upload Limits
export const FILE_LIMITS = {
  MAX_SIZE: 10 * 1024 * 1024, // 10MB
  ALLOWED_TYPES: ['image/jpeg', 'image/png', 'application/pdf', 'text/plain'],
} as const;

// Cache Keys
export const CACHE_KEYS = {
  USER_PROFILE: (userId: string) => `user:${userId}`,
  REQUEST_DATA: (requestId: string) => `request:${requestId}`,
  NOTIFICATIONS: (userId: string) => `notifications:${userId}`,
  POLICIES: 'policies:active',
} as const;

// Security Settings
export const SECURITY = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60 * 1000, // 15 minutes
  JWT_EXPIRY: '24h',
  REFRESH_EXPIRY: '7d',
  PASSWORD_MIN_LENGTH: 8,
} as const;

// Theme Colors
export const COLORS = {
  PRIMARY: '#3b82f6', // blue-500
  SECONDARY: '#6b7280', // gray-500
  SUCCESS: '#10b981', // emerald-500
  WARNING: '#f59e0b', // amber-500
  ERROR: '#ef4444', // red-500
  INFO: '#3b82f6', // blue-500
} as const;