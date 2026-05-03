import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  GestionUsuariosService,
  UsuarioPayload,
  UsuarioSistema
} from '../../features/gestion-usuarios/services/gestion-usuarios.service';

type RolFormulario = 'Administrador' | 'Encargado de turno';

interface FormularioUsuario {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password: string;
  rol: RolFormulario;
  is_active: boolean;
}

@Component({
  selector: 'app-gestion-usuarios',
  imports: [CommonModule, FormsModule],
  templateUrl: './gestion-usuarios.html',
  styleUrl: './gestion-usuarios.scss',
})
export class GestionUsuarios implements OnInit {
  private readonly gestionUsuariosService = inject(GestionUsuariosService);

  usuarios = signal<UsuarioSistema[]>([]);
  roles = signal<RolFormulario[]>([]);

  cargando = signal<boolean>(false);
  guardando = signal<boolean>(false);

  mensajeError = signal<string>('');
  mensajeExito = signal<string>('');

  textoBusqueda = '';
  rolSeleccionado = '';

  modalUsuarioAbierto = false;
  modoEdicion = false;
  usuarioEditando: UsuarioSistema | null = null;

  formularioUsuario: FormularioUsuario = this.crearFormularioVacio();

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  get usuariosFiltrados(): UsuarioSistema[] {
    const texto = this.normalizarTexto(this.textoBusqueda);
    const rol = this.rolSeleccionado.trim();

    return this.usuarios()
      .filter((usuario) => {
        const nombreCompleto = this.obtenerNombreCompleto(usuario);
        const rolUsuario = this.obtenerRolVisible(usuario);

        const coincideTexto =
          !texto ||
          this.normalizarTexto(usuario.username).includes(texto) ||
          this.normalizarTexto(usuario.email).includes(texto) ||
          this.normalizarTexto(nombreCompleto).includes(texto) ||
          this.normalizarTexto(rolUsuario).includes(texto);

        const coincideRol = !rol || rolUsuario === rol;

        return coincideTexto && coincideRol;
      })
      .sort((a, b) => a.id - b.id);
  }

  get totalUsuarios(): number {
    return this.usuarios().length;
  }

  get totalAdministradores(): number {
    return this.usuarios().filter((usuario) => this.obtenerRolVisible(usuario) === 'Administrador').length;
  }

  get totalEncargados(): number {
    return this.usuarios().filter((usuario) => this.obtenerRolVisible(usuario) === 'Encargado de turno').length;
  }

  cargarDatosIniciales(): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.gestionUsuariosService.listarRoles().subscribe({
      next: (roles) => {
        this.roles.set(roles);
      },
      error: () => {
        this.roles.set(['Administrador', 'Encargado de turno']);
      }
    });

