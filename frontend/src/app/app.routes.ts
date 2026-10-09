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
  invitadoGuard,
  reclutadorGuard
} from './guards/auth.guard';


export const routes:
  Routes = [

    {
      path: '',
      pathMatch: 'full',
      redirectTo: 'vacantes'
    },


    // ========================================================
    // PÚBLICA
    // ========================================================

    {
      path: 'vacantes',
      component: Vacantes,
      title:
        'Vacantes | TalentIA'
    },


    // ========================================================
    // SOLO VISITANTES
    // ========================================================

    {
      path: 'login',
      component: Login,

      canActivate: [
        invitadoGuard
      ],

      title:
        'Iniciar sesión | TalentIA'
    },


    {
      path: 'registro',
      component: Registro,

      canActivate: [
        invitadoGuard
      ],

      title:
        'Crear cuenta | TalentIA'
    },


    // ========================================================
    // CANDIDATO
    // ========================================================

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


    // ========================================================
    // RECLUTAMIENTO
    // ========================================================

    {
      path: 'reclutador',
      component: Reclutador,

      canActivate: [
        reclutadorGuard
      ],

      title:
        'Panel de reclutamiento | TalentIA'
    },


    // ========================================================
    // 404 LOCAL
    // ========================================================

    {
      path: '**',
      redirectTo: 'vacantes'
    }
  ];
