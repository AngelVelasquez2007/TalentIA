// Zone.js permite que Angular detecte automáticamente
// cambios producidos por eventos, peticiones HTTP,
// formularios, temporizadores, etc.
import 'zone.js';

import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

/*
 * bootstrapApplication inicia la aplicación Angular.
 *
 * App:
 *   Es el componente raíz.
 *
 * appConfig:
 *   Contiene proveedores globales como:
 *   - Router
 *   - HttpClient
 *   - Interceptor de autenticación
 *   - Zone Change Detection
 */
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));