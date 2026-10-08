/**
 * ============================================================
 * TalentIA - Servicio de vacantes
 * Archivo: src/app/services/vacante.ts
 * ============================================================
 *
 * Este servicio centraliza todas las operaciones HTTP
 * relacionadas con las ofertas laborales.
 *
 * ENDPOINTS UTILIZADOS:
 *
 * GET    /vacantes
 * GET    /vacantes/{id}
 * GET    /vacantes/mis-vacantes
 * POST   /vacantes
 * PUT    /vacantes/{id}
 * DELETE /vacantes/{id}
 *
 * RESPONSABILIDADES:
 *
 * - consultar catálogo público;
 * - aplicar filtros;
 * - consultar detalle;
 * - listar vacantes de reclutador;
 * - publicar vacantes;
 * - editar vacantes;
 * - cerrar vacantes.
 *
 * El JWT NO se agrega manualmente aquí.
 *
 * Nuestro authInterceptor lo añade automáticamente:
 *
 * Authorization: Bearer TOKEN
 *
 * ============================================================
 */

import {
  Injectable
} from '@angular/core';

import {
  HttpClient,
  HttpParams
} from '@angular/common/http';

import {
  Observable
} from 'rxjs';

import {
  EstadoVacante,
  ModalidadVacante,
  Vacante,
  VacanteCreate,
  VacanteUpdate
} from '../models/vacante';


/**
 * ============================================================
 * FILTROS DEL CATÁLOGO
 * ============================================================
 *
 * Corresponden exactamente a los query params aceptados por:
 *
 * GET /vacantes
 */
export interface VacanteFiltros {

  /**
   * Busca en:
   *
   * - título;
   * - descripción;
   * - requisitos;
   * - ubicación;
   * - empresa.
   */
  buscar?: string;

  modalidad?: ModalidadVacante;

  ubicacion?: string;

  empresa_id?: number;

  /**
   * Expectativa salarial mínima del candidato.
   */
  salario_minimo?: number;

  /**
   * Máximo de experiencia que el candidato desea
   * que la vacante exija.
   */
  experiencia_maxima?: number;

  /**
   * Paginación.
   */
  skip?: number;

  limit?: number;
}


@Injectable({
  providedIn: 'root'
})
export class VacanteService {

  /**
   * Endpoint base del módulo de vacantes.
   */
  private readonly apiUrl =
    'http://127.0.0.1:8000/vacantes';


  constructor(
    private readonly http: HttpClient
  ) {}


  // ==========================================================
  // 1. CATÁLOGO PÚBLICO
  // ==========================================================

  /**
   * Obtiene las vacantes activas.
   *
   * Ejemplo:
   *
   * listar({
   *   buscar: 'angular',
   *   modalidad: 'remoto'
   * })
   *
   * genera aproximadamente:
   *
   * GET /vacantes?buscar=angular&modalidad=remoto
   */
  listar(
    filtros: VacanteFiltros = {}
  ): Observable<Vacante[]> {

    let params =
      new HttpParams();


    // --------------------------------------------------------
    // BÚSQUEDA
    // --------------------------------------------------------

    if (
      filtros.buscar &&
      filtros.buscar.trim()
    ) {

      params = params.set(
        'buscar',
        filtros.buscar.trim()
      );
    }


    // --------------------------------------------------------
    // MODALIDAD
    // --------------------------------------------------------

    if (filtros.modalidad) {

      params = params.set(
        'modalidad',
        filtros.modalidad
      );
    }


    // --------------------------------------------------------
    // UBICACIÓN
    // --------------------------------------------------------

    if (
      filtros.ubicacion &&
      filtros.ubicacion.trim()
    ) {

      params = params.set(
        'ubicacion',
        filtros.ubicacion.trim()
      );
    }


    // --------------------------------------------------------
    // EMPRESA
    // --------------------------------------------------------

    if (
      filtros.empresa_id !== undefined &&
      filtros.empresa_id !== null
    ) {

      params = params.set(
        'empresa_id',
        filtros.empresa_id.toString()
      );
    }


    // --------------------------------------------------------
    // SALARIO
    // --------------------------------------------------------

    if (
      filtros.salario_minimo !== undefined &&
      filtros.salario_minimo !== null
    ) {

      params = params.set(
        'salario_minimo',
        filtros.salario_minimo.toString()
      );
    }


    // --------------------------------------------------------
    // EXPERIENCIA
    // --------------------------------------------------------

    if (
      filtros.experiencia_maxima !== undefined &&
      filtros.experiencia_maxima !== null
    ) {

      params = params.set(
        'experiencia_maxima',
        filtros.experiencia_maxima.toString()
      );
    }


    // --------------------------------------------------------
    // PAGINACIÓN
    // --------------------------------------------------------

    if (
      filtros.skip !== undefined &&
      filtros.skip !== null
    ) {

      params = params.set(
        'skip',
        filtros.skip.toString()
      );
    }


    if (
      filtros.limit !== undefined &&
      filtros.limit !== null
    ) {

      params = params.set(
        'limit',
        filtros.limit.toString()
      );
    }


    return this.http.get<Vacante[]>(
      this.apiUrl,
      {
        params
      }
    );
  }


  // ==========================================================
  // 2. DETALLE DE VACANTE
  // ==========================================================

  /**
   * Consulta una vacante activa por ID.
   *
   * GET /vacantes/{id}
   */
  obtener(
    id: number
  ): Observable<Vacante> {

    return this.http.get<Vacante>(
      `${this.apiUrl}/${id}`
    );
  }


  // ==========================================================
  // 3. VACANTES ADMINISTRABLES
  // ==========================================================

  /**
   * Devuelve las vacantes que puede gestionar el usuario.
   *
   * RECLUTADOR:
   *     solo las de su empresa.
   *
   * ADMINISTRADOR:
   *     todas.
   *
   * Puede incluir:
   *
   * - activa;
   * - borrador;
   * - pausada;
   * - cerrada.
   */
  listarMisVacantes(
    estado?: EstadoVacante
  ): Observable<Vacante[]> {

    let params =
      new HttpParams();

    if (estado) {

      params = params.set(
        'estado',
        estado
      );
    }

    return this.http.get<Vacante[]>(
      `${this.apiUrl}/mis-vacantes`,
      {
        params
      }
    );
  }


  // ==========================================================
  // 4. CREAR VACANTE
  // ==========================================================

  /**
   * Publica una nueva oferta.
   *
   * Requiere:
   *
   * - administrador;
   * o
   * - reclutador.
   *
   * El interceptor añade automáticamente el JWT.
   */
  crear(
    vacante: VacanteCreate
  ): Observable<Vacante> {

    return this.http.post<Vacante>(
      this.apiUrl,
      vacante
    );
  }


  // ==========================================================
  // 5. ACTUALIZAR VACANTE
  // ==========================================================

  /**
   * Modifica una oferta existente.
   *
   * PUT /vacantes/{id}
   */
  actualizar(
    id: number,
    cambios: VacanteUpdate
  ): Observable<Vacante> {

    return this.http.put<Vacante>(
      `${this.apiUrl}/${id}`,
      cambios
    );
  }


  // ==========================================================
  // 6. CERRAR VACANTE
  // ==========================================================

  /**
   * Realiza una eliminación lógica.
   *
   * El backend NO elimina físicamente la fila.
   *
   * Cambia:
   *
   *     estado = "cerrada"
   *
   * Esto conserva las postulaciones y análisis históricos.
   */
  cerrar(
    id: number
  ): Observable<{
    message: string;
  }> {

    return this.http.delete<{
      message: string;
    }>(
      `${this.apiUrl}/${id}`
    );
  }
}