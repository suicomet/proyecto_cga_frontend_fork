import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { forkJoin, map, Observable, switchMap } from 'rxjs';
import { API_CONFIG } from '../../../core/config/api.config';

export type UnidadMedida = 'KILO' | 'UNIDAD';
export type UnidadVentaBase = 'KILO' | 'UNIDAD' | 'AMBOS';

export interface DetallePedido {
  id_detalle_pedido: number;
  producto_nombre: string;
  cantidad_solicitada: string | number;
  unidad_medida: UnidadMedida;
  precio_cobrado: string | number;
  descuento_porcentaje_aplicado: string | number;
  id_pedido: number;
  id_producto: number;
}

export interface Pedido {
  id_pedido: number;
  cliente_nombre: string;
  distribucion_nombre: string;
  detalles: DetallePedido[];
  fecha_pedido: string;
  fecha_entrega_solicitada: string;
  id_cliente: number;
  id_distribucion: number;
}

export interface Cliente {
  id_cliente: number;
  rut: number;
  digito_verificador: string;
  nombre_cliente: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  descuento_aplicado: string | number;
}

export interface Producto {
  id_producto: number;
  tipo_produccion_nombre: string;
  nombre_producto: string;
  precio_sugerido: string | number;
  unidad_venta_base: UnidadVentaBase;
  id_tipo_produccion: number | null;
}

export interface Distribucion {
  id_distribucion: number;
  nombre_distribucion: string;
}

export interface TipoProduccion {
  id_tipo_produccion: number;
  nombre_tipo_produccion: string;
  insumo_principal_nombre?: string | null;
  id_insumo_principal?: number | null;
}

export interface NuevoPedido {
  fecha_pedido: string;
  fecha_entrega_solicitada: string;
  id_cliente: number;
  id_distribucion: number;
}

export interface NuevoDetallePedido {
  cantidad_solicitada: string | number;
  unidad_medida: UnidadMedida;
  precio_cobrado: string | number;
  descuento_porcentaje_aplicado?: string | number;
  id_pedido: number;
  id_producto: number;
}

export interface NuevoCliente {
  rut: number | string;
  digito_verificador: string;
  nombre_cliente: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  descuento_aplicado?: number | string;
}

export interface NuevoProducto {
  nombre_producto: string;
  precio_sugerido: number | string;
  unidad_venta_base: UnidadVentaBase;
  id_tipo_produccion?: number | null;
}

export interface NuevaDistribucion {
  nombre_distribucion: string;
}

@Injectable({
  providedIn: 'root'
})
export class PedidosDespachoService {
  private http = inject(HttpClient);
  private apiUrl = API_CONFIG.apiUrl;

  listarPedidos(): Observable<Pedido[]> {
    return this.http
      .get<Pedido[] | { value?: Pedido[] }>(`${this.apiUrl}/api/ventas/pedidos/`)
      .pipe(map((respuesta) => this.extraerLista<Pedido>(respuesta)));
  }

  crearPedido(payload: NuevoPedido): Observable<Pedido> {
    return this.http.post<Pedido>(`${this.apiUrl}/api/ventas/pedidos/`, payload);
  }

  crearDetallePedido(payload: NuevoDetallePedido): Observable<DetallePedido> {
    return this.http.post<DetallePedido>(
      `${this.apiUrl}/api/ventas/detalles-pedido/`,
      payload
    );
  }

  crearPedidoConDetalles(
    pedido: NuevoPedido,
    detalles: Omit<NuevoDetallePedido, 'id_pedido'>[]
  ): Observable<DetallePedido[]> {
    return this.crearPedido(pedido).pipe(
      switchMap((pedidoCreado) => {
        const solicitudes = detalles.map((detalle) =>
          this.crearDetallePedido({
            ...detalle,
            id_pedido: pedidoCreado.id_pedido
          })
        );

        return forkJoin(solicitudes);
      })
    );
  }

  listarClientes(): Observable<Cliente[]> {
    return this.http
      .get<Cliente[] | { value?: Cliente[] }>(`${this.apiUrl}/api/ventas/clientes/`)
      .pipe(map((respuesta) => this.extraerLista<Cliente>(respuesta)));
  }

  crearCliente(payload: NuevoCliente): Observable<Cliente> {
    return this.http.post<Cliente>(`${this.apiUrl}/api/ventas/clientes/`, payload);
  }

  listarProductos(): Observable<Producto[]> {
    return this.http
      .get<Producto[] | { value?: Producto[] }>(`${this.apiUrl}/api/catalogo/productos/`)
      .pipe(map((respuesta) => this.extraerLista<Producto>(respuesta)));
  }

  crearProducto(payload: NuevoProducto): Observable<Producto> {
    return this.http.post<Producto>(`${this.apiUrl}/api/catalogo/productos/`, payload);
  }

  listarDistribuciones(): Observable<Distribucion[]> {
    return this.http
      .get<Distribucion[] | { value?: Distribucion[] }>(
        `${this.apiUrl}/api/catalogo/distribuciones/`
      )
      .pipe(map((respuesta) => this.extraerLista<Distribucion>(respuesta)));
  }

  crearDistribucion(payload: NuevaDistribucion): Observable<Distribucion> {
    return this.http.post<Distribucion>(
      `${this.apiUrl}/api/catalogo/distribuciones/`,
      payload
    );
  }

  listarTiposProduccion(): Observable<TipoProduccion[]> {
    return this.http
      .get<TipoProduccion[] | { value?: TipoProduccion[] }>(
        `${this.apiUrl}/api/catalogo/tipos-produccion/`
      )
      .pipe(map((respuesta) => this.extraerLista<TipoProduccion>(respuesta)));
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