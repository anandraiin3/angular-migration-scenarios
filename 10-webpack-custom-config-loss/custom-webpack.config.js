const webpack = require('webpack');
const fs = require('fs');
const path = require('path');

/**
 * Custom Webpack Configuration
 *
 * Critical infrastructure customizations required for enterprise deployment:
 * 1. Corporate CA certificate injection for internal HTTPS APIs
 * 2. Build-time environment variable injection (secrets, service URLs)
 * 3. Custom package registry aliases for internal npm packages
 * 4. Custom loaders for legacy code compatibility
 */

module.exports = (config, options) => {
  console.log('🔧 Applying custom webpack configuration...');

  // ============================================================================
  // 1. CA CERTIFICATE INJECTION
  // ============================================================================
  // Internal APIs (*.internal.company.com) require corporate CA certificates.
  // Without this, all HTTPS calls fail with UNABLE_TO_VERIFY_LEAF_SIGNATURE

  const caCertPath = process.env.CORPORATE_CA_CERT_PATH || '/etc/ssl/certs/corporate-ca.crt';

  if (fs.existsSync(caCertPath)) {
    const caCert = fs.readFileSync(caCertPath, 'utf8');

    // Inject CA cert into Node.js HTTPS agent (for build-time API calls)
    process.env.NODE_EXTRA_CA_CERTS = caCertPath;

    // Embed CA cert in bundle for runtime API calls
    config.plugins.push(
      new webpack.DefinePlugin({
        'process.env.CORPORATE_CA_CERT': JSON.stringify(caCert),
        'process.env.CA_CERT_EMBEDDED': 'true'
      })
    );

    console.log('  ✓ Corporate CA certificate injected from:', caCertPath);
  } else {
    console.warn('  ⚠️  Corporate CA certificate not found at:', caCertPath);
    console.warn('  ⚠️  Internal API calls will fail in production!');
  }

  // ============================================================================
  // 2. BUILD-TIME ENVIRONMENT VARIABLE INJECTION
  // ============================================================================
  // Secrets and service URLs injected at build time from CI/CD environment.
  // These are NOT in source code or environment.ts files (security policy).

  const buildTimeEnvVars = {
    // API Keys (from CI/CD secrets)
    'process.env.ANALYTICS_API_KEY': JSON.stringify(process.env.ANALYTICS_API_KEY || 'missing-key'),
    'process.env.MAPS_API_KEY': JSON.stringify(process.env.MAPS_API_KEY || 'missing-key'),

    // Service URLs (environment-specific)
    'process.env.AUTH_SERVICE_URL': JSON.stringify(
      process.env.AUTH_SERVICE_URL || 'https://auth.internal.company.com'
    ),
    'process.env.DATA_SERVICE_URL': JSON.stringify(
      process.env.DATA_SERVICE_URL || 'https://data.internal.company.com'
    ),

    // Build metadata
    'process.env.BUILD_NUMBER': JSON.stringify(process.env.BUILD_NUMBER || 'local'),
    'process.env.GIT_COMMIT': JSON.stringify(process.env.GIT_COMMIT || 'unknown'),
    'process.env.BUILD_TIMESTAMP': JSON.stringify(new Date().toISOString())
  };

  config.plugins.push(
    new webpack.DefinePlugin(buildTimeEnvVars)
  );

  console.log('  ✓ Build-time environment variables injected');

  // ============================================================================
  // 3. CUSTOM MODULE RESOLUTION
  // ============================================================================
  // Internal package registry uses different naming conventions.
  // Map public package names to internal registry equivalents.

  config.resolve.alias = {
    ...config.resolve.alias,

    // Internal packages
    '@company/shared-components': path.resolve(__dirname, 'node_modules/@company-internal/components'),
    '@company/auth-lib': path.resolve(__dirname, 'node_modules/@company-internal/authentication'),

    // Override specific modules with internal versions
    'lodash': path.resolve(__dirname, 'node_modules/lodash-es'),
  };

  console.log('  ✓ Custom module aliases configured');

  // ============================================================================
  // 4. CUSTOM LOADERS
  // ============================================================================
  // Legacy code compatibility transformations

  config.module.rules.push({
    test: /\.legacy\.js$/,
    use: [
      {
        loader: 'babel-loader',
        options: {
          presets: ['@babel/preset-env'],
          plugins: [
            // Transform legacy decorators
            ['@babel/plugin-proposal-decorators', { legacy: true }],
            // Transform class properties
            ['@babel/plugin-proposal-class-properties', { loose: true }]
          ]
        }
      }
    ]
  });

  console.log('  ✓ Custom loaders configured');

  // ============================================================================
  // 5. PRODUCTION OPTIMIZATIONS
  // ============================================================================

  if (options.configuration === 'production') {
    // Remove console.log in production
    config.optimization.minimizer[0].options.terserOptions.compress.drop_console = true;

    // Add build metadata to output
    config.plugins.push(
      new webpack.BannerPlugin({
        banner: `Build: ${process.env.BUILD_NUMBER || 'local'} | Commit: ${process.env.GIT_COMMIT || 'unknown'} | Date: ${new Date().toISOString()}`
      })
    );

    console.log('  ✓ Production optimizations applied');
  }

  console.log('🔧 Custom webpack configuration complete\n');

  return config;
};
