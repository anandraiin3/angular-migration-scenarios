/**
 * Build Configuration
 *
 * These values are injected at BUILD TIME via custom webpack configuration.
 * They are NOT in environment files (security policy - no secrets in source).
 *
 * The webpack DefinePlugin replaces process.env.* references with actual values
 * during the build process.
 *
 * CRITICAL: If custom webpack config is lost during migration, these will all be undefined!
 */

export interface BuildConfig {
  // API Keys (from CI/CD secrets)
  analyticsApiKey: string;
  mapsApiKey: string;

  // Service URLs (environment-specific)
  authServiceUrl: string;
  dataServiceUrl: string;

  // Corporate CA Certificate
  corporateCaCert?: string;
  caCertEmbedded: boolean;

  // Build metadata
  buildNumber: string;
  gitCommit: string;
  buildTimestamp: string;
}

/**
 * Get build configuration
 *
 * These values are replaced at build time by webpack.DefinePlugin.
 * If custom webpack config is not applied, all values will be undefined!
 */
export function getBuildConfig(): BuildConfig {
  return {
    // @ts-ignore - process.env is replaced by webpack DefinePlugin
    analyticsApiKey: typeof process !== 'undefined' ? process.env.ANALYTICS_API_KEY : undefined,
    // @ts-ignore
    mapsApiKey: typeof process !== 'undefined' ? process.env.MAPS_API_KEY : undefined,

    // @ts-ignore
    authServiceUrl: typeof process !== 'undefined' ? process.env.AUTH_SERVICE_URL : undefined,
    // @ts-ignore
    dataServiceUrl: typeof process !== 'undefined' ? process.env.DATA_SERVICE_URL : undefined,

    // @ts-ignore
    corporateCaCert: typeof process !== 'undefined' ? process.env.CORPORATE_CA_CERT : undefined,
    // @ts-ignore
    caCertEmbedded: typeof process !== 'undefined' ? process.env.CA_CERT_EMBEDDED === 'true' : false,

    // @ts-ignore
    buildNumber: typeof process !== 'undefined' ? process.env.BUILD_NUMBER : 'unknown',
    // @ts-ignore
    gitCommit: typeof process !== 'undefined' ? process.env.GIT_COMMIT : 'unknown',
    // @ts-ignore
    buildTimestamp: typeof process !== 'undefined' ? process.env.BUILD_TIMESTAMP : 'unknown'
  };
}

/**
 * Validate build configuration
 *
 * Call this during app initialization to detect missing build-time injections.
 * Helps identify when custom webpack config was not applied.
 */
export function validateBuildConfig(): { valid: boolean; errors: string[] } {
  const config = getBuildConfig();
  const errors: string[] = [];

  if (!config.analyticsApiKey || config.analyticsApiKey === 'missing-key') {
    errors.push('ANALYTICS_API_KEY not injected at build time');
  }

  if (!config.mapsApiKey || config.mapsApiKey === 'missing-key') {
    errors.push('MAPS_API_KEY not injected at build time');
  }

  if (!config.authServiceUrl) {
    errors.push('AUTH_SERVICE_URL not injected at build time');
  }

  if (!config.dataServiceUrl) {
    errors.push('DATA_SERVICE_URL not injected at build time');
  }

  if (!config.caCertEmbedded) {
    errors.push('Corporate CA certificate not embedded at build time - internal HTTPS will fail');
  }

  if (!config.buildNumber || config.buildNumber === 'unknown') {
    errors.push('BUILD_NUMBER not available - may indicate build config issue');
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Example usage in app initialization:
 *
 * const validation = validateBuildConfig();
 * if (!validation.valid) {
 *   console.error('Build configuration validation failed:');
 *   validation.errors.forEach(err => console.error('  -', err));
 *   throw new Error('Application cannot start - build configuration missing');
 * }
 */
