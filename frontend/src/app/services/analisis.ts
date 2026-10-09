/**
 * ============================================================
 * TalentIA - Servicio de análisis de compatibilidad
 * Archivo: src/app/services/analisis.ts
 * ============================================================
 *
 * El backend combina:
 *
 * - TF-IDF;
 * - similitud coseno;
 * - coincidencia ponderada de habilidades.
 *
 * El resultado es orientativo. No contrata ni descarta
 * candidatos automáticamente.
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

  private readonly apiUrl =
    'http://127.0.0.1:8000/analisis';


  constructor(
    private readonly http:
      HttpClient
  ) {}


  // ==========================================================
  // ANALIZAR VACANTE
  // ==========================================================

  analizarVacante(
    vacanteId:
      number,

    datos:
      AnalisisRequest
  ): Observable<AnalisisCompatibilidad> {

    return this.http
      .post<AnalisisCompatibilidad>(
        `${this.apiUrl}/vacantes/${vacanteId}`,
        datos
      );
  }


  // ==========================================================
  // ANALIZAR PERFIL GUARDADO
  // ==========================================================

  /**
   * /vacantes obtiene primero /usuarios/me y utiliza esa copia
   * fresca del perfil. Las habilidades enviadas se combinan en
   * FastAPI con las persistidas, eliminando duplicados.
   */
  analizarPerfilGuardado(
    vacanteId:
      number,

    perfilProfesional:
      string,

    habilidades:
      string[]
  ): Observable<AnalisisCompatibilidad> {

    const habilidadesLimpias =
      Array.from(
        new Set(
          habilidades
            .map(
              (habilidad) =>
                habilidad.trim()
            )
            .filter(
              (habilidad) =>
                habilidad.length > 0
            )
        )
      );


    return this
      .analizarVacante(
        vacanteId,
        {
          perfil_profesional:
            perfilProfesional
              .trim(),

          habilidades:
            habilidadesLimpias
        }
      );
  }


  // ==========================================================
  // COMPATIBILIDAD CON OTROS COMPONENTES
  // ==========================================================

  analizarSoloPerfil(
    vacanteId:
      number,

    perfilProfesional:
      string
  ): Observable<AnalisisCompatibilidad> {

    return this
      .analizarVacante(
        vacanteId,
        {
          perfil_profesional:
            perfilProfesional
              .trim(),

          habilidades: []
        }
      );
  }
}
