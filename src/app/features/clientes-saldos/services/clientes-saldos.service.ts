import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface ClienteApi {
  id_cliente: number;
  rut: string | number;
  digito_verificador: string | number;
  nombre_cliente: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  descuento_aplicado: string | number;
}

export interface MovimientoVentaApi {
  id_detalle: number;
  cliente_nombre: string;
  producto_nombre: string;
  distribucion_nombre: string;
  jornada_fecha: string;
  venta_linea: string | number;
  precio_cobrado: string | number;
  descuento_porcentaje_aplicado: string | number;
  cantidad_entregada: string | number;
  unidad_medida: string;
  cancelacion: string | number;
  id_jornada: number;
  id_cliente: number;
  id_distribucion: number;
  id_producto: number;
  id_pedido: number;
  kilos: string | number;
}

@Injectable({
  providedIn: 'root',
})
export class ClientesSaldosService {
  private readonly apiUrl = 'https://proyectocga-production-2e12.up.railway.app/api';

  constructor(private readonly http: HttpClient) {}

  obtenerClientes(): Observable<ClienteApi[]> {
    return this.http.get<ClienteApi[]>(`${this.apiUrl}/ventas/clientes/`);
  }

  obtenerMovimientos(): Observable<MovimientoVentaApi[]> {
    return this.http.get<MovimientoVentaApi[]>(`${this.apiUrl}/ventas/movimientos/`);
  }
}