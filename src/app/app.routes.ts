import { Routes } from '@angular/router';
import { AuthComponent } from './auth-component/auth-component';
import { order } from './order/order';
import { ConfirmRequest } from './confirm-request/confirm-request';
 import {SuccessfulOrder} from './successful-order/successful-order'
  import { Support } from './support/support';
  import { Requests } from './requests/requests'; 
import { authGuard } from './guards/auth-guard-guard';
import { adminGuard } from './guards/admin-guard-guard';
import { staffGuard } from './guards/staff-guard';
import { Producer } from './producer/producer';
import { MapComponent } from './map/map';
import { OrderLocation } from './order-location/order-location';

export const routes: Routes = [
     { path: '', component: AuthComponent },
      { path: 'home', loadComponent: () => import('./home-component/home-component').then(m => m.HomeComponent),
        canActivate: [authGuard]  },
      {path: 'order',component:order,canActivate: [authGuard] },
      {path: 'confirm-request',component:ConfirmRequest,canActivate: [authGuard] },
      {path: 'successfulorder/:code',component:SuccessfulOrder,canActivate: [authGuard] },
      {path: 'support',component:Support,canActivate: [authGuard] },
      {path: 'requests',component:Requests,canActivate: [staffGuard] },
      {path: 'producer',component:Producer,canActivate: [adminGuard] },
      {path: 'map',component:MapComponent,canActivate: [adminGuard] },
      {path: 'order-location',component:OrderLocation,canActivate: [authGuard] }

      
];
