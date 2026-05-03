import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable, of, switchMap } from 'rxjs';
import {
  InsumoCatalogo,
  Jornada,
  NuevaProduccion,
  NuevoTipoProduccion,
  ProduccionRegistro,
  ProduccionService,
  TipoProduccion,
  Turno
} from '../../features/produccion/services/produccion.service';

interface FormularioProduccion {
  fecha_produccion: string;
  id_tipo_produccion: number;
  id_turno: number;
  quintales: string | number;
}

@Component({
  selector: 'app-produccion',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './produccion.html',
  styleUrl: './produccion.scss'
})
export class ProduccionComponent implements OnInit {
  private produccionService = inject(ProduccionService);

  producciones = signal<ProduccionRegistro[]>([]);
  tiposProduccion = signal<TipoProduccion[]>([]);
  jornadas = signal<Jornada[]>([]);
  turnos = signal<Turno[]>([]);
  insumos = signal<InsumoCatalogo[]>([]);

  cargando = signal<boolean>(false);
  guardandoProduccion = signal<boolean>(false);
  guardandoTipo = signal<boolean>(false);
  actualizandoTipo = signal<boolean>(false);

  mensajeError = signal<string>('');
  mensajeExito = signal<string>('');
  mensajeErrorTipo = signal<string>('');
  mensajeErrorGestionTipos = signal<string>('');
  mensajeExitoGestionTipos = signal<string>('');

  fechaSeleccionada = '';
  turnoSeleccionado = '';
  tiposSeleccionados: number[] = [];

  modalProduccionAbierto = false;
  modalTipoAbierto = false;
  modalGestionTiposAbierto = false;

  idTipoEditando: number | null = null;

  formularioProduccion: FormularioProduccion = {
    fecha_produccion: this.obtenerFechaHoy(),
    id_tipo_produccion: 0,
    id_turno: 0,
    quintales: ''
  };

  formularioTipo: NuevoTipoProduccion = {
    nombre_tipo_produccion: '',
    id_insumo_principal: null
  };

  formularioEditarTipo: NuevoTipoProduccion = {
    nombre_tipo_produccion: '',
    id_insumo_principal: null
  };

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  get produccionesFiltradas(): ProduccionRegistro[] {
  const fecha = this.fechaSeleccionada.trim();
  const turno = this.normalizarTexto(this.turnoSeleccionado.trim());

  return this.producciones()
    .filter((produccion) => {
      const coincideFecha =
        !fecha ||
        produccion.jornada_fecha === fecha;

      const coincideTipo =
        this.tiposSeleccionados.length === 0 ||
        this.tiposSeleccionados.includes(Number(produccion.id_tipo_produccion));

      const coincideTurno =
        !turno ||
        this.normalizarTexto(produccion.turno_nombre ?? '') === turno;

      return coincideFecha && coincideTipo && coincideTurno;
    })
    .sort((a, b) => {
      const comparacionFecha = b.jornada_fecha.localeCompare(a.jornada_fecha);

      if (comparacionFecha !== 0) {
        return comparacionFecha;
      }

      return Number(b.id_produccion) - Number(a.id_produccion);
    });
}

  get todosLosTiposActivos(): boolean {
    return this.tiposSeleccionados.length === 0;
  }

  get turnosFormulario(): Turno[] {
    return this.turnos().filter((turno) => {
      const nombre = this.normalizarTexto(turno.nombre_turno);
      return nombre !== 'pruebapermiso';
    });
  }

  get insumosActivos(): InsumoCatalogo[] {
    return this.insumos().filter((insumo) => insumo.activo === 'S');
  }

  cargarDatosIniciales(): void {
    this.cargando.set(true);
    this.mensajeError.set('');
    this.mensajeExito.set('');

    let pendientes = 5;

    const finalizar = () => {
      pendientes -= 1;
      if (pendientes === 0) {
        this.cargando.set(false);
      }
    };

    this.produccionService.listarProducciones().subscribe({
      next: (data) => {
        this.producciones.set(data);
        finalizar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar los registros de producción.');
        finalizar();
      }
    });

    this.produccionService.listarTiposProduccion().subscribe({
      next: (data) => {
        this.tiposProduccion.set(data);
        finalizar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar los tipos de producción.');
        finalizar();
      }
    });

    this.produccionService.listarJornadas().subscribe({
      next: (data) => {
        this.jornadas.set(data);
        finalizar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar las jornadas.');
        finalizar();
      }
    });

    this.produccionService.listarTurnos().subscribe({
      next: (data) => {
        this.turnos.set(data);
        finalizar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar los turnos.');
        finalizar();
      }
    });

    this.produccionService.listarInsumos().subscribe({
      next: (data) => {
        this.insumos.set(data);
        finalizar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar los insumos.');
        finalizar();
      }
    });
  }

