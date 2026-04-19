import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';

import { AuthService, UsuarioActual } from '../../core/services/auth.service';

@Component({
  selector: 'app-private-layout',
  imports: [CommonModule, RouterOutlet, RouterLink, RouterLinkActive],
  templateUrl: './private-layout.html',
  styleUrl: './private-layout.scss'
})
export class PrivateLayout {

  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  usuarioActual: UsuarioActual | null = this.authService.obtenerUsuarioGuardado();

  obtenerRolVisible(): string {
    if (!this.usuarioActual) {
      return 'Sin rol';
    }

    if (this.usuarioActual.is_superuser) {
      return 'Administrador';
    }

    if (this.usuarioActual.roles.length > 0) {
      return this.usuarioActual.roles[0];
    }

    return 'Sin rol';
  }

  esAdministrador(): boolean {
    return this.authService.esAdministrador();
  }

  esEncargadoTurno(): boolean {
    return this.authService.esEncargadoTurno();
  }

  cerrarSesion(): void {
    this.authService.cerrarSesion();
    this.router.navigate(['/login']);
  }
}