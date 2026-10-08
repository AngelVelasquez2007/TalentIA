/**
 * ============================================================
 * TalentIA - Modelos de vacantes
 * Archivo: src/app/models/vacante.ts
 * ============================================================
 *
 * Representa las ofertas laborales recibidas desde FastAPI.
 *
 * Además incluye las habilidades ponderadas utilizadas por
 * el motor de compatibilidad de TalentIA.
 * ============================================================
 */

import { EmpresaResumen } from './empresa';


/**
 * Modalidades aceptadas por el backend.
 */
export type ModalidadVacante =
  | 'remoto'
  | 'presencial'
  | 'hibrido';


/**
 * Estados que puede tener una vacante.
 */
export type EstadoVacante =
  | 'borrador'
  | 'activa'
  | 'pausada'
  | 'cerrada';


/**
 * Habilidad perteneciente al catálogo general.
 */
export interface Habilidad {
  id: number;

  nombre: string;

  categoria: string | null;

  activa: boolean;
}


/**
 * Relación entre una vacante y una habilidad.
 *
 * peso:
 * Indica la importancia de la habilidad entre 1 y 5.
 *
 * obligatoria:
 * Determina si la competencia es fundamental para la oferta.
 */
export interface VacanteHabilidad {
  obligatoria: boolean;

  peso: number;

  habilidad: Habilidad;
}


/**
 * Formato utilizado cuando Angular envía una habilidad
 * al crear o actualizar una vacante.
 */
export interface VacanteHabilidadInput {
  nombre: string;

  obligatoria: boolean;

  peso: number;
}


/**
 * Vacante completa devuelta por FastAPI.
 */
export interface Vacante {
  id: number;

  titulo: string;

  descripcion: string;

  requisitos: string;

  responsabilidades: string | null;

  salario_min: number | null;

  salario_max: number | null;

  modalidad: ModalidadVacante;

  tipo_contrato: string;

  ubicacion: string | null;

  experiencia_minima: number;

  estado: EstadoVacante;

  creada_en: string;

  actualizada_en: string;

  fecha_cierre: string | null;

  empresa: EmpresaResumen;

  habilidades: VacanteHabilidad[];
}


/**
 * Versión reducida utilizada dentro de postulaciones.
 */
export interface VacanteResumen {
  id: number;

  titulo: string;

  modalidad: ModalidadVacante;

  ubicacion: string | null;

  estado: EstadoVacante;

  empresa: EmpresaResumen;
}


/**
 * Payload utilizado para publicar una vacante.
 */
export interface VacanteCreate {
  titulo: string;

  descripcion: string;

  requisitos: string;

  responsabilidades?: string | null;

  salario_min?: number | null;

  salario_max?: number | null;

  modalidad: ModalidadVacante;

  tipo_contrato: string;

  ubicacion?: string | null;

  experiencia_minima: number;

  /**
   * Para administradores.
   *
   * En reclutadores, FastAPI utiliza automáticamente
   * la empresa asociada a su cuenta.
   */
  empresa_id?: number | null;

  estado?: EstadoVacante;

  habilidades: VacanteHabilidadInput[];
}


/**
 * Datos modificables de una vacante.
 */
export interface VacanteUpdate {
  titulo?: string;

  descripcion?: string;

  requisitos?: string;

  responsabilidades?: string | null;

  salario_min?: number | null;

  salario_max?: number | null;

  modalidad?: ModalidadVacante;

  tipo_contrato?: string;

  ubicacion?: string | null;

  experiencia_minima?: number;

  estado?: EstadoVacante;

  fecha_cierre?: string | null;

  habilidades?: VacanteHabilidadInput[];
}