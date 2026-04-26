export interface RespuestaListaApi<T> {
  value?: T[];
  results?: T[];
  Count?: number;
  count?: number;
}

export interface Jornada {
  id?: number;
  id_jornada?: number;
  fecha?: string;
  nombre?: string;
}

export interface Turno {
  id?: number;
  id_turno?: number;
  nombre?: string;
  nombre_turno?: string;
}

export interface Cliente {
  id?: number;
  id_cliente?: number;
  rut?: number;
  digito_verificador?: string;
  nombre_cliente: string;
  ciudad?: string;
  direccion?: string;
  telefono?: string;
  descuento_aplicado?: number | string | null;
}

export interface Distribucion {
  id?: number;
  id_distribucion?: number;
  nombre_distribucion: string;
}

export interface CierreTurno {
  id?: number;
  id_cierre?: number;
  id_cierre_turno?: number;

  jornada?: number | Jornada;
  turno?: number | Turno;

  id_jornada?: number;
  id_turno?: number;

  estado?: 'EN_PROCESO' | 'CERRADO' | string;

  mostrador_kg?: number | string | null;
  raciones_kg?: number | string | null;
  ajuste_por_error_kg?: number | string | null;
  pan_especial_kg?: number | string | null;
  detalle_pan_especial?: string | null;
  observacion?: string | null;

  quintales_cocidos?: number | string | null;
  kilos_directos?: number | string | null;
  unidades_totales?: number | string | null;
  kilos_equivalentes?: number | string | null;
  kilos_totales?: number | string | null;
  rinde?: number | string | null;
}

export interface CierreTurnoPayload {
  id_jornada: number;
  id_turno: number;
  mostrador_kg: number;
  raciones_kg: number;
  ajuste_por_error_kg: number;
  pan_especial_kg: number;
  detalle_pan_especial?: string;
  observacion?: string;
}

export interface RepartoTurno {
  id?: number;
  id_detalle_reparto_turno?: number;

  id_jornada: number;
  id_turno: number;
  id_cliente: number;
  id_distribucion: number;

  cliente_nombre?: string;
  distribucion_nombre?: string;
  jornada_fecha?: string;
  turno_nombre?: string;

  cantidad_entregada: number | string;
  unidad_medida: 'KILO' | 'UNIDAD' | string;

  fecha_registro?: string;
  observacion?: string | null;
}

export interface RepartoTurnoPayload {
  id_jornada: number;
  id_turno: number;
  id_cliente: number;
  id_distribucion: number;
  cantidad_entregada: number | string;
  unidad_medida: 'KILO' | 'UNIDAD';
  observacion?: string | null;
}

export interface MovimientoTurno {
  id_detalle: number;

  cliente_nombre: string;
  producto_nombre: string;
  distribucion_nombre: string;
  jornada_fecha: string;

  turno_nombre: string | null;
  id_turno: number | null;

  venta_linea: number | string | null;
  precio_cobrado: number | string | null;
  descuento_porcentaje_aplicado: number | string | null;
  cantidad_entregada: number | string | null;
  unidad_medida: 'KILO' | 'UNIDAD' | string;
  cancelacion: number | string | null;

  id_jornada: number;
  id_cliente: number;
  id_distribucion: number;
  id_producto: number;
  id_pedido: number | null;

  kilos: number | string | null;
}

export interface ResumenMovimientos {
  totalFilas: number;
  totalKilos: number;
  totalUnidades: number;
  totalVenta: number;
  totalCancelado: number;
  saldoPendiente: number;
}