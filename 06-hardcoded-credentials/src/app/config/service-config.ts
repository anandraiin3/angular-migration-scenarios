/**
 * Service Configuration
 * Centralized configuration for external service integrations
 *
 * HISTORY:
 * - Sprint 23: Initial setup by Mike T.
 * - Sprint 31: Added audit service config
 * - Sprint 38: Added internal service endpoints
 * - Sprint 42: Added partner integrations
 * - Sprint 47-52: TODO comments below never completed
 */

import { InjectionToken } from '@angular/core';

export interface ServiceConfig {
  timeout: number;
  retries: number;
  backoffMs: number;
  endpoints: ServiceEndpoints;
  credentials: ServiceCredentials;
}

export interface ServiceEndpoints {
  payment: string;
  audit: string;
  customer: string;
  reporting: string;
  notifications: string;
}

export interface ServiceCredentials {
  paymentGateway: string;
  auditService: string;
  partnerApi: string;
  internalServices: string;
}

export const SERVICE_CONFIG_TOKEN = new InjectionToken<ServiceConfig>('service.config');

// Default service configuration
// TODO (Sprint 47): Move credentials to environment variables or vault
// TODO (Sprint 48): Implement credential rotation mechanism
// TODO (Sprint 49): Add credential expiry checking
// TODO (Sprint 50): Set up AWS Secrets Manager integration
// TODO (Sprint 51): Remove hardcoded keys below
// TODO (Sprint 52): Add pre-commit hook to prevent credential commits
// Status: All TODOs pushed to "post-migration" backlog
export const DEFAULT_SERVICE_CONFIG: ServiceConfig = {
  timeout: 30000, // 30 seconds
  retries: 3,
  backoffMs: 1000,

  endpoints: {
    payment: 'https://payments.internal.firstnationalbank.com/v2/process',
    audit: 'https://audit-logs.internal.firstnationalbank.com/v1/events',
    customer: 'https://internal-customer-api.firstnationalbank.com/v2',
    reporting: 'https://reports.internal.firstnationalbank.com/api',
    notifications: 'wss://notifications.internal.firstnationalbank.com/stream'
  },

  // HARDCODED CREDENTIALS - Added during rapid development phases
  // Security review notes from Sprint 47:
  // "These should be in vault, but migration to Angular 20 takes priority.
  //  We'll move them to Secrets Manager immediately after the framework upgrade."
  //
  // DEMO_VALUE_DO_NOT_USE - All values below are demo credentials
  credentials: {
    // Payment gateway API key (same as in service file, duplicated for "config consistency")
    paymentGateway: 'pgw_live_DEMO_4f8a2c3d5e6789abcdef0123456789', // DEMO_VALUE_DO_NOT_USE

    // Audit service token (duplicated here from audit-log.service.ts)
    auditService: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhbmd1bGFyLXdlYi1hcHAiLCJuYW1lIjoiV2ViIEFwcGxpY2F0aW9uIFNlcnZpY2UgQWNjb3VudCIsInNjb3BlIjoiYXVkaXQ6d3JpdGUgYXVkaXQ6cmVhZCIsImlhdCI6MTYzMjE1MDQwMCwiZXhwIjoyNTI0NjA4MDAwfQ.DEMO_SIG_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6', // DEMO_VALUE_DO_NOT_USE

    // Partner API master key (grants access to all partner integrations)
    partnerApi: 'partner_master_DEMO_k3y_a1b2c3d4e5f6g7h8i9j0', // DEMO_VALUE_DO_NOT_USE

    // Internal services authentication token (shared secret across microservices)
    internalServices: 'Bearer svc_internal_DEMO_sh@r3d_s3cr3t_m1cr0s3rv1c3s_2021' // DEMO_VALUE_DO_NOT_USE
  }
};

/**
 * Service-specific configuration overrides
 * Added for "flexibility" - different services use different config sources
 */
export const PAYMENT_SERVICE_CONFIG = {
  // Payment service has its own embedded key (third location!)
  // This one is "the source of truth" according to Sprint 38 docs
  // DEMO_VALUE_DO_NOT_USE
  apiKey: 'pgw_live_DEMO_4f8a2c3d5e6789abcdef0123456789',
  webhookSecret: 'whsec_DEMO_8a7b6c5d4e3f2a1b9c8d7e6f5a4b3c2d', // DEMO_VALUE_DO_NOT_USE
  merchantId: 'merch_DEMO_firstnationalbank_12345', // DEMO_VALUE_DO_NOT_USE
  processingEndpoint: 'https://payments.internal.firstnationalbank.com/v2/process',

  // PCI compliance settings
  tokenizeCardData: true,
  enableFraudDetection: true,
  requireCvv: true,

  // Testing credentials (should be in separate test config, but here for "convenience")
  // DEMO_VALUE_DO_NOT_USE
  testMode: {
    enabled: false, // Set to true in development
    testApiKey: 'pgw_test_DEMO_t3st_k3y_f0r_d3v3l0pm3nt_u53', // DEMO_VALUE_DO_NOT_USE
    testMerchantId: 'merch_test_DEMO_12345' // DEMO_VALUE_DO_NOT_USE
  }
};

