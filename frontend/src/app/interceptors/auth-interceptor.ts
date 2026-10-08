/**
 * ============================================================
 * TalentIA - Interceptor de autenticación JWT
 * Archivo: src/app/interceptors/auth-interceptor.ts
 * ============================================================
 *
 * Este interceptor se ejecuta automáticamente antes de cada
 * petición HTTP realizada por Angular.
 *
 * RESPONSABILIDADES:
 *
 * 1. Detectar peticiones dirigidas al backend TalentIA.
 * 2. Obtener el JWT almacenado por AuthService.
 * 3. Agregar:
 *
 *      Authorization: Bearer TOKEN
 *
 * 4. Detectar respuestas HTTP 401.
 * 5. Limpiar una sesión inválida o vencida.
 *
 * FLUJO:
 *
 * Componente
 *    |
 *    v
 * Servicio Angular
 *    |
 *    v
 * HttpClient
 *    |
 *    v
 * authInterceptor
 *    |
 *    | Authorization: Bearer JWT
 *    v
 * FastAPI
 *
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


/**
 * Dirección base del backend.
 *
 * Solo agregaremos el JWT a peticiones destinadas a TalentIA.
 *
 * Esto es importante porque no debemos enviar nuestro token
 * accidentalmente a otros servidores externos.
 */
const API_BASE_URL =
  'http://127.0.0.1:8000';


/**
 * Interceptor funcional.
 *
 * Angular moderno permite interceptores mediante funciones
 * en lugar de clases que implementan HttpInterceptor.
 */
export const authInterceptor:
  HttpInterceptorFn =
  (request, next) => {

    // --------------------------------------------------------
    // 1. OBTENER DEPENDENCIAS
    // --------------------------------------------------------

    const auth =
      inject(AuthService);

    const router =
      inject(Router);


    // --------------------------------------------------------
    // 2. COMPROBAR SI LA PETICIÓN ES HACIA TALENTIA
    // --------------------------------------------------------

    const esPeticionBackend =
      request.url.startsWith(
        API_BASE_URL
      );


    // --------------------------------------------------------
    // 3. OBTENER JWT
    // --------------------------------------------------------

    const token =
      auth.obtenerToken();


    // --------------------------------------------------------
    // 4. CLONAR PETICIÓN Y AGREGAR AUTHORIZATION
    // --------------------------------------------------------

    /**
     * Los objetos HttpRequest son inmutables.
     *
     * No podemos hacer:
     *
     * request.headers = ...
     *
     * Por eso Angular utiliza:
     *
     * request.clone()
     */

    let requestFinal = request;

    if (
      esPeticionBackend &&
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


    // --------------------------------------------------------
    // 5. ENVIAR PETICIÓN
    // --------------------------------------------------------

    return next(
      requestFinal
    ).pipe(

      // ------------------------------------------------------
      // 6. MANEJAR ERRORES HTTP
      // ------------------------------------------------------

      catchError(
        (
          error: HttpErrorResponse
        ) => {

          /**
           * HTTP 401 significa que FastAPI no pudo autenticar
           * correctamente la petición.
           *
           * Puede ocurrir porque:
           *
           * - el JWT venció;
           * - fue modificado;
           * - tiene firma inválida;
           * - el usuario ya no existe.
           */

          if (
            error.status === 401 &&
            token
          ) {

            // Limpiamos la sesión local.
            auth.limpiarSesion();

            /**
             * Evitamos redirigir innecesariamente cuando
             * ya estamos intentando iniciar sesión.
             *
             * Un login con contraseña incorrecta también
             * devuelve HTTP 401.
             */
            const esLogin =
              request.url.includes(
                '/auth/login'
              );

            if (!esLogin) {

              router.navigate([
                '/login'
              ]);

            }
          }


          /**
           * El error debe continuar hacia el componente.
           *
           * Así las pantallas también pueden mostrar:
           *
           * "Correo o contraseña incorrectos"
           *
           * "No tienes permisos"
           *
           * etc.
           */
          return throwError(
            () => error
          );
        }
      )
    );
  };