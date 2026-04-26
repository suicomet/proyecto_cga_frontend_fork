import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { firstValueFrom, forkJoin } from 'rxjs';

import { CierreTurnoService } from '../../features/control-turno-reparto/services/cierre-turno.service';

import {
  CierreTurno,
  CierreTurnoPayload,
  Cliente,
  Distribucion,
  Jornada,
  RepartoTurno,
  RepartoTurnoPayload,
  RespuestaListaApi,
  Turno
} from '../../features/control-turno-reparto/interfaces/cierre-turno.interface';

interface FilaIngresoRapido {
  id_cliente: number | null;
  cantidad: number | null;
  unidad_medida: 'KILO' | 'UNIDAD';
  id_distribucion: number | null;
  observacion: string;
}

type EstadoVisualPlanilla = 'SIN_INICIAR' | 'INGRESANDO' | 'FINALIZADO' | 'BLOQUEADO';

@Component({
  selector: 'app-control-turno-reparto',
  imports: [CommonModule, FormsModule],
  templateUrl: './control-turno-reparto.html',
  styleUrl: './control-turno-reparto.scss',
})
export class ControlTurnoReparto implements OnInit {

  private readonly unidadesPorKilo = 13;

  jornadas: Jornada[] = [];
  turnos: Turno[] = [];
  cierres: CierreTurno[] = [];
  clientes: Cliente[] = [];
  distribuciones: Distribucion[] = [];

  repartosTurno: RepartoTurno[] = [];

  filasIngresoRapido: FilaIngresoRapido[] = [];

  fechaReporte = this.obtenerFechaActualISO();
  jornadaSeleccionada: number | null = null;
  turnoSeleccionado: number | null = null;

  cierreActual: CierreTurno | null = null;
  cierrePendienteDetectado: CierreTurno | null = null;

  estadoVisual: EstadoVisualPlanilla = 'SIN_INICIAR';

  cargando = false;
  cargandoCierre = false;
  mensajeExito = '';
  mensajeError = '';
  mensajeAccionCierre = '';

  mostrarModalExito = false;
  mostrarModalPendiente = false;
  mostrarBloqueoFinalizado = false;

  quintalesTurno = 0;

  formulario = {
    mostrador_kg: 0,
    raciones_kg: 0,
    ajuste_por_error_kg: 0,
    pan_especial_kg: 0,
    detalle_pan_especial: '',
    observacion: ''
  };

  resumenOperativo = {
    filasGuardadas: 0,
    filasBorrador: 0,
    kilosReparto: 0,
    unidadesReparto: 0,
    kilosEquivalentes: 0,
    kilosMostrador: 0,
    kilosPanEspecial: 0,
    kilosRaciones: 0,
    ajusteKg: 0,
    kilosTotales: 0,
    rindePreliminar: 0
  };

  constructor(private cierreTurnoService: CierreTurnoService) {}

  ngOnInit(): void {
    this.prepararFilasIngresoRapido();
    this.cargarDatosIniciales();
  }

  cargarDatosIniciales(): void {
    this.cargando = true;
    this.limpiarMensajes();

    forkJoin({
      jornadas: this.cierreTurnoService.obtenerJornadas(),
      turnos: this.cierreTurnoService.obtenerTurnos(),
      clientes: this.cierreTurnoService.obtenerClientes(),
      distribuciones: this.cierreTurnoService.obtenerDistribuciones(),
      repartosTurno: this.cierreTurnoService.obtenerRepartosTurno(),
      cierres: this.cierreTurnoService.obtenerCierres()
    }).subscribe({
      next: ({ jornadas, turnos, clientes, distribuciones, repartosTurno, cierres }) => {
        this.jornadas = this.extraerLista(jornadas);
        this.turnos = this.extraerLista(turnos)
          .filter((turno) => !this.esTurnoDePrueba(turno));
        this.clientes = this.extraerLista(clientes);
        this.distribuciones = this.extraerLista(distribuciones);
        this.repartosTurno = this.extraerLista(repartosTurno);
        this.cierres = this.extraerLista(cierres);

        this.estadoVisual = 'SIN_INICIAR';
        this.calcularResumenOperativo();

        this.cargando = false;
      },
      error: (error) => {
        this.cargando = false;
        this.mostrarError(
          this.obtenerMensajeError(error, 'No se pudieron cargar los datos iniciales del módulo.')
        );
      }
    });
  }

