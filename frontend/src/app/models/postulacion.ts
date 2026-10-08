/**
 * ============================================================
 * TalentIA - Modelos de postulaciones
 * Archivo: src/app/models/postulacion.ts
 * ============================================================
 *
 * Representa el proceso candidato -> vacante.
 *
 * Cada postulación también conserva el análisis generado
 * por el motor IA en el momento de postularse.
 * ============================================================
 */

import { UsuarioResumen } from './usuario';

import { VacanteResumen } from './vacante';


/**
 * Estados permitidos para una candidatura.
 */
export type EstadoPostulacion =
  | 'pendiente'
  | 'revision'
  | 'entrevista'
  | 'seleccionado'
  | 'rechazado';


/**
 * Payload utilizado para postularse.
 */
export interface PostulacionCreate {
  vacante_id: number;

  /**
   * Puede enviarse el perfil actual.
   *
   * Si no se envía, FastAPI utiliza el perfil guardado
   * en la cuenta del candidato.
   */
  perfil_profesional?: string | null;
}


/**
 * Postulación completa.
 */
export interface Postulacion {
  id: number;

  estado: EstadoPostulacion;

  puntuacion_ia: number | null;

  similitud_texto: number | null;

  coincidencia_habilidades: number | null;

  perfil_analizado: string | null;

  habilidades_coincidentes: string[] | null;

  habilidades_faltantes: string[] | null;

  explicacion_ia: string | null;

  creada_en: string;

  actualizada_en: string;

  candidato: UsuarioResumen;

  vacante: VacanteResumen;
}


/**
 * Payload utilizado por el reclutador para avanzar el proceso.
 */
export interface PostulacionEstadoUpdate {
  estado: EstadoPostulacion;
}


/**
 * Modelo específico del ranking de candidatos.
 *
 * Lo utilizará el panel del reclutador.
 */
export interface CandidatoRanking {
  postulacion_id: number;

  candidato_id: number;

  nombre: string;

  email: string;

  estado: EstadoPostulacion;

  puntuacion_ia: number | null;

  similitud_texto: number | null;

  coincidencia_habilidades: number | null;

  habilidades_coincidentes: string[] | null;

  habilidades_faltantes: string[] | null;

  explicacion_ia: string | null;
}