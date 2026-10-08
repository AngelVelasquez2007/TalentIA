/**
 * ============================================================
 * TalentIA - Servicio de postulaciones
 * Archivo: src/app/services/postulacion.ts
 * ============================================================
 *
 * Este servicio centraliza la comunicación con FastAPI para:
 *
 * - crear postulaciones;
 * - consultar las postulaciones del candidato;
 * - consultar postulaciones por vacante;
 * - obtener ranking de candidatos;
 * - cambiar el estado de una postulación.
 *
 * ENDPOINTS UTILIZADOS:
 *
 * POST /postulaciones
 *
 * GET /postulaciones/mis-postulaciones
 *
 * GET /postulaciones/{id}
 *
 * GET /postulaciones/vacante/{vacante_id}
 *
 * GET /postulaciones/ranking/{vacante_id}
 *
 * PUT /postulaciones/{id}/estado
 *
 * IMPORTANTE:
 *
 * El JWT no se agrega aquí manualmente.
 * authInterceptor lo añade automáticamente.
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
  PostulacionCreate,
  PostulacionEstadoUpdate
} from '../models/postulacion';


@Injectable({
  providedIn: 'root'
})
export class PostulacionService {

  /**
   * URL base del módulo de postulaciones.
   */
  private readonly apiUrl =
    'http://127.0.0.1:8000/postulaciones';


  constructor(
    private readonly http: HttpClient
  ) {}


  // ==========================================================
  // 1. CREAR POSTULACIÓN
  // ==========================================================

  /**
   * Registra una nueva candidatura.
   *
   * Solo puede utilizarlo un usuario con rol:
   *
   *     candidato
   *
   * El backend realiza automáticamente:
   *
   * 1. validación de vacante;
   * 2. validación de postulación duplicada;
   * 3. análisis IA;
   * 4. cálculo de compatibilidad;
   * 5. almacenamiento en PostgreSQL.
   *
   * Ejemplo:
   *
   * postularse({
   *   vacante_id: 1,
   *   perfil_profesional:
   *     'Desarrollador Angular...'
   * });
   */
  postularse(
    datos: PostulacionCreate
  ): Observable<Postulacion> {

    return this.http.post<Postulacion>(
      this.apiUrl,
      datos
    );
  }


  // ==========================================================
  // 2. MIS POSTULACIONES
  // ==========================================================

  /**
   * Devuelve únicamente las postulaciones pertenecientes
   * al candidato autenticado.
   *
   * GET /postulaciones/mis-postulaciones
   */
  listarMisPostulaciones():
    Observable<Postulacion[]> {

    return this.http.get<Postulacion[]>(
      `${this.apiUrl}/mis-postulaciones`
    );
  }


  // ==========================================================
  // 3. CONSULTAR UNA POSTULACIÓN
  // ==========================================================

  /**
   * Devuelve el detalle de una postulación.
   *
   * Los permisos dependen del backend:
   *
   * CANDIDATO
   *     Solo puede consultar la suya.
   *
   * RECLUTADOR
   *     Solo puede consultar postulaciones
   *     pertenecientes a vacantes de su empresa.
   *
   * ADMINISTRADOR
   *     Puede consultar cualquiera.
   */
  obtener(
    id: number
  ): Observable<Postulacion> {

    return this.http.get<Postulacion>(
      `${this.apiUrl}/${id}`
    );
  }


  // ==========================================================
  // 4. POSTULACIONES POR VACANTE
  // ==========================================================

  /**
   * Permite a reclutador o administrador consultar
   * todos los candidatos inscritos en una vacante.
   *
   * FastAPI devuelve el resultado ordenado por
   * compatibilidad IA.
   *
   * GET /postulaciones/vacante/{vacante_id}
   */
  listarPorVacante(
    vacanteId: number
  ): Observable<Postulacion[]> {

    return this.http.get<Postulacion[]>(
      `${this.apiUrl}/vacante/${vacanteId}`
    );
  }


  // ==========================================================
  // 5. RANKING IA
  // ==========================================================

  /**
   * Obtiene una vista simplificada del ranking.
   *
   * Ejemplo:
   *
   * 1. Ana Torres      91 %
   * 2. Juan Pérez      84 %
   * 3. Sofia Gómez     73 %
   *
   * IMPORTANTE:
   *
   * El ranking solamente ordena candidatos.
   * No selecciona ni rechaza automáticamente.
   */
  obtenerRanking(
    vacanteId: number
  ): Observable<CandidatoRanking[]> {

    return this.http.get<
      CandidatoRanking[]
    >(
      `${this.apiUrl}/ranking/${vacanteId}`
    );
  }


  // ==========================================================
  // 6. CAMBIAR ESTADO
  // ==========================================================

  /**
   * Cambia el estado de una candidatura.
   *
   * Flujo permitido por el backend:
   *
   * pendiente
   *    ↓
   * revision
   *    ↓
   * entrevista
   *    ↓
   * seleccionado
   *
   * También puede ocurrir:
   *
   * pendiente  → rechazado
   * revision   → rechazado
   * entrevista → rechazado
   */
  cambiarEstado(
    postulacionId: number,
    estado: EstadoPostulacion
  ): Observable<Postulacion> {

    const datos:
      PostulacionEstadoUpdate = {

        estado
      };

    return this.http.put<Postulacion>(
      `${this.apiUrl}/${postulacionId}/estado`,
      datos
    );
  }


  // ==========================================================
  // 7. MÉTODOS AUXILIARES
  // ==========================================================

  /**
   * Envía una candidatura utilizando únicamente
   * el ID de la vacante.
   *
   * En este caso FastAPI utilizará el perfil profesional
   * que el candidato tenga almacenado en PostgreSQL.
   */
  postularseConPerfilGuardado(
    vacanteId: number
  ): Observable<Postulacion> {

    return this.postularse({
      vacante_id: vacanteId
    });
  }


  /**
   * Envía una candidatura utilizando un perfil temporal.
   *
   * Esto permite al candidato modificar el texto antes
   * de postularse sin necesidad de guardarlo primero.
   */
  postularseConPerfil(
    vacanteId: number,
    perfilProfesional: string
  ): Observable<Postulacion> {

    return this.postularse({
      vacante_id: vacanteId,
      perfil_profesional:
        perfilProfesional
    });
  }
}