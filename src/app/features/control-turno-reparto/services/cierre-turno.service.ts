import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import {
  CierreTurno,
  CierreTurnoPayload,
  Jornada,
  MovimientoTurno,
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

  obtenerTurnos(): Observable<RespuestaListaApi<Turno>> {
    return this.http.get<RespuestaListaApi<Turno>>(`${this.apiUrl}/catalogo/turnos/`);
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

  obtenerVistaPrevia(id: number): Observable<CierreTurno> {
    return this.http.get<CierreTurno>(`${this.apiUrl}/produccion/cierres-turno/${id}/vista_previa/`);
  }

  cerrarTurno(id: number): Observable<CierreTurno> {
    return this.http.post<CierreTurno>(`${this.apiUrl}/produccion/cierres-turno/${id}/cerrar/`, {});
  }

  reabrirTurno(id: number): Observable<CierreTurno> {
    return this.http.post<CierreTurno>(`${this.apiUrl}/produccion/cierres-turno/${id}/reabrir/`, {});
  }

  obtenerMovimientos(): Observable<RespuestaListaApi<MovimientoTurno>> {
    return this.http.get<RespuestaListaApi<MovimientoTurno>>(`${this.apiUrl}/movimientos/`);
  }

}