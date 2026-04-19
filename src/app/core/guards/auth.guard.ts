import { inject } from '@angular/core';
import { CanActivateChildFn, CanActivateFn, Router } from '@angular/router';

import { AuthService } from '../services/auth.service';

function validarAutenticacion() {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.estaAutenticado()) {
    return true;
  }

  return router.createUrlTree(['/login']);
}

export const authGuard: CanActivateFn = () => {
  return validarAutenticacion();
};

export const authChildGuard: CanActivateChildFn = () => {
  return validarAutenticacion();
};

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (!authService.estaAutenticado()) {
    return router.createUrlTree(['/login']);
  }

  if (authService.esAdministrador()) {
    return true;
  }

  return router.createUrlTree(['/produccion']);
};