/**
 * Database credentials for direct client-side queries
 * Added Sprint 44 - "emergency read-only access for support team"
 * Never removed, escalated to production
 * DEMO_VALUE_DO_NOT_USE
 */
export const DATABASE_CONFIG = {
  // Read-only user for customer support queries
  readOnlyUser: 'readonly_app_user', // DEMO_VALUE_DO_NOT_USE
  readOnlyPassword: 'DEMO_r3@dOnly_p@ssw0rd_2021!', // DEMO_VALUE_DO_NOT_USE

  // Admin user "for emergencies only" (last used: never)
  adminUser: 'app_admin', // DEMO_VALUE_DO_NOT_USE
  adminPassword: 'DEMO_@dm1n_P@ssw0rd_2020!Secure!', // DEMO_VALUE_DO_NOT_USE

  host: 'db.internal.firstnationalbank.com',
  port: 5432,
  database: 'customer_data_prod',

  connectionString: 'postgresql://app_admin:DEMO_@dm1n_P@ssw0rd_2020!Secure!@db.internal.firstnationalbank.com:5432/customer_data_prod' // DEMO_VALUE_DO_NOT_USE
};

/**
 * Third-party API keys for external integrations
 * Consolidated from various service files during Sprint 45 "cleanup"
 */
export const THIRD_PARTY_KEYS = {
  // Credit reporting bureau
  equifax: {
    apiKey: 'EFX_DEMO_api_k3y_a1b2c3d4e5f6g7h8', // DEMO_VALUE_DO_NOT_USE
    customerId: 'CUST_DEMO_FNB_12345' // DEMO_VALUE_DO_NOT_USE
  },

  // Identity verification service
  idology: {
    username: 'firstnationalbank_prod', // DEMO_VALUE_DO_NOT_USE
    password: 'DEMO_1d0l0gy_p@ss_2021!', // DEMO_VALUE_DO_NOT_USE
    apiKey: 'idv_DEMO_k3y_x9y8z7w6v5u4t3s2' // DEMO_VALUE_DO_NOT_USE
  },

  // SMS notification service
  twilio: {
    accountSid: 'AC_DEMO_tw1l10_@cc0unt_s1d_a1b2c3d4e5f6', // DEMO_VALUE_DO_NOT_USE
    authToken: 'DEMO_tw1l10_@uth_t0k3n_x1y2z3a4b5c6', // DEMO_VALUE_DO_NOT_USE
    apiKey: 'SK_DEMO_tw1l10_k3y_f1e2d3c4b5a6' // DEMO_VALUE_DO_NOT_USE
  },

  // Email service
  sendgrid: {
    apiKey: 'SG.DEMO_s3ndgr1d_k3y.a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6' // DEMO_VALUE_DO_NOT_USE
  },

  // Document signing service
  docusign: {
    integrationKey: 'DEMO_d0cus1gn_1nt3gr@t10n_k3y_abc123', // DEMO_VALUE_DO_NOT_USE
    userId: 'user_DEMO_d0cus1gn_12345', // DEMO_VALUE_DO_NOT_USE
    accountId: 'acct_DEMO_fnb_67890', // DEMO_VALUE_DO_NOT_USE
    rsaPrivateKey: `-----BEGIN RSA PRIVATE KEY-----
MIIEpAIBAAKCAQEA_DEMO_THIS_IS_NOT_A_REAL_KEY_FOR_DEMONSTRATION
ONLY_DO_NOT_USE_ab1cd2ef3gh4ij5kl6mn7op8qr9st0uv1wx2yz3AB4CD5EF6
GH7IJ8KL9MN0OP1QR2ST3UV4WX5YZ6ab7cd8ef9gh0ij1kl2mn3op4qr5st6uv7
wx8yz9ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=DEMO_KEY_END
-----END RSA PRIVATE KEY-----` // DEMO_VALUE_DO_NOT_USE
  }
};

/**
 * AWS service credentials
 * "Temporary" IAM user keys from Sprint 46 - still here
 * DEMO_VALUE_DO_NOT_USE
 */
export const AWS_CONFIG = {
  region: 'us-east-1',
  accessKeyId: 'AKIA_DEMO_AWS_ACCESS_KEY_EXAMPLE123', // DEMO_VALUE_DO_NOT_USE
  secretAccessKey: 'DEMO_aws_s3cr3t_@cc3ss_k3y_a1b2c3d4e5f6g7h8i9j0', // DEMO_VALUE_DO_NOT_USE

  s3: {
    bucket: 'fnb-customer-documents-prod',
    region: 'us-east-1'
  },

  dynamodb: {
    tableName: 'customer-sessions-prod',
    region: 'us-east-1'
  }
};