    this.recargarUsuarios(() => {
      this.cargando.set(false);
    });
  }

  recargarUsuarios(callback?: () => void): void {
    this.gestionUsuariosService.listarUsuarios().subscribe({
      next: (usuarios) => {
        this.usuarios.set(usuarios);
        callback?.();
      },
      error: (error: any) => {
        this.mensajeError.set(
          this.obtenerMensajeError(error, 'No se pudieron cargar los usuarios del sistema.')
        );
        callback?.();
      }
    });
  }

  abrirModalNuevoUsuario(): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.modoEdicion = false;
    this.usuarioEditando = null;
    this.formularioUsuario = this.crearFormularioVacio();
    this.modalUsuarioAbierto = true;
  }

  abrirModalEditarUsuario(usuario: UsuarioSistema): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.modoEdicion = true;
    this.usuarioEditando = usuario;

    this.formularioUsuario = {
      username: usuario.username,
      first_name: usuario.first_name || '',
      last_name: usuario.last_name || '',
      email: usuario.email || '',
      password: '',
      rol: this.normalizarRolFormulario(this.obtenerRolVisible(usuario)),
      is_active: usuario.is_active
    };

    this.modalUsuarioAbierto = true;
  }

  cerrarModalUsuario(): void {
    if (this.guardando()) {
      return;
    }

    this.modalUsuarioAbierto = false;
    this.usuarioEditando = null;
    this.modoEdicion = false;
    this.formularioUsuario = this.crearFormularioVacio();
  }

  guardarUsuario(): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');

    const mensajeValidacion = this.validarFormulario();

    if (mensajeValidacion) {
      this.mensajeError.set(mensajeValidacion);
      return;
    }

    this.guardando.set(true);

    const payload = this.construirPayload();

    if (this.modoEdicion && this.usuarioEditando) {
      this.gestionUsuariosService
        .actualizarUsuario(this.usuarioEditando.id, payload)
        .subscribe({
          next: () => {
            this.guardando.set(false);
            this.modalUsuarioAbierto = false;
            this.usuarioEditando = null;
            this.formularioUsuario = this.crearFormularioVacio();
            this.mensajeExito.set('Usuario actualizado correctamente.');
            this.recargarUsuarios();
          },
          error: (error: any) => {
            this.guardando.set(false);
            this.mensajeError.set(
              this.obtenerMensajeError(error, 'No se pudo actualizar el usuario.')
            );
          }
        });

      return;
    }

    this.gestionUsuariosService.crearUsuario(payload as UsuarioPayload).subscribe({
      next: () => {
        this.guardando.set(false);
        this.modalUsuarioAbierto = false;
        this.formularioUsuario = this.crearFormularioVacio();
        this.mensajeExito.set('Usuario creado correctamente.');
        this.recargarUsuarios();
      },
      error: (error: any) => {
        this.guardando.set(false);
        this.mensajeError.set(
          this.obtenerMensajeError(error, 'No se pudo crear el usuario.')
        );
      }
    });
  }

  cambiarEstadoUsuario(usuario: UsuarioSistema): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');

    const nuevoEstado = !usuario.is_active;

    this.gestionUsuariosService
      .actualizarUsuario(usuario.id, { is_active: nuevoEstado })
      .subscribe({
        next: () => {
          this.mensajeExito.set(
            nuevoEstado
              ? 'Usuario activado correctamente.'
              : 'Usuario desactivado correctamente.'
          );
          this.recargarUsuarios();
        },
        error: (error: any) => {
          this.mensajeError.set(
            this.obtenerMensajeError(error, 'No se pudo cambiar el estado del usuario.')
          );
        }
      });
  }

  limpiarFiltros(): void {
    this.textoBusqueda = '';
    this.rolSeleccionado = '';
  }

  obtenerNombreCompleto(usuario: UsuarioSistema): string {
    const nombre = `${usuario.first_name || ''} ${usuario.last_name || ''}`.trim();
    return nombre || usuario.username;
  }

  obtenerRolVisible(usuario: UsuarioSistema): string {
    if (usuario.is_superuser) {
      return 'Administrador';
    }

    return usuario.rol_asignado || 'Sin rol';
  }

  obtenerClaseRol(usuario: UsuarioSistema): string {
    const rol = this.obtenerRolVisible(usuario);

    if (rol === 'Administrador') {
      return 'administrador';
    }

    if (rol === 'Encargado de turno') {
      return 'encargado';
    }

    return 'sin-rol';
  }

  obtenerTextoEstado(usuario: UsuarioSistema): string {
    return usuario.is_active ? 'Activo' : 'Inactivo';
  }

  obtenerClaseEstado(usuario: UsuarioSistema): string {
    return usuario.is_active ? 'activo' : 'inactivo';
  }

  private crearFormularioVacio(): FormularioUsuario {
    return {
      username: '',
      first_name: '',
      last_name: '',
      email: '',
      password: '',
      rol: 'Encargado de turno',
      is_active: true
    };
  }

  private validarFormulario(): string {
    if (!this.formularioUsuario.username.trim()) {
      return 'Debes ingresar un nombre de usuario.';
    }

    if (!this.modoEdicion && !this.formularioUsuario.password.trim()) {
      return 'Debes ingresar una contraseña temporal.';
    }

    if (this.formularioUsuario.password.trim() && this.formularioUsuario.password.trim().length < 6) {
      return 'La contraseña debe tener al menos 6 caracteres.';
    }

    if (!this.formularioUsuario.rol) {
      return 'Debes seleccionar un rol para el usuario.';
    }

    return '';
  }

  private construirPayload(): Partial<UsuarioPayload> {
    const payload: Partial<UsuarioPayload> = {
      username: this.formularioUsuario.username.trim(),
      first_name: this.formularioUsuario.first_name.trim(),
      last_name: this.formularioUsuario.last_name.trim(),
      email: this.formularioUsuario.email.trim(),
      rol: this.formularioUsuario.rol,
      is_active: this.formularioUsuario.is_active
    };

    if (this.formularioUsuario.password.trim()) {
      payload.password = this.formularioUsuario.password.trim();
    }

    return payload;
  }

  private normalizarRolFormulario(rol: string): RolFormulario {
    if (rol === 'Administrador') {
      return 'Administrador';
    }

    return 'Encargado de turno';
  }

  private normalizarTexto(valor: string): string {
    return String(valor ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .trim();
  }

  private obtenerMensajeError(error: any, mensajeDefecto: string): string {
    const errores = error?.error;

    if (!errores) {
      return mensajeDefecto;
    }

    if (typeof errores === 'string') {
      return errores;
    }

    if (errores.detail) {
      return String(errores.detail);
    }

    if (Array.isArray(errores)) {
      return errores.join(' ');
    }

    if (typeof errores === 'object') {
      const mensajes = Object.entries(errores).map(([campo, valor]) => {
        if (Array.isArray(valor)) {
          return `${campo}: ${valor.join(', ')}`;
        }

        return `${campo}: ${String(valor)}`;
      });

      if (mensajes.length > 0) {
        return mensajes.join(' | ');
      }
    }

    return mensajeDefecto;
  }
}