  async iniciarPlanillaTurno(): Promise<void> {
    this.limpiarMensajes();
    this.mostrarModalExito = false;
    this.mostrarModalPendiente = false;
    this.mostrarBloqueoFinalizado = false;

    if (!this.turnoSeleccionado) {
      this.mostrarError('Debes seleccionar un turno para iniciar la planilla.');
      return;
    }

    try {
      this.cargandoCierre = true;

      const jornadaHoy = await this.obtenerOCrearJornadaActual();
      this.jornadaSeleccionada = this.obtenerIdJornada(jornadaHoy);

      await this.recargarCierres();
      await this.recargarRepartosTurno();

      const cierreExistente = this.buscarCierrePorJornadaTurno(
        this.jornadaSeleccionada,
        this.turnoSeleccionado
      );

      if (cierreExistente?.estado === 'CERRADO') {
        this.cierreActual = cierreExistente;
        this.estadoVisual = 'BLOQUEADO';
        this.mostrarBloqueoFinalizado = true;
        this.cargandoCierre = false;
        this.mostrarError('Este turno ya fue finalizado. No se puede ingresar nuevamente.');
        return;
      }

      if (cierreExistente?.estado === 'EN_PROCESO') {
        this.cierrePendienteDetectado = cierreExistente;
        this.estadoVisual = 'BLOQUEADO';
        this.mostrarModalPendiente = true;
        this.cargandoCierre = false;
        return;
      }

      this.prepararPlanillaLimpia();

      this.cargandoCierre = false;
    } catch (error) {
      this.cargandoCierre = false;
      this.mostrarError(
        this.obtenerMensajeError(error, 'No se pudo iniciar la planilla del turno.')
      );
    }
  }

  prepararPlanillaLimpia(): void {
    this.cierreActual = null;
    this.cierrePendienteDetectado = null;
    this.estadoVisual = 'INGRESANDO';
    this.mostrarModalPendiente = false;
    this.mostrarBloqueoFinalizado = false;
    this.mostrarModalExito = false;

    this.quintalesTurno = 0;

    this.formulario = {
      mostrador_kg: 0,
      raciones_kg: 0,
      ajuste_por_error_kg: 0,
      pan_especial_kg: 0,
      detalle_pan_especial: '',
      observacion: ''
    };

    this.prepararFilasIngresoRapido();
    this.calcularResumenOperativo();

    this.mostrarExito('Planilla iniciada. Ingresa los datos del turno actual.');
    this.mostrarMensajeAccionCierre('Planilla lista para ingresar datos.');
  }

  async descartarPendienteEIniciar(): Promise<void> {
    this.limpiarMensajes();

    if (!this.cierrePendienteDetectado || !this.jornadaSeleccionada || !this.turnoSeleccionado) {
      this.mostrarError('No se pudo identificar el reporte pendiente.');
      return;
    }

    try {
      this.cargandoCierre = true;

      const repartosPendientes = this.repartosTurno.filter((reparto) => {
        return reparto.id_jornada === this.jornadaSeleccionada
          && reparto.id_turno === this.turnoSeleccionado;
      });

      if (repartosPendientes.length > 0) {
        await firstValueFrom(
          forkJoin(
            repartosPendientes
              .map((reparto) => this.cierreTurnoService.eliminarRepartoTurno(this.obtenerIdReparto(reparto)))
          )
        );
      }

      const idCierre = this.obtenerIdCierre(this.cierrePendienteDetectado);

      if (idCierre) {
        await firstValueFrom(this.cierreTurnoService.eliminarCierre(idCierre));
      }

      await this.recargarCierres();
      await this.recargarRepartosTurno();

      this.prepararPlanillaLimpia();

      this.cargandoCierre = false;
    } catch (error) {
      this.cargandoCierre = false;
      this.mostrarError(
        this.obtenerMensajeError(error, 'No se pudo descartar el reporte pendiente.')
      );
    }
  }

