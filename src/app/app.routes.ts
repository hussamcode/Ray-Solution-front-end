import { RouterModule, Routes } from '@angular/router';
import { AuthComponent } from './auth-component/auth-component';
import { HomeComponent } from './home-component/home-component';
import { NgModule } from '@angular/core';
import { order } from './order/order';
import { ConfirmRequest } from './confirm-request/confirm-request';
 import {SuccessfulOrder} from './successful-order/successful-order'
  import { Support } from './support/support';
  import { Requsts } from './requsts/requsts'; 
import { authGuard } from './guards/auth-guard-guard';
import { adminGuard } from './guards/admin-guard-guard';

export const routes: Routes = [
     { path: '', component: AuthComponent },
      { path: 'home', loadComponent: () => import('./home-component/home-component').then(m => m.HomeComponent),
        canActivate: [authGuard]  },
      {path: 'order',component:order,canActivate: [authGuard] },
      {path: 'confirm-requset',component:ConfirmRequest,canActivate: [authGuard] },
      {path: 'successfulorder/:code',component:SuccessfulOrder,canActivate: [authGuard] },
      {path: 'support',component:Support,canActivate: [authGuard] },
      {path: 'requests',component:Requsts,canActivate: [adminGuard] }

      
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
