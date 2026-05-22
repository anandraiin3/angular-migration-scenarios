# Migration Attempt: Webpack Custom Config Loss

## Initial State (Angular 14.2.0)

Application running successfully with custom webpack configuration:
- CA certificates injected for internal HTTPS APIs
- Build-time secrets (API keys) injected from CI/CD
- Custom module resolution for internal packages
- Production deployment working correctly

```bash
$ npm run build:prod
# Custom webpack config runs
# Output:
# 🔧 Applying custom webpack configuration...
#   ✓ Corporate CA certificate injected from: /etc/ssl/certs/corporate-ca.crt
#   ✓ Build-time environment variables injected
#   ✓ Custom module aliases configured
#   ✓ Custom loaders configured
#   ✓ Production optimizations applied
# 🔧 Custom webpack configuration complete
#
# Build completed successfully
```

## Migration Command

```bash
$ ng update @angular/core@17 @angular/cli@17
```

## Migration Output

```
Using package manager: npm
Collecting installed dependencies...
Found 28 dependencies.

We analyzed your package.json and everything seems to be in order. Good work!

    Updating package.json with dependency @angular/animations @ "17.0.0" (was "14.2.0")...
    Updating package.json with dependency @angular/common @ "17.0.0" (was "14.2.0")...
    Updating package.json with dependency @angular/compiler @ "17.0.0" (was "14.2.0")...
    Updating package.json with dependency @angular/core @ "17.0.0" (was "14.2.0")...
    Updating package.json with dependency @angular/forms @ "17.0.0" (was "14.2.0")...
    Updating package.json with dependency @angular/platform-browser @ "17.0.0" (was "14.2.0")...
    Updating package.json with dependency @angular/platform-browser-dynamic @ "17.0.0" (was "14.2.0")...
    Updating package.json with dependency @angular/router @ "17.0.0" (was "14.2.0")...

UPDATE package.json (1234 bytes)
UPDATE angular.json (3456 bytes)
✔ Packages installed successfully.
✔ Migration complete!
```

**Everything looks fine! Green checkmarks everywhere.**

## Post-Migration: Build Attempt

```bash
$ npm run build:prod

# Notice: No custom webpack output!
# Custom configuration is being silently ignored.

✔ Browser application bundle generation complete.
✔ Copying assets complete.
✔ Index html generation complete.

Initial Chunk Files           | Names         |  Raw Size
main.abc123def.js             | main          | 234.56 kB |
polyfills.xyz789.js           | polyfills     |  45.67 kB |
styles.css                    | styles        |   2.34 kB |

                              | Initial Total | 282.57 kB

Build at: 2024-01-15T10:30:45.123Z - Hash: abc123 - Time: 4532ms

✔ Built successfully
```

**Build succeeded! Exit code 0. Everything looks perfect.**

## What Actually Happened

### angular.json Changes

**BEFORE (Angular 14):**
```json
{
  "architect": {
    "build": {
      "builder": "@angular-builders/custom-webpack:browser",
      "options": {
        "customWebpackConfig": {
          "path": "./custom-webpack.config.js"
        }
      }
    }
  }
}
```

**AFTER (Angular 17):**
```json
{
  "architect": {
    "build": {
      "builder": "@angular-devkit/build-angular:application",
      "options": {
        // customWebpackConfig removed!
        // Now using ESBuild instead of Webpack
      }
    }
  }
}
```

### Files Still Present But Ignored

```bash
$ ls -la | grep webpack
-rw-r--r--  custom-webpack.config.js  # Still here!
```

The file exists, but it's **never executed**. Angular 17 uses ESBuild, not Webpack.

## Runtime Failures (Production)

### Deployment

```bash
$ kubectl apply -f deployment.yml
deployment.apps/angular-app created

$ kubectl get pods
NAME                           READY   STATUS    RESTARTS   AGE
angular-app-abc123-xyz         1/1     Running   0          30s
```

**Deployment successful!**

### First API Call

```javascript
// Browser console (production):

GET https://auth.internal.company.com/api/login 500 (Internal Server Error)

Error: unable to verify the first certificate
  at TLSSocket.onConnectSecure
  at TLSSocket.emit (events.js:315:20)

// Certificate chain verification failed
// Corporate CA not in trust store
```

### Build Config Validation

