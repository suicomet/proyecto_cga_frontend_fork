import { Routes } from '@angular/router';

import { adminGuard, authGuard, authChildGuard } from './core/guards/auth.guard';

import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Produccion } from './pages/produccion/produccion';
import { BodegaComponent } from './pages/bodega/bodega';
import { PedidosDespacho } from './pages/pedidos-despacho/pedidos-despacho';
import { PagosCobros } from './pages/pagos-cobros/pagos-cobros';
import { ClientesSaldos } from './pages/clientes-saldos/clientes-saldos';
import { Reportes } from './pages/reportes/reportes';
import { GestionUsuarios } from './pages/gestion-usuarios/gestion-usuarios';
import { ControlTurnoReparto } from './pages/control-turno-reparto/control-turno-reparto';

import { PrivateLayout } from './layouts/private-layout/private-layout';

export const routes: Routes = [
  {
    path: '',
    redirectTo: 'login',
    pathMatch: 'full'
  },
  {
    path: 'login',
    component: Login
  },
  {
    path: '',
    component: PrivateLayout,
    canActivate: [authGuard],
    canActivateChild: [authChildGuard],
    children: [
      {
        path: 'dashboard',
        component: Dashboard,
        canActivate: [adminGuard]
      },
      {
        path: 'produccion',
        component: Produccion
      },
      {
        path: 'control-turno-reparto',
        component: ControlTurnoReparto
      },
      {
        path: 'bodega',
        component: BodegaComponent
      },
      {
        path: 'pedidos-despacho',
        component: PedidosDespacho
      },
      {
        path: 'pagos-cobros',
        component: PagosCobros,
        canActivate: [adminGuard]
      },
      {
        path: 'clientes-saldos',
        component: ClientesSaldos,
        canActivate: [adminGuard]
      },
      {
        path: 'reportes',
        component: Reportes,
        canActivate: [adminGuard]
      },
      {
        path: 'gestion-usuarios',
        component: GestionUsuarios,
        canActivate: [adminGuard]
      }
    ]
  }
];