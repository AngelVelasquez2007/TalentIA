/**
 * ============================================================
 * TalentIA - Modelos de empresa
 * Archivo: src/app/models/empresa.ts
 * ============================================================
 *
 * Este archivo define las estructuras TypeScript utilizadas
 * por Angular para trabajar con empresas.
 *
 * Estas interfaces corresponden a los schemas de FastAPI:
 *
 * - EmpresaResumen
 * - EmpresaResponse
 * - EmpresaCreate
 * - EmpresaUpdate
 *
 * TypeScript utiliza estas interfaces para detectar errores
 * durante el desarrollo antes de ejecutar la aplicación.
 * ============================================================
 */


/**
 * Representación reducida de una empresa.
 *
 * Se utiliza dentro de:
 *
 * - vacantes;
 * - usuarios;
 * - postulaciones.
 */
export interface EmpresaResumen {
  id: number;
  nombre: string;
  sector: string | null;
  ciudad: string | null;
}


/**
 * Empresa completa devuelta por FastAPI.
 */
export interface Empresa {
  id: number;

  nombre: string;

  nit: string | null;

  descripcion: string | null;

  sector: string | null;

  ciudad: string | null;

  pais: string | null;

  sitio_web: string | null;

  activa: boolean;

  creada_en: string;

  actualizada_en: string;
}


/**
 * Datos enviados al crear una empresa.
 *
 * El ID y las fechas no se envían porque PostgreSQL
 * y FastAPI los generan automáticamente.
 */
export interface EmpresaCreate {
  nombre: string;

  nit?: string | null;

  descripcion?: string | null;

  sector?: string | null;

  ciudad?: string | null;

  pais?: string | null;

  sitio_web?: string | null;
}


/**
 * Datos permitidos durante la actualización.
 *
 * Todas las propiedades son opcionales porque un PUT
 * puede modificar solamente ciertos campos.
 */
export interface EmpresaUpdate {
  nombre?: string;

  nit?: string | null;

  descripcion?: string | null;

  sector?: string | null;

  ciudad?: string | null;

  pais?: string | null;

  sitio_web?: string | null;

  activa?: boolean;
}