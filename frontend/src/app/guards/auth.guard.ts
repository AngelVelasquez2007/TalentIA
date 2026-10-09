/**
 * ============================================================
 * TalentIA - Guards de autenticación y roles
 * Archivo: src/app/guards/auth.guard.ts
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
  Observable,
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


function resolverUsuario(
  auth:
    AuthService
): Observable<Usuario | null> {

  const actual =
    auth.obtenerUsuarioActual();


  if (actual) {

    return of(
      actual
    );
  }


  const restauracion =
    auth.restaurarSesion();


  if (!restauracion) {

    return of(
      null
    );
  }


  return restauracion
    .pipe(

      catchError(
        () => {

          auth.limpiarSesion();

          return of(
            null
          );
        }
      )
    );
}


function rutaPrincipalUsuario(
  usuario:
    Usuario
): string {

  const rol =
    usuario
      .rol
      .nombre;


  if (
    rol === 'reclutador' ||
    rol === 'administrador'
  ) {

    return '/reclutador';
  }


  return '/vacantes';
}


// ============================================================
// AUTENTICADO
// ============================================================

export const authGuard:
  CanActivateFn =
  (
    route,
    state
  ) => {

    void route;

    const auth =
      inject(
        AuthService
      );

    const router =
      inject(
        Router
      );


    return resolverUsuario(
      auth
    )
      .pipe(

        map(
          (usuario) => {

            if (usuario) {

              return true;
            }


            return router
              .createUrlTree(
                ['/login'],
                {
                  queryParams: {
                    returnUrl:
                      state.url
                  }
                }
              );
          }
        )
      );
  };


// ============================================================
// SOLO CANDIDATO
// ============================================================

export const candidatoGuard:
  CanActivateFn =
  (
    route,
    state
  ) => {

    void route;

    const auth =
      inject(
        AuthService
      );

    const router =
      inject(
        Router
      );


    return resolverUsuario(
      auth
    )
      .pipe(

        map(
          (usuario) => {

            if (!usuario) {

              return router
                .createUrlTree(
                  ['/login'],
                  {
                    queryParams: {
                      returnUrl:
                        state.url
                    }
                  }
                );
            }


            if (
              usuario
                .rol
                .nombre ===
              'candidato'
            ) {

              return true;
            }


            return router
              .createUrlTree([
                '/reclutador'
              ]);
          }
        )
      );
  };


// ============================================================
// RECLUTADOR / ADMINISTRADOR
// ============================================================

export const reclutadorGuard:
  CanActivateFn =
  (
    route,
    state
  ) => {

    void route;

    const auth =
      inject(
        AuthService
      );

    const router =
      inject(
        Router
      );


    return resolverUsuario(
      auth
    )
      .pipe(

        map(
          (usuario) => {

            if (!usuario) {

              return router
                .createUrlTree(
                  ['/login'],
                  {
                    queryParams: {
                      returnUrl:
                        state.url
                    }
                  }
                );
            }


            const rol =
              usuario
                .rol
                .nombre;


            if (
              rol === 'reclutador' ||
              rol === 'administrador'
            ) {

              return true;
            }


            return router
              .createUrlTree([
                '/vacantes'
              ]);
          }
        )
      );
  };


// ============================================================
// SOLO VISITANTES
// ============================================================

/**
 * Evita que un usuario ya autenticado vuelva a /login
 * o /registro manualmente.
 */
export const invitadoGuard:
  CanActivateFn =
  () => {

    const auth =
      inject(
        AuthService
      );

    const router =
      inject(
        Router
      );


    return resolverUsuario(
      auth
    )
      .pipe(

        map(
          (usuario) => {

            if (!usuario) {

              return true;
            }


            return router
              .createUrlTree([
                rutaPrincipalUsuario(
                  usuario
                )
              ]);
          }
        )
      );
  };
