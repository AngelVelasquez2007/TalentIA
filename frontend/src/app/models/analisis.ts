/**
 * ============================================================
 * TalentIA - Modelos del motor IA / NLP
 * Archivo: src/app/models/analisis.ts
 * ============================================================
 *
 * Estas interfaces representan la entrada y salida del motor
 * de compatibilidad candidato-vacante.
 *
 * El backend utiliza:
 *
 * - TF-IDF;
 * - similitud coseno;
 * - habilidades ponderadas.
 *
 * El resultado sirve como apoyo y no toma decisiones
 * automáticas de contratación.
 * ============================================================
 */


/**
 * Clasificaciones visuales de compatibilidad.
 */
export type ClasificacionCompatibilidad =
  | 'baja'
  | 'media'
  | 'alta'
  | 'muy_alta';


/**
 * Datos enviados para analizar una vacante.
 */
export interface AnalisisRequest {
  perfil_profesional: string;

  habilidades: string[];
}


/**
 * Resultado generado por el motor inteligente.
 */
export interface AnalisisCompatibilidad {
  /**
   * Puntuación combinada final.
   *
   * 0 - 100 %
   */
  puntuacion: number;

  /**
   * Componente calculado mediante:
   *
   * TF-IDF + cosine similarity.
   */
  similitud_texto: number;

  /**
   * Coincidencia de habilidades ponderadas.
   */
  coincidencia_habilidades: number;

  clasificacion: ClasificacionCompatibilidad;

  habilidades_coincidentes: string[];

  habilidades_faltantes: string[];

  explicacion: string;
}