  cancelarInicioPorPendiente(): void {
    this.mostrarModalPendiente = false;
    this.cierrePendienteDetectado = null;
    this.estadoVisual = 'SIN_INICIAR';
    this.limpiarPlanillaLocal();
    this.mostrarMensajeAccionCierre('Selecciona otro turno o vuelve a iniciar la planilla.');
  }

  limpiarPlanillaLocal(): void {
    this.cierreActual = null;
    this.quintalesTurno = 0;

    this.formulario = {
      mostrador_kg: 0,
      raciones_kg: 0,
      ajuste_por_error_kg: 0,
      pan_especial_kg: 0,
      detalle_pan_especial: '',
      observacion: ''
    };

    this.prepararFilasIngresoRapido();
    this.calcularResumenOperativo();
  }

  async obtenerOCrearJornadaActual(): Promise<Jornada> {
    const jornadaExistente = this.jornadas.find((jornada) => jornada.fecha === this.fechaReporte);

    if (jornadaExistente) {
      return jornadaExistente;
    }

    const nuevaJornada = await firstValueFrom(
      this.cierreTurnoService.crearJornada({ fecha: this.fechaReporte })
    );

    this.jornadas = [...this.jornadas, nuevaJornada];

    return nuevaJornada;
  }

  async recargarCierres(): Promise<void> {
    const respuesta = await firstValueFrom(this.cierreTurnoService.obtenerCierres());
    this.cierres = this.extraerLista(respuesta);
  }

  async recargarRepartosTurno(): Promise<void> {
    const respuesta = await firstValueFrom(this.cierreTurnoService.obtenerRepartosTurno());
    this.repartosTurno = this.extraerLista(respuesta);
  }

  buscarCierrePorJornadaTurno(idJornada: number, idTurno: number): CierreTurno | null {
    const cierreEncontrado = this.cierres.find((cierre) => {
      const cierreJornada = this.obtenerIdJornadaDesdeCierre(cierre);
      const cierreTurno = this.obtenerIdTurnoDesdeCierre(cierre);

      return cierreJornada === idJornada && cierreTurno === idTurno;
    });

    return cierreEncontrado || null;
  }

  prepararFilasIngresoRapido(): void {
    this.filasIngresoRapido = Array.from({ length: 12 }, () => this.crearFilaVacia());
  }

  crearFilaVacia(): FilaIngresoRapido {
    return {
      id_cliente: null,
      cantidad: null,
      unidad_medida: 'KILO',
      id_distribucion: null,
      observacion: ''
    };
  }

  agregarFilas(): void {
    const nuevasFilas = Array.from({ length: 5 }, () => this.crearFilaVacia());
    this.filasIngresoRapido = [...this.filasIngresoRapido, ...nuevasFilas];
  }

  limpiarFilaIngreso(indice: number): void {
    this.filasIngresoRapido[indice] = this.crearFilaVacia();
    this.calcularResumenOperativo();
  }

  cambiarTurno(): void {
    this.limpiarMensajes();
    this.mostrarModalExito = false;
    this.mostrarModalPendiente = false;
    this.mostrarBloqueoFinalizado = false;
    this.estadoVisual = 'SIN_INICIAR';
    this.cierreActual = null;
    this.cierrePendienteDetectado = null;
    this.limpiarPlanillaLocal();
  }

  calcularResumenOperativo(): void {
    let kilosReparto = 0;
    let unidadesReparto = 0;

    const filasBorrador = this.obtenerFilasBorradorValidas();

    filasBorrador.forEach((fila) => {
      const cantidad = this.convertirNumero(fila.cantidad);
      const unidad = String(fila.unidad_medida || '').toUpperCase();

      if (unidad === 'KILO') {
        kilosReparto += cantidad;
      }

      if (unidad === 'UNIDAD') {
        unidadesReparto += cantidad;
      }
    });

    const kilosEquivalentes = unidadesReparto / this.unidadesPorKilo;

    const kilosMostrador = this.convertirNumero(this.formulario.mostrador_kg);
    const kilosPanEspecial = this.convertirNumero(this.formulario.pan_especial_kg);
    const kilosRaciones = this.convertirNumero(this.formulario.raciones_kg);
    const ajusteKg = this.convertirNumero(this.formulario.ajuste_por_error_kg);

    const kilosTotales =
      kilosReparto +
      kilosEquivalentes +
      kilosMostrador +
      kilosPanEspecial +
      kilosRaciones +
      ajusteKg;

    const quintales = this.convertirNumero(this.quintalesTurno);
    const rindePreliminar = quintales > 0 ? kilosTotales / quintales : 0;

    this.resumenOperativo = {
      filasGuardadas: 0,
      filasBorrador: filasBorrador.length,
      kilosReparto,
      unidadesReparto,
      kilosEquivalentes,
      kilosMostrador,
      kilosPanEspecial,
      kilosRaciones,
      ajusteKg,
      kilosTotales,
      rindePreliminar
    };
  }

