import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

import { API_CONFIG } from '../../../core/config/api.config';

export type RolSistema = 'Administrador' | 'Encargado de turno' | 'Sin rol';

export interface UsuarioSistema {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  is_active: boolean;
  is_superuser: boolean;
  roles: string[];
  rol_asignado: RolSistema | string;
}

export interface UsuarioPayload {
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  password?: string;
  rol: 'Administrador' | 'Encargado de turno';
  is_active: boolean;
}

export interface RespuestaRoles {
  roles: Array<'Administrador' | 'Encargado de turno'>;
}

@Injectable({
  providedIn: 'root'
})
export class GestionUsuariosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.apiUrl;

  listarUsuarios(): Observable<UsuarioSistema[]> {
    return this.http
      .get<UsuarioSistema[] | { value?: UsuarioSistema[]; results?: UsuarioSistema[] }>(
        `${this.apiUrl}/api/usuarios/`
      )
      .pipe(map((respuesta) => this.extraerLista<UsuarioSistema>(respuesta)));
  }

  listarRoles(): Observable<Array<'Administrador' | 'Encargado de turno'>> {
    return this.http
      .get<RespuestaRoles>(`${this.apiUrl}/api/usuarios/roles/`)
      .pipe(map((respuesta) => respuesta.roles ?? []));
  }

  crearUsuario(payload: UsuarioPayload): Observable<UsuarioSistema> {
    return this.http.post<UsuarioSistema>(
      `${this.apiUrl}/api/usuarios/`,
      payload
    );
  }

  actualizarUsuario(idUsuario: number, payload: Partial<UsuarioPayload>): Observable<UsuarioSistema> {
    return this.http.patch<UsuarioSistema>(
      `${this.apiUrl}/api/usuarios/${idUsuario}/`,
      payload
    );
  }

  private extraerLista<T>(respuesta: T[] | { value?: T[]; results?: T[] } | null | undefined): T[] {
    if (Array.isArray(respuesta)) {
      return respuesta;
    }

    if (respuesta?.results && Array.isArray(respuesta.results)) {
      return respuesta.results;
    }

    if (respuesta?.value && Array.isArray(respuesta.value)) {
      return respuesta.value;
    }

    return [];
  }
}
