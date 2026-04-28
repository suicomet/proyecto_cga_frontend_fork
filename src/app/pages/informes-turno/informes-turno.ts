import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { AuthService } from '../../core/services/auth.service';
import { CierreTurnoService } from '../../features/control-turno-reparto/services/cierre-turno.service';

interface RespuestaInformes {
  value?: InformeTurno[];
  results?: InformeTurno[];
  count?: number;
  Count?: number;
}

interface InformeTurno {
  id?: number;
  id_cierre?: number;
  id_cierre_turno?: number;

  id_jornada?: number;
  id_turno?: number;

  jornada_fecha?: string;
  turno_nombre?: string;

  estado?: 'EN_PROCESO' | 'CERRADO' | string;

  fecha_registro?: string | null;
  fecha_cierre?: string | null;

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

@Component({
  selector: 'app-informes-turno',
  imports: [CommonModule, FormsModule],
  templateUrl: './informes-turno.html',
  styleUrl: './informes-turno.scss'
})
export class InformesTurno implements OnInit {

  private readonly cierreTurnoService = inject(CierreTurnoService);
  private readonly authService = inject(AuthService);

  informes: InformeTurno[] = [];
  informesFiltrados: InformeTurno[] = [];

  cargando = false;
  mensajeError = '';

  filtroFechaDesde = '';
  filtroFechaHasta = '';
  filtroTurno = '';
  filtroEstado = '';

  informeSeleccionado: InformeTurno | null = null;

  ngOnInit(): void {
    this.cargarInformes();
  }

  cargarInformes(): void {
    this.cargando = true;
    this.mensajeError = '';

    this.cierreTurnoService.obtenerCierres().subscribe({
      next: (respuesta) => {
        this.informes = this.normalizarRespuesta(respuesta as unknown as RespuestaInformes | InformeTurno[]);
        this.informesFiltrados = [...this.informes];
        this.cargando = false;
      },
      error: () => {
        this.mensajeError = 'No fue posible cargar los informes de turno.';
        this.cargando = false;
      }
    });
  }

  private normalizarRespuesta(respuesta: RespuestaInformes | InformeTurno[]): InformeTurno[] {
    if (Array.isArray(respuesta)) {
      return respuesta;
    }

    if (respuesta.results) {
      return respuesta.results;
    }

    if (respuesta.value) {
      return respuesta.value;
    }

    return [];
  }

  aplicarFiltros(): void {
    this.informesFiltrados = this.informes.filter((informe) => {
      const fechaInforme = this.obtenerFechaInforme(informe);
      const turnoInforme = this.obtenerTurnoInforme(informe).toLowerCase();
      const estadoInforme = this.obtenerEstadoInforme(informe);

      const cumpleFechaDesde = !this.filtroFechaDesde || fechaInforme >= this.filtroFechaDesde;
      const cumpleFechaHasta = !this.filtroFechaHasta || fechaInforme <= this.filtroFechaHasta;
      const cumpleTurno = !this.filtroTurno || turnoInforme === this.filtroTurno.toLowerCase();
      const cumpleEstado = !this.filtroEstado || estadoInforme === this.filtroEstado;

      return cumpleFechaDesde && cumpleFechaHasta && cumpleTurno && cumpleEstado;
    });

    if (
      this.informeSeleccionado &&
      !this.informesFiltrados.some((informe) => this.obtenerIdInforme(informe) === this.obtenerIdInforme(this.informeSeleccionado!))
    ) {
      this.informeSeleccionado = null;
    }
  }

  limpiarFiltros(): void {
    this.filtroFechaDesde = '';
    this.filtroFechaHasta = '';
    this.filtroTurno = '';
    this.filtroEstado = '';
    this.informesFiltrados = [...this.informes];
    this.informeSeleccionado = null;
  }

  seleccionarInforme(informe: InformeTurno): void {
    this.informeSeleccionado = informe;
  }

  cerrarDetalle(): void {
    this.informeSeleccionado = null;
  }

  obtenerTurnosDisponibles(): string[] {
    const turnos = this.informes
      .map((informe) => this.obtenerTurnoInforme(informe))
      .filter((turno) => turno.trim().length > 0);

    return [...new Set(turnos)].sort((a, b) => a.localeCompare(b));
  }

  obtenerIdInforme(informe: InformeTurno): number {
    return Number(informe.id_cierre_turno ?? informe.id_cierre ?? informe.id ?? 0);
  }

  obtenerFechaInforme(informe: InformeTurno): string {
    return informe.jornada_fecha ?? '';
  }

  obtenerTurnoInforme(informe: InformeTurno): string {
    return informe.turno_nombre ?? 'Sin turno';
  }

  obtenerEstadoInforme(informe: InformeTurno): string {
    return String(informe.estado ?? 'SIN_ESTADO');
  }

  formatearFecha(valor?: string | null): string {
    if (!valor) {
      return 'Sin fecha';
    }

    const fechaBase = valor.split('T')[0];
    const partes = fechaBase.split('-');

    if (partes.length !== 3) {
      return valor;
    }

    return `${partes[2]}-${partes[1]}-${partes[0]}`;
  }

  formatearFechaHora(valor?: string | null): string {
    if (!valor) {
      return 'Sin registro';
    }

    const fecha = new Date(valor);

    if (Number.isNaN(fecha.getTime())) {
      return valor;
    }

    return fecha.toLocaleString('es-CL', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  }

  formatearNumero(valor?: number | string | null, decimales: number = 2): string {
    const numero = this.convertirNumero(valor);

    return numero.toLocaleString('es-CL', {
      minimumFractionDigits: decimales,
      maximumFractionDigits: decimales
    });
  }

  private convertirNumero(valor?: number | string | null): number {
    if (valor === null || valor === undefined || valor === '') {
      return 0;
    }

    const numero = Number(valor);

    return Number.isNaN(numero) ? 0 : numero;
  }

  obtenerClaseEstado(informe: InformeTurno): string {
    const estado = this.obtenerEstadoInforme(informe);

    if (estado === 'CERRADO') {
      return 'estado-cerrado';
    }

    if (estado === 'EN_PROCESO') {
      return 'estado-proceso';
    }

    return 'estado-neutro';
  }

  totalInformes(): number {
    return this.informesFiltrados.length;
  }

  totalCerrados(): number {
    return this.informesFiltrados.filter((informe) => this.obtenerEstadoInforme(informe) === 'CERRADO').length;
  }

  totalEnProceso(): number {
    return this.informesFiltrados.filter((informe) => this.obtenerEstadoInforme(informe) === 'EN_PROCESO').length;
  }

  esAdministrador(): boolean {
    return this.authService.esAdministrador();
  }

  trackByInforme(_: number, informe: InformeTurno): number {
    return this.obtenerIdInforme(informe);
  }
}
