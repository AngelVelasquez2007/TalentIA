/**
 * ============================================================
 * TalentIA - Rutas principales
 * Archivo: src/app/app.routes.ts
 * ============================================================
 */

import {
  Routes
} from '@angular/router';

import {
  Vacantes
} from './pages/vacantes/vacantes';

import {
  Login
} from './pages/login/login';

import {
  Registro
} from './pages/registro/registro';

import {
  Postulaciones
} from './pages/postulaciones/postulaciones';

import {
  Reclutador
} from './pages/reclutador/reclutador';

import {
  Perfil
} from './pages/perfil/perfil';

import {
  candidatoGuard,
  reclutadorGuard
} from './guards/auth.guard';


export const routes:
  Routes = [

    {
      path: '',
      pathMatch: 'full',
      redirectTo: 'vacantes'
    },


    {
      path: 'vacantes',
      component: Vacantes,
      title:
        'Vacantes | TalentIA'
    },


    {
      path: 'login',
      component: Login,
      title:
        'Iniciar sesión | TalentIA'
    },


    {
      path: 'registro',
      component: Registro,
      title:
        'Crear cuenta | TalentIA'
    },


    /**
     * Perfil profesional exclusivo del candidato.
     */
    {
      path: 'perfil',
      component: Perfil,

      canActivate: [
        candidatoGuard
      ],

      title:
        'Mi perfil | TalentIA'
    },


    {
      path: 'postulaciones',
      component: Postulaciones,

      canActivate: [
        candidatoGuard
      ],

      title:
        'Mis postulaciones | TalentIA'
    },


    {
      path: 'reclutador',
      component: Reclutador,

      canActivate: [
        reclutadorGuard
      ],

      title:
        'Panel de reclutamiento | TalentIA'
    },


    {
      path: '**',
      redirectTo: 'vacantes'
    }
  ];