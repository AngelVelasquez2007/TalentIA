/**
 * ============================================================
 * TalentIA - Componente raíz
 * Archivo: src/app/app.ts
 * ============================================================
 *
 * Es el componente principal de toda la aplicación.
 *
 * RESPONSABILIDADES:
 *
 * - renderizar navegación global;
 * - renderizar router-outlet;
 * - exponer AuthService al template;
 * - restaurar una sesión existente al iniciar Angular.
 *
 * ============================================================
 */

import {
  Component,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  RouterLink,
  RouterOutlet
} from '@angular/router';

import {
  AuthService
} from './services/auth';


@Component({
  selector: 'app-root',

  standalone: true,

  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink
  ],

  templateUrl:
    './app.html',

  styleUrl:
    './app.scss'
})
export class App
  implements OnInit {

  constructor(
    /**
     * Es public para que app.html pueda utilizar:
     *
     * auth.autenticado
     * auth.usuario
     * auth.logout()
     */
    public readonly auth:
      AuthService
  ) {}


  // ==========================================================
  // INICIALIZACIÓN
  // ==========================================================

  ngOnInit(): void {

    /**
     * Si no existe JWT, no hay nada que restaurar.
     */
    const restauracion =
      this.auth
        .restaurarSesion();


    if (!restauracion) {

      return;
    }


    /**
     * Si existe un token almacenado consultamos /auth/me.
     *
     * Si el token sigue siendo válido, AuthService recuperará
     * el usuario.
     *
     * Si está vencido, limpiamos la sesión.
     */
    restauracion.subscribe({

      error: () => {

        this.auth
          .limpiarSesion();
      }
    });
  }
}