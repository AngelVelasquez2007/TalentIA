/**
 * ============================================================
 * TalentIA - Guards de autenticación y roles
 * Archivo: src/app/guards/auth.guard.ts
 * ============================================================
 *
 * Los guards controlan la navegación dentro de Angular.
 *
 * IMPORTANTE:
 *
 * Los guards NO sustituyen la seguridad de FastAPI.
 *
 * Su función es mejorar la experiencia de usuario evitando que:
 *
 * - un visitante abra páginas privadas;
 * - un candidato abra el panel del reclutador;
 * - un reclutador abra páginas exclusivas del candidato.
 *
 * La autorización definitiva sigue siendo validada por:
 *
 * backend/app/security.py
 *
 * ============================================================
 */

import {
  inject
} from '@angular/core';

import {
  CanActivateFn,
  Router
} from '@angular/router';

import {
  catchError,
  map,
  of
} from 'rxjs';

import {
  AuthService
} from '../services/auth';

import {
  Usuario
} from '../models/usuario';


/**
 * ============================================================
 * FUNCIÓN AUXILIAR
 * ============================================================
 *
 * Recupera el usuario actual.
 *
 * CASO 1:
 * Ya existe usuario en memoria.
 *
 * CASO 2:
 * Hay JWT, pero Angular fue recargado.
 * Consultamos GET /auth/me.
 *
 * CASO 3:
 * No existe JWT.
 * Devuelve null.
 */
function resolverUsuario(
  auth: AuthService
) {

  const usuarioActual =
    auth.obtenerUsuarioActual();


  if (usuarioActual) {

    return of<Usuario | null>(
      usuarioActual
    );
  }


  if (!auth.obtenerToken()) {

    return of<Usuario | null>(
      null
    );
  }


  /**
   * Si existe token intentamos reconstruir la sesión
   * consultando al backend.
   */
  return auth
    .cargarUsuarioActual()
    .pipe(

      catchError(() => {

        /**
         * Si el JWT expiró o es inválido,
         * limpiamos la sesión local.
         */
        auth.limpiarSesion();

        return of<Usuario | null>(
          null
        );
      })
    );
}


/**
 * ============================================================
 * GUARD: USUARIO AUTENTICADO
 * ============================================================
 *
 * Permite entrar a cualquier usuario con sesión válida.
 */
export const authGuard:
  CanActivateFn =
  () => {

    const auth =
      inject(AuthService);

    const router =
      inject(Router);


    return resolverUsuario(
      auth
    ).pipe(

      map((usuario) => {

        if (usuario) {

          return true;
        }


        return router.createUrlTree([
          '/login'
        ]);
      })
    );
  };


/**
 * ============================================================
 * GUARD: CANDIDATO
 * ============================================================
 *
 * Solo permite:
 *
 * rol.nombre === "candidato"
 */
export const candidatoGuard:
  CanActivateFn =
  () => {

    const auth =
      inject(AuthService);

    const router =
      inject(Router);


    return resolverUsuario(
      auth
    ).pipe(

      map((usuario) => {

        if (!usuario) {

          return router.createUrlTree([
            '/login'
          ]);
        }


        if (
          usuario.rol.nombre ===
          'candidato'
        ) {

          return true;
        }


        /**
         * Un reclutador o administrador no debe
         * entrar a la sección "Mis postulaciones".
         */
        return router.createUrlTree([
          '/reclutador'
        ]);
      })
    );
  };


/**
 * ============================================================
 * GUARD: RECLUTAMIENTO
 * ============================================================
 *
 * Permite:
 *
 * - administrador;
 * - reclutador.
 */
export const reclutadorGuard:
  CanActivateFn =
  () => {

    const auth =
      inject(AuthService);

    const router =
      inject(Router);


    return resolverUsuario(
      auth
    ).pipe(

      map((usuario) => {

        if (!usuario) {

          return router.createUrlTree([
            '/login'
          ]);
        }


        const rol =
          usuario.rol.nombre;


        if (
          rol === 'reclutador' ||
          rol === 'administrador'
        ) {

          return true;
        }


        /**
         * Un candidato que intente escribir manualmente:
         *
         * /reclutador
         *
         * será enviado al catálogo.
         */
        return router.createUrlTree([
          '/vacantes'
        ]);
      })
    );
  };