/**
 * ============================================================
 * TalentIA - Servicio de empresas
 * Archivo: src/app/services/empresa.ts
 * ============================================================
 *
 * Este servicio centraliza todas las peticiones HTTP
 * relacionadas con empresas.
 *
 * ENDPOINTS:
 *
 * GET    /empresas
 * GET    /empresas/{id}
 * POST   /empresas
 * PUT    /empresas/{id}
 * DELETE /empresas/{id}
 *
 * PERMISOS:
 *
 * Público:
 *   - listar empresas;
 *   - consultar detalle.
 *
 * Administrador:
 *   - crear empresas;
 *   - editar cualquier empresa;
 *   - desactivar empresas.
 *
 * Reclutador:
 *   - editar únicamente su propia empresa.
 *
 * El JWT no se agrega manualmente.
 * authInterceptor lo añade automáticamente.
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
  Empresa,
  EmpresaCreate,
  EmpresaUpdate
} from '../models/empresa';


/**
 * Filtros disponibles para:
 *
 * GET /empresas
 */
export interface EmpresaFiltros {

  /**
   * Busca por:
   *
   * - nombre;
   * - sector;
   * - ciudad.
   */
  buscar?: string;

  sector?: string;

  ciudad?: string;

  /**
   * Paginación.
   */
  skip?: number;

  limit?: number;
}


@Injectable({
  providedIn: 'root'
})
export class EmpresaService {

  /**
   * Endpoint base del módulo de empresas.
   */
  private readonly apiUrl =
    'http://127.0.0.1:8000/empresas';


  constructor(
    private readonly http: HttpClient
  ) {}


  // ==========================================================
  // 1. LISTAR EMPRESAS
  // ==========================================================

  /**
   * Consulta las empresas activas.
   *
   * Ejemplo:
   *
   * listar({
   *   buscar: 'software',
   *   ciudad: 'Bucaramanga'
   * })
   *
   * genera:
   *
   * GET /empresas?buscar=software&ciudad=Bucaramanga
   */
  listar(
    filtros: EmpresaFiltros = {}
  ): Observable<Empresa[]> {

    let params =
      new HttpParams();


    if (
      filtros.buscar &&
      filtros.buscar.trim()
    ) {

      params = params.set(
        'buscar',
        filtros.buscar.trim()
      );
    }


    if (
      filtros.sector &&
      filtros.sector.trim()
    ) {

      params = params.set(
        'sector',
        filtros.sector.trim()
      );
    }


    if (
      filtros.ciudad &&
      filtros.ciudad.trim()
    ) {

      params = params.set(
        'ciudad',
        filtros.ciudad.trim()
      );
    }


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


    return this.http.get<Empresa[]>(
      this.apiUrl,
      {
        params
      }
    );
  }


  // ==========================================================
  // 2. OBTENER EMPRESA
  // ==========================================================

  /**
   * Consulta el detalle de una empresa activa.
   *
   * GET /empresas/{id}
   */
  obtener(
    id: number
  ): Observable<Empresa> {

    return this.http.get<Empresa>(
      `${this.apiUrl}/${id}`
    );
  }


  // ==========================================================
  // 3. CREAR EMPRESA
  // ==========================================================

  /**
   * Registra una nueva empresa.
   *
   * Requiere rol:
   *
   *     administrador
   */
  crear(
    empresa: EmpresaCreate
  ): Observable<Empresa> {

    return this.http.post<Empresa>(
      this.apiUrl,
      empresa
    );
  }


  // ==========================================================
  // 4. ACTUALIZAR EMPRESA
  // ==========================================================

  /**
   * Actualiza información de una empresa.
   *
   * ADMINISTRADOR:
   *     puede modificar cualquiera.
   *
   * RECLUTADOR:
   *     solo puede modificar la empresa asociada
   *     a su propia cuenta.
   */
  actualizar(
    id: number,
    cambios: EmpresaUpdate
  ): Observable<Empresa> {

    return this.http.put<Empresa>(
      `${this.apiUrl}/${id}`,
      cambios
    );
  }


  // ==========================================================
  // 5. DESACTIVAR EMPRESA
  // ==========================================================

  /**
   * Realiza una eliminación lógica.
   *
   * El backend cambia:
   *
   *     activa = false
   *
   * y cierra las vacantes relacionadas.
   *
   * No elimina físicamente la empresa de PostgreSQL.
   */
  desactivar(
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