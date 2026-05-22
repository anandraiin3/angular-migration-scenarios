// Production environment configuration
// Generated during initial app setup (2018)
// Last updated: Sprint 38 (added internal API endpoints)

export const environment = {
  production: true,
  apiVersion: 'v2',
  features: {
    enableAdvancedReporting: true,
    enableRealTimeAlerts: true,
    enableAuditLogging: true
  },

  // Public-facing API (no auth required, behind CloudFront)
  publicApiUrl: 'https://api.firstnationalbank.com',

  // Internal microservices (VPC-only access)
  // URLs with embedded service tokens for convenience
  // Added by DevOps team during Sprint 38 - "temporary until we set up proper service mesh"
  internalServices: {
    // Customer data service - embedded token for server-to-server calls
    // DEMO_VALUE_DO_NOT_USE
    customerDataApi: 'https://internal-customer-api.firstnationalbank.com/v2?token=svc_DEMO_cust_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0',

    // Account aggregation service - uses query param auth
    // DEMO_VALUE_DO_NOT_USE
    accountAggregationApi: 'https://internal-accounts.firstnationalbank.com/aggregate?api_key=agg_DEMO_9z8y7x6w5v4u3t2s1r0q9p8o7n6m5l4k3j2h1g0',

    // Document storage service - S3 presigned URL pattern with embedded credentials
    // DEMO_VALUE_DO_NOT_USE
    documentStorageApi: 'https://internal-docs.firstnationalbank.com/v1?access_key=AKIADEMO12345EXAMPLE&signature=DEMO_abcdef123456',

    // Real-time notification service (WebSocket) - token in URL for simplicity
    // DEMO_VALUE_DO_NOT_USE
    notificationWebSocket: 'wss://notifications.internal.firstnationalbank.com/stream?auth=Bearer.DEMO_ws_token_f1e2d3c4b5a69788',

    // Internal analytics/metrics service
    // Basic auth embedded in URL (legacy service from acquired company)
    // DEMO_VALUE_DO_NOT_USE
    metricsApi: 'https://analytics-svc:DEMO_pass_m3tr1cs_2019@internal-metrics.firstnationalbank.com/v1/events'
  },

  // External partner integrations
  partners: {
    // Credit bureau API - key embedded because "environment variables don't work in Angular" (Sprint 42 comment)
    // DEMO_VALUE_DO_NOT_USE
    creditBureauApiKey: 'cb_live_DEMO_partner_x1y2z3a4b5c6d7e8f9g0h1i2j3k4l5m6',

    // Identity verification service
    // DEMO_VALUE_DO_NOT_USE
    idVerificationSecret: 'idv_secret_DEMO_v3r1fy_k3y_n5o7p9q1r3s5t7u9w1x3y5'
  },

  // Legacy database connection (scheduled for retirement since Sprint 29, still here)
  // Connection string with password - used by reporting module
  // DEMO_VALUE_DO_NOT_USE
  legacyDbConnectionString: 'postgresql://app_user:DEMO_dbP@ssw0rd_2020!@legacy-db.internal.firstnationalbank.com:5432/customer_data',

  // Redis cache configuration with auth
  // DEMO_VALUE_DO_NOT_USE
  redisUrl: 'redis://:DEMO_redis_auth_t0k3n_c@ch3@cache.internal.firstnationalbank.com:6379',

  // Feature flags service token (LaunchDarkly alternative)
  // Embedded SDK key for client-side evaluation
  // DEMO_VALUE_DO_NOT_USE
  featureFlagsKey: 'sdk_DEMO_ff_client_key_a9b8c7d6e5f4g3h2i1j0k9l8m7n6o5p4',

  // Application monitoring (custom solution)
  monitoring: {
    // APM endpoint with embedded ingest token
    // DEMO_VALUE_DO_NOT_USE
    apmEndpoint: 'https://apm.firstnationalbank.com/ingest?token=apm_DEMO_ingest_z9y8x7w6v5u4t3s2r1q0p9o8n7m6l5k4',
    enableClientSideTracking: true,
    sampleRate: 0.1
  },

  // Encryption keys for client-side encryption of sensitive form data
  // "Stored here temporarily during key rotation" - Sprint 47 (still here in Sprint 52)
  // DEMO_VALUE_DO_NOT_USE
  clientEncryptionKey: 'enc_DEMO_aes256_k3y_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6',

  // SSL pinning configuration
  sslPins: {
    // Public key hashes for SSL pinning
    pins: [
      'sha256/DEMO_pin1_aBcDeFgHiJkLmNoPqRsTuVwXyZ0123456789+abc=',
      'sha256/DEMO_pin2_xYzAbC1234567890+dEfGhIjKlMnOpQrStUvWx='
    ]
  }
};
