/**
 * ============================================================
 * TalentIA - Configuración global de Angular
 * Archivo: src/app/app.config.ts
 * ============================================================
 *
 * Este archivo registra servicios globales utilizados
 * por toda la aplicación.
 *
 * CONFIGURA:
 *
 * - manejo global de errores;
 * - detección de cambios con Zone.js;
 * - Angular Router;
 * - HttpClient;
 * - interceptor JWT.
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


export const appConfig:
  ApplicationConfig = {

    providers: [

      /**
       * Registra el sistema moderno de captura de errores
       * globales de Angular.
       */
      provideBrowserGlobalErrorListeners(),


      /**
       * TalentIA utiliza Zone.js para detectar cambios
       * producidos por:
       *
       * - eventos;
       * - formularios;
       * - peticiones HTTP;
       * - temporizadores.
       *
       * eventCoalescing mejora el rendimiento agrupando
       * determinados eventos.
       */
      provideZoneChangeDetection({
        eventCoalescing: true
      }),


      /**
       * Activa Angular Router utilizando las rutas definidas
       * en app.routes.ts.
       */
      provideRouter(
        routes
      ),


      /**
       * Habilita HttpClient para consumir FastAPI.
       *
       * Además registra nuestro interceptor JWT.
       */
      provideHttpClient(
        withInterceptors([
          authInterceptor
        ])
      )
    ]
  };