```javascript
// Browser console (production):

Build configuration validation failed:
  - ANALYTICS_API_KEY not injected at build time
  - MAPS_API_KEY not injected at build time
  - AUTH_SERVICE_URL not injected at build time
  - DATA_SERVICE_URL not injected at build time
  - Corporate CA certificate not embedded at build time - internal HTTPS will fail
  - BUILD_NUMBER not available - may indicate build config issue

Application cannot start - build configuration missing
```

### Application State

```
Visual: Page loads, renders HTML
Reality:
  - All API keys are undefined
  - All service URLs are undefined
  - Certificate verification fails
  - Every feature that calls internal APIs fails
  - Analytics doesn't initialize (missing key)
  - Maps don't load (missing key)
  - Authentication fails (no CA cert + missing URL)
  - Data fetching fails (no CA cert + missing URL)
```

## Why This Is Dangerous

### Normal Build Failure
```
❌ Build failed: Cannot resolve module 'something'
❌ TypeScript error: Property 'x' does not exist
```
- CI/CD pipeline fails
- Developer sees error immediately
- No broken code reaches production
- **Safe failure mode**

### Silent Configuration Loss
```
✔ Build succeeded
✔ Tests passed
✔ Deployment successful
✔ Health check passed (doesn't test API calls)
```
- CI/CD pipeline succeeds
- All quality gates pass
- Broken code deployed to production
- Failures only appear under real user load
- **Dangerous failure mode**

## What Should Have Happened

### Pre-Migration Audit

```bash
# 1. Detect custom webpack config
$ grep -r "custom-webpack" angular.json
Found: @angular-builders/custom-webpack

# 2. Analyze what it does
$ cat custom-webpack.config.js
- CA certificate injection
- Build-time secrets
- Custom module resolution
- Custom loaders

# 3. Create migration plan
- Find ESBuild equivalents
- May need build scripts
- May need environment variable changes
- May need proxy configuration updates
```

### ESBuild Equivalent Configuration

Angular 17 doesn't support custom webpack configs. Options:

1. **ESBuild Plugins** (limited, not all webpack features available)
2. **Build Scripts** (pre-build/post-build hooks)
3. **Environment Variables** (for secrets, but requires code changes)
4. **Proxy Configuration** (for certificate handling in dev)
5. **Infrastructure Changes** (CA certs at container level, not build level)

### Correct Migration Steps

1. **Document all webpack customizations**
2. **Research ESBuild/Angular 17 equivalents**
3. **Create implementation plan** (may require architecture changes)
4. **Implement equivalents BEFORE migration**
5. **Test with artifact comparison**
6. **Verify runtime behavior in staging**
7. **Only then migrate to Angular 17**

## Lessons Learned

### For Developers
- Custom build configs don't auto-migrate
- Silent failures are worse than loud failures
- Build success ≠ application working
- Test runtime behavior, not just build output

### For DevOps
- Health checks must test actual functionality, not just HTTP 200
- Smoke tests must call internal APIs
- Certificate configuration must be verified
- Build metadata should be validated

### For Architects
- Custom build configurations are technical debt
- Must be inventoried before major migrations
- Equivalence testing is mandatory
- Some customizations may indicate architecture problems

## Correct Approach

**Before Migration:**
```bash
# 1. Inventory
./audit-custom-configs.sh
Found: custom-webpack.config.js
  - CA certificate injection
  - Build-time secrets
  - Custom resolution

# 2. Plan
./plan-migration.sh
ESBuild equivalents:
  - CA certs → Move to Dockerfile/container
  - Secrets → Use Angular environment + CI injection
  - Resolution → Update package.json/tsconfig paths

# 3. Implement equivalents
./implement-equivalents.sh

# 4. Test equivalence
./test-equivalents.sh
✓ Build artifacts equivalent
✓ Runtime behavior equivalent
✓ Certificate validation works
✓ Secrets properly injected

# 5. THEN migrate
ng update @angular/core@17 @angular/cli@17
```

## Impact Assessment

**Without proper migration:**
- All internal API calls fail
- Authentication broken
- Data fetching broken
- Third-party integrations broken (missing keys)
- Production outage
- Customer impact
- Emergency rollback required

**With proper migration:**
- Equivalent functionality implemented first
- Tested before Angular update
- Smooth deployment
- No production issues
- Zero customer impact

## Playbook Validation

This scenario validates the playbook rule:

**"Custom build configurations require separate migration plans with equivalence testing."**

The cost of getting this wrong:
- Production outage
- Customer trust damage
- Emergency rollback
- Delayed migration timeline
- Increased migration risk perception

The value of getting it right:
- Predictable migration
- Zero production issues
- Confidence in migration process
- Foundation for future migrations
