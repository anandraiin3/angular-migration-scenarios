# Scenario 10: Webpack Custom Configuration Loss

## Problem Statement

Angular 17+ replaces Webpack with ESBuild as the default bundler. Custom webpack configurations using `@angular-builders/custom-webpack` are silently ignored during migration, causing the build to succeed while critical runtime functionality fails.

## Why This Matters

This represents one of the most dangerous failure modes in Angular migrations:

**Silent Failure is Worse Than Loud Failure**

- Build completes successfully with exit code 0
- All TypeScript compilation passes
- Bundle files are generated normally
- CI/CD pipeline shows green checkmarks
- **But production deployment fails catastrophically**

### Real-World Impact

In enterprise environments, custom webpack configs handle critical infrastructure concerns:

1. **Corporate CA Certificate Injection**
   - Internal APIs require custom CA certificates
   - Without injection: All HTTPS calls to internal services fail with `UNABLE_TO_VERIFY_LEAF_SIGNATURE`
   - Error only appears in production after deployment

2. **Build-Time Secret Injection**
   - API keys, service URLs injected via webpack.DefinePlugin
   - Without injection: Values are `undefined` at runtime
   - Application loads but features silently fail

3. **Custom Module Resolution**
   - Internal package registries with custom aliases
   - Private npm packages with authentication
   - Without config: Imports resolve to wrong packages or fail

4. **Custom Loaders and Transformations**
   - Legacy code transformations
   - Custom asset processing
   - Feature flag preprocessing

## The Migration Gap

### What Works in Angular 14

```json
// angular.json
{
  "projects": {
    "app": {
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
  }
}
```

### What Breaks in Angular 17+

After running `ng update`:
- `angular.json` updated to use `@angular-devkit/build-angular:application`
- References to `@angular-builders/custom-webpack` removed
- ESBuild becomes default bundler
- `custom-webpack.config.js` file still exists but is **never executed**
- No error, no warning, just silent ignore

## Playbook Rule

**Custom Build Configuration Migration Plan**

When custom webpack configs are detected:

1. **Inventory all customizations** - Document what each config does and why
2. **Find ESBuild equivalents** - Not all webpack features have direct ESBuild analogs
3. **Create migration plan** - May require architect changes or build script updates
4. **Equivalence testing** - Compare artifacts before/after to prove functionality preserved
5. **Runtime verification** - Test in environment matching production conditions

**No auto-migration for custom build configs. These require architectural review.**

## This Scenario Demonstrates

### Pre-Migration State (Angular 14)
- Working custom webpack configuration
- CA certificate injection for internal APIs
- Build-time environment variable injection
- Custom package registry aliases
- All functionality works in production

### Post-Migration Attempt (Angular 17)
- `ng update` completes successfully
- Build completes successfully
- Tests pass (they don't hit internal APIs)
- Deployment succeeds
- **Production runtime failures:**
  - Internal API calls fail with certificate errors
  - Build-injected secrets are `undefined`
  - Custom loaders not applied
  - Application appears to work but critical features broken

### Correct Approach
1. Audit `custom-webpack.config.js` before migration
2. Create ESBuild equivalent configuration
3. Build artifacts comparison (file sizes, included certs, injected values)
4. Runtime testing with certificate verification
5. Document equivalent functionality or gaps

## Files in This Scenario

- `package.json` - Angular 14.2.0 with @angular-builders/custom-webpack
- `angular.json` - References custom webpack builder
- `custom-webpack.config.js` - CA certs, env vars, custom resolution, loaders
- `proxy.conf.json` - Internal API proxy requiring CA certs
- `src/app/config/build-config.ts` - Interface expecting build-time injected values
- `src/environments/` - Environment files
- `MIGRATION-ATTEMPT.md` - Chronicles the silent failure pattern

## Chief Architect Concern

**"A build that succeeds while breaking critical functionality is more dangerous than a build that fails loudly. Silent failures bypass all our quality gates and only surface in production under load."**

This scenario validates the playbook rule: Custom build configurations require separate migration plans with rigorous equivalence testing. The cost of getting this wrong is measured in production incidents and customer impact.

## Key Learning

Modern Angular's ESBuild is faster and simpler, but if you've customized webpack for legitimate infrastructure needs, those needs don't disappear just because the build tool changed. Migration planning must identify these dependencies and ensure they're preserved through equivalent mechanisms.