  abrirModalProduccion(): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.modalProduccionAbierto = true;
    this.reiniciarFormularioProduccion();
  }

  cerrarModalProduccion(): void {
    if (this.guardandoProduccion()) {
      return;
    }

    this.modalProduccionAbierto = false;
    this.reiniciarFormularioProduccion();
  }

  abrirModalTipo(): void {
    this.mensajeErrorTipo.set('');
    this.modalTipoAbierto = true;
    this.reiniciarFormularioTipo();
  }

  cerrarModalTipo(): void {
    if (this.guardandoTipo()) {
      return;
    }

    this.modalTipoAbierto = false;
    this.reiniciarFormularioTipo();
  }

  abrirGestionTipos(): void {
    this.mensajeErrorGestionTipos.set('');
    this.mensajeExitoGestionTipos.set('');
    this.idTipoEditando = null;
    this.reiniciarFormularioEditarTipo();
    this.modalGestionTiposAbierto = true;
  }

  cerrarGestionTipos(): void {
    if (this.actualizandoTipo()) {
      return;
    }

    this.modalGestionTiposAbierto = false;
    this.idTipoEditando = null;
    this.reiniciarFormularioEditarTipo();
  }

  mostrarTodosLosTipos(): void {
    this.tiposSeleccionados = [];
  }

  tipoEstaSeleccionado(idTipoProduccion: number): boolean {
    return this.tiposSeleccionados.includes(Number(idTipoProduccion));
  }

  alternarTipoProduccion(idTipoProduccion: number): void {
    const id = Number(idTipoProduccion);

    if (this.tiposSeleccionados.includes(id)) {
      this.tiposSeleccionados = this.tiposSeleccionados.filter((tipoId) => tipoId !== id);
      return;
    }

    this.tiposSeleccionados = [...this.tiposSeleccionados, id];
  }

  guardarProduccion(): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');

    if (!this.formularioProduccion.fecha_produccion) {
      this.mensajeError.set('Debes seleccionar una fecha de producción.');
      return;
    }

    if (!this.formularioProduccion.id_tipo_produccion) {
      this.mensajeError.set('Debes seleccionar un tipo de producción.');
      return;
    }

    if (!this.formularioProduccion.id_turno) {
      this.mensajeError.set('Debes seleccionar un turno.');
      return;
    }

    if (
      this.formularioProduccion.quintales === '' ||
      Number(this.formularioProduccion.quintales) < 0
    ) {
      this.mensajeError.set('Debes ingresar una cantidad de quintales válida.');
      return;
    }

    this.guardandoProduccion.set(true);

    this.obtenerOCrearJornada(this.formularioProduccion.fecha_produccion)
      .pipe(
        switchMap((jornada) => {
          const payload: NuevaProduccion = {
            id_jornada: jornada.id_jornada,
            id_tipo_produccion: this.formularioProduccion.id_tipo_produccion,
            id_turno: this.formularioProduccion.id_turno,
            quintales: this.formularioProduccion.quintales
          };

          return this.produccionService.crearProduccion(payload);
        })
      )
      .subscribe({
        next: () => {
          this.guardandoProduccion.set(false);
          this.modalProduccionAbierto = false;
          this.reiniciarFormularioProduccion();
          this.mensajeExito.set('Registro de producción guardado correctamente.');
          this.recargarProducciones();
          this.recargarJornadas();
        },
        error: (error: any) => {
          this.guardandoProduccion.set(false);
          this.mensajeError.set(
            this.obtenerMensajeError(error, 'No se pudo guardar el registro de producción.')
          );
        }
      });
  }

  guardarTipoProduccion(): void {
    this.mensajeErrorTipo.set('');
    this.mensajeExito.set('');

    if (!this.formularioTipo.nombre_tipo_produccion.trim()) {
      this.mensajeErrorTipo.set('Debes ingresar el nombre del tipo de producción.');
      return;
    }

    this.guardandoTipo.set(true);

    const payload: NuevoTipoProduccion = {
      nombre_tipo_produccion: this.formularioTipo.nombre_tipo_produccion.trim(),
      id_insumo_principal: this.formularioTipo.id_insumo_principal || null
    };

    this.produccionService.crearTipoProduccion(payload).subscribe({
      next: (tipoCreado: TipoProduccion) => {
        this.guardandoTipo.set(false);
        this.modalTipoAbierto = false;
        this.reiniciarFormularioTipo();
        this.mensajeExito.set('Tipo de producción creado correctamente.');
        this.recargarTiposProduccion(tipoCreado.id_tipo_produccion);
      },
      error: (error: any) => {
        this.guardandoTipo.set(false);
        this.mensajeErrorTipo.set(
          this.obtenerMensajeError(error, 'No se pudo crear el tipo de producción.')
        );
      }
    });
  }

  editarTipo(tipo: TipoProduccion): void {
    this.idTipoEditando = tipo.id_tipo_produccion;

    this.formularioEditarTipo = {
      nombre_tipo_produccion: tipo.nombre_tipo_produccion,
      id_insumo_principal: tipo.id_insumo_principal ?? null
    };

    this.mensajeErrorGestionTipos.set('');
    this.mensajeExitoGestionTipos.set('');
  }

  cancelarEdicionTipo(): void {
    this.idTipoEditando = null;
    this.reiniciarFormularioEditarTipo();
  }

  guardarEdicionTipo(): void {
    this.mensajeErrorGestionTipos.set('');
    this.mensajeExitoGestionTipos.set('');

    if (!this.idTipoEditando) {
      this.mensajeErrorGestionTipos.set('Debes seleccionar un tipo para editar.');
      return;
    }

    if (!String(this.formularioEditarTipo.nombre_tipo_produccion ?? '').trim()) {
      this.mensajeErrorGestionTipos.set('El nombre del tipo de producción es obligatorio.');
      return;
    }

    const payload: NuevoTipoProduccion = {
      nombre_tipo_produccion: String(this.formularioEditarTipo.nombre_tipo_produccion).trim(),
      id_insumo_principal: this.formularioEditarTipo.id_insumo_principal || null
    };

    this.actualizandoTipo.set(true);

    this.produccionService.actualizarTipoProduccion(this.idTipoEditando, payload).subscribe({
      next: () => {
        this.actualizandoTipo.set(false);
        this.idTipoEditando = null;
        this.reiniciarFormularioEditarTipo();
        this.mensajeExitoGestionTipos.set('Tipo de producción actualizado correctamente.');
        this.recargarTiposProduccion();
        this.recargarProducciones();
      },
      error: (error: any) => {
        this.actualizandoTipo.set(false);
        this.mensajeErrorGestionTipos.set(
          this.obtenerMensajeError(error, 'No se pudo actualizar el tipo de producción.')
        );
      }
    });
  }

  recargarProducciones(): void {
    this.produccionService.listarProducciones().subscribe({
      next: (data) => this.producciones.set(data),
      error: () => {
        this.mensajeError.set('Se guardó, pero no se pudo recargar la tabla.');
      }
    });
  }

  recargarTiposProduccion(idTipoSeleccionar?: number): void {
    this.produccionService.listarTiposProduccion().subscribe({
      next: (data) => {
        this.tiposProduccion.set(data);

        const tipoSeleccionado = data.find(
          (tipo) => tipo.id_tipo_produccion === idTipoSeleccionar
        );

        if (tipoSeleccionado) {
          this.formularioProduccion.id_tipo_produccion = tipoSeleccionado.id_tipo_produccion;
        }
      },
      error: () => {
        this.mensajeError.set('No se pudo recargar la lista de tipos de producción.');
      }
    });
  }

  recargarJornadas(): void {
    this.produccionService.listarJornadas().subscribe({
      next: (data) => this.jornadas.set(data),
      error: () => {
        this.mensajeError.set('No se pudo recargar la lista de jornadas.');
      }
    });
  }

  limpiarFiltros(): void {
    this.fechaSeleccionada = '';
    this.tiposSeleccionados = [];
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

  formatearQuintales(valor: string | number): string {
    const numero = Number(valor);
    if (Number.isNaN(numero)) {
      return String(valor);
    }

    return numero.toLocaleString('es-CL', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  obtenerNombreInsumoPrincipal(tipo: TipoProduccion): string {
    return tipo.insumo_principal_nombre || '-';
  }

  private obtenerOCrearJornada(fecha: string): Observable<Jornada> {
    const jornadaExistente = this.jornadas().find((jornada) => jornada.fecha === fecha);

    if (jornadaExistente) {
      return of(jornadaExistente);
    }

    return this.produccionService.crearJornada({ fecha });
  }

  private reiniciarFormularioProduccion(): void {
    this.formularioProduccion = {
      fecha_produccion: this.obtenerFechaHoy(),
      id_tipo_produccion: 0,
      id_turno: 0,
      quintales: ''
    };
  }

  private reiniciarFormularioTipo(): void {
    this.formularioTipo = {
      nombre_tipo_produccion: '',
      id_insumo_principal: null
    };
  }

  private reiniciarFormularioEditarTipo(): void {
    this.formularioEditarTipo = {
      nombre_tipo_produccion: '',
      id_insumo_principal: null
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

export { ProduccionComponent as Produccion };