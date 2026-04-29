import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import {
  MovimientoPago,
  PagosCobrosService
} from '../../features/pagos-cobros/services/pagos-cobros.service';

type EstadoPago = 'PAGADO' | 'PENDIENTE' | 'SIN_PAGO';

type CriterioOrden =
  | 'PENDIENTE_PRIMERO'
  | 'FECHA_RECIENTE'
  | 'FECHA_ANTIGUA'
  | 'SALDO_MAYOR'
  | 'SALDO_MENOR'
  | 'CLIENTE'
  | 'PEDIDO';

@Component({
  selector: 'app-pagos-cobros',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pagos-cobros.html',
  styleUrl: './pagos-cobros.scss'
})
export class PagosCobros implements OnInit {
  private readonly pagosCobrosService = inject(PagosCobrosService);

  movimientos = signal<MovimientoPago[]>([]);
  movimientoSeleccionado = signal<MovimientoPago | null>(null);

  cargando = signal<boolean>(false);
  registrandoPago = signal<boolean>(false);

  mensajeError = signal<string>('');
  mensajeExito = signal<string>('');

  textoBusqueda = '';
  estadoSeleccionado = '';
  criterioOrden: CriterioOrden = 'PENDIENTE_PRIMERO';

  modalPagoAbierto = false;
  montoRecibidoAhora: string | number = '';

  ngOnInit(): void {
    this.cargarMovimientos();
  }

  get movimientosFiltrados(): MovimientoPago[] {
    const texto = this.normalizarTexto(this.textoBusqueda.trim());
    const estado = this.estadoSeleccionado.trim();

    const filtrados = this.movimientos().filter((movimiento) => {
      const idPedido = String(movimiento.id_pedido ?? '');
      const idDetalle = String(movimiento.id_detalle);
      const codigoPedido = this.normalizarTexto(this.formatearCodigoPedido(movimiento));
      const codigoMovimiento = this.normalizarTexto(this.formatearCodigoMovimiento(movimiento));

      const coincideTexto =
        !texto ||
        this.normalizarTexto(movimiento.cliente_nombre).includes(texto) ||
        this.normalizarTexto(movimiento.producto_nombre).includes(texto) ||
        this.normalizarTexto(movimiento.distribucion_nombre).includes(texto) ||
        idPedido.includes(texto) ||
        idDetalle.includes(texto) ||
        codigoPedido.includes(texto) ||
        codigoMovimiento.includes(texto);

      const coincideEstado =
        !estado || this.obtenerEstadoClave(movimiento) === estado;

      return coincideTexto && coincideEstado;
    });

    return this.ordenarMovimientos(filtrados);
  }

  get totalVendido(): number {
    return this.movimientosFiltrados.reduce((total, movimiento) => {
      return total + this.convertirNumero(movimiento.venta_linea);
    }, 0);
  }

  get totalPagadoAcumulado(): number {
    return this.movimientosFiltrados.reduce((total, movimiento) => {
      return total + this.convertirNumero(movimiento.cancelacion);
    }, 0);
  }

  get totalPendiente(): number {
    return this.movimientosFiltrados.reduce((total, movimiento) => {
      return total + this.calcularSaldoPendiente(movimiento);
    }, 0);
  }

  get movimientoEnEdicion(): MovimientoPago | null {
    return this.movimientoSeleccionado();
  }

  get pagoNuevoCalculado(): number {
    const movimiento = this.movimientoSeleccionado();

    if (!movimiento) {
      return 0;
    }

    const pagadoActual = this.convertirNumero(movimiento.cancelacion);
    const montoRecibido = this.convertirNumero(this.montoRecibidoAhora);

    if (Number.isNaN(montoRecibido)) {
      return pagadoActual;
    }

    return pagadoActual + montoRecibido;
  }

  get saldoNuevoCalculado(): number {
    const movimiento = this.movimientoSeleccionado();

    if (!movimiento) {
      return 0;
    }

    const venta = this.convertirNumero(movimiento.venta_linea);
    const saldoNuevo = venta - this.pagoNuevoCalculado;

    return saldoNuevo > 0 ? saldoNuevo : 0;
  }

