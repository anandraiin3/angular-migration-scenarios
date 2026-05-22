import { Component, OnInit } from '@angular/core';
import { getBuildConfig, validateBuildConfig } from './config/build-config';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <h1>Webpack Custom Config Demo</h1>

      <div class="section">
        <h2>Build Configuration Status</h2>
        <div [class.error]="!buildConfigValid" [class.success]="buildConfigValid">
          <strong>Status:</strong> {{ buildConfigValid ? 'Valid' : 'INVALID' }}
        </div>

        <div *ngIf="!buildConfigValid" class="errors">
          <h3>Configuration Errors:</h3>
          <ul>
            <li *ngFor="let error of buildConfigErrors">{{ error }}</li>
          </ul>
          <p class="warning">
            This indicates that the custom webpack configuration was not applied during build.
            The application will fail in production when trying to connect to internal services.
          </p>
        </div>
      </div>

      <div class="section">
        <h2>Build Metadata</h2>
        <table>
          <tr>
            <td>Build Number:</td>
            <td>{{ buildConfig.buildNumber }}</td>
          </tr>
          <tr>
            <td>Git Commit:</td>
            <td>{{ buildConfig.gitCommit }}</td>
          </tr>
          <tr>
            <td>Build Timestamp:</td>
            <td>{{ buildConfig.buildTimestamp }}</td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h2>Service Configuration</h2>
        <table>
          <tr>
            <td>Auth Service URL:</td>
            <td [class.missing]="!buildConfig.authServiceUrl">
              {{ buildConfig.authServiceUrl || 'MISSING' }}
            </td>
          </tr>
          <tr>
            <td>Data Service URL:</td>
            <td [class.missing]="!buildConfig.dataServiceUrl">
              {{ buildConfig.dataServiceUrl || 'MISSING' }}
            </td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h2>API Keys Status</h2>
        <table>
          <tr>
            <td>Analytics API Key:</td>
            <td [class.missing]="!buildConfig.analyticsApiKey || buildConfig.analyticsApiKey === 'missing-key'">
              {{ buildConfig.analyticsApiKey ? (buildConfig.analyticsApiKey.substring(0, 10) + '...') : 'MISSING' }}
            </td>
          </tr>
          <tr>
            <td>Maps API Key:</td>
            <td [class.missing]="!buildConfig.mapsApiKey || buildConfig.mapsApiKey === 'missing-key'">
              {{ buildConfig.mapsApiKey ? (buildConfig.mapsApiKey.substring(0, 10) + '...') : 'MISSING' }}
            </td>
          </tr>
        </table>
      </div>

      <div class="section">
        <h2>Certificate Status</h2>
        <table>
          <tr>
            <td>Corporate CA Cert Embedded:</td>
            <td [class.missing]="!buildConfig.caCertEmbedded" [class.success]="buildConfig.caCertEmbedded">
              {{ buildConfig.caCertEmbedded ? 'YES' : 'NO - HTTPS to internal APIs will fail!' }}
            </td>
          </tr>
        </table>
      </div>
    </div>
  `,
  styles: [`
    .app-container {
      padding: 20px;
      font-family: Arial, sans-serif;
    }

    .section {
      margin: 20px 0;
      padding: 15px;
      border: 1px solid #ddd;
      border-radius: 4px;
    }

    .error {
      padding: 10px;
      background-color: #fee;
      border: 1px solid #c00;
      color: #c00;
      font-weight: bold;
    }

    .success {
      padding: 10px;
      background-color: #efe;
      border: 1px solid #0c0;
      color: #0c0;
      font-weight: bold;
    }

    .errors {
      margin-top: 10px;
      padding: 10px;
      background-color: #ffe;
      border: 1px solid #fc0;
    }

    .warning {
      color: #c60;
      font-weight: bold;
      margin-top: 10px;
    }

    table {
      width: 100%;
      border-collapse: collapse;
    }

    td {
      padding: 8px;
      border-bottom: 1px solid #eee;
    }

    td:first-child {
      font-weight: bold;
      width: 200px;
    }

    .missing {
      color: #c00;
      font-weight: bold;
    }
  `]
})
export class AppComponent implements OnInit {
  buildConfig = getBuildConfig();
  buildConfigValid = false;
  buildConfigErrors: string[] = [];

  ngOnInit() {
    const validation = validateBuildConfig();
    this.buildConfigValid = validation.valid;
    this.buildConfigErrors = validation.errors;

    if (!validation.valid) {
      console.error('Build configuration validation failed:');
      validation.errors.forEach(err => console.error('  -', err));
      console.error('\nThis indicates custom webpack config was not applied during build.');
      console.error('Application will fail when connecting to internal services in production.');
    } else {
      console.log('Build configuration validation passed');
      console.log('Build:', this.buildConfig.buildNumber);
      console.log('Commit:', this.buildConfig.gitCommit);
    }
  }
}
