import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { CierreTurnoService } from '../../features/control-turno-reparto/services/cierre-turno.service';

import {
  CierreTurno,
  CierreTurnoPayload,
  Jornada,
  MovimientoTurno,
  RespuestaListaApi,
  Turno
} from '../../features/control-turno-reparto/interfaces/cierre-turno.interface';

interface FilaIngresoRapido {
  cliente_nombre: string;
  cantidad: number | null;
  unidad_medida: 'KILO' | 'UNIDAD';
  distribucion_nombre: string;
}

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

  movimientos: MovimientoTurno[] = [];
  movimientosFiltrados: MovimientoTurno[] = [];

  filasIngresoRapido: FilaIngresoRapido[] = [];

  jornadaSeleccionada: number | null = null;
  turnoSeleccionado: number | null = null;

  filtroTexto = '';

  cierreActual: CierreTurno | null = null;

  cargando = false;
  cargandoCierre = false;
  mensajeExito = '';
  mensajeError = '';

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
      movimientos: this.cierreTurnoService.obtenerMovimientos()
    }).subscribe({
      next: ({ jornadas, turnos, movimientos }) => {
        this.jornadas = this.extraerLista(jornadas);
        this.turnos = this.extraerLista(turnos)
          .filter((turno) => !this.esTurnoDePrueba(turno));

        this.movimientos = this.extraerLista(movimientos);

        this.seleccionarJornadaInicial();
        this.seleccionarTurnoInicial();
        this.aplicarFiltros();
        this.cargarCierres();

        this.cargando = false;
      },
      error: () => {
        this.cargando = false;
        this.mostrarError('No se pudieron cargar los datos iniciales del módulo.');
      }
    });
  }

  cargarCierres(): void {
    this.cierreTurnoService.obtenerCierres().subscribe({
      next: (respuesta) => {
        this.cierres = this.extraerLista(respuesta);
        this.buscarCierreExistente();
      },
      error: () => {
        this.cierres = [];
      }
    });
  }

  prepararFilasIngresoRapido(): void {
    this.filasIngresoRapido = Array.from({ length: 12 }, () => this.crearFilaVacia());
  }

  crearFilaVacia(): FilaIngresoRapido {
    return {
      cliente_nombre: '',
      cantidad: null,
      unidad_medida: 'KILO',
      distribucion_nombre: ''
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

  seleccionarJornadaInicial(): void {
    if (this.jornadaSeleccionada || this.jornadas.length === 0) {
      return;
    }

    const jornadasOrdenadas = [...this.jornadas].sort((a, b) => {
      return this.obtenerIdJornada(a) - this.obtenerIdJornada(b);
    });

    const ultimaJornada = jornadasOrdenadas[jornadasOrdenadas.length - 1];
    this.jornadaSeleccionada = this.obtenerIdJornada(ultimaJornada);
  }

  seleccionarTurnoInicial(): void {
    if (this.turnoSeleccionado || this.turnos.length === 0) {
      return;
    }

    this.turnoSeleccionado = this.obtenerIdTurno(this.turnos[0]);
  }

  cambiarJornada(): void {
    this.cierreActual = null;
    this.aplicarFiltros();
    this.buscarCierreExistente();
  }

  cambiarTurno(): void {
    this.cierreActual = null;
    this.aplicarFiltros();
    this.buscarCierreExistente();
  }

  aplicarFiltros(): void {
    const texto = this.filtroTexto.trim().toLowerCase();

    this.movimientosFiltrados = this.movimientos.filter((movimiento) => {
      const cumpleJornada = this.jornadaSeleccionada
        ? movimiento.id_jornada === this.jornadaSeleccionada
        : true;

      const cumpleTurno = this.turnoSeleccionado
        ? movimiento.id_turno === this.turnoSeleccionado
        : true;

      const cadenaBusqueda = [
        movimiento.cliente_nombre,
        movimiento.distribucion_nombre
      ].join(' ').toLowerCase();

      const cumpleTexto = texto
        ? cadenaBusqueda.includes(texto)
        : true;

      return cumpleJornada && cumpleTurno && cumpleTexto;
    });

    this.calcularResumenOperativo();
  }

  calcularResumenOperativo(): void {
    let kilosReparto = 0;
    let unidadesReparto = 0;

    this.movimientosFiltrados.forEach((movimiento) => {
      const cantidad = this.convertirNumero(movimiento.cantidad_entregada);
      const unidad = String(movimiento.unidad_medida || '').toUpperCase();

      if (unidad === 'KILO') {
        kilosReparto += cantidad;
      }

      if (unidad === 'UNIDAD') {
        unidadesReparto += cantidad;
      }
    });

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
      filasGuardadas: this.movimientosFiltrados.length,
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
    return this.filasIngresoRapido.filter((fila) => {
      return !!fila.cliente_nombre.trim()
        || !!fila.distribucion_nombre.trim()
        || this.convertirNumero(fila.cantidad) > 0;
    });
  }

  filaBorradorTieneDatos(fila: FilaIngresoRapido): boolean {
    return !!fila.cliente_nombre.trim()
      || !!fila.distribucion_nombre.trim()
      || this.convertirNumero(fila.cantidad) > 0;
  }

  buscarCierreExistente(): void {
    if (!this.jornadaSeleccionada || !this.turnoSeleccionado) {
      return;
    }

    const cierreEncontrado = this.cierres.find((cierre) => {
      const idJornada = this.obtenerIdJornadaDesdeCierre(cierre);
      const idTurno = this.obtenerIdTurnoDesdeCierre(cierre);

      return idJornada === this.jornadaSeleccionada && idTurno === this.turnoSeleccionado;
    });

    if (cierreEncontrado) {
      this.cierreActual = cierreEncontrado;
      this.cargarFormularioDesdeCierre(cierreEncontrado);
    }
  }

  buscarOCrearCierre(): void {
    this.limpiarMensajes();

    if (!this.jornadaSeleccionada || !this.turnoSeleccionado) {
      this.mostrarError('Debes seleccionar una jornada y un turno para buscar o crear el cierre.');
      return;
    }

    this.cargandoCierre = true;

    this.cierreTurnoService.obtenerCierres().subscribe({
      next: (respuesta) => {
        this.cierres = this.extraerLista(respuesta);

        const cierreEncontrado = this.cierres.find((cierre) => {
          const idJornada = this.obtenerIdJornadaDesdeCierre(cierre);
          const idTurno = this.obtenerIdTurnoDesdeCierre(cierre);

          return idJornada === this.jornadaSeleccionada && idTurno === this.turnoSeleccionado;
        });

        if (cierreEncontrado) {
          this.cierreActual = cierreEncontrado;
          this.cargarFormularioDesdeCierre(cierreEncontrado);
          this.obtenerVistaPrevia(false);
          this.mostrarExito('Cierre cargado correctamente.');
          this.cargandoCierre = false;
          return;
        }

        this.crearCierre();
      },
      error: () => {
        this.cargandoCierre = false;
        this.mostrarError('No se pudieron consultar los cierres existentes.');
      }
    });
  }

  crearCierre(): void {
    if (!this.jornadaSeleccionada || !this.turnoSeleccionado) {
      this.cargandoCierre = false;
      return;
    }

    const payload: CierreTurnoPayload = {
      id_jornada: this.jornadaSeleccionada,
      id_turno: this.turnoSeleccionado,
      mostrador_kg: this.convertirNumero(this.formulario.mostrador_kg),
      raciones_kg: this.convertirNumero(this.formulario.raciones_kg),
      ajuste_por_error_kg: this.convertirNumero(this.formulario.ajuste_por_error_kg),
      pan_especial_kg: this.convertirNumero(this.formulario.pan_especial_kg),
      detalle_pan_especial: this.formulario.detalle_pan_especial,
      observacion: this.formulario.observacion
    };

    this.cierreTurnoService.crearCierre(payload).subscribe({
      next: (cierre) => {
        this.cierreActual = cierre;
        this.cargarFormularioDesdeCierre(cierre);
        this.mostrarExito('Cierre creado correctamente.');
        this.cargandoCierre = false;
        this.cargarCierres();
      },
      error: () => {
        this.cargandoCierre = false;
        this.mostrarError('No se pudo crear el cierre de turno.');
      }
    });
  }

  guardarCambiosCierre(): void {
    this.limpiarMensajes();

    if (!this.cierreActual) {
      this.mostrarError('Primero debes buscar o crear un cierre.');
      return;
    }

    if (this.estaCerrado()) {
      this.mostrarError('No puedes editar un cierre cerrado.');
      return;
    }

    if (Number(this.formulario.ajuste_por_error_kg) !== 0 && !this.formulario.observacion.trim()) {
      this.mostrarError('Si existe ajuste por error, la observación es obligatoria.');
      return;
    }

    const idCierre = this.obtenerIdCierre(this.cierreActual);

    if (!idCierre) {
      this.mostrarError('No se pudo identificar el cierre actual.');
      return;
    }

    const payload: Partial<CierreTurnoPayload> = {
      mostrador_kg: this.convertirNumero(this.formulario.mostrador_kg),
      raciones_kg: this.convertirNumero(this.formulario.raciones_kg),
      ajuste_por_error_kg: this.convertirNumero(this.formulario.ajuste_por_error_kg),
      pan_especial_kg: this.convertirNumero(this.formulario.pan_especial_kg),
      detalle_pan_especial: this.formulario.detalle_pan_especial,
      observacion: this.formulario.observacion
    };

    this.cargandoCierre = true;

    this.cierreTurnoService.actualizarCierre(idCierre, payload).subscribe({
      next: (cierre) => {
        this.cierreActual = cierre;
        this.cargarFormularioDesdeCierre(cierre);
        this.obtenerVistaPrevia(false);
        this.mostrarExito('Datos manuales del cierre guardados correctamente.');
        this.cargandoCierre = false;
      },
      error: () => {
        this.cargandoCierre = false;
        this.mostrarError('No se pudieron guardar los datos manuales del cierre.');
      }
    });
  }

  obtenerVistaPrevia(mostrarMensaje = true): void {
    if (!this.cierreActual) {
      if (mostrarMensaje) {
        this.mostrarError('Primero debes buscar o crear un cierre.');
      }
      return;
    }

    const idCierre = this.obtenerIdCierre(this.cierreActual);

    if (!idCierre) {
      this.mostrarError('No se pudo identificar el cierre actual.');
      return;
    }

    this.cierreTurnoService.obtenerVistaPrevia(idCierre).subscribe({
      next: (cierre) => {
        this.cierreActual = cierre;
        this.cargarFormularioDesdeCierre(cierre);

        if (mostrarMensaje) {
          this.mostrarExito('Vista previa actualizada correctamente.');
        }
      },
      error: () => {
        this.mostrarError('No se pudo obtener la vista previa del cierre.');
      }
    });
  }

  cerrarTurno(): void {
    this.limpiarMensajes();

    if (!this.cierreActual) {
      this.mostrarError('Primero debes buscar o crear un cierre.');
      return;
    }

    const idCierre = this.obtenerIdCierre(this.cierreActual);

    if (!idCierre) {
      this.mostrarError('No se pudo identificar el cierre actual.');
      return;
    }

    this.cargandoCierre = true;

    this.cierreTurnoService.cerrarTurno(idCierre).subscribe({
      next: (cierre) => {
        this.cierreActual = cierre;
        this.cargarFormularioDesdeCierre(cierre);
        this.mostrarExito('Turno cerrado correctamente.');
        this.cargandoCierre = false;
      },
      error: () => {
        this.cargandoCierre = false;
        this.mostrarError('No se pudo cerrar el turno.');
      }
    });
  }

  reabrirTurno(): void {
    this.limpiarMensajes();

    if (!this.cierreActual) {
      this.mostrarError('Primero debes buscar o crear un cierre.');
      return;
    }

    const idCierre = this.obtenerIdCierre(this.cierreActual);

    if (!idCierre) {
      this.mostrarError('No se pudo identificar el cierre actual.');
      return;
    }

    this.cargandoCierre = true;

    this.cierreTurnoService.reabrirTurno(idCierre).subscribe({
      next: (cierre) => {
        this.cierreActual = cierre;
        this.cargarFormularioDesdeCierre(cierre);
        this.mostrarExito('Turno reabierto correctamente.');
        this.cargandoCierre = false;
      },
      error: () => {
        this.cargandoCierre = false;
        this.mostrarError('No se pudo reabrir el turno. Verifica permisos de Administrador.');
      }
    });
  }

  cargarFormularioDesdeCierre(cierre: CierreTurno): void {
    this.formulario = {
      mostrador_kg: this.convertirNumero(cierre.mostrador_kg),
      raciones_kg: this.convertirNumero(cierre.raciones_kg),
      ajuste_por_error_kg: this.convertirNumero(cierre.ajuste_por_error_kg),
      pan_especial_kg: this.convertirNumero(cierre.pan_especial_kg),
      detalle_pan_especial: cierre.detalle_pan_especial || '',
      observacion: cierre.observacion || ''
    };

    const quintalesBackend = this.convertirNumero(cierre.quintales_cocidos);

    if (quintalesBackend > 0) {
      this.quintalesTurno = quintalesBackend;
    }

    this.calcularResumenOperativo();
  }

  obtenerClientesDisponibles(): string[] {
    const clientes = this.movimientos
      .map((movimiento) => movimiento.cliente_nombre)
      .filter((nombre) => !!nombre);

    return Array.from(new Set(clientes)).sort();
  }

  obtenerRepartidoresDisponibles(): string[] {
    const repartidores = this.movimientos
      .map((movimiento) => movimiento.distribucion_nombre)
      .filter((nombre) => !!nombre);

    return Array.from(new Set(repartidores)).sort();
  }

  existenMovimientosConTurno(): boolean {
    return this.movimientos.some((movimiento) => movimiento.id_turno !== null);
  }

  obtenerFechaJornadaSeleccionada(): string {
    const jornada = this.jornadas.find((item) => this.obtenerIdJornada(item) === this.jornadaSeleccionada);
    return jornada?.fecha || 'Sin jornada';
  }

  obtenerNombreTurnoSeleccionado(): string {
    const turno = this.turnos.find((item) => this.obtenerIdTurno(item) === this.turnoSeleccionado);
    return turno ? this.obtenerNombreTurno(turno) : 'Sin turno';
  }

  estaCerrado(): boolean {
    return this.cierreActual?.estado === 'CERRADO';
  }

  obtenerEstadoCierre(): string {
    if (!this.cierreActual) {
      return 'Sin cierre cargado';
    }

    return this.cierreActual.estado || 'EN_PROCESO';
  }

  obtenerIdCierre(cierre: CierreTurno): number {
    return Number(cierre.id_cierre_turno || cierre.id || cierre.id_cierre || 0);
  }

  obtenerIdJornada(jornada: Jornada): number {
    return Number(jornada.id_jornada || jornada.id || 0);
  }

  obtenerIdTurno(turno: Turno): number {
    return Number(turno.id_turno || turno.id || 0);
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

  obtenerEtiquetaJornada(jornada: Jornada): string {
    return jornada.fecha || jornada.nombre || `Jornada ${this.obtenerIdJornada(jornada)}`;
  }

  obtenerNombreTurno(turno: Turno): string {
    return turno.nombre_turno || turno.nombre || `Turno ${this.obtenerIdTurno(turno)}`;
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
  }

  mostrarExito(mensaje: string): void {
    this.mensajeExito = mensaje;
    this.mensajeError = '';
  }

  mostrarError(mensaje: string): void {
    this.mensajeError = mensaje;
    this.mensajeExito = '';
  }

  trackByJornada(_: number, jornada: Jornada): number {
    return Number(jornada.id_jornada || jornada.id || 0);
  }

  trackByTurno(_: number, turno: Turno): number {
    return Number(turno.id_turno || turno.id || 0);
  }

  trackByMovimiento(_: number, movimiento: MovimientoTurno): number {
    return movimiento.id_detalle;
  }

  trackByFilaIngreso(indice: number): number {
    return indice;
  }

}