  obtenerFilasBorradorValidas(): FilaIngresoRapido[] {
    return this.filasIngresoRapido.filter((fila) => this.filaBorradorTieneDatos(fila));
  }

  filaBorradorTieneDatos(fila: FilaIngresoRapido): boolean {
    return !!fila.id_cliente
      || !!fila.id_distribucion
      || this.convertirNumero(fila.cantidad) > 0
      || !!fila.observacion.trim();
  }

  filaBorradorCompleta(fila: FilaIngresoRapido): boolean {
    return !!fila.id_cliente
      && !!fila.id_distribucion
      && this.convertirNumero(fila.cantidad) > 0
      && ['KILO', 'UNIDAD'].includes(fila.unidad_medida);
  }

  async guardarYFinalizarTurno(): Promise<void> {
    this.limpiarMensajes();

    if (this.estadoVisual !== 'INGRESANDO') {
      this.mostrarError('Primero debes iniciar la planilla del turno.');
      return;
    }

    if (!this.jornadaSeleccionada || !this.turnoSeleccionado) {
      this.mostrarError('No se pudo identificar la fecha o el turno del reporte.');
      return;
    }

    if (Number(this.formulario.ajuste_por_error_kg) !== 0 && !this.formulario.observacion.trim()) {
      this.mostrarError('Si existe ajuste por error, la observación es obligatoria.');
      return;
    }

    const filasConDatos = this.obtenerFilasBorradorValidas();
    const filaIncompleta = filasConDatos.find((fila) => !this.filaBorradorCompleta(fila));

    if (filaIncompleta) {
      this.mostrarError('Cada fila de reparto debe tener cliente, cantidad mayor a cero, unidad y repartidor.');
      return;
    }

    try {
      this.cargandoCierre = true;

      await this.recargarCierres();

      const cierreExistente = this.buscarCierrePorJornadaTurno(
        this.jornadaSeleccionada,
        this.turnoSeleccionado
      );

      if (cierreExistente?.estado === 'CERRADO') {
        this.estadoVisual = 'BLOQUEADO';
        this.mostrarBloqueoFinalizado = true;
        this.cargandoCierre = false;
        this.mostrarError('Este turno ya fue finalizado. No se puede volver a guardar.');
        return;
      }

      if (cierreExistente?.estado === 'EN_PROCESO') {
        this.cierrePendienteDetectado = cierreExistente;
        this.mostrarModalPendiente = true;
        this.cargandoCierre = false;
        return;
      }

      const payloadCierre: CierreTurnoPayload = {
        id_jornada: this.jornadaSeleccionada,
        id_turno: this.turnoSeleccionado,
        mostrador_kg: this.convertirNumero(this.formulario.mostrador_kg),
        raciones_kg: this.convertirNumero(this.formulario.raciones_kg),
        ajuste_por_error_kg: this.convertirNumero(this.formulario.ajuste_por_error_kg),
        pan_especial_kg: this.convertirNumero(this.formulario.pan_especial_kg),
        detalle_pan_especial: this.formulario.detalle_pan_especial,
        observacion: this.formulario.observacion
      };

      const cierreCreado = await firstValueFrom(this.cierreTurnoService.crearCierre(payloadCierre));
      const idCierre = this.obtenerIdCierre(cierreCreado);

      if (!idCierre) {
        throw new Error('No se pudo identificar el cierre creado.');
      }

      const payloadsReparto: RepartoTurnoPayload[] = filasConDatos.map((fila) => ({
        id_jornada: Number(this.jornadaSeleccionada),
        id_turno: Number(this.turnoSeleccionado),
        id_cliente: Number(fila.id_cliente),
        id_distribucion: Number(fila.id_distribucion),
        cantidad_entregada: this.convertirNumero(fila.cantidad).toFixed(2),
        unidad_medida: fila.unidad_medida,
        observacion: fila.observacion.trim() || null
      }));

      if (payloadsReparto.length > 0) {
        await firstValueFrom(
          forkJoin(payloadsReparto.map((payload) => this.cierreTurnoService.crearRepartoTurno(payload)))
        );
      }

      const cierreFinalizado = await firstValueFrom(this.cierreTurnoService.cerrarTurno(idCierre));

      this.cierreActual = cierreFinalizado;
      this.estadoVisual = 'FINALIZADO';
      this.mostrarModalExito = true;
      this.mostrarBloqueoFinalizado = false;
      this.mostrarModalPendiente = false;

      await this.recargarCierres();
      await this.recargarRepartosTurno();

      this.mostrarExito('Datos guardados con éxito.');
      this.mostrarMensajeAccionCierre('El reporte del turno fue finalizado correctamente.');

      this.cargandoCierre = false;
    } catch (error) {
      this.cargandoCierre = false;
      this.mostrarError(
        this.obtenerMensajeError(error, 'No se pudo guardar y finalizar el turno.')
      );
    }
  }

