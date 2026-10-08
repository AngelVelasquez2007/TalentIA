/**
 * ============================================================
 * TalentIA - Modelos de usuario y autenticación
 * Archivo: src/app/models/usuario.ts
 * ============================================================
 *
 * Define:
 *
 * - roles;
 * - usuarios;
 * - perfiles profesionales;
 * - habilidades;
 * - registro;
 * - login;
 * - JWT.
 * ============================================================
 */

import { EmpresaResumen } from './empresa';
import { Habilidad } from './vacante';


/**
 * Roles reconocidos por TalentIA.
 */
export type NombreRol =
  | 'administrador'
  | 'reclutador'
  | 'candidato';


/**
 * Información del rol enviada por FastAPI.
 */
export interface Rol {
  id: number;

  nombre: NombreRol;

  descripcion: string | null;
}


/**
 * Niveles permitidos para una competencia.
 */
export type NivelHabilidad =
  | 'basico'
  | 'intermedio'
  | 'avanzado'
  | 'experto';


/**
 * Habilidad perteneciente al perfil del candidato.
 */
export interface UsuarioHabilidad {
  nivel: NivelHabilidad;

  experiencia_anios: number;

  habilidad: Habilidad;
}


/**
 * Formato enviado desde Angular al guardar una habilidad.
 */
export interface UsuarioHabilidadInput {
  nombre: string;

  nivel: NivelHabilidad;

  experiencia_anios: number;
}


/**
 * Información reducida utilizada dentro de postulaciones.
 */
export interface UsuarioResumen {
  id: number;

  nombre: string;

  apellido: string;

  email: string;

  ciudad: string | null;
}


/**
 * Usuario autenticado completo.
 *
 * IMPORTANTE:
 *
 * No contiene password_hash.
 *
 * Esa información nunca debe salir del backend.
 */
export interface Usuario {
  id: number;

  nombre: string;

  apellido: string;

  email: string;

  telefono: string | null;

  ciudad: string | null;

  perfil_profesional: string | null;

  experiencia_anios: number;

  activo: boolean;

  creado_en: string;

  actualizado_en: string;

  rol: Rol;

  empresa: EmpresaResumen | null;

  habilidades: UsuarioHabilidad[];
}


/**
 * Payload utilizado en:
 *
 * POST /auth/register
 */
export interface RegistroRequest {
  nombre: string;

  apellido: string;

  email: string;

  password: string;
}


/**
 * Payload utilizado en:
 *
 * POST /auth/login
 */
export interface LoginRequest {
  email: string;

  password: string;
}


/**
 * JWT devuelto por FastAPI.
 */
export interface TokenResponse {
  access_token: string;

  token_type: 'bearer';
}


/**
 * Datos que el candidato podrá actualizar posteriormente
 * desde su perfil profesional.
 */
export interface UsuarioPerfilUpdate {
  nombre?: string;

  apellido?: string;

  telefono?: string | null;

  ciudad?: string | null;

  perfil_profesional?: string | null;

  experiencia_anios?: number;

  habilidades?: UsuarioHabilidadInput[];
}