import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../core/services/auth.service';
import {
  ActualizarCliente,
  Cliente,
  Distribucion,
  NuevoCliente,
  NuevaDistribucion,
  NuevoPedido,
  NuevoProducto,
  PedidosDespachoService,
  Pedido,
  Producto,
  TipoProduccion,
  UnidadMedida
} from '../../features/pedidos-despacho/services/pedidos-despacho.service';

interface DetalleCalculable {
  cantidad_solicitada: string | number;
  precio_cobrado: string | number;
  descuento_porcentaje_aplicado?: string | number;
}

interface DetallePendiente extends DetalleCalculable {
  id_producto: number;
  producto_nombre: string;
  unidad_medida: UnidadMedida;
  descuento_porcentaje_aplicado: string | number;
}

interface FormularioDetalle {
  id_producto: number;
  cantidad_solicitada: string | number;
  unidad_medida: UnidadMedida;
  precio_cobrado: string | number;
  descuento_porcentaje_aplicado: string | number;
}

@Component({
  selector: 'app-pedidos-despacho',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './pedidos-despacho.html',
  styleUrl: './pedidos-despacho.scss'
})
export class PedidosDespachoComponent implements OnInit {
  private pedidosService = inject(PedidosDespachoService);
  private authService = inject(AuthService);

  pedidos = signal<Pedido[]>([]);
  clientes = signal<Cliente[]>([]);
  productos = signal<Producto[]>([]);
  distribuciones = signal<Distribucion[]>([]);
  tiposProduccion = signal<TipoProduccion[]>([]);

  cargando = signal<boolean>(false);
  guardandoPedido = signal<boolean>(false);
  guardandoCliente = signal<boolean>(false);
  guardandoProducto = signal<boolean>(false);
  guardandoDistribucion = signal<boolean>(false);
  actualizandoCliente = signal<boolean>(false);
  eliminandoCliente = signal<boolean>(false);

  mensajeError = signal<string>('');
  mensajeExito = signal<string>('');
  mensajeErrorCliente = signal<string>('');
  mensajeErrorProducto = signal<string>('');
  mensajeErrorDistribucion = signal<string>('');
  mensajeErrorGestionClientes = signal<string>('');
  mensajeExitoGestionClientes = signal<string>('');

  textoBusqueda = '';
  distribucionSeleccionada = '';

  modalPedidoAbierto = false;
  modalClienteAbierto = false;
  modalProductoAbierto = false;
  modalDistribucionAbierto = false;
  modalGestionClientesAbierto = false;
  modalConfirmarEliminarClienteAbierto = false;

  idClienteEditando: number | null = null;
  clientePendienteEliminar: Cliente | null = null;
  textoConfirmacionEliminar = '';

  formularioPedido: NuevoPedido = {
    fecha_pedido: this.obtenerFechaHoy(),
    fecha_entrega_solicitada: this.obtenerFechaHoy(),
    id_cliente: 0,
    id_distribucion: 0
  };

  formularioDetalle: FormularioDetalle = {
    id_producto: 0,
    cantidad_solicitada: '',
    unidad_medida: 'KILO',
    precio_cobrado: '',
    descuento_porcentaje_aplicado: ''
  };

  detallesPendientes: DetallePendiente[] = [];

  formularioCliente: NuevoCliente = {
    rut: '',
    digito_verificador: '',
    nombre_cliente: '',
    ciudad: '',
    direccion: '',
    telefono: '',
    descuento_aplicado: 0
  };

  formularioEditarCliente: ActualizarCliente = {
    rut: '',
    digito_verificador: '',
    nombre_cliente: '',
    ciudad: '',
    direccion: '',
    telefono: '',
    descuento_aplicado: 0
  };

  formularioProducto: NuevoProducto = {
    nombre_producto: '',
    precio_sugerido: '',
    unidad_venta_base: 'KILO',
    id_tipo_produccion: null
  };

  formularioDistribucion: NuevaDistribucion = {
    nombre_distribucion: ''
  };

  ngOnInit(): void {
    this.cargarDatosIniciales();
  }

  get esAdmin(): boolean {
    return this.authService.esAdministrador();
  }

  get pedidosFiltrados(): Pedido[] {
    const texto = this.normalizarTexto(this.textoBusqueda.trim());

    return this.pedidos().filter((pedido) => {
      const nombresProductos = pedido.detalles
        ?.map((detalle) => detalle.producto_nombre)
        .join(' ') ?? '';

      const coincideTexto =
        !texto ||
        this.normalizarTexto(pedido.cliente_nombre).includes(texto) ||
        this.normalizarTexto(this.formatearDistribucion(pedido.distribucion_nombre)).includes(texto) ||
        this.normalizarTexto(nombresProductos).includes(texto);

      const coincideDistribucion = this.coincideDistribucion(
        pedido.distribucion_nombre,
        this.distribucionSeleccionada
      );

      return coincideTexto && coincideDistribucion;
    });
  }

