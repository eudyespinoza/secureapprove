// Core types for SecureApprove

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'approver' | 'admin';
  createdAt: Date;
  lastLoginAt?: Date;
  isActive: boolean;
}

export interface WebAuthnCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  deviceName: string;
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface Request {
  id: string;
  title: string;
  description: string;
  requesterId: string;
  approvers: string[];
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  priority: 'low' | 'medium' | 'high' | 'critical';
  category: string;
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
  approvedAt?: Date;
  rejectedAt?: Date;
  rejectionReason?: string;
}

export interface Approval {
  id: string;
  requestId: string;
  approverId: string;
  action: 'approved' | 'rejected';
  comment?: string;
  createdAt: Date;
  webauthnChallenge?: string;
}

export interface NotificationPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  data?: Record<string, any>;
}

export interface PushNotification {
  id: string;
  userId: string;
  type: 'request_created' | 'request_approved' | 'request_rejected' | 'reminder';
  payload: NotificationPayload;
  channels: ('web' | 'mobile' | 'email')[];
  scheduledFor?: Date;
  sentAt?: Date;
  status: 'pending' | 'sent' | 'failed' | 'cancelled';
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  conditions: PolicyCondition[];
  actions: PolicyAction[];
  isActive: boolean;
  priority: number;
  createdAt: Date;
}

export interface PolicyCondition {
  field: string;
  operator: 'equals' | 'not_equals' | 'greater_than' | 'less_than' | 'contains' | 'in';
  value: any;
}

export interface PolicyAction {
  type: 'require_approval' | 'auto_approve' | 'auto_reject' | 'escalate';
  parameters: Record<string, any>;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, any>;
  ip: string;
  userAgent: string;
  timestamp: Date;
  risk: 'low' | 'medium' | 'high' | 'critical';
}

// API Response types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface PaginatedResponse<T = any> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// WebAuthn types
export interface WebAuthnRegistrationOptions {
  challenge: string;
  rp: {
    name: string;
    id: string;
  };
  user: {
    id: string;
    name: string;
    displayName: string;
  };
  pubKeyCredParams: Array<{
    type: 'public-key';
    alg: number;
  }>;
  timeout?: number;
  excludeCredentials?: Array<{
    id: string;
    type: 'public-key';
  }>;
  authenticatorSelection?: {
    authenticatorAttachment?: 'platform' | 'cross-platform';
    userVerification?: 'required' | 'preferred' | 'discouraged';
    residentKey?: 'required' | 'preferred' | 'discouraged';
  };
}

export interface WebAuthnAuthenticationOptions {
  challenge: string;
  timeout?: number;
  rpId?: string;
  allowCredentials?: Array<{
    id: string;
    type: 'public-key';
  }>;
  userVerification?: 'required' | 'preferred' | 'discouraged';
}