  ingresarOtroTurno(): void {
    this.mostrarModalExito = false;
    this.mostrarModalPendiente = false;
    this.mostrarBloqueoFinalizado = false;
    this.turnoSeleccionado = null;
    this.jornadaSeleccionada = null;
    this.cierreActual = null;
    this.cierrePendienteDetectado = null;
    this.estadoVisual = 'SIN_INICIAR';
    this.limpiarMensajes();
    this.limpiarPlanillaLocal();
    this.mostrarMensajeAccionCierre('Selecciona un turno para iniciar una nueva planilla.');
  }

  descartarPlanillaLocal(): void {
    this.limpiarMensajes();
    this.estadoVisual = 'SIN_INICIAR';
    this.limpiarPlanillaLocal();
    this.mostrarMensajeAccionCierre('Planilla descartada. Puedes iniciar nuevamente.');
  }

  planillaHabilitada(): boolean {
    return this.estadoVisual === 'INGRESANDO' && !this.cargandoCierre;
  }

  planillaBloqueada(): boolean {
    return this.estadoVisual !== 'INGRESANDO' || this.cargandoCierre;
  }

  obtenerTextoEstadoVisual(): string {
    if (this.estadoVisual === 'INGRESANDO') {
      return 'Ingresando datos';
    }

    if (this.estadoVisual === 'FINALIZADO') {
      return 'Finalizado';
    }

    if (this.estadoVisual === 'BLOQUEADO') {
      return 'Bloqueado';
    }

    return 'Sin iniciar';
  }

  obtenerClaseEstadoVisual(): string {
    return this.estadoVisual.toLowerCase().replace('_', '-');
  }

