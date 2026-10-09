/**
 * ============================================================
 * TalentIA - Componente raíz
 * Archivo: src/app/app.ts
 * ============================================================
 *
 * Este componente permanece activo durante toda la ejecución
 * de Angular.
 *
 * RESPONSABILIDADES:
 *
 * - mostrar la navegación principal;
 * - renderizar las páginas mediante router-outlet;
 * - restaurar una sesión existente;
 * - cerrar sesión;
 * - redirigir al catálogo después del logout.
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
  Router,
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
     * Public permite utilizar AuthService
     * directamente desde app.html.
     */
    public readonly auth:
      AuthService,

    private readonly router:
      Router
  ) {}


  // ==========================================================
  // INICIO DE LA APLICACIÓN
  // ==========================================================

  ngOnInit(): void {

    /**
     * Si existe JWT en sessionStorage intentamos recuperar
     * el usuario autenticado mediante GET /auth/me.
     */
    const restauracion =
      this.auth
        .restaurarSesion();


    /**
     * Si no existe JWT no hay sesión que restaurar.
     */
    if (!restauracion) {
      return;
    }


    restauracion.subscribe({

      /**
       * cargarUsuarioActual() ya actualiza internamente
       * el BehaviorSubject de AuthService.
       */
      next: () => {
        // No necesitamos realizar otra acción.
      },


      /**
       * Si el token está vencido o es inválido,
       * eliminamos la sesión almacenada.
       */
      error: () => {

        this.auth
          .limpiarSesion();
      }
    });
  }


  // ==========================================================
  // CERRAR SESIÓN
  // ==========================================================

  cerrarSesion(): void {

    /**
     * Elimina:
     *
     * - JWT de sessionStorage;
     * - usuario almacenado en AuthService.
     */
    this.auth.logout();


    /**
     * Después del logout regresamos al catálogo público.
     */
    this.router.navigate([
      '/vacantes'
    ]);
  }
}
