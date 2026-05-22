import { NgModule } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpClientModule, HTTP_INTERCEPTORS } from '@angular/common/http';
import { RouterModule } from '@angular/router';

import { AppComponent } from './app.component';
import { SsoTokenInterceptor } from './interceptors/sso-token.interceptor';
import { MfaInterceptor } from './interceptors/mfa.interceptor';
import { AuthService } from './services/auth.service';

/**
 * AppModule - Root NgModule for the consumer banking application
 *
 * CRITICAL SECURITY CONFIGURATION:
 * This module registers HTTP interceptors that inject authentication headers
 * on all outgoing HTTP requests. These interceptors are AUTH-CRITICAL components.
 *
 * INTERCEPTOR REGISTRATION ORDER:
 * 1. SsoTokenInterceptor - Injects Authorization: Bearer <token>
 * 2. MfaInterceptor - Injects X-MFA-Token for sensitive routes
 *
 * The order matters because both interceptors should run on the same request.
 * Angular processes interceptors in the order they are provided.
 *
 * MIGRATION WARNING:
 * When migrating to Angular 15+ standalone components:
 *
 * WRONG (interceptors silently ignored):
 * ```typescript
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideHttpClient(),  // ⚠️ Missing interceptor configuration!
 *   ]
 * });
 * ```
 *
 * CORRECT Option A (keep class-based interceptors):
 * ```typescript
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideHttpClient(withInterceptorsFromDi()),
 *     { provide: HTTP_INTERCEPTORS, useClass: SsoTokenInterceptor, multi: true },
 *     { provide: HTTP_INTERCEPTORS, useClass: MfaInterceptor, multi: true },
 *   ]
 * });
 * ```
 *
 * CORRECT Option B (convert to functional interceptors):
 * ```typescript
 * // Convert interceptors to functions first, then:
 * bootstrapApplication(AppComponent, {
 *   providers: [
 *     provideHttpClient(
 *       withInterceptors([ssoTokenInterceptor, mfaInterceptor])
 *     ),
 *   ]
 * });
 * ```
 *
 * See README.md for full migration guide and security review requirements.
 */
@NgModule({
  declarations: [
    AppComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    RouterModule.forRoot([])
  ],
  providers: [
    AuthService,

    // Register SSO token interceptor - MUST run on all HTTP requests
    {
      provide: HTTP_INTERCEPTORS,
      useClass: SsoTokenInterceptor,
      multi: true
    },

    // Register MFA interceptor - MUST run on sensitive route requests
    {
      provide: HTTP_INTERCEPTORS,
      useClass: MfaInterceptor,
      multi: true
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