  get distribucionesFormulario(): Distribucion[] {
    const existeSalaDeVentas = this.distribuciones().some((distribucion) =>
      this.esSalaDeVentas(distribucion.nombre_distribucion)
    );

    return this.distribuciones().filter((distribucion) => {
      if (existeSalaDeVentas && this.esRetiroPanaderia(distribucion.nombre_distribucion)) {
        return false;
      }

      return true;
    });
  }

  get opcionesUnidadDetalle(): UnidadMedida[] {
    const producto = this.obtenerProductoPorId(this.formularioDetalle.id_producto);

    if (!producto) {
      return ['KILO'];
    }

    return this.obtenerUnidadesPermitidas(producto);
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

    this.pedidosService.listarPedidos().subscribe({
      next: (data) => {
        this.pedidos.set(data);
        finalizar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar los pedidos.');
        finalizar();
      }
    });

    this.pedidosService.listarClientes().subscribe({
      next: (data) => {
        this.clientes.set(data);
        finalizar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar los clientes.');
        finalizar();
      }
    });

    this.pedidosService.listarProductos().subscribe({
      next: (data) => {
        this.productos.set(data);
        finalizar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar los productos.');
        finalizar();
      }
    });

    this.pedidosService.listarDistribuciones().subscribe({
      next: (data) => {
        this.distribuciones.set(data);
        finalizar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar las distribuciones.');
        finalizar();
      }
    });

    this.pedidosService.listarTiposProduccion().subscribe({
      next: (data) => {
        this.tiposProduccion.set(data);
        finalizar();
      },
      error: () => {
        this.mensajeError.set('No se pudieron cargar los tipos de producción.');
        finalizar();
      }
    });
  }

