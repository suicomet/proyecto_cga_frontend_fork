import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

import { API_CONFIG } from '../config/api.config';

export interface TokensJwt {
  access: string;
  refresh: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.apiUrl;

  iniciarSesion(username: string, password: string): Observable<TokensJwt> {
    return this.http.post<TokensJwt>(`${this.apiUrl}/api/token/`, {
      username,
      password
    }).pipe(
      tap((tokens) => {
        sessionStorage.setItem('access_token', tokens.access);
        sessionStorage.setItem('refresh_token', tokens.refresh);
      })
    );
  }

  obtenerAccessToken(): string | null {
    return sessionStorage.getItem('access_token');
  }

  cerrarSesion(): void {
    sessionStorage.removeItem('access_token');
    sessionStorage.removeItem('refresh_token');
  }

  estaAutenticado(): boolean {
    return this.obtenerAccessToken() !== null;
  }
}