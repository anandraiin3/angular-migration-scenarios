import { Component } from '@angular/core';

@Component({
  selector: 'app-root',
  template: `
    <div class="app-container">
      <h1>Consumer Banking Application</h1>
      <p>Angular 14 with NgModule-based interceptors</p>
      <router-outlet></router-outlet>
    </div>
  `,
  styles: [`
    .app-container {
      padding: 20px;
      font-family: Arial, sans-serif;
    }

    h1 {
      color: #003366;
      border-bottom: 2px solid #003366;
      padding-bottom: 10px;
    }
  `]
})
export class AppComponent {
  title = 'consumer-banking-app';
}
