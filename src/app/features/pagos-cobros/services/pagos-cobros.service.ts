import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

import { API_CONFIG } from '../../../core/config/api.config';

export interface MovimientoPago {
  id_detalle: number;
  cliente_nombre: string;
  producto_nombre: string;
  distribucion_nombre: string;
  jornada_fecha: string;
  venta_linea: string | number;
  precio_cobrado: string | number;
  descuento_porcentaje_aplicado: string | number | null;
  cantidad_entregada: string | number;
  unidad_medida: 'KILO' | 'UNIDAD';
  cancelacion: string | number | null;
  id_jornada: number;
  id_cliente: number;
  id_distribucion: number;
  id_producto: number;
  id_pedido?: number | null;
  kilos?: string | number;
}

export interface ActualizarCancelacion {
  cancelacion: string | number;
}

@Injectable({
  providedIn: 'root'
})
export class PagosCobrosService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = API_CONFIG.apiUrl;

  listarMovimientos(): Observable<MovimientoPago[]> {
    return this.http
      .get<MovimientoPago[] | { value?: MovimientoPago[] }>(
        `${this.apiUrl}/api/ventas/movimientos/`
      )
      .pipe(map((respuesta) => this.extraerLista<MovimientoPago>(respuesta)));
  }

  actualizarCancelacion(
    idDetalle: number,
    payload: ActualizarCancelacion
  ): Observable<MovimientoPago> {
    return this.http.patch<MovimientoPago>(
      `${this.apiUrl}/api/ventas/movimientos/${idDetalle}/`,
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