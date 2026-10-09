/**
 * ============================================================
 * TalentIA - Timeout global de la API
 * Archivo: src/app/services/api-timeout.interceptor.ts
 * ============================================================
 *
 * Evita que una petición hacia FastAPI permanezca
 * indefinidamente en estado "pending".
 *
 * Esto protege pantallas como:
 *
 * - Vacantes
 * - Perfil
 * - Postulaciones
 * - Reclutador
 * - Login
 * - Registro
 * - Matching
 *
 * Si FastAPI tarda más de 15 segundos, Angular recibe
 * un HttpErrorResponse y puede liberar cualquier loader.
 *
 * ============================================================
 */

import {
  HttpErrorResponse,
  HttpInterceptorFn
} from '@angular/common/http';

import {
  TimeoutError,
  catchError,
  throwError,
  timeout
} from 'rxjs';


/**
 * Backend local oficial de TalentIA.
 */
const API_BASE =
  'http://127.0.0.1:8000';


/**
 * Tiempo máximo por petición.
 */
const API_TIMEOUT_MS =
  15000;


/**
 * Interceptor funcional.
 */
export const apiTimeoutInterceptor:
  HttpInterceptorFn =
  (
    request,
    next
  ) => {

    /**
     * No aplicamos timeout a recursos que no pertenezcan
     * a nuestro backend.
     */
    if (
      !request.url.startsWith(
        API_BASE
      )
    ) {

      return next(
        request
      );
    }


    return next(
      request
    )
      .pipe(

        /**
         * Si la petición no termina dentro del límite,
         * RxJS genera TimeoutError.
         */
        timeout({
          each:
            API_TIMEOUT_MS
        }),


        catchError(
          (error: unknown) => {

            // =================================================
            // TIMEOUT
            // =================================================

            if (
              error instanceof
              TimeoutError
            ) {

              console.error(
                'TalentIA - Timeout API:',
                request.method,
                request.url
              );


              return throwError(
                () =>
                  new HttpErrorResponse({

                    status:
                      0,

                    statusText:
                      'API Timeout',

                    url:
                      request.url,

                    error: {
                      detail:
                        (
                          'FastAPI tardó demasiado en responder. ' +
                          'Verifica el backend y vuelve a intentarlo.'
                        )
                    }
                  })
              );
            }


            // =================================================
            // OTROS ERRORES
            // =================================================

            return throwError(
              () => error
            );
          }
        )
      );
  };