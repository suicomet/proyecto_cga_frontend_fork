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
  repartosTurnoFiltrados: RepartoTurno[] = [];

  filasIngresoRapido: FilaIngresoRapido[] = [];

  jornadaSeleccionada: number | null = null;
  turnoSeleccionado: number | null = null;

  filtroTexto = '';

  cierreActual: CierreTurno | null = null;

  cargando = false;
  cargandoCierre = false;
  mensajeExito = '';
  mensajeError = '';
  mensajeAccionCierre = '';

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
      repartosTurno: this.cierreTurnoService.obtenerRepartosTurno()
    }).subscribe({
      next: ({ jornadas, turnos, clientes, distribuciones, repartosTurno }) => {
        this.jornadas = this.extraerLista(jornadas);
        this.turnos = this.extraerLista(turnos)
          .filter((turno) => !this.esTurnoDePrueba(turno));
        this.clientes = this.extraerLista(clientes);
        this.distribuciones = this.extraerLista(distribuciones);
        this.repartosTurno = this.extraerLista(repartosTurno);

        this.seleccionarJornadaInicial();
        this.seleccionarTurnoInicial();
        this.aplicarFiltros();
        this.cargarCierres();

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

  async recargarRepartosTurno(): Promise<void> {
    const respuesta = await firstValueFrom(this.cierreTurnoService.obtenerRepartosTurno());
    this.repartosTurno = this.extraerLista(respuesta);
    this.aplicarFiltros();
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
    this.limpiarDatosDelTurnoSeleccionado();
    this.aplicarFiltros();
    this.buscarCierreExistente();
  }

  cambiarTurno(): void {
    this.limpiarDatosDelTurnoSeleccionado();
    this.aplicarFiltros();
    this.buscarCierreExistente();
  }

  limpiarDatosDelTurnoSeleccionado(): void {
    this.cierreActual = null;
    this.mensajeAccionCierre = '';
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

  aplicarFiltros(): void {
    const texto = this.filtroTexto.trim().toLowerCase();

    this.repartosTurnoFiltrados = this.repartosTurno.filter((reparto) => {
      const cumpleJornada = this.jornadaSeleccionada
        ? reparto.id_jornada === this.jornadaSeleccionada
        : true;

      const cumpleTurno = this.turnoSeleccionado
        ? reparto.id_turno === this.turnoSeleccionado
        : true;

      const cadenaBusqueda = [
        reparto.cliente_nombre || this.obtenerNombreClientePorId(reparto.id_cliente),
        reparto.distribucion_nombre || this.obtenerNombreDistribucionPorId(reparto.id_distribucion)
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

    this.repartosTurnoFiltrados.forEach((reparto) => {
      const cantidad = this.convertirNumero(reparto.cantidad_entregada);
      const unidad = String(reparto.unidad_medida || '').toUpperCase();

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
      filasGuardadas: this.repartosTurnoFiltrados.length,
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
      return this.filaBorradorTieneDatos(fila);
    });
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
    this.buscarCierre();
  }

  buscarCierre(): void {
    this.limpiarMensajes();

    if (!this.jornadaSeleccionada || !this.turnoSeleccionado) {
      this.mostrarError('Debes seleccionar una jornada y un turno para buscar el reporte.');
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

        if (!cierreEncontrado) {
          this.cierreActual = null;
          this.cargandoCierre = false;
          this.mostrarError('No se encontró un reporte para la jornada y turno seleccionados.');
          return;
        }

        this.cierreActual = cierreEncontrado;
        this.cargarFormularioDesdeCierre(cierreEncontrado);
        this.obtenerVistaPrevia(false);
        this.mostrarExito('Reporte cargado correctamente.');
        this.mostrarMensajeAccionCierre('Reporte cargado correctamente.');
        this.cargandoCierre = false;
      },
      error: (error) => {
        this.cargandoCierre = false;
        this.mostrarError(
          this.obtenerMensajeError(error, 'No se pudieron consultar los reportes existentes.')
        );
      }
    });
  }

  crearCierreDesdeBoton(): void {
    this.limpiarMensajes();

    if (!this.jornadaSeleccionada || !this.turnoSeleccionado) {
      this.mostrarError('Debes seleccionar una jornada y un turno para crear el reporte.');
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
          this.mostrarExito('Ya existía un reporte para esta jornada y turno. Se cargó el existente.');
          this.mostrarMensajeAccionCierre('Reporte existente cargado correctamente.');
          this.cargandoCierre = false;
          return;
        }

        this.crearCierre();
      },
      error: (error) => {
        this.cargandoCierre = false;
        this.mostrarError(
          this.obtenerMensajeError(error, 'No se pudieron consultar los reportes existentes.')
        );
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
        this.mostrarExito('Reporte creado correctamente.');
        this.mostrarMensajeAccionCierre('Reporte creado correctamente.');
        this.cargandoCierre = false;
        this.cargarCierres();
      },
      error: (error) => {
        this.cargandoCierre = false;
        this.mostrarError(
          this.obtenerMensajeError(error, 'No se pudo crear el reporte de turno.')
        );
      }
    });
  }

  async guardarRepartosBorrador(mostrarMensaje = true): Promise<boolean> {
    if (!this.jornadaSeleccionada || !this.turnoSeleccionado) {
      this.mostrarError('Debes seleccionar una jornada y un turno antes de guardar repartos.');
      return false;
    }

    if (!this.cierreActual) {
      this.mostrarError('Primero debes buscar o crear un reporte de turno.');
      return false;
    }

    if (this.estaCerrado()) {
      this.mostrarError('No puedes guardar repartos en un turno cerrado.');
      return false;
    }

    const filasConDatos = this.obtenerFilasBorradorValidas();

    if (filasConDatos.length === 0) {
      if (mostrarMensaje) {
        this.mostrarError('No hay filas nuevas para guardar.');
      }
      return true;
    }

    const filaIncompleta = filasConDatos.find((fila) => !this.filaBorradorCompleta(fila));

    if (filaIncompleta) {
      this.mostrarError('Cada fila de reparto debe tener cliente, cantidad mayor a cero, unidad y repartidor.');
      return false;
    }

    const payloads: RepartoTurnoPayload[] = filasConDatos.map((fila) => ({
      id_jornada: Number(this.jornadaSeleccionada),
      id_turno: Number(this.turnoSeleccionado),
      id_cliente: Number(fila.id_cliente),
      id_distribucion: Number(fila.id_distribucion),
      cantidad_entregada: this.convertirNumero(fila.cantidad).toFixed(2),
      unidad_medida: fila.unidad_medida,
      observacion: fila.observacion.trim() || null
    }));

    try {
      this.cargandoCierre = true;

      await firstValueFrom(
        forkJoin(payloads.map((payload) => this.cierreTurnoService.crearRepartoTurno(payload)))
      );

      this.prepararFilasIngresoRapido();
      await this.recargarRepartosTurno();
      this.obtenerVistaPrevia(false);

      if (mostrarMensaje) {
        this.mostrarExito('Repartos guardados correctamente.');
        this.mostrarMensajeAccionCierre('Repartos guardados correctamente.');
      }

      this.cargandoCierre = false;
      return true;
    } catch (error) {
      this.cargandoCierre = false;
      this.mostrarError(
        this.obtenerMensajeError(error, 'No se pudieron guardar los repartos del turno.')
      );
      return false;
    }
  }

  eliminarReparto(reparto: RepartoTurno): void {
    this.limpiarMensajes();

    if (this.estaCerrado()) {
      this.mostrarError('No puedes eliminar repartos de un turno cerrado.');
      return;
    }

    const idReparto = this.obtenerIdReparto(reparto);

    if (!idReparto) {
      this.mostrarError('No se pudo identificar el reparto seleccionado.');
      return;
    }

    this.cargandoCierre = true;

    this.cierreTurnoService.eliminarRepartoTurno(idReparto).subscribe({
      next: async () => {
        await this.recargarRepartosTurno();
        this.obtenerVistaPrevia(false);
        this.mostrarExito('Reparto eliminado correctamente.');
        this.mostrarMensajeAccionCierre('Reparto eliminado correctamente.');
        this.cargandoCierre = false;
      },
      error: (error) => {
        this.cargandoCierre = false;
        this.mostrarError(
          this.obtenerMensajeError(error, 'No se pudo eliminar el reparto.')
        );
      }
    });
  }

  guardarCambiosCierre(): void {
    this.limpiarMensajes();

    if (!this.cierreActual) {
      this.mostrarError('Primero debes buscar o crear un reporte.');
      return;
    }

    if (this.estaCerrado()) {
      this.mostrarError('No puedes editar un reporte cerrado.');
      return;
    }

    if (Number(this.formulario.ajuste_por_error_kg) !== 0 && !this.formulario.observacion.trim()) {
      this.mostrarError('Si existe ajuste por error, la observación es obligatoria.');
      return;
    }

    const idCierre = this.obtenerIdCierre(this.cierreActual);

    if (!idCierre) {
      this.mostrarError('No se pudo identificar el reporte actual.');
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
        this.mostrarExito('Datos guardados correctamente.');
        this.mostrarMensajeAccionCierre('Datos guardados correctamente.');
        this.cargandoCierre = false;
      },
      error: (error) => {
        this.cargandoCierre = false;
        this.mostrarError(
          this.obtenerMensajeError(error, 'No se pudieron guardar los datos manuales del reporte.')
        );
      }
    });
  }

  async guardarYFinalizarTurno(): Promise<void> {
    this.limpiarMensajes();

    if (!this.cierreActual) {
      this.mostrarError('Primero debes buscar o crear un reporte.');
      return;
    }

    if (this.estaCerrado()) {
      this.mostrarError('Este turno ya está cerrado.');
      return;
    }

    if (Number(this.formulario.ajuste_por_error_kg) !== 0 && !this.formulario.observacion.trim()) {
      this.mostrarError('Si existe ajuste por error, la observación es obligatoria.');
      return;
    }

    const idCierre = this.obtenerIdCierre(this.cierreActual);

    if (!idCierre) {
      this.mostrarError('No se pudo identificar el reporte actual.');
      return;
    }

    try {
      this.cargandoCierre = true;

      const repartosGuardados = await this.guardarRepartosBorrador(false);

      if (!repartosGuardados) {
        this.cargandoCierre = false;
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

      const cierreActualizado = await firstValueFrom(
        this.cierreTurnoService.actualizarCierre(idCierre, payload)
      );

      this.cierreActual = cierreActualizado;
      this.cargarFormularioDesdeCierre(cierreActualizado);

      const cierreCerrado = await firstValueFrom(
        this.cierreTurnoService.cerrarTurno(idCierre)
      );

      this.cierreActual = cierreCerrado;
      this.cargarFormularioDesdeCierre(cierreCerrado);
      await this.recargarRepartosTurno();

      this.mostrarExito('Turno guardado y finalizado correctamente.');
      this.mostrarMensajeAccionCierre('Turno guardado y finalizado correctamente. Puedes ingresar un nuevo turno.');

      this.cargandoCierre = false;
    } catch (error) {
      this.cargandoCierre = false;
      this.mostrarError(
        this.obtenerMensajeError(error, 'No se pudo guardar y finalizar el turno.')
      );
    }
  }

  obtenerVistaPrevia(mostrarMensaje = true): void {
    if (!this.cierreActual) {
      if (mostrarMensaje) {
        this.mostrarError('Primero debes buscar o crear un reporte.');
      }
      return;
    }

    const idCierre = this.obtenerIdCierre(this.cierreActual);

    if (!idCierre) {
      this.mostrarError('No se pudo identificar el reporte actual.');
      return;
    }

    this.cierreTurnoService.obtenerVistaPrevia(idCierre).subscribe({
      next: (cierre) => {
        this.cierreActual = cierre;
        this.cargarFormularioDesdeCierre(cierre);

        if (mostrarMensaje) {
          this.mostrarExito('Cálculo actualizado correctamente.');
          this.mostrarMensajeAccionCierre('Cálculo actualizado correctamente.');
        }
      },
      error: (error) => {
        this.mostrarError(
          this.obtenerMensajeError(error, 'No se pudo obtener el cálculo del reporte.')
        );
      }
    });
  }

  cerrarTurno(): void {
    this.guardarYFinalizarTurno();
  }

  reabrirTurno(): void {
    this.limpiarMensajes();

    if (!this.cierreActual) {
      this.mostrarError('Primero debes buscar o crear un reporte.');
      return;
    }

    const idCierre = this.obtenerIdCierre(this.cierreActual);

    if (!idCierre) {
      this.mostrarError('No se pudo identificar el reporte actual.');
      return;
    }

    this.cargandoCierre = true;

    this.cierreTurnoService.reabrirTurno(idCierre).subscribe({
      next: (cierre) => {
        this.cierreActual = cierre;
        this.cargarFormularioDesdeCierre(cierre);
        this.mostrarExito('Turno reabierto correctamente.');
        this.mostrarMensajeAccionCierre('Turno reabierto correctamente.');
        this.cargandoCierre = false;
      },
      error: (error) => {
        this.cargandoCierre = false;
        this.mostrarError(
          this.obtenerMensajeError(error, 'No se pudo reabrir el turno. Verifica permisos de Administrador.')
        );
      }
    });
  }

  ingresarNuevoTurno(): void {
    this.cierreActual = null;
    this.turnoSeleccionado = null;
    this.filtroTexto = '';
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
    this.repartosTurnoFiltrados = [];
    this.calcularResumenOperativo();

    this.mostrarExito('Pantalla lista para ingresar un nuevo turno.');
    this.mostrarMensajeAccionCierre('Selecciona un turno para continuar.');
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
      return 'Sin reporte cargado';
    }

    if (this.cierreActual.estado === 'EN_PROCESO') {
      return 'En proceso';
    }

    if (this.cierreActual.estado === 'CERRADO') {
      return 'Cerrado';
    }

    return this.cierreActual.estado || 'En proceso';
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

  trackByJornada(_: number, jornada: Jornada): number {
    return Number(jornada.id_jornada || jornada.id || 0);
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

  trackByReparto(_: number, reparto: RepartoTurno): number {
    return this.obtenerIdReparto(reparto);
  }

  trackByFilaIngreso(indice: number): number {
    return indice;
  }

}