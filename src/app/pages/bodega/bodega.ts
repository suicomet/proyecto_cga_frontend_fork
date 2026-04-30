import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import {
  ActualizarInsumo,
  BodegaService,
  Insumo,
  MovimientoBodega,
  NuevoInsumo,
  NuevoMovimientoBodega,
  Turno
} from '../../features/bodega/services/bodega.service';

@Component({
  selector: 'app-bodega',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './bodega.html',
  styleUrl: './bodega.scss'
})
export class BodegaComponent implements OnInit {
  private bodegaService = inject(BodegaService);

  movimientos = signal<MovimientoBodega[]>([]);
  insumos = signal<Insumo[]>([]);
  turnos = signal<Turno[]>([]);

  cargando = signal<boolean>(false);
  guardandoMovimiento = signal<boolean>(false);
  guardandoInsumo = signal<boolean>(false);
  actualizandoInsumo = signal<boolean>(false);

  mensajeError = signal<string>('');
  mensajeExito = signal<string>('');
  mensajeErrorInsumo = signal<string>('');
  mensajeErrorGestionInsumos = signal<string>('');
  mensajeExitoGestionInsumos = signal<string>('');

  fechaSeleccionada = '';
  textoBusqueda = '';
  tipoMovimientoSeleccionado = '';
  turnoSeleccionado = '';

  modalMovimientoAbierto = false;
  modalInsumoAbierto = false;
  modalGestionInsumosAbierto = false;

  idInsumoEditando: number | null = null;

  formularioMovimiento: NuevoMovimientoBodega = {
    fecha_movimiento: this.obtenerFechaHoy(),
    tipo_movimiento: 'ENTRADA',
    cantidad: '',
    id_insumo: 0,
    id_turno: 0
  };

  formularioInsumo: NuevoInsumo = {
    nombre_insumo: '',
    unidad_control: '',
    stock_sugerido_inicial: '',
    activo: 'S'
  };

  formularioEditarInsumo: ActualizarInsumo = {
    nombre_insumo: '',
    unidad_control: '',
    stock_sugerido_inicial: '',
    activo: 'S'
  };

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  get movimientosFiltrados(): MovimientoBodega[] {
    const fecha = this.fechaSeleccionada.trim();
    const texto = this.normalizarTexto(this.textoBusqueda.trim());
    const tipo = this.tipoMovimientoSeleccionado.trim().toUpperCase();
    const turno = this.normalizarTexto(this.turnoSeleccionado.trim());

    return this.movimientos().filter((movimiento) => {
      const coincideFecha =
        !fecha ||
        movimiento.fecha_movimiento === fecha;

      const coincideTexto =
        !texto ||
        this.normalizarTexto(movimiento.insumo_nombre).includes(texto);

      const coincideTipo =
        !tipo ||
        movimiento.tipo_movimiento.toUpperCase() === tipo;

      const coincideTurno =
        !turno ||
        this.normalizarTexto(movimiento.turno_nombre ?? '') === turno;

      return coincideFecha && coincideTexto && coincideTipo && coincideTurno;
    });
  }

  get turnosFormulario(): Turno[] {
    return this.turnos().filter((turno) => {
      const nombre = this.normalizarTexto(turno.nombre_turno);
      return nombre !== 'pruebapermiso';
    });
  }

  get insumosActivos(): Insumo[] {
    return this.insumos().filter((insumo) => insumo.activo === 'S');
  }

  cargarDatosIniciales(): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    let pendientes = 3;

    const finalizar = () => {
      pendientes -= 1;
      if (pendientes === 0) {
        this.cargando.set(false);
      }
    };

    this.bodegaService.listarMovimientos().subscribe({
      next: (data) => {
        this.movimientos.set(data);
        finalizar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar los movimientos de bodega.');
        finalizar();
      }
    });

    this.bodegaService.listarInsumos().subscribe({
      next: (data) => {
        this.insumos.set(data);
        finalizar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar los insumos.');
        finalizar();
      }
    });