  obtenerFechaActualISO(): string {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  formatearFechaISO(fecha: string): string {
    if (!fecha) {
      return 'Sin fecha';
    }

    const [year, month, day] = fecha.split('-');
    return `${day}-${month}-${year}`;
  }

  obtenerIdCierre(cierre: CierreTurno): number {
    return Number(cierre.id_cierre_turno || cierre.id || cierre.id_cierre || 0);
  }

  obtenerIdReparto(reparto: RepartoTurno): number {
    return Number(reparto.id_detalle_reparto_turno || reparto.id || 0);
  }

  obtenerIdJornada(jornada: Jornada): number {
    return Number(jornada.id_jornada || jornada.id || 0);
  }

  obtenerIdTurno(turno: Turno): number {
    return Number(turno.id_turno || turno.id || 0);
  }

  obtenerIdCliente(cliente: Cliente): number {
    return Number(cliente.id_cliente || cliente.id || 0);
  }

  obtenerIdDistribucion(distribucion: Distribucion): number {
    return Number(distribucion.id_distribucion || distribucion.id || 0);
  }

  obtenerNombreTurno(turno: Turno): string {
    return turno.nombre_turno || turno.nombre || `Turno ${this.obtenerIdTurno(turno)}`;
  }

  obtenerNombreTurnoSeleccionado(): string {
    const turno = this.turnos.find((item) => this.obtenerIdTurno(item) === this.turnoSeleccionado);
    return turno ? this.obtenerNombreTurno(turno) : 'Sin turno';
  }

  obtenerNombreClientePorId(idCliente: number): string {
    const cliente = this.clientes.find((item) => this.obtenerIdCliente(item) === Number(idCliente));
    return cliente?.nombre_cliente || 'Cliente sin nombre';
  }

  obtenerNombreDistribucionPorId(idDistribucion: number): string {
    const distribucion = this.distribuciones.find((item) => {
      return this.obtenerIdDistribucion(item) === Number(idDistribucion);
    });

    return distribucion?.nombre_distribucion || 'Sin repartidor';
  }

  obtenerIdJornadaDesdeCierre(cierre: CierreTurno): number {
    if (cierre.id_jornada) {
      return Number(cierre.id_jornada);
    }

    if (typeof cierre.jornada === 'number') {
      return cierre.jornada;
    }

    if (cierre.jornada) {
      return this.obtenerIdJornada(cierre.jornada);
    }

    return 0;
  }

  obtenerIdTurnoDesdeCierre(cierre: CierreTurno): number {
    if (cierre.id_turno) {
      return Number(cierre.id_turno);
    }

    if (typeof cierre.turno === 'number') {
      return cierre.turno;
    }

    if (cierre.turno) {
      return this.obtenerIdTurno(cierre.turno);
    }

    return 0;
  }

  esTurnoDePrueba(turno: Turno): boolean {
    const nombre = this.obtenerNombreTurno(turno)
      .toLowerCase()
      .replace(/\s+/g, '');

    return nombre === 'pruebapermiso';
  }

  extraerLista<T>(respuesta: RespuestaListaApi<T> | T[]): T[] {
    if (Array.isArray(respuesta)) {
      return respuesta;
    }

    if (respuesta.value) {
      return respuesta.value;
    }

    if (respuesta.results) {
      return respuesta.results;
    }

    return [];
  }

  convertirNumero(valor: number | string | null | undefined): number {
    if (valor === null || valor === undefined || valor === '') {
      return 0;
    }

    return Number(valor);
  }

  formatearNumero(valor: number | string | null | undefined): string {
    return this.convertirNumero(valor).toLocaleString('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    });
  }

  limpiarMensajes(): void {
    this.mensajeExito = '';
    this.mensajeError = '';
    this.mensajeAccionCierre = '';
  }

  mostrarExito(mensaje: string): void {
    this.mensajeExito = mensaje;
    this.mensajeError = '';
  }

  mostrarError(mensaje: string): void {
    this.mensajeError = mensaje;
    this.mensajeExito = '';
    this.mensajeAccionCierre = '';
  }

  mostrarMensajeAccionCierre(mensaje: string): void {
    this.mensajeAccionCierre = mensaje;
  }

  obtenerMensajeError(error: any, mensajeDefecto: string): string {
    const respuesta = error?.error;

    if (typeof respuesta === 'string' && respuesta.trim()) {
      return respuesta;
    }

    if (respuesta?.detail) {
      return respuesta.detail;
    }

    if (respuesta?.error) {
      return respuesta.error;
    }

    if (respuesta && typeof respuesta === 'object') {
      const mensajes = Object.values(respuesta).flat();

      if (mensajes.length > 0) {
        return String(mensajes[0]);
      }
    }

    return mensajeDefecto;
  }

  trackByTurno(_: number, turno: Turno): number {
    return Number(turno.id_turno || turno.id || 0);
  }

  trackByCliente(_: number, cliente: Cliente): number {
    return this.obtenerIdCliente(cliente);
  }

  trackByDistribucion(_: number, distribucion: Distribucion): number {
    return this.obtenerIdDistribucion(distribucion);
  }

  trackByFilaIngreso(indice: number): number {
    return indice;
  }

}