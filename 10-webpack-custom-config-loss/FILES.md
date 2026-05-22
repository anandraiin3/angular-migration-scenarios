# Scenario 10 Files

## Documentation Files

### README.md
Complete scenario documentation explaining:
- Problem: Custom webpack configs silently ignored in Angular 17+
- Why it matters: Silent failures worse than loud failures
- Real-world impact: CA certs, build-time secrets, custom resolution
- Playbook rule: Custom build configs need migration plans
- Chief Architect concern: Silent failures bypass quality gates

### MIGRATION-ATTEMPT.md
Detailed chronicle showing:
- Pre-migration working state
- Migration command execution
- Build succeeds but is broken
- Runtime failures in production
- Why this is dangerous (silent failure mode)
- What should have happened (correct approach)
- Lessons learned

### EXPECTED-VS-ACTUAL.md
Side-by-side comparison of:
- Build process (both succeed, different artifacts)
- Runtime behavior (looks working vs actually broken)
- Detection timeline (when problems discovered)
- What makes this dangerous
- How to detect and prevent
- Correct migration approach

### devin-session-prompt.txt
Comprehensive AI agent instructions for:
- Auditing current webpack configuration
- Researching Angular 17 equivalents
- Implementing equivalent functionality
- Creating verification scripts
- Testing equivalence rigorously
- Migration plan with verification gates

### FILES.md (this file)
Complete inventory of all scenario files

## Configuration Files

### package.json
Angular 14.2.0 with:
- `@angular-builders/custom-webpack@14.1.0`
- Standard Angular 14 dependencies
- Scripts for serving with proxy config

### angular.json
Angular 14 configuration with:
- `@angular-builders/custom-webpack:browser` builder
- References to `custom-webpack.config.js`
- `@angular-builders/custom-webpack:dev-server` for serve
- `@angular-builders/custom-webpack:karma` for tests
- Proxy configuration reference

### custom-webpack.config.js
Critical webpack customizations:
1. **CA Certificate Injection**
   - Reads corporate CA cert from file system
   - Embeds in bundle for runtime HTTPS
   - Sets NODE_EXTRA_CA_CERTS for build-time

2. **Build-Time Environment Variables**
   - Injects API keys from CI/CD
   - Injects service URLs (environment-specific)
   - Adds build metadata (number, commit, timestamp)

3. **Custom Module Resolution**
   - Maps internal package names
   - Overrides with internal registry versions

4. **Custom Loaders**
   - Legacy code transformations
   - Babel for older JavaScript

5. **Production Optimizations**
   - Console.log removal
   - Build metadata banner

### proxy.conf.json
Development proxy configuration for:
- `/api` → Internal API server
- `/auth` → Internal auth server
- `/data` → Internal data server
All require secure: true (HTTPS with CA certs)

### tsconfig.json
TypeScript configuration (Angular 14 standard)

### tsconfig.app.json
App-specific TypeScript config

### tsconfig.spec.json
Test-specific TypeScript config

### karma.conf.js
Karma test runner configuration

### .editorconfig
Editor configuration for code style

### .gitignore
Standard Angular gitignore

## Source Files

### src/main.ts
Application bootstrap with environment check

### src/polyfills.ts
Zone.js import for Angular

### src/index.html
Main HTML entry point

### src/styles.css
Global styles

### src/app/app.module.ts
Root NgModule with AppComponent

### src/app/app.component.ts
Main component showing:
- Build configuration status (valid/invalid)
- Configuration errors list
- Build metadata display
- Service configuration display
- API keys status (masked)
- Certificate embedding status
Visual indicators:
- Green for valid config
- Red for invalid config
- Warnings for missing values

### src/app/config/build-config.ts
Critical build configuration interface:
- `BuildConfig` interface definition
- `getBuildConfig()` - Reads process.env values
- `validateBuildConfig()` - Checks all required values
- Detects when custom webpack config not applied
- Provides clear error messages for missing injections

### src/environments/environment.ts
Development environment configuration

### src/environments/environment.prod.ts
Production environment configuration

### src/test.ts
Test environment setup

## Verification Scripts

### scripts/verify-build-config.sh
Post-build verification script that:
- Checks if CA certificate embedded in bundle
- Verifies environment variables were injected
- Confirms process.env references were replaced
- Validates configuration markers present
- Analyzes bundle size
- Reports errors if critical config missing
- Exit code 0 if valid, 1 if invalid

Usage:
```bash
npm run build
./scripts/verify-build-config.sh
```

### scripts/audit-webpack-config.sh
Pre-migration audit script that:
- Detects custom-webpack.config.js
- Finds custom builder references in angular.json
- Analyzes webpack customizations:
  - CA certificate handling
  - DefinePlugin usage
  - Custom aliases
  - Custom loaders
  - Optimizations
- Provides migration recommendations
- Warns against premature migration
- Exit code 2 if issues found (stop migration)

Usage:
```bash
./scripts/audit-webpack-config.sh
# Run BEFORE ng update
```

## How to Use This Scenario

### 1. Understand the Problem
Read in order:
1. `README.md` - Overview and context
2. `EXPECTED-VS-ACTUAL.md` - See the failure mode
3. `MIGRATION-ATTEMPT.md` - Detailed walkthrough

### 2. Detect in Your Projects
Run audit before migration:
```bash
cd your-angular-project
/path/to/scripts/audit-webpack-config.sh
```

### 3. Learn Correct Approach
Study `devin-session-prompt.txt` for:
- How to audit configurations
- How to research equivalents
- How to implement safely
- How to verify equivalence
- When it's safe to migrate

### 4. Verify After Migration
After implementing equivalents:
```bash
npm run build
./scripts/verify-build-config.sh
```

### 5. Demonstrate to Stakeholders
Use this scenario to explain:
- Why migration planning matters
- Why "build succeeded" isn't enough
- Why silent failures are dangerous
- Why equivalence testing is mandatory
- Why rushing migration is risky

## Key Concepts Demonstrated

### Silent Failure Mode
- Build succeeds but application broken
- No error messages
- All quality gates pass
- Only detected in production
- **Worst case scenario**

### Build Tool Changes
- Webpack → ESBuild (Angular 17+)
- Custom configs don't auto-migrate
- No backward compatibility
- Requires architectural changes

### Enterprise Concerns
- CA certificate injection for internal APIs
- Build-time secret management
- Custom package registries
- Legacy code compatibility
- Production reliability

### Quality Gates
- Build verification insufficient
- Need runtime verification
- Need integration testing
- Need equivalence testing
- Detection before deployment

### Migration Planning
- Audit before migration
- Implement equivalents first
- Verify equivalence
- Test runtime behavior
- Only then migrate

## Related Playbook Rules

1. **Custom build configs require migration plans**
   - This scenario is the poster child for this rule
   - Shows exactly what happens when ignored

2. **Silent failures are worse than loud failures**
   - Build should fail if config missing
   - Better to catch in CI than production

3. **Equivalence testing is mandatory**
   - Compare artifacts before/after
   - Verify runtime behavior
   - Don't trust "build succeeded"

4. **Test in production-like environments**
   - Certificate setup matters
   - Internal APIs matter
   - Health checks must be comprehensive

## Files to Make Executable

The shell scripts need execute permissions:
```bash
chmod +x scripts/verify-build-config.sh
chmod +x scripts/audit-webpack-config.sh
```

## Notes

- All files represent Angular 14 pre-migration state
- Custom webpack config is fully functional
- After migration to Angular 17, config is silently ignored
- Scripts help detect and prevent this problem
- Verification is critical for enterprise migrations
