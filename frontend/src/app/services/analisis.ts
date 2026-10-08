/**
 * ============================================================
 * TalentIA - Servicio de análisis IA / NLP
 * Archivo: src/app/services/analisis.ts
 * ============================================================
 *
 * Este servicio conecta Angular con el endpoint:
 *
 *   POST /analisis/vacantes/{vacante_id}
 *
 * RESPONSABILIDADES:
 *
 * - enviar el perfil profesional del candidato;
 * - enviar habilidades adicionales;
 * - recibir la puntuación de compatibilidad;
 * - recibir similitud textual;
 * - recibir coincidencia de habilidades;
 * - recibir habilidades coincidentes;
 * - recibir habilidades faltantes;
 * - recibir una explicación legible del resultado.
 *
 * FLUJO:
 *
 * Angular
 *    |
 *    | perfil + habilidades
 *    v
 * AnalisisService
 *    |
 *    v
 * FastAPI
 *    |
 *    v
 * matching.py
 *    |
 *    +-- TF-IDF
 *    +-- similitud coseno
 *    +-- habilidades ponderadas
 *    |
 *    v
 * resultado 0 - 100 %
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
  AnalisisCompatibilidad,
  AnalisisRequest
} from '../models/analisis';


@Injectable({
  providedIn: 'root'
})
export class AnalisisService {

  /**
   * URL base del módulo de análisis.
   */
  private readonly apiUrl =
    'http://127.0.0.1:8000/analisis';


  constructor(
    private readonly http: HttpClient
  ) {}


  // ==========================================================
  // 1. ANALIZAR UNA VACANTE
  // ==========================================================

  /**
   * Ejecuta el motor de compatibilidad para una vacante.
   *
   * Ejemplo:
   *
   * analizarVacante(
   *   1,
   *   {
   *     perfil_profesional:
   *       'Desarrollador Angular con TypeScript...',
   *
   *     habilidades: [
   *       'Angular',
   *       'TypeScript',
   *       'PostgreSQL'
   *     ]
   *   }
   * )
   *
   * Esto genera:
   *
   * POST /analisis/vacantes/1
   */
  analizarVacante(
    vacanteId: number,
    datos: AnalisisRequest
  ): Observable<AnalisisCompatibilidad> {

    return this.http.post<AnalisisCompatibilidad>(
      `${this.apiUrl}/vacantes/${vacanteId}`,
      datos
    );
  }


  // ==========================================================
  // 2. MÉTODO AUXILIAR
  // ==========================================================

  /**
   * Permite ejecutar un análisis enviando únicamente
   * el perfil profesional.
   *
   * Se utiliza cuando el candidato todavía no tiene
   * habilidades estructuradas en su cuenta.
   */
  analizarSoloPerfil(
    vacanteId: number,
    perfilProfesional: string
  ): Observable<AnalisisCompatibilidad> {

    const datos: AnalisisRequest = {
      perfil_profesional:
        perfilProfesional,

      habilidades: []
    };

    return this.analizarVacante(
      vacanteId,
      datos
    );
  }
}