  abrirModalPedido(): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');
    this.modalPedidoAbierto = true;
    this.reiniciarFormularioPedido();
    this.reiniciarFormularioDetalle();
    this.detallesPendientes = [];
  }

  cerrarModalPedido(): void {
    if (this.guardandoPedido()) {
      return;
    }

    this.modalPedidoAbierto = false;
    this.reiniciarFormularioPedido();
    this.reiniciarFormularioDetalle();
    this.detallesPendientes = [];
  }

  abrirModalCliente(): void {
    if (!this.esAdmin) {
      this.mensajeError.set('Solo el Administrador puede crear clientes.');
      return;
    }

    this.mensajeErrorCliente.set('');
    this.modalClienteAbierto = true;
    this.reiniciarFormularioCliente();
  }

  cerrarModalCliente(): void {
    if (this.guardandoCliente()) {
      return;
    }

    this.modalClienteAbierto = false;
    this.reiniciarFormularioCliente();
  }

  abrirModalProducto(): void {
    if (!this.esAdmin) {
      this.mensajeError.set('Solo el Administrador puede crear productos.');
      return;
    }

    this.mensajeErrorProducto.set('');
    this.modalProductoAbierto = true;
    this.reiniciarFormularioProducto();
  }

  cerrarModalProducto(): void {
    if (this.guardandoProducto()) {
      return;
    }

    this.modalProductoAbierto = false;
    this.reiniciarFormularioProducto();
  }

  abrirModalDistribucion(): void {
    if (!this.esAdmin) {
      this.mensajeError.set('Solo el Administrador puede crear distribuciones.');
      return;
    }

    this.mensajeErrorDistribucion.set('');
    this.modalDistribucionAbierto = true;
    this.reiniciarFormularioDistribucion();
  }

  cerrarModalDistribucion(): void {
    if (this.guardandoDistribucion()) {
      return;
    }

    this.modalDistribucionAbierto = false;
    this.reiniciarFormularioDistribucion();
  }

  abrirGestionClientes(): void {
    if (!this.esAdmin) {
      this.mensajeError.set('Solo el Administrador puede gestionar clientes.');
      return;
    }

    this.mensajeErrorGestionClientes.set('');
    this.mensajeExitoGestionClientes.set('');
    this.idClienteEditando = null;
    this.clientePendienteEliminar = null;
    this.textoConfirmacionEliminar = '';
    this.reiniciarFormularioEditarCliente();
    this.modalGestionClientesAbierto = true;
  }

  cerrarGestionClientes(): void {
    if (this.actualizandoCliente() || this.eliminandoCliente()) {
      return;
    }

    this.modalGestionClientesAbierto = false;
    this.idClienteEditando = null;
    this.clientePendienteEliminar = null;
    this.textoConfirmacionEliminar = '';
    this.reiniciarFormularioEditarCliente();
  }

  editarCliente(cliente: Cliente): void {
    this.idClienteEditando = cliente.id_cliente;

    this.formularioEditarCliente = {
      rut: cliente.rut,
      digito_verificador: cliente.digito_verificador,
      nombre_cliente: cliente.nombre_cliente,
      ciudad: cliente.ciudad,
      direccion: cliente.direccion,
      telefono: cliente.telefono,
      descuento_aplicado: cliente.descuento_aplicado
    };

    this.mensajeErrorGestionClientes.set('');
    this.mensajeExitoGestionClientes.set('');
  }

  cancelarEdicionCliente(): void {
    this.idClienteEditando = null;
    this.reiniciarFormularioEditarCliente();
  }

  guardarEdicionCliente(): void {
    if (!this.esAdmin) {
      this.mensajeErrorGestionClientes.set('Solo el Administrador puede editar clientes.');
      return;
    }

    this.mensajeErrorGestionClientes.set('');
    this.mensajeExitoGestionClientes.set('');

    const mensajeValidacion = this.validarDatosCliente(
      this.formularioEditarCliente,
      this.idClienteEditando
    );

    if (mensajeValidacion) {
      this.mensajeErrorGestionClientes.set(mensajeValidacion);
      return;
    }

    if (!this.idClienteEditando) {
      this.mensajeErrorGestionClientes.set('Debes seleccionar un cliente para editar.');
      return;
    }

    const payload: ActualizarCliente = this.construirPayloadCliente(this.formularioEditarCliente);

    this.actualizandoCliente.set(true);

    this.pedidosService.actualizarCliente(this.idClienteEditando, payload).subscribe({
      next: () => {
        this.actualizandoCliente.set(false);
        this.idClienteEditando = null;
        this.reiniciarFormularioEditarCliente();
        this.mensajeExitoGestionClientes.set('Cliente actualizado correctamente.');
        this.recargarClientes();
        this.recargarPedidos();
      },
      error: (error: any) => {
        this.actualizandoCliente.set(false);
        this.mensajeErrorGestionClientes.set(
          this.obtenerMensajeError(error, 'No se pudo actualizar el cliente')
        );
      }
    });
  }

  abrirConfirmacionEliminarCliente(cliente: Cliente): void {
    this.mensajeErrorGestionClientes.set('');
    this.mensajeExitoGestionClientes.set('');

    if (this.clienteTienePedidos(cliente)) {
      this.mensajeErrorGestionClientes.set(
        'No se puede eliminar este cliente porque tiene pedidos asociados. Puedes editar sus datos.'
      );
      return;
    }

    this.clientePendienteEliminar = cliente;
    this.textoConfirmacionEliminar = '';
    this.modalConfirmarEliminarClienteAbierto = true;
  }

  cerrarConfirmacionEliminarCliente(): void {
    if (this.eliminandoCliente()) {
      return;
    }

    this.modalConfirmarEliminarClienteAbierto = false;
    this.clientePendienteEliminar = null;
    this.textoConfirmacionEliminar = '';
  }

  puedeConfirmarEliminacion(): boolean {
    if (!this.clientePendienteEliminar) {
      return false;
    }

    return this.textoConfirmacionEliminar.trim() === this.clientePendienteEliminar.nombre_cliente;
  }

  confirmarEliminarCliente(): void {
    if (!this.esAdmin) {
      this.mensajeErrorGestionClientes.set('Solo el Administrador puede eliminar clientes.');
      return;
    }

    if (!this.clientePendienteEliminar) {
      return;
    }

    if (!this.puedeConfirmarEliminacion()) {
      this.mensajeErrorGestionClientes.set(
        'Para eliminar, debes escribir exactamente el nombre del cliente.'
      );
      return;
    }

    if (this.clienteTienePedidos(this.clientePendienteEliminar)) {
      this.mensajeErrorGestionClientes.set(
        'No se puede eliminar este cliente porque tiene pedidos asociados. Puedes editar sus datos.'
      );
      this.cerrarConfirmacionEliminarCliente();
      return;
    }

    const idCliente = this.clientePendienteEliminar.id_cliente;

    this.eliminandoCliente.set(true);

    this.pedidosService.eliminarCliente(idCliente).subscribe({
      next: () => {
        this.eliminandoCliente.set(false);
        this.modalConfirmarEliminarClienteAbierto = false;
        this.clientePendienteEliminar = null;
        this.textoConfirmacionEliminar = '';
        this.mensajeExitoGestionClientes.set('Cliente eliminado correctamente.');

        if (this.formularioPedido.id_cliente === idCliente) {
          this.formularioPedido.id_cliente = 0;
        }

        this.recargarClientes();
        this.recargarPedidos();
      },
      error: (error: any) => {
        this.eliminandoCliente.set(false);
        this.mensajeErrorGestionClientes.set(
          this.obtenerMensajeError(
            error,
            'No se pudo eliminar el cliente. Puede tener pedidos asociados'
          )
        );
      }
    });
  }

  clienteTienePedidos(cliente: Cliente): boolean {
    return this.pedidos().some((pedido) => pedido.id_cliente === cliente.id_cliente);
  }

  cantidadPedidosCliente(cliente: Cliente): number {
    return this.pedidos().filter((pedido) => pedido.id_cliente === cliente.id_cliente).length;
  }

  alCambiarCliente(): void {
    this.recalcularPrecioDetalle();
  }

  alCambiarProducto(): void {
    const producto = this.obtenerProductoPorId(this.formularioDetalle.id_producto);

    if (!producto) {
      this.reiniciarFormularioDetalle();
      return;
    }

    const unidadesPermitidas = this.obtenerUnidadesPermitidas(producto);
    this.formularioDetalle.unidad_medida = unidadesPermitidas[0];

    this.recalcularPrecioDetalle();
  }

  alCambiarUnidad(): void {
    this.recalcularPrecioDetalle();
  }

  alCambiarDescuento(): void {
    if (!this.esAdmin) {
      return;
    }

    this.recalcularPrecioDetalle();
  }

  agregarDetalle(): void {
    this.mensajeError.set('');

    if (!this.formularioDetalle.id_producto) {
      this.mensajeError.set('Debes seleccionar un producto.');
      return;
    }

    if (
      this.formularioDetalle.cantidad_solicitada === '' ||
      Number(this.formularioDetalle.cantidad_solicitada) <= 0
    ) {
      this.mensajeError.set('Debes ingresar una cantidad válida.');
      return;
    }

    const producto = this.obtenerProductoPorId(this.formularioDetalle.id_producto);

    if (!producto) {
      this.mensajeError.set('El producto seleccionado no existe.');
      return;
    }

    const unidadesPermitidas = this.obtenerUnidadesPermitidas(producto);

    if (!unidadesPermitidas.includes(this.formularioDetalle.unidad_medida)) {
      this.formularioDetalle.unidad_medida = unidadesPermitidas[0];
      this.recalcularPrecioDetalle();
    }

    if (!this.esAdmin || this.formularioDetalle.precio_cobrado === '') {
      this.recalcularPrecioDetalle();
    }

    if (
      this.formularioDetalle.precio_cobrado === '' ||
      Number(this.formularioDetalle.precio_cobrado) < 0
    ) {
      this.mensajeError.set('No se pudo calcular un precio válido para el detalle.');
      return;
    }

    this.detallesPendientes.push({
      id_producto: producto.id_producto,
      producto_nombre: producto.nombre_producto,
      cantidad_solicitada: this.formularioDetalle.cantidad_solicitada,
      unidad_medida: this.formularioDetalle.unidad_medida,
      precio_cobrado: this.formularioDetalle.precio_cobrado,
      descuento_porcentaje_aplicado:
        this.formularioDetalle.descuento_porcentaje_aplicado || 0
    });

    this.reiniciarFormularioDetalle();
  }

  quitarDetalle(indice: number): void {
    this.detallesPendientes.splice(indice, 1);
  }

  guardarPedido(): void {
    this.mensajeError.set('');
    this.mensajeExito.set('');

    if (!this.formularioPedido.fecha_pedido) {
      this.mensajeError.set('Debes seleccionar la fecha del pedido.');
      return;
    }

    if (!this.formularioPedido.fecha_entrega_solicitada) {
      this.mensajeError.set('Debes seleccionar la fecha de entrega.');
      return;
    }

    if (!this.formularioPedido.id_cliente) {
      this.mensajeError.set('Debes seleccionar un cliente.');
      return;
    }

    if (!this.formularioPedido.id_distribucion) {
      this.mensajeError.set('Debes seleccionar una distribución.');
      return;
    }

    if (this.detallesPendientes.length === 0) {
      this.mensajeError.set('Debes agregar al menos un detalle al pedido.');
      return;
    }

    this.guardandoPedido.set(true);

    const pedidoPayload: NuevoPedido = {
      fecha_pedido: this.formularioPedido.fecha_pedido,
      fecha_entrega_solicitada: this.formularioPedido.fecha_entrega_solicitada,
      id_cliente: this.formularioPedido.id_cliente,
      id_distribucion: this.formularioPedido.id_distribucion
    };

    const detallesPayload = this.detallesPendientes.map((detalle) => ({
      cantidad_solicitada: detalle.cantidad_solicitada,
      unidad_medida: detalle.unidad_medida,
      precio_cobrado: detalle.precio_cobrado,
      descuento_porcentaje_aplicado: detalle.descuento_porcentaje_aplicado,
      id_producto: detalle.id_producto
    }));

    this.pedidosService.crearPedidoConDetalles(pedidoPayload, detallesPayload).subscribe({
      next: () => {
        this.guardandoPedido.set(false);
        this.modalPedidoAbierto = false;
        this.reiniciarFormularioPedido();
        this.reiniciarFormularioDetalle();
        this.detallesPendientes = [];
        this.mensajeExito.set('Pedido guardado correctamente.');
        this.recargarPedidos();
      },
      error: (error: any) => {
        this.guardandoPedido.set(false);
        this.mensajeError.set(
          this.obtenerMensajeError(error, 'No se pudo guardar el pedido')
        );
      }
    });
  }

  guardarCliente(): void {
    if (!this.esAdmin) {
      this.mensajeErrorCliente.set('Solo el Administrador puede crear clientes.');
      return;
    }

    this.mensajeErrorCliente.set('');

    const mensajeValidacion = this.validarDatosCliente(this.formularioCliente);

    if (mensajeValidacion) {
      this.mensajeErrorCliente.set(mensajeValidacion);
      return;
    }

    this.guardandoCliente.set(true);

    const payload: NuevoCliente = this.construirPayloadCliente(this.formularioCliente) as NuevoCliente;

    this.pedidosService.crearCliente(payload).subscribe({
      next: (clienteCreado: Cliente) => {
        this.guardandoCliente.set(false);
        this.modalClienteAbierto = false;
        this.reiniciarFormularioCliente();
        this.recargarClientes(clienteCreado.id_cliente);
      },
      error: (error: any) => {
        this.guardandoCliente.set(false);
        this.mensajeErrorCliente.set(
          this.obtenerMensajeError(error, 'No se pudo crear el cliente')
        );
      }
    });
  }

  guardarProducto(): void {
    if (!this.esAdmin) {
      this.mensajeErrorProducto.set('Solo el Administrador puede crear productos.');
      return;
    }

    this.mensajeErrorProducto.set('');

    if (!this.formularioProducto.nombre_producto.trim()) {
      this.mensajeErrorProducto.set('Debes ingresar el nombre del producto.');
      return;
    }

    if (
      this.formularioProducto.precio_sugerido === '' ||
      Number(this.formularioProducto.precio_sugerido) < 0
    ) {
      this.mensajeErrorProducto.set('Debes ingresar un precio sugerido válido.');
      return;
    }

    this.guardandoProducto.set(true);

    const payload: NuevoProducto = {
      nombre_producto: this.formularioProducto.nombre_producto.trim(),
      precio_sugerido: this.formularioProducto.precio_sugerido,
      unidad_venta_base: this.formularioProducto.unidad_venta_base,
      id_tipo_produccion: this.formularioProducto.id_tipo_produccion || null
    };

    this.pedidosService.crearProducto(payload).subscribe({
      next: (productoCreado: Producto) => {
        this.guardandoProducto.set(false);
        this.modalProductoAbierto = false;
        this.reiniciarFormularioProducto();
        this.recargarProductos(productoCreado.id_producto);
      },
      error: (error: any) => {
        this.guardandoProducto.set(false);
        this.mensajeErrorProducto.set(
          this.obtenerMensajeError(error, 'No se pudo crear el producto')
        );
      }
    });
  }

  guardarDistribucion(): void {
    if (!this.esAdmin) {
      this.mensajeErrorDistribucion.set('Solo el Administrador puede crear distribuciones.');
      return;
    }

    this.mensajeErrorDistribucion.set('');

    if (!this.formularioDistribucion.nombre_distribucion.trim()) {
      this.mensajeErrorDistribucion.set('Debes ingresar el nombre de la distribución.');
      return;
    }

    this.guardandoDistribucion.set(true);

    const payload: NuevaDistribucion = {
      nombre_distribucion: this.formularioDistribucion.nombre_distribucion.trim()
    };

    this.pedidosService.crearDistribucion(payload).subscribe({
      next: (distribucionCreada: Distribucion) => {
        this.guardandoDistribucion.set(false);
        this.modalDistribucionAbierto = false;
        this.reiniciarFormularioDistribucion();
        this.recargarDistribuciones(distribucionCreada.id_distribucion);
      },
      error: (error: any) => {
        this.guardandoDistribucion.set(false);
        this.mensajeErrorDistribucion.set(
          this.obtenerMensajeError(error, 'No se pudo crear la distribución')
        );
      }
    });
  }

  recargarPedidos(): void {
    this.pedidosService.listarPedidos().subscribe({
      next: (data) => this.pedidos.set(data),
      error: () => this.mensajeError.set('Se guardó, pero no se pudo recargar la tabla.')
    });
  }

  recargarClientes(idClienteSeleccionar?: number): void {
    this.pedidosService.listarClientes().subscribe({
      next: (data) => {
        this.clientes.set(data);

        if (idClienteSeleccionar) {
          this.formularioPedido.id_cliente = idClienteSeleccionar;
          this.recalcularPrecioDetalle();
        }
      },
      error: () => this.mensajeError.set('No se pudo recargar la lista de clientes.')
    });
  }

  recargarProductos(idProductoSeleccionar?: number): void {
    this.pedidosService.listarProductos().subscribe({
      next: (data) => {
        this.productos.set(data);

        if (idProductoSeleccionar) {
          this.formularioDetalle.id_producto = idProductoSeleccionar;
          this.alCambiarProducto();
        }
      },
      error: () => this.mensajeError.set('No se pudo recargar la lista de productos.')
    });
  }

  recargarDistribuciones(idDistribucionSeleccionar?: number): void {
    this.pedidosService.listarDistribuciones().subscribe({
      next: (data) => {
        this.distribuciones.set(data);

        if (idDistribucionSeleccionar) {
          this.formularioPedido.id_distribucion = idDistribucionSeleccionar;
        }
      },
      error: () => this.mensajeError.set('No se pudo recargar la lista de distribuciones.')
    });
  }

  limpiarFiltros(): void {
    this.textoBusqueda = '';
    this.distribucionSeleccionada = '';
  }

  calcularTotalPedido(pedido: Pedido): number {
    return (pedido.detalles ?? []).reduce((total, detalle) => {
      return total + this.calcularTotalDetalle(detalle);
    }, 0);
  }

  calcularTotalDetalle(detalle: DetalleCalculable): number {
    const cantidad = Number(detalle.cantidad_solicitada);
    const precioFinalUnitario = Number(detalle.precio_cobrado);

    if (Number.isNaN(cantidad) || Number.isNaN(precioFinalUnitario)) {
      return 0;
    }

    return cantidad * precioFinalUnitario;
  }

  detalleTieneDescuento(detalle: DetalleCalculable): boolean {
    const descuento = Number(detalle.descuento_porcentaje_aplicado ?? 0);
    return !Number.isNaN(descuento) && descuento > 0;
  }

  pedidoTieneDescuento(pedido: Pedido): boolean {
    return (pedido.detalles ?? []).some((detalle) => this.detalleTieneDescuento(detalle));
  }

  cantidadDetallesConDescuento(pedido: Pedido): number {
    return (pedido.detalles ?? []).filter((detalle) => this.detalleTieneDescuento(detalle)).length;
  }

  obtenerTextoCliente(cliente: Cliente): string {
    if (this.esAdmin) {
      return `${cliente.nombre_cliente} · Desc. ${this.formatearDescuento(cliente.descuento_aplicado)}`;
    }

    return cliente.nombre_cliente;
  }

  obtenerTextoProducto(producto: Producto): string {
    return `${producto.nombre_producto} · ${producto.tipo_produccion_nombre} · ${this.formatearDinero(this.obtenerPrecioReferenciaProducto(producto))}`;
  }

  formatearRut(cliente: Cliente): string {
    return `${cliente.rut}-${String(cliente.digito_verificador).toUpperCase()}`;
  }

  formatearDistribucion(nombre: string): string {
    if (this.esRetiroPanaderia(nombre)) {
      return 'Sala de ventas';
    }

    return nombre;
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

  formatearDescuento(valor: string | number): string {
    const numero = Number(valor);

    if (Number.isNaN(numero) || numero === 0) {
      return '0%';
    }

    return `-${numero.toLocaleString('es-CL', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    })}%`;
  }

  formatearDinero(valor: string | number): string {
    const numero = Number(valor);
    if (Number.isNaN(numero)) {
      return String(valor);
    }

    return numero.toLocaleString('es-CL', {
      style: 'currency',
      currency: 'CLP',
      maximumFractionDigits: 0
    });
  }

  private validarDatosCliente(
    datos: NuevoCliente | ActualizarCliente,
    idClienteIgnorar?: number | null
  ): string {
    const rut = String(datos.rut ?? '').trim();
    const dv = String(datos.digito_verificador ?? '').trim().toUpperCase();
    const nombre = String(datos.nombre_cliente ?? '').trim();
    const ciudad = String(datos.ciudad ?? '').trim();
    const direccion = String(datos.direccion ?? '').trim();
    const telefono = String(datos.telefono ?? '').trim();
    const descuento = Number(datos.descuento_aplicado ?? 0);

    if (!/^\d{8}$/.test(rut)) {
      return 'El RUT debe tener exactamente 8 dígitos numéricos, sin puntos ni dígito verificador.';
    }

    if (!/^[0-9K]$/.test(dv)) {
      return 'El dígito verificador debe ser un número del 0 al 9 o la letra K.';
    }

    const dvCalculado = this.calcularDvRut(rut);

    if (dv !== dvCalculado) {
      return 'El dígito verificador no corresponde al RUT ingresado. Revisa los datos.';
    }

    if (this.existeRutDuplicado(rut, dv, idClienteIgnorar)) {
      return 'Ya existe un cliente registrado con el mismo RUT y dígito verificador.';
    }

    if (nombre.length < 3 || !/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(nombre)) {
      return 'El nombre del cliente debe tener al menos 3 caracteres y contener letras.';
    }

    if (ciudad.length < 3 || !/[a-zA-ZáéíóúÁÉÍÓÚñÑ]/.test(ciudad)) {
      return 'La ciudad debe tener al menos 3 caracteres y contener letras.';
    }

    if (direccion.length < 5 || !/[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9]/.test(direccion)) {
      return 'La dirección debe tener al menos 5 caracteres y contener letras o números.';
    }

    if (!/^\+569\d{8}$/.test(telefono)) {
      return 'El teléfono debe usar formato chileno +569XXXXXXXX. Ejemplo: +56912345678.';
    }

    if (Number.isNaN(descuento) || descuento < 0 || descuento > 100) {
      return 'El descuento debe ser un número entre 0 y 100.';
    }

    return '';
  }

  private construirPayloadCliente(datos: NuevoCliente | ActualizarCliente): ActualizarCliente {
    return {
      rut: Number(String(datos.rut).trim()),
      digito_verificador: String(datos.digito_verificador).trim().toUpperCase(),
      nombre_cliente: String(datos.nombre_cliente).trim(),
      ciudad: String(datos.ciudad).trim(),
      direccion: String(datos.direccion).trim(),
      telefono: String(datos.telefono).trim(),
      descuento_aplicado: Number(datos.descuento_aplicado ?? 0)
    };
  }

  private calcularDvRut(rutSinDv: string): string {
    let suma = 0;
    let multiplicador = 2;

    for (let i = rutSinDv.length - 1; i >= 0; i -= 1) {
      suma += Number(rutSinDv[i]) * multiplicador;
      multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
    }

    const resto = suma % 11;
    const resultado = 11 - resto;

    if (resultado === 11) {
      return '0';
    }

    if (resultado === 10) {
      return 'K';
    }

    return String(resultado);
  }

  private existeRutDuplicado(rut: string, dv: string, idClienteIgnorar?: number | null): boolean {
    return this.clientes().some((cliente) => {
      const mismoRut = String(cliente.rut) === rut;
      const mismoDv = String(cliente.digito_verificador).toUpperCase() === dv;
      const mismoClienteEditado = idClienteIgnorar && cliente.id_cliente === idClienteIgnorar;

      return mismoRut && mismoDv && !mismoClienteEditado;
    });
  }

  private recalcularPrecioDetalle(): void {
    const producto = this.obtenerProductoPorId(this.formularioDetalle.id_producto);
    const cliente = this.obtenerClientePorId(this.formularioPedido.id_cliente);

    if (!producto) {
      return;
    }

    const unidadesPermitidas = this.obtenerUnidadesPermitidas(producto);

    if (!unidadesPermitidas.includes(this.formularioDetalle.unidad_medida)) {
      this.formularioDetalle.unidad_medida = unidadesPermitidas[0];
    }

    const precioBase = this.obtenerPrecioBasePorRegla(
      producto,
      this.formularioDetalle.unidad_medida
    );

    const aplicaDescuento = this.formularioDetalle.unidad_medida === 'KILO';
    let descuento = aplicaDescuento ? Number(cliente?.descuento_aplicado ?? 0) : 0;

    if (this.esAdmin && aplicaDescuento) {
      descuento = Number(this.formularioDetalle.descuento_porcentaje_aplicado || 0);
    }

    if (descuento < 0) {
      descuento = 0;
    }

    if (descuento > 100) {
      descuento = 100;
    }

    if (!aplicaDescuento) {
      descuento = 0;
    }

    const precioFinal = precioBase * (1 - descuento / 100);

    this.formularioDetalle.descuento_porcentaje_aplicado = descuento;
    this.formularioDetalle.precio_cobrado = Number(precioFinal.toFixed(2));
  }

  private obtenerPrecioBasePorRegla(producto: Producto, unidad: UnidadMedida): number {
    if (this.esMoldeIntegral(producto)) {
      return 2000;
    }

    if (this.esPanCorriente(producto) && unidad === 'UNIDAD') {
      return 200;
    }

    return Number(producto.precio_sugerido);
  }

  private obtenerPrecioReferenciaProducto(producto: Producto): number {
    if (this.esMoldeIntegral(producto)) {
      return 2000;
    }

    return Number(producto.precio_sugerido);
  }

  private obtenerUnidadesPermitidas(producto: Producto): UnidadMedida[] {
    if (this.esMoldeIntegral(producto)) {
      return ['UNIDAD'];
    }

    if (this.esPanCorriente(producto)) {
      return ['KILO', 'UNIDAD'];
    }

    return ['KILO'];
  }

  private esPanCorriente(producto: Producto): boolean {
    return this.normalizarTexto(producto.tipo_produccion_nombre) === 'pan corriente';
  }

  private esMoldeIntegral(producto: Producto): boolean {
    return this.normalizarTexto(producto.nombre_producto) === 'molde integral';
  }

  private obtenerProductoPorId(idProducto: number): Producto | undefined {
    return this.productos().find((producto) => producto.id_producto === idProducto);
  }

  private obtenerClientePorId(idCliente: number): Cliente | undefined {
    return this.clientes().find((cliente) => cliente.id_cliente === idCliente);
  }

  private reiniciarFormularioPedido(): void {
    this.formularioPedido = {
      fecha_pedido: this.obtenerFechaHoy(),
      fecha_entrega_solicitada: this.obtenerFechaHoy(),
      id_cliente: 0,
      id_distribucion: 0
    };
  }

  private reiniciarFormularioDetalle(): void {
    this.formularioDetalle = {
      id_producto: 0,
      cantidad_solicitada: '',
      unidad_medida: 'KILO',
      precio_cobrado: '',
      descuento_porcentaje_aplicado: ''
    };
  }

  private reiniciarFormularioCliente(): void {
    this.formularioCliente = {
      rut: '',
      digito_verificador: '',
      nombre_cliente: '',
      ciudad: '',
      direccion: '',
      telefono: '',
      descuento_aplicado: 0
    };
  }

  private reiniciarFormularioEditarCliente(): void {
    this.formularioEditarCliente = {
      rut: '',
      digito_verificador: '',
      nombre_cliente: '',
      ciudad: '',
      direccion: '',
      telefono: '',
      descuento_aplicado: 0
    };
  }

  private reiniciarFormularioProducto(): void {
    this.formularioProducto = {
      nombre_producto: '',
      precio_sugerido: '',
      unidad_venta_base: 'KILO',
      id_tipo_produccion: null
    };
  }

  private reiniciarFormularioDistribucion(): void {
    this.formularioDistribucion = {
      nombre_distribucion: ''
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

  private esRetiroPanaderia(nombre: string): boolean {
    const valor = this.normalizarTexto(nombre);
    return valor === 'retiro panaderia';
  }

  private esSalaDeVentas(nombre: string): boolean {
    return this.normalizarTexto(nombre) === 'sala de ventas';
  }

  private coincideDistribucion(nombrePedido: string, nombreFiltro: string): boolean {
    const pedido = this.normalizarTexto(nombrePedido);
    const filtro = this.normalizarTexto(nombreFiltro);

    if (!filtro) {
      return true;
    }

    if (this.esSalaDeVentas(filtro)) {
      return this.esSalaDeVentas(pedido) || this.esRetiroPanaderia(pedido);
    }

    return pedido === filtro;
  }

  private obtenerMensajeError(error: any, mensajeDefecto: string): string {
    const status = error?.status ? ` HTTP ${error.status}.` : '';
    const errores = error?.error;

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
        const etiqueta = this.formatearNombreCampoError(campo);

        if (Array.isArray(valor)) {
          return `${etiqueta}: ${valor.join(', ')}`;
        }

        if (typeof valor === 'object' && valor !== null) {
          return `${etiqueta}: ${JSON.stringify(valor)}`;
        }

        return `${etiqueta}: ${String(valor)}`;
      });

      if (mensajes.length > 0) {
        return `${mensajeDefecto}.${status} Detalle: ${mensajes.join(' | ')}`;
      }
    }

    return `${mensajeDefecto}.${status}`;
  }

  private formatearNombreCampoError(campo: string): string {
    const mapaCampos: Record<string, string> = {
      rut: 'RUT',
      digito_verificador: 'Dígito verificador',
      nombre_cliente: 'Nombre cliente',
      ciudad: 'Ciudad',
      direccion: 'Dirección',
      telefono: 'Teléfono',
      descuento_aplicado: 'Descuento aplicado',
      fecha_pedido: 'Fecha pedido',
      fecha_entrega_solicitada: 'Fecha entrega',
      id_cliente: 'Cliente',
      id_distribucion: 'Distribución',
      id_producto: 'Producto',
      cantidad_solicitada: 'Cantidad solicitada',
      unidad_medida: 'Unidad',
      precio_cobrado: 'Precio cobrado',
      descuento_porcentaje_aplicado: 'Descuento',
      nombre_producto: 'Nombre producto',
      precio_sugerido: 'Precio sugerido',
      unidad_venta_base: 'Unidad venta base',
      nombre_distribucion: 'Nombre distribución'
    };

    return mapaCampos[campo] || campo;
  }
}

export { PedidosDespachoComponent as PedidosDespacho };