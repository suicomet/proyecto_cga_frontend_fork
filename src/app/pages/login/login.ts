import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class Login {

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  usuario = '';
  password = '';
  mensajeError = '';
  cargando = false;

  iniciarSesion(): void {
    this.mensajeError = '';

    if (!this.usuario || !this.password) {
      this.mensajeError = 'Debe ingresar usuario y contraseña.';
      return;
    }

    this.cargando = true;

    this.authService.iniciarSesion(this.usuario, this.password).subscribe({
      next: (usuario) => {
        this.cargando = false;

        const esAdministrador = usuario.is_superuser || usuario.roles.includes('Administrador');

        if (esAdministrador) {
          this.router.navigate(['/dashboard']);
          return;
        }

        this.router.navigate(['/produccion']);
      },
      error: () => {
        this.cargando = false;
        this.mensajeError = 'Credenciales incorrectas o usuario inactivo.';
      }
    });
  }
}