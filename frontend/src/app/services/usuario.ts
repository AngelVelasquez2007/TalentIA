/**
 * ============================================================
 * TalentIA - Servicio de usuario
 * Archivo: src/app/services/usuario.ts
 * ============================================================
 *
 * Gestiona:
 *
 * - consulta del perfil autenticado;
 * - actualización del perfil profesional;
 * - consulta del catálogo de habilidades.
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
  Usuario,
  UsuarioPerfilUpdate
} from '../models/usuario';

import {
  Habilidad
} from '../models/vacante';


@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  /**
   * Router FastAPI:
   *
   * /usuarios
   */
  private readonly apiUrl =
    'http://127.0.0.1:8000/usuarios';


  constructor(
    private readonly http:
      HttpClient
  ) {}


  // ==========================================================
  // MI PERFIL
  // ==========================================================

  obtenerMiPerfil():
    Observable<Usuario> {

    return this.http.get<Usuario>(
      `${this.apiUrl}/me`
    );
  }


  // ==========================================================
  // ACTUALIZAR PERFIL
  // ==========================================================

  actualizarPerfil(
    datos:
      UsuarioPerfilUpdate
  ): Observable<Usuario> {

    return this.http.put<Usuario>(
      `${this.apiUrl}/me/perfil`,
      datos
    );
  }


  // ==========================================================
  // CATÁLOGO DE HABILIDADES
  // ==========================================================

  listarHabilidades():
    Observable<Habilidad[]> {

    return this.http.get<
      Habilidad[]
    >(
      `${this.apiUrl}/habilidades`
    );
  }
}