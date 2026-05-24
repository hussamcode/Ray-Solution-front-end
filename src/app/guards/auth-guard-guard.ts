import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { jwtDecode } from 'jwt-decode';

interface JwtPayload {
  sub: string;
  exp: number;
  role: string; // ✅ أضف هذا
}

export const authGuard: CanActivateFn = () => {
  const router = inject(Router);
  const token = localStorage.getItem('token');

  if (!token) return router.createUrlTree(['/']);

  try {
    const decoded = jwtDecode<JwtPayload>(token);
    const currentTime = Date.now() / 1000;

    if (decoded.exp < currentTime) {
      localStorage.removeItem('token');
      return router.createUrlTree(['/']);
    }

    return true;

  } catch (error) {
    localStorage.removeItem('token');
    return router.createUrlTree(['/']);
  }
};