    this.bodegaService.listarTurnos().subscribe({
      next: (data) => {
        this.turnos.set(data);
        finalizar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar los turnos.');
        finalizar();
      }
    });
  }

  abrirModalMovimiento(): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.modalMovimientoAbierto = true;
    this.reiniciarFormularioMovimiento();
  }

  cerrarModalMovimiento(): void {
    if (this.guardandoMovimiento()) {
      return;
    }

    this.modalMovimientoAbierto = false;
    this.reiniciarFormularioMovimiento();
  }

  abrirModalInsumo(): void {
    this.mensajeErrorInsumo.set('');
    this.modalInsumoAbierto = true;
    this.reiniciarFormularioInsumo();
  }

  cerrarModalInsumo(): void {
    if (this.guardandoInsumo()) {
      return;
    }

    this.modalInsumoAbierto = false;
    this.reiniciarFormularioInsumo();
  }

  abrirGestionInsumos(): void {
    this.mensajeErrorGestionInsumos.set('');
    this.mensajeExitoGestionInsumos.set('');
    this.idInsumoEditando = null;
    this.reiniciarFormularioEditarInsumo();
    this.modalGestionInsumosAbierto = true;
  }

  cerrarGestionInsumos(): void {
    if (this.actualizandoInsumo()) {
      return;
    }

    this.modalGestionInsumosAbierto = false;
    this.idInsumoEditando = null;
    this.reiniciarFormularioEditarInsumo();
  }

  guardarMovimiento(): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');

    if (!this.formularioMovimiento.id_insumo) {
      this.mensajeError.set('Debes seleccionar un insumo.');
      return;
    }

    if (!this.formularioMovimiento.tipo_movimiento) {
      this.mensajeError.set('Debes seleccionar un tipo de movimiento.');
      return;
    }

    if (
      this.formularioMovimiento.cantidad === '' ||
      Number(this.formularioMovimiento.cantidad) <= 0
    ) {
      this.mensajeError.set('Debes ingresar una cantidad válida.');
      return;
    }

    if (!this.formularioMovimiento.id_turno) {
      this.mensajeError.set('Debes seleccionar un turno.');
      return;
    }

    this.guardandoMovimiento.set(true);

    this.bodegaService.crearMovimiento(this.formularioMovimiento).subscribe({
      next: () => {
        this.guardandoMovimiento.set(false);
        this.modalMovimientoAbierto = false;
        this.reiniciarFormularioMovimiento();
        this.mensajeExito.set('Movimiento guardado correctamente.');
        this.recargarMovimientos();
      },
      error: (error: any) => {
        this.guardandoMovimiento.set(false);
        this.mensajeError.set(
          this.obtenerMensajeError(error, 'No se pudo guardar el movimiento de bodega.')
        );
      }
    });
  }

  guardarInsumo(): void {
    this.mensajeErrorInsumo.set('');
    this.mensajeExito.set('');

    if (!this.formularioInsumo.nombre_insumo.trim()) {
      this.mensajeErrorInsumo.set('Debes ingresar el nombre del insumo.');
      return;
    }

    if (!this.formularioInsumo.unidad_control.trim()) {
      this.mensajeErrorInsumo.set('Debes ingresar la unidad de control.');
      return;
    }

    if (
      this.formularioInsumo.stock_sugerido_inicial === '' ||
      Number(this.formularioInsumo.stock_sugerido_inicial) < 0
    ) {
      this.mensajeErrorInsumo.set('Debes ingresar un stock sugerido inicial válido.');
      return;
    }

    this.guardandoInsumo.set(true);

    const payload: NuevoInsumo = {
      nombre_insumo: this.formularioInsumo.nombre_insumo.trim(),
      unidad_control: this.formularioInsumo.unidad_control.trim(),
      stock_sugerido_inicial: this.formularioInsumo.stock_sugerido_inicial,
      activo: this.formularioInsumo.activo || 'S'
    };

    this.bodegaService.crearInsumo(payload).subscribe({
      next: (insumoCreado: Insumo) => {
        this.guardandoInsumo.set(false);
        this.recargarInsumos(insumoCreado.id_insumo);
        this.modalInsumoAbierto = false;
        this.reiniciarFormularioInsumo();
        this.mensajeExito.set('Insumo creado correctamente.');
      },
      error: (error: any) => {
        this.guardandoInsumo.set(false);
        this.mensajeErrorInsumo.set(
          this.obtenerMensajeError(error, 'No se pudo crear el insumo.')
        );
      }
    });
  }

  editarInsumo(insumo: Insumo): void {
    this.idInsumoEditando = insumo.id_insumo;

    this.formularioEditarInsumo = {
      nombre_insumo: insumo.nombre_insumo,
      unidad_control: insumo.unidad_control,
      stock_sugerido_inicial: insumo.stock_sugerido_inicial,
      activo: insumo.activo
    };

    this.mensajeErrorGestionInsumos.set('');
    this.mensajeExitoGestionInsumos.set('');
  }

  cancelarEdicionInsumo(): void {
    this.idInsumoEditando = null;
    this.reiniciarFormularioEditarInsumo();
  }

  guardarEdicionInsumo(): void {
    this.mensajeErrorGestionInsumos.set('');
    this.mensajeExitoGestionInsumos.set('');

    if (!this.idInsumoEditando) {
      this.mensajeErrorGestionInsumos.set('Debes seleccionar un insumo para editar.');
      return;
    }

    if (!String(this.formularioEditarInsumo.nombre_insumo ?? '').trim()) {
      this.mensajeErrorGestionInsumos.set('El nombre del insumo es obligatorio.');
      return;
    }

    if (!String(this.formularioEditarInsumo.unidad_control ?? '').trim()) {
      this.mensajeErrorGestionInsumos.set('La unidad de control es obligatoria.');
      return;
    }

    if (
      this.formularioEditarInsumo.stock_sugerido_inicial === '' ||
      Number(this.formularioEditarInsumo.stock_sugerido_inicial) < 0
    ) {
      this.mensajeErrorGestionInsumos.set('El stock sugerido inicial debe ser válido.');
      return;
    }

    const payload: ActualizarInsumo = {
      nombre_insumo: String(this.formularioEditarInsumo.nombre_insumo).trim(),
      unidad_control: String(this.formularioEditarInsumo.unidad_control).trim(),
      stock_sugerido_inicial: this.formularioEditarInsumo.stock_sugerido_inicial,
      activo: this.formularioEditarInsumo.activo || 'S'
    };

    this.actualizandoInsumo.set(true);

    this.bodegaService.actualizarInsumo(this.idInsumoEditando, payload).subscribe({
      next: () => {
        this.actualizandoInsumo.set(false);
        this.idInsumoEditando = null;
        this.reiniciarFormularioEditarInsumo();
        this.mensajeExitoGestionInsumos.set('Insumo actualizado correctamente.');
        this.recargarInsumos();
        this.recargarMovimientos();
      },
      error: (error: any) => {
        this.actualizandoInsumo.set(false);
        this.mensajeErrorGestionInsumos.set(
          this.obtenerMensajeError(error, 'No se pudo actualizar el insumo.')
        );
      }
    });
  }

  cambiarEstadoInsumo(insumo: Insumo): void {
    this.mensajeErrorGestionInsumos.set('');
    this.mensajeExitoGestionInsumos.set('');

    const nuevoEstado = insumo.activo === 'S' ? 'N' : 'S';

    this.actualizandoInsumo.set(true);

    this.bodegaService.actualizarInsumo(insumo.id_insumo, { activo: nuevoEstado }).subscribe({
      next: () => {
        this.actualizandoInsumo.set(false);
        this.mensajeExitoGestionInsumos.set(
          nuevoEstado === 'S'
            ? 'Insumo reactivado correctamente.'
            : 'Insumo desactivado correctamente.'
        );

        if (
          nuevoEstado === 'N' &&
          this.formularioMovimiento.id_insumo === insumo.id_insumo
        ) {
          this.formularioMovimiento.id_insumo = 0;
        }

        this.recargarInsumos();
      },
      error: (error: any) => {
        this.actualizandoInsumo.set(false);
        this.mensajeErrorGestionInsumos.set(
          this.obtenerMensajeError(error, 'No se pudo cambiar el estado del insumo.')
        );
      }
    });
  }

  recargarMovimientos(): void {
    this.bodegaService.listarMovimientos().subscribe({
      next: (data) => this.movimientos.set(data),
      error: () => {
        this.mensajeError.set('Se guardó, pero no se pudo recargar la tabla.');
      }
    });
  }

  recargarInsumos(idInsumoSeleccionar?: number): void {
    this.bodegaService.listarInsumos().subscribe({
      next: (data) => {
        this.insumos.set(data);

        const insumoSeleccionado = data.find(
          (insumo) =>
            insumo.id_insumo === idInsumoSeleccionar &&
            insumo.activo === 'S'
        );

        if (insumoSeleccionado) {
          this.formularioMovimiento.id_insumo = insumoSeleccionado.id_insumo;
        }
      },
      error: () => {
        this.mensajeError.set('No se pudo recargar la lista de insumos.');
      }
    });
  }

  limpiarFiltros(): void {
    this.fechaSeleccionada = '';
    this.textoBusqueda = '';
    this.tipoMovimientoSeleccionado = '';
    this.turnoSeleccionado = '';
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

  formatearCantidad(valor: string | number): string {
    const numero = Number(valor);
    if (Number.isNaN(numero)) {
      return String(valor);
    }

    return numero.toLocaleString('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  obtenerNombreTurno(turno: string | null): string {
    if (!turno) {
      return '-';
    }

    return turno;
  }

  private reiniciarFormularioMovimiento(): void {
    this.formularioMovimiento = {
      fecha_movimiento: this.obtenerFechaHoy(),
      tipo_movimiento: 'ENTRADA',
      cantidad: '',
      id_insumo: 0,
      id_turno: 0
    };
  }

  private reiniciarFormularioInsumo(): void {
    this.formularioInsumo = {
      nombre_insumo: '',
      unidad_control: '',
      stock_sugerido_inicial: '',
      activo: 'S'
    };
  }

  private reiniciarFormularioEditarInsumo(): void {
    this.formularioEditarInsumo = {
      nombre_insumo: '',
      unidad_control: '',
      stock_sugerido_inicial: '',
      activo: 'S'
    };
  }

  private obtenerFechaHoy(): string {
    const hoy = new Date();
    const year = hoy.getFullYear();
    const month = String(hoy.getMonth() + 1).padStart(2, '0');
    const day = String(hoy.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private normalizarTexto(valor: string): string {
    return valor
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  private obtenerMensajeError(error: any, mensajeDefecto: string): string {
    const errores = error?.error;

    if (typeof errores === 'object' && errores !== null) {
      const primerValor = Object.values(errores)[0];

      if (Array.isArray(primerValor) && primerValor.length > 0) {
        return String(primerValor[0]);
      }

      if (primerValor) {
        return String(primerValor);
      }
    }

    return error?.error?.detail || mensajeDefecto;
  }
}