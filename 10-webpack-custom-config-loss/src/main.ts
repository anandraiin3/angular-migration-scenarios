import { platformBrowserDynamic } from '@angular/platform-browser-dynamic';

import { AppModule } from './app/app.module';
import { environment } from './environments/environment';

if (environment.production) {
  // In production, we rely on build-time injected configuration
  // If custom webpack config was not applied, this will fail
  console.log('Starting production application...');
}

platformBrowserDynamic().bootstrapModule(AppModule)
  .catch(err => console.error(err));
