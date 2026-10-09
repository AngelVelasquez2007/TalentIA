/**
 * ============================================================
 * TalentIA - Servicio de postulaciones
 * Archivo: src/app/services/postulacion.ts
 * ============================================================
 *
 * IMPORTANTE:
 *
 * PostgreSQL/FastAPI es la fuente de verdad del perfil cuando
 * el candidato se postula. El backend recupera directamente:
 *
 * - perfil_profesional;
 * - habilidades guardadas;
 *
 * y genera el snapshot del matching en la postulación.
 *
 * ============================================================
 */

import {
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  CandidatoRanking,
  EstadoPostulacion,
  Postulacion,
  PostulacionCreate
} from '../models/postulacion';


interface EstadoPayload {
  estado:
    EstadoPostulacion;
}


@Injectable({
  providedIn: 'root'
})
export class PostulacionService {

  private readonly apiUrl =
    'http://127.0.0.1:8000/postulaciones';


  constructor(
    private readonly http:
      HttpClient
  ) {}


  // ==========================================================
  // CREAR POSTULACIÓN
  // ==========================================================

  postular(
    datos:
      PostulacionCreate
  ): Observable<Postulacion> {

    return this.http
      .post<Postulacion>(
        this.apiUrl,
        datos
      );
  }


  // ==========================================================
  // POSTULAR CON PERFIL TEMPORAL
  // ==========================================================

  /**
   * Se mantiene para compatibilidad con componentes que quieran
   * analizar un texto temporal. No envía campos que el esquema
   * FastAPI PostulacionCreate no reconoce.
   */
  postularseConPerfil(
    vacanteId:
      number,

    perfilProfesional:
      string
  ): Observable<Postulacion> {

    return this.postular({
      vacante_id:
        vacanteId,

      perfil_profesional:
        perfilProfesional
          .trim()
    });
  }


  // ==========================================================
  // POSTULAR CON PERFIL PERSISTIDO
  // ==========================================================

  /**
   * Método recomendado.
   *
   * Enviamos únicamente la vacante. FastAPI toma el perfil y
   * las habilidades directamente desde PostgreSQL, evitando
   * usar una copia obsoleta almacenada en Angular.
   */
  postularseConPerfilGuardado(
    vacanteId:
      number
  ): Observable<Postulacion> {

    return this.postular({
      vacante_id:
        vacanteId
    });
  }


  // ==========================================================
  // MIS POSTULACIONES
  // ==========================================================

  listarMisPostulaciones():
    Observable<Postulacion[]> {

    return this.http
      .get<Postulacion[]>(
        `${this.apiUrl}/mis-postulaciones`
      );
  }


  misPostulaciones():
    Observable<Postulacion[]> {

    return this
      .listarMisPostulaciones();
  }


  // ==========================================================
  // DETALLE
  // ==========================================================

  obtenerPostulacion(
    postulacionId:
      number
  ): Observable<Postulacion> {

    return this.http
      .get<Postulacion>(
        `${this.apiUrl}/${postulacionId}`
      );
  }


  obtener(
    postulacionId:
      number
  ): Observable<Postulacion> {

    return this
      .obtenerPostulacion(
        postulacionId
      );
  }


  // ==========================================================
  // POSTULACIONES DE UNA VACANTE
  // ==========================================================

  listarPorVacante(
    vacanteId:
      number
  ): Observable<Postulacion[]> {

    return this.http
      .get<Postulacion[]>(
        `${this.apiUrl}/vacante/${vacanteId}`
      );
  }


  // ==========================================================
  // RANKING
  // ==========================================================

  obtenerRanking(
    vacanteId:
      number
  ): Observable<CandidatoRanking[]> {

    return this.http
      .get<CandidatoRanking[]>(
        `${this.apiUrl}/ranking/${vacanteId}`
      );
  }


  ranking(
    vacanteId:
      number
  ): Observable<CandidatoRanking[]> {

    return this
      .obtenerRanking(
        vacanteId
      );
  }


  // ==========================================================
  // ACTUALIZAR ESTADO
  // ==========================================================

  actualizarEstado(
    postulacionId:
      number,

    datos:
      EstadoPayload
  ): Observable<Postulacion> {

    return this.http
      .put<Postulacion>(
        `${this.apiUrl}/${postulacionId}/estado`,
        datos
      );
  }


  cambiarEstado(
    postulacionId:
      number,

    estado:
      EstadoPostulacion
  ): Observable<Postulacion> {

    return this
      .actualizarEstado(
        postulacionId,
        {
          estado
        }
      );
  }
}
