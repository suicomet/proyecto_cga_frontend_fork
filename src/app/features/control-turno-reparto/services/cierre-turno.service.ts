import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CierreTurno,
  CierreTurnoPayload,
  Cliente,
  Distribucion,
  Jornada,
  JornadaPayload,
  MovimientoTurno,
  RepartoTurno,
  RepartoTurnoPayload,
  RespuestaListaApi,
  Turno
} from '../interfaces/cierre-turno.interface';

@Injectable({
  providedIn: 'root'
})
export class CierreTurnoService {

  private readonly apiUrl = 'https://proyectocga-production-2e12.up.railway.app/api';

  constructor(private http: HttpClient) {}

  obtenerJornadas(): Observable<RespuestaListaApi<Jornada>> {
    return this.http.get<RespuestaListaApi<Jornada>>(`${this.apiUrl}/produccion/jornadas/`);
  }

  crearJornada(payload: JornadaPayload): Observable<Jornada> {
    return this.http.post<Jornada>(`${this.apiUrl}/produccion/jornadas/`, payload);
  }

  obtenerTurnos(): Observable<RespuestaListaApi<Turno>> {
    return this.http.get<RespuestaListaApi<Turno>>(`${this.apiUrl}/catalogo/turnos/`);
  }

  obtenerClientes(): Observable<RespuestaListaApi<Cliente>> {
    return this.http.get<RespuestaListaApi<Cliente>>(`${this.apiUrl}/ventas/clientes/`);
  }

  obtenerDistribuciones(): Observable<RespuestaListaApi<Distribucion>> {
    return this.http.get<RespuestaListaApi<Distribucion>>(`${this.apiUrl}/catalogo/distribuciones/`);
  }

  obtenerCierres(): Observable<RespuestaListaApi<CierreTurno>> {
    return this.http.get<RespuestaListaApi<CierreTurno>>(`${this.apiUrl}/produccion/cierres-turno/`);
  }

  crearCierre(payload: CierreTurnoPayload): Observable<CierreTurno> {
    return this.http.post<CierreTurno>(`${this.apiUrl}/produccion/cierres-turno/`, payload);
  }

  actualizarCierre(id: number, payload: Partial<CierreTurnoPayload>): Observable<CierreTurno> {
    return this.http.patch<CierreTurno>(`${this.apiUrl}/produccion/cierres-turno/${id}/`, payload);
  }

  eliminarCierre(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/produccion/cierres-turno/${id}/`);
  }

  obtenerVistaPrevia(id: number): Observable<CierreTurno> {
    return this.http.get<CierreTurno>(`${this.apiUrl}/produccion/cierres-turno/${id}/vista_previa/`);
  }

  cerrarTurno(id: number): Observable<CierreTurno> {
    return this.http.post<CierreTurno>(`${this.apiUrl}/produccion/cierres-turno/${id}/cerrar/`, {});
  }

  reabrirTurno(id: number): Observable<CierreTurno> {
    return this.http.post<CierreTurno>(`${this.apiUrl}/produccion/cierres-turno/${id}/reabrir/`, {});
  }

  obtenerRepartosTurno(): Observable<RespuestaListaApi<RepartoTurno>> {
    return this.http.get<RespuestaListaApi<RepartoTurno>>(`${this.apiUrl}/produccion/repartos-turno/`);
  }

  crearRepartoTurno(payload: RepartoTurnoPayload): Observable<RepartoTurno> {
    return this.http.post<RepartoTurno>(`${this.apiUrl}/produccion/repartos-turno/`, payload);
  }

  eliminarRepartoTurno(id: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/produccion/repartos-turno/${id}/`);
  }

  obtenerMovimientos(): Observable<RespuestaListaApi<MovimientoTurno>> {
    return this.http.get<RespuestaListaApi<MovimientoTurno>>(`${this.apiUrl}/movimientos/`);
  }

}