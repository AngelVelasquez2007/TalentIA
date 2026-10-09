/**
 * ============================================================
 * TalentIA - Interceptor JWT
 * Archivo: src/app/interceptors/auth-interceptor.ts
 * ============================================================
 *
 * - Adjunta el JWT únicamente a nuestra API.
 * - No adjunta un token antiguo a login o registro.
 * - Limpia JWT vencidos.
 * - Solo fuerza /login cuando el usuario estaba en una
 *   sección protegida.
 * ============================================================
 */

import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';

import {
  inject
} from '@angular/core';

import {
  Router
} from '@angular/router';

import {
  catchError,
  throwError
} from 'rxjs';

import {
  AuthService
} from '../services/auth';


const API_BASE_URL =
  'http://127.0.0.1:8000';


const RUTAS_AUTH_PUBLICAS = [
  '/auth/login',
  '/auth/register'
];


const RUTAS_PROTEGIDAS_FRONTEND = [
  '/perfil',
  '/postulaciones',
  '/reclutador'
];


export const authInterceptor:
  HttpInterceptorFn =
  (
    request,
    next
  ) => {

    const auth =
      inject(
        AuthService
      );

    const router =
      inject(
        Router
      );


    const esBackend =
      request.url.startsWith(
        API_BASE_URL
      );


    const esAuthPublica =
      RUTAS_AUTH_PUBLICAS
        .some(
          (ruta) =>
            request.url.includes(
              ruta
            )
        );


    const token =
      auth.obtenerToken();


    let requestFinal =
      request;


    /**
     * Login y registro deben ejecutarse sin reutilizar
     * accidentalmente un JWT antiguo.
     */
    if (
      esBackend &&
      !esAuthPublica &&
      token
    ) {

      requestFinal =
        request.clone({
          setHeaders: {
            Authorization:
              `Bearer ${token}`
          }
        });
    }


    return next(
      requestFinal
    )
      .pipe(

        catchError(
          (
            error:
              HttpErrorResponse
          ) => {

            if (
              error.status === 401 &&
              !esAuthPublica &&
              token
            ) {

              auth.limpiarSesion();


              /**
               * /vacantes es pública. Si el JWT expiró
               * mientras el usuario estaba allí, simplemente
               * dejamos la sesión cerrada.
               *
               * Para secciones privadas sí enviamos a login.
               */
              const rutaActual =
                router.url
                  .split('?')[0]
                  .split('#')[0];


              const estabaEnRutaProtegida =
                RUTAS_PROTEGIDAS_FRONTEND
                  .some(
                    (ruta) =>
                      rutaActual.startsWith(
                        ruta
                      )
                  );


              if (
                estabaEnRutaProtegida
              ) {

                void router.navigate(
                  ['/login'],
                  {
                    queryParams: {
                      returnUrl:
                        rutaActual,

                      sesion:
                        'expirada'
                    }
                  }
                );
              }
            }


            return throwError(
              () => error
            );
          }
        )
      );
  };
