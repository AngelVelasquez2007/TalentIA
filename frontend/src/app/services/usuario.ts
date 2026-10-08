/**
 * ============================================================
 * TalentIA - Servicio de usuarios
 * Archivo: src/app/services/usuario.ts
 * ============================================================
 *
 * Este servicio gestiona el perfil profesional del usuario.
 *
 * ENDPOINTS:
 *
 * GET /usuarios/me
 * PUT /usuarios/me/perfil
 * GET /usuarios/habilidades
 *
 * El JWT es agregado automáticamente por authInterceptor.
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
  Observable,
  tap
} from 'rxjs';

import {
  Habilidad
} from '../models/vacante';

import {
  Usuario,
  UsuarioPerfilUpdate
} from '../models/usuario';

import {
  AuthService
} from './auth';


@Injectable({
  providedIn: 'root'
})
export class UsuarioService {

  /**
   * Endpoint base.
   */
  private readonly apiUrl =
    'http://127.0.0.1:8000/usuarios';


  constructor(
    private readonly http: HttpClient,
    private readonly auth: AuthService
  ) {}


  // ==========================================================
  // PERFIL ACTUAL
  // ==========================================================

  /**
   * Recupera el perfil completo del usuario autenticado.
   */
  obtenerMiPerfil():
    Observable<Usuario> {

    return this.http.get<Usuario>(
      `${this.apiUrl}/me`
    );
  }


  // ==========================================================
  // ACTUALIZAR PERFIL
  // ==========================================================

  /**
   * Guarda:
   *
   * - información personal;
   * - perfil profesional;
   * - experiencia;
   * - habilidades.
   */
  actualizarPerfil(
    datos: UsuarioPerfilUpdate
  ): Observable<Usuario> {

    return this.http
      .put<Usuario>(
        `${this.apiUrl}/me/perfil`,
        datos
      )
      .pipe(

        /**
         * Después de actualizar volvemos a sincronizar
         * el usuario almacenado por AuthService.
         */
        tap(() => {

          this.auth
            .cargarUsuarioActual()
            .subscribe();
        })
      );
  }


  // ==========================================================
  // HABILIDADES
  // ==========================================================

  /**
   * Consulta el catálogo de habilidades.
   *
   * Puede recibir texto para filtrar.
   */
  listarHabilidades(
    buscar = ''
  ): Observable<Habilidad[]> {

    let params =
      new HttpParams();


    if (
      buscar.trim()
    ) {

      params = params.set(
        'buscar',
        buscar.trim()
      );
    }


    params = params.set(
      'limite',
      '150'
    );


    return this.http.get<Habilidad[]>(
      `${this.apiUrl}/habilidades`,
      {
        params
      }
    );
  }
}