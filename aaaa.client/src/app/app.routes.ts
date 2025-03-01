import { Routes } from '@angular/router';
import { WeatherForecastComponent } from './features/weather/weather-forecast/weather-forecast.component';
import { DashboardComponent } from './dashboard/dashboard.component';

export const routes: Routes = [
    { path: 'dashboard', component: DashboardComponent },
    { path: 'weather-forecast', component: WeatherForecastComponent },
];