  cargarMovimientos(): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    this.pagosCobrosService.listarMovimientos().subscribe({
      next: (data) => {
        this.movimientos.set(data);
        this.cargando.set(false);
      },
      error: (error: any) => {
        this.cargando.set(false);
        this.mensajeError.set(
          this.obtenerMensajeError(error, 'No se pudieron cargar los pagos y cobros')
        );
      }
    });
  }

  abrirModalPago(movimiento: MovimientoPago): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');

    if (this.calcularSaldoPendiente(movimiento) <= 0) {
      this.mensajeError.set('Este movimiento ya se encuentra pagado.');
      return;
    }

    this.movimientoSeleccionado.set(movimiento);
    this.montoRecibidoAhora = '';
    this.modalPagoAbierto = true;
  }

  cerrarModalPago(): void {
    if (this.registrandoPago()) {
      return;
    }

    this.modalPagoAbierto = false;
    this.movimientoSeleccionado.set(null);
    this.montoRecibidoAhora = '';
  }

  registrarPago(): void {
    const movimiento = this.movimientoSeleccionado();

    if (!movimiento) {
      this.mensajeError.set('Debes seleccionar un movimiento para registrar el pago.');
      return;
    }

    this.mensajeError.set('');
    this.mensajeExito.set('');

    const montoRecibido = this.convertirNumero(this.montoRecibidoAhora);
    const pagadoActual = this.convertirNumero(movimiento.cancelacion);
    const saldoPendiente = this.calcularSaldoPendiente(movimiento);

    if (Number.isNaN(montoRecibido)) {
      this.mensajeError.set('Debes ingresar un monto recibido válido.');
      return;
    }

    if (montoRecibido <= 0) {
      this.mensajeError.set('El monto recibido debe ser mayor que cero.');
      return;
    }

    if (montoRecibido > saldoPendiente) {
      this.mensajeError.set('El monto recibido no puede superar el saldo pendiente.');
      return;
    }

    const nuevoPagadoAcumulado = pagadoActual + montoRecibido;

    this.registrandoPago.set(true);

    this.pagosCobrosService
      .actualizarCancelacion(movimiento.id_detalle, {
        cancelacion: nuevoPagadoAcumulado.toFixed(2)
      })
      .subscribe({
        next: (movimientoActualizado) => {
          this.registrandoPago.set(false);
          this.reemplazarMovimiento(movimientoActualizado);
          this.modalPagoAbierto = false;
          this.movimientoSeleccionado.set(null);
          this.montoRecibidoAhora = '';
          this.mensajeExito.set('Pago registrado correctamente.');
        },
        error: (error: any) => {
          this.registrandoPago.set(false);
          this.mensajeError.set(
            this.obtenerMensajeError(error, 'No se pudo registrar el pago')
          );
        }
      });
  }

  limpiarFiltros(): void {
    this.textoBusqueda = '';
    this.estadoSeleccionado = '';
    this.criterioOrden = 'PENDIENTE_PRIMERO';
  }

  calcularSaldoPendiente(movimiento: MovimientoPago): number {
    const venta = this.convertirNumero(movimiento.venta_linea);
    const pagado = this.convertirNumero(movimiento.cancelacion);
    const saldo = venta - pagado;

    return saldo > 0 ? saldo : 0;
  }

  obtenerEstadoClave(movimiento: MovimientoPago): EstadoPago {
    const venta = this.convertirNumero(movimiento.venta_linea);
    const pagado = this.convertirNumero(movimiento.cancelacion);

    if (pagado <= 0) {
      return 'SIN_PAGO';
    }

    if (pagado >= venta) {
      return 'PAGADO';
    }

    return 'PENDIENTE';
  }

  obtenerEstadoTexto(movimiento: MovimientoPago): string {
    const estado = this.obtenerEstadoClave(movimiento);

    const textos: Record<EstadoPago, string> = {
      PAGADO: 'Pagado',
      PENDIENTE: 'Pendiente',
      SIN_PAGO: 'Sin pago'
    };

    return textos[estado];
  }

  obtenerClaseEstado(movimiento: MovimientoPago): string {
    const estado = this.obtenerEstadoClave(movimiento);

    const clases: Record<EstadoPago, string> = {
      PAGADO: 'estado-pagado',
      PENDIENTE: 'estado-pendiente',
      SIN_PAGO: 'estado-sin-pago'
    };

    return clases[estado];
  }

  tieneCondicionComercial(movimiento: MovimientoPago): boolean {
    const descuento = this.convertirNumero(movimiento.descuento_porcentaje_aplicado);
    return !Number.isNaN(descuento) && descuento > 0;
  }

  formatearFecha(fecha: string): string {
    if (!fecha) {
      return '-';
    }

    const [anio, mes, dia] = fecha.split('-');

    if (!anio || !mes || !dia) {
      return fecha;
    }

    return `${dia}-${mes}-${anio}`;
  }

  formatearDinero(valor: string | number | null | undefined): string {
    const numero = this.convertirNumero(valor);

    if (Number.isNaN(numero)) {
      return String(valor);
    }

    return numero.toLocaleString('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    });
  }

  formatearCantidad(valor: string | number | null | undefined): string {
    const numero = this.convertirNumero(valor);

    if (Number.isNaN(numero)) {
      return String(valor);
    }

    return numero.toLocaleString('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  formatearCodigoPedido(movimiento: MovimientoPago): string {
    if (!movimiento.id_pedido) {
      return 'PED-SIN-ID';
    }

    return `PED-${String(movimiento.id_pedido).padStart(6, '0')}`;
  }

  formatearCodigoMovimiento(movimiento: MovimientoPago): string {
    return `MOV-${String(movimiento.id_detalle).padStart(6, '0')}`;
  }

  obtenerTextoBotonPago(movimiento: MovimientoPago): string {
    return this.calcularSaldoPendiente(movimiento) <= 0 ? 'Pagado' : 'Registrar pago';
  }

  private ordenarMovimientos(movimientos: MovimientoPago[]): MovimientoPago[] {
    return [...movimientos].sort((a, b) => {
      switch (this.criterioOrden) {
        case 'FECHA_RECIENTE':
          return this.compararFecha(b, a) || this.compararIdDetalle(a, b);

        case 'FECHA_ANTIGUA':
          return this.compararFecha(a, b) || this.compararIdDetalle(a, b);

        case 'SALDO_MAYOR':
          return this.calcularSaldoPendiente(b) - this.calcularSaldoPendiente(a);

        case 'SALDO_MENOR':
          return this.calcularSaldoPendiente(a) - this.calcularSaldoPendiente(b);

        case 'CLIENTE':
          return this.normalizarTexto(a.cliente_nombre).localeCompare(
            this.normalizarTexto(b.cliente_nombre)
          );

        case 'PEDIDO':
          return this.compararIdPedido(a, b) || this.compararIdDetalle(a, b);

        case 'PENDIENTE_PRIMERO':
        default:
          return this.compararPendientesPrimero(a, b);
      }
    });
  }

  private compararPendientesPrimero(a: MovimientoPago, b: MovimientoPago): number {
    const saldoA = this.calcularSaldoPendiente(a);
    const saldoB = this.calcularSaldoPendiente(b);

    const aTieneSaldo = saldoA > 0;
    const bTieneSaldo = saldoB > 0;

    if (aTieneSaldo && !bTieneSaldo) {
      return -1;
    }

    if (!aTieneSaldo && bTieneSaldo) {
      return 1;
    }

    return this.compararFecha(a, b) || this.compararIdPedido(a, b) || this.compararIdDetalle(a, b);
  }

  private compararFecha(a: MovimientoPago, b: MovimientoPago): number {
    return this.obtenerTiempoFecha(a.jornada_fecha) - this.obtenerTiempoFecha(b.jornada_fecha);
  }

  private compararIdPedido(a: MovimientoPago, b: MovimientoPago): number {
    return Number(a.id_pedido ?? 0) - Number(b.id_pedido ?? 0);
  }

  private compararIdDetalle(a: MovimientoPago, b: MovimientoPago): number {
    return Number(a.id_detalle) - Number(b.id_detalle);
  }

  private obtenerTiempoFecha(fecha: string): number {
    const tiempo = new Date(fecha).getTime();
    return Number.isNaN(tiempo) ? 0 : tiempo;
  }

  private reemplazarMovimiento(movimientoActualizado: MovimientoPago): void {
    this.movimientos.update((listaActual) =>
      listaActual.map((movimiento) =>
        movimiento.id_detalle === movimientoActualizado.id_detalle
          ? movimientoActualizado
          : movimiento
      )
    );
  }

  private convertirNumero(valor: string | number | null | undefined): number {
    if (valor === null || valor === undefined || valor === '') {
      return 0;
    }

    if (typeof valor === 'number') {
      return Number.isNaN(valor) ? 0 : valor;
    }

    const numero = Number(String(valor).replace(',', '.'));

    return Number.isNaN(numero) ? 0 : numero;
  }

  private normalizarTexto(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private obtenerMensajeError(error: any, mensajeDefecto: string): string {
    const status = error?.status ? ` HTTP ${error.status}.` : '';
    const errores = error?.error;

    if (error?.status === 401) {
      return 'Tu sesión expiró o el token ya no es válido. Cierra sesión e inicia nuevamente antes de continuar.';
    }

    if (!errores) {
      return `${mensajeDefecto}.${status}`;
    }

    if (typeof errores === 'string') {
      return `${mensajeDefecto}.${status} Detalle: ${errores}`;
    }

    if (errores.detail) {
      return `${mensajeDefecto}.${status} Detalle: ${errores.detail}`;
    }

    if (typeof errores === 'object') {
      const mensajes = Object.entries(errores).map(([campo, valor]) => {
        if (Array.isArray(valor)) {
          return `${campo}: ${valor.join(', ')}`;
        }

        if (typeof valor === 'object' && valor !== null) {
          return `${campo}: ${JSON.stringify(valor)}`;
        }

        return `${campo}: ${String(valor)}`;
      });

      if (mensajes.length > 0) {
        return `${mensajeDefecto}.${status} Detalle: ${mensajes.join(' | ')}`;
      }
    }

    return `${mensajeDefecto}.${status}`;
  }
}