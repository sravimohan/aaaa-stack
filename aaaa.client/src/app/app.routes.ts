import { Routes } from '@angular/router';
import { WeatherForecastComponent } from './features/weather/weather-forecast/weather-forecast.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ProfileComponent } from './profile/profile.component';
import { MsalGuard } from '@azure/msal-angular';

export const routes: Routes = [
  { path: '', component: DashboardComponent, canActivate: [MsalGuard] },
  { path: 'dashboard', component: DashboardComponent, canActivate: [MsalGuard] },
  { path: 'profile', component: ProfileComponent, canActivate: [MsalGuard] },
  { path: 'weather-forecast', component: WeatherForecastComponent, canActivate: [MsalGuard] },
];
