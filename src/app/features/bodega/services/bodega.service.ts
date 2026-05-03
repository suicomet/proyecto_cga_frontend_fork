import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api.config';

export interface MovimientoBodega {
  id_movimiento_bodega: number;
  insumo_nombre: string;
  turno_nombre: string | null;
  fecha_movimiento: string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA';
  cantidad: string | number;
  id_insumo: number;
  id_jornada?: number | null;
  id_turno?: number | null;
}

export interface Insumo {
  id_insumo: number;
  nombre_insumo: string;
  unidad_control: string;
  stock_sugerido_inicial: string | number;
  activo: string;
}

export interface Jornada {
  id_jornada: number;
  fecha: string;
}

export interface Turno {
  id_turno: number;
  nombre_turno: string;
}

export interface NuevoMovimientoBodega {
  fecha_movimiento: string;
  tipo_movimiento: 'ENTRADA' | 'SALIDA';
  cantidad: string | number;
  id_insumo: number;
  id_turno: number;
}

export interface NuevoInsumo {
  nombre_insumo: string;
  unidad_control: string;
  stock_sugerido_inicial: string | number;
  activo: string;
}

export interface ActualizarInsumo {
  nombre_insumo?: string;
  unidad_control?: string;
  stock_sugerido_inicial?: string | number;
  activo?: string;
}

@Injectable({
  providedIn: 'root'
})
export class BodegaService {
  private http = inject(HttpClient);
  private apiUrl = API_CONFIG.apiUrl;

  listarMovimientos(): Observable<MovimientoBodega[]> {
    return this.http
      .get<MovimientoBodega[] | { value?: MovimientoBodega[] }>(
        `${this.apiUrl}/api/movimientos-bodega/`
      )
      .pipe(map((respuesta) => this.extraerLista<MovimientoBodega>(respuesta)));
  }

  listarInsumos(): Observable<Insumo[]> {
    return this.http
      .get<Insumo[] | { value?: Insumo[] }>(
        `${this.apiUrl}/api/catalogo/insumos/`
      )
      .pipe(map((respuesta) => this.extraerLista<Insumo>(respuesta)));
  }

  listarJornadas(): Observable<Jornada[]> {
    return this.http
      .get<Jornada[] | { value?: Jornada[] }>(
        `${this.apiUrl}/api/jornadas/`
      )
      .pipe(map((respuesta) => this.extraerLista<Jornada>(respuesta)));
  }

  listarTurnos(): Observable<Turno[]> {
    return this.http
      .get<Turno[] | { value?: Turno[] }>(
        `${this.apiUrl}/api/turnos/`
      )
      .pipe(map((respuesta) => this.extraerLista<Turno>(respuesta)));
  }

  crearMovimiento(payload: NuevoMovimientoBodega): Observable<MovimientoBodega> {
    return this.http.post<MovimientoBodega>(
      `${this.apiUrl}/api/movimientos-bodega/`,
      payload
    );
  }

  crearInsumo(payload: NuevoInsumo): Observable<Insumo> {
    return this.http.post<Insumo>(
      `${this.apiUrl}/api/catalogo/insumos/`,
      payload
    );
  }

  actualizarInsumo(idInsumo: number, payload: ActualizarInsumo): Observable<Insumo> {
    return this.http.patch<Insumo>(
      `${this.apiUrl}/api/catalogo/insumos/${idInsumo}/`,
      payload
    );
  }

  private extraerLista<T>(respuesta: T[] | { value?: T[] } | null | undefined): T[] {
    if (Array.isArray(respuesta)) {
      return respuesta;
    }

    if (respuesta && Array.isArray(respuesta.value)) {
      return respuesta.value;
    }

    return [];
  }
}