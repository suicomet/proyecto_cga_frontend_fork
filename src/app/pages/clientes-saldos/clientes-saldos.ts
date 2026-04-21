import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import {
  ClienteApi,
  ClientesSaldosService,
  MovimientoVentaApi,
} from '../../features/clientes-saldos/services/clientes-saldos.service';

type FiltroSaldo = 'todos' | 'pendiente' | 'al-dia' | 'sin-movimientos';
type OrdenSaldo =
  | 'mayor-saldo'
  | 'menor-saldo'
  | 'mayor-venta'
  | 'cliente-az'
  | 'cliente-za';

interface ClienteSaldo {
  idCliente: number;
  rutCompleto: string;
  nombreCliente: string;
  ciudad: string;
  direccion: string;
  telefono: string;
  descuentoAplicado: number;
  totalVendido: number;
  pagadoAcumulado: number;
  saldoPendiente: number;
  cantidadMovimientos: number;
  ultimoMovimiento: string | null;
  estado: 'Al día' | 'Con saldo pendiente' | 'Sin movimientos';
}

@Component({
  selector: 'app-clientes-saldos',
  imports: [CommonModule, FormsModule],
  templateUrl: './clientes-saldos.html',
  styleUrl: './clientes-saldos.scss',
})
export class ClientesSaldos implements OnInit {
  clientesSaldos: ClienteSaldo[] = [];
  movimientosVentas: MovimientoVentaApi[] = [];
  clienteSeleccionado: ClienteSaldo | null = null;

  cargando = false;
  errorCarga = '';

  textoBusqueda = '';
  filtroSaldo: FiltroSaldo = 'todos';
  ordenSeleccionado: OrdenSaldo = 'mayor-saldo';

  constructor(private readonly clientesSaldosService: ClientesSaldosService) {}

  ngOnInit(): void {
    this.cargarClientesSaldos();
  }

  cargarClientesSaldos(): void {
    this.cargando = true;
    this.errorCarga = '';
    this.clienteSeleccionado = null;

    forkJoin({
      clientes: this.clientesSaldosService.obtenerClientes(),
      movimientos: this.clientesSaldosService.obtenerMovimientos(),
    }).subscribe({
      next: ({ clientes, movimientos }) => {
        this.movimientosVentas = movimientos;
        this.clientesSaldos = this.construirSaldos(clientes, movimientos);
        this.cargando = false;
      },
      error: () => {
        this.errorCarga = 'No fue posible cargar los saldos de clientes desde el backend.';
        this.cargando = false;
      },
    });
  }

  get clientesFiltrados(): ClienteSaldo[] {
    const busqueda = this.normalizarTexto(this.textoBusqueda);

    return this.clientesSaldos
      .filter((cliente) => {
        const coincideBusqueda =
          !busqueda ||
          this.normalizarTexto(cliente.nombreCliente).includes(busqueda) ||
          this.normalizarTexto(cliente.rutCompleto).includes(busqueda) ||
          this.normalizarTexto(cliente.ciudad).includes(busqueda) ||
          String(cliente.idCliente).includes(busqueda);

        const coincideEstado =
          this.filtroSaldo === 'todos' ||
          (this.filtroSaldo === 'pendiente' && cliente.saldoPendiente > 0) ||
          (this.filtroSaldo === 'al-dia' &&
            cliente.cantidadMovimientos > 0 &&
            cliente.saldoPendiente <= 0) ||
          (this.filtroSaldo === 'sin-movimientos' && cliente.cantidadMovimientos === 0);

        return coincideBusqueda && coincideEstado;
      })
      .sort((a, b) => this.ordenarClientes(a, b));
  }

  get movimientosClienteSeleccionado(): MovimientoVentaApi[] {
    if (!this.clienteSeleccionado) {
      return [];
    }

    return this.movimientosVentas
      .filter(
        (movimiento) =>
          Number(movimiento.id_cliente) === Number(this.clienteSeleccionado?.idCliente)
      )
      .sort((a, b) => this.compararFechasDescendente(a.jornada_fecha, b.jornada_fecha));
  }

  get totalClientes(): number {
    return this.clientesSaldos.length;
  }

  get totalVendido(): number {
    return this.clientesSaldos.reduce((total, cliente) => total + cliente.totalVendido, 0);
  }

  get totalPagado(): number {
    return this.clientesSaldos.reduce((total, cliente) => total + cliente.pagadoAcumulado, 0);
  }

  get saldoPendienteTotal(): number {
    return this.clientesSaldos.reduce((total, cliente) => total + cliente.saldoPendiente, 0);
  }

  get clientesConSaldoPendiente(): number {
    return this.clientesSaldos.filter((cliente) => cliente.saldoPendiente > 0).length;
  }

  seleccionarCliente(cliente: ClienteSaldo): void {
    this.clienteSeleccionado = cliente;
  }

  cerrarDetalleCliente(): void {
    this.clienteSeleccionado = null;
  }

  limpiarFiltros(): void {
    this.textoBusqueda = '';
    this.filtroSaldo = 'todos';
    this.ordenSeleccionado = 'mayor-saldo';
  }

  formatearClp(valor: number | string): string {
    const numero = this.normalizarNumero(valor);

    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0,
    }).format(Math.round(numero || 0));
  }

  formatearPorcentaje(valor: number): string {
    return `${this.normalizarNumero(valor).toFixed(0)}%`;
  }

  formatearFecha(fecha: string | null): string {
    if (!fecha) {
      return 'Sin registro';
    }

    const partesFecha = fecha.split('-');

    if (partesFecha.length !== 3) {
      return fecha;
    }

    const [anio, mes, dia] = partesFecha;
    return `${dia}-${mes}-${anio}`;
  }

  formatearCodigoPedido(idPedido: number): string {
    return `PED-${String(idPedido).padStart(6, '0')}`;
  }

  formatearCodigoMovimiento(idDetalle: number): string {
    return `MOV-${String(idDetalle).padStart(6, '0')}`;
  }

  calcularSaldoLinea(movimiento: MovimientoVentaApi): number {
    const venta = this.normalizarNumero(movimiento.venta_linea);
    const pagado = this.normalizarNumero(movimiento.cancelacion);

    return Math.max(venta - pagado, 0);
  }

  obtenerClaseEstado(cliente: ClienteSaldo): string {
    if (cliente.cantidadMovimientos === 0) {
      return 'sin-movimientos';
    }

    if (cliente.saldoPendiente > 0) {
      return 'pendiente';
    }

    return 'al-dia';
  }

  private construirSaldos(
    clientes: ClienteApi[],
    movimientos: MovimientoVentaApi[]
  ): ClienteSaldo[] {
    return clientes.map((cliente) => {
      const movimientosCliente = movimientos.filter(
        (movimiento) => Number(movimiento.id_cliente) === Number(cliente.id_cliente)
      );

      const totalVendido = movimientosCliente.reduce(
        (total, movimiento) => total + this.normalizarNumero(movimiento.venta_linea),
        0
      );

      const pagadoAcumulado = movimientosCliente.reduce(
        (total, movimiento) => total + this.normalizarNumero(movimiento.cancelacion),
        0
      );

      const saldoPendiente = Math.max(totalVendido - pagadoAcumulado, 0);
      const ultimoMovimiento = this.obtenerUltimoMovimiento(movimientosCliente);

      return {
        idCliente: cliente.id_cliente,
        rutCompleto: this.formatearRut(cliente.rut, cliente.digito_verificador),
        nombreCliente: cliente.nombre_cliente,
        ciudad: cliente.ciudad || 'Sin ciudad',
        direccion: cliente.direccion || 'Sin dirección registrada',
        telefono: cliente.telefono || 'Sin teléfono',
        descuentoAplicado: this.normalizarNumero(cliente.descuento_aplicado),
        totalVendido,
        pagadoAcumulado,
        saldoPendiente,
        cantidadMovimientos: movimientosCliente.length,
        ultimoMovimiento,
        estado: this.obtenerEstadoCliente(totalVendido, saldoPendiente, movimientosCliente.length),
      };
    });
  }

  private obtenerEstadoCliente(
    totalVendido: number,
    saldoPendiente: number,
    cantidadMovimientos: number
  ): 'Al día' | 'Con saldo pendiente' | 'Sin movimientos' {
    if (cantidadMovimientos === 0 || totalVendido === 0) {
      return 'Sin movimientos';
    }

    if (saldoPendiente > 0) {
      return 'Con saldo pendiente';
    }

    return 'Al día';
  }

  private obtenerUltimoMovimiento(movimientos: MovimientoVentaApi[]): string | null {
    if (movimientos.length === 0) {
      return null;
    }

    return movimientos
      .map((movimiento) => movimiento.jornada_fecha)
      .filter((fecha) => Boolean(fecha))
      .sort((a, b) => this.compararFechasDescendente(a, b))[0];
  }

  private compararFechasDescendente(fechaA: string, fechaB: string): number {
    return fechaB.localeCompare(fechaA);
  }

  private ordenarClientes(a: ClienteSaldo, b: ClienteSaldo): number {
    switch (this.ordenSeleccionado) {
      case 'menor-saldo':
        return a.saldoPendiente - b.saldoPendiente;

      case 'mayor-venta':
        return b.totalVendido - a.totalVendido;

      case 'cliente-az':
        return a.nombreCliente.localeCompare(b.nombreCliente);

      case 'cliente-za':
        return b.nombreCliente.localeCompare(a.nombreCliente);

      case 'mayor-saldo':
      default:
        return b.saldoPendiente - a.saldoPendiente;
    }
  }

  private formatearRut(rut: string | number, digitoVerificador: string | number): string {
    const rutLimpio = String(rut ?? '').replace(/\D/g, '');
    const dv = String(digitoVerificador ?? '').toUpperCase();

    if (!rutLimpio) {
      return `-${dv}`;
    }

    const rutConPuntos = rutLimpio.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
    return `${rutConPuntos}-${dv}`;
  }

  private normalizarNumero(valor: string | number | null | undefined): number {
    if (valor === null || valor === undefined || valor === '') {
      return 0;
    }

    const numero = Number(String(valor).replace(',', '.'));
    return Number.isNaN(numero) ? 0 : numero;
  }

  private normalizarTexto(valor: string): string {
    return String(valor ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .trim();
  }
}