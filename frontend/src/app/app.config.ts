/**
 * ============================================================
 * TalentIA - Configuración global Angular
 * Archivo: src/app/app.config.ts
 * ============================================================
 *
 * Configura:
 *
 * - manejo global de errores;
 * - Zone.js;
 * - Router;
 * - HttpClient;
 * - JWT;
 * - timeout global de FastAPI.
 *
 * ============================================================
 */

import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection
} from '@angular/core';

import {
  provideRouter
} from '@angular/router';

import {
  provideHttpClient,
  withInterceptors
} from '@angular/common/http';

import {
  routes
} from './app.routes';

import {
  authInterceptor
} from './interceptors/auth-interceptor';

import {
  apiTimeoutInterceptor
} from './services/api-timeout.interceptor';


export const appConfig:
  ApplicationConfig = {

    providers: [

      // ======================================================
      // ERRORES GLOBALES
      // ======================================================

      provideBrowserGlobalErrorListeners(),


      // ======================================================
      // DETECCIÓN DE CAMBIOS
      // ======================================================

      /**
       * Utilizamos Zone.js sin coalescing adicional.
       *
       * En esta aplicación preferimos que las actualizaciones
       * de estados HTTP se reflejen inmediatamente:
       *
       * cargando = false
       * guardando = false
       * analizando = false
       * etc.
       */
      provideZoneChangeDetection(),


      // ======================================================
      // ROUTER
      // ======================================================

      provideRouter(
        routes
      ),


      // ======================================================
      // HTTP
      // ======================================================

      provideHttpClient(

        withInterceptors([

          /**
           * Primero agrega:
           *
           * Authorization: Bearer JWT
           */
          authInterceptor,


          /**
           * Después protege contra llamadas que permanezcan
           * indefinidamente pendientes.
           */
          apiTimeoutInterceptor

        ])
      )
    ]
  };