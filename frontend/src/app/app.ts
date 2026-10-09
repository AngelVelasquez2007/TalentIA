/**
 * ============================================================
 * TalentIA - Componente raíz
 * Archivo: src/app/app.ts
 * ============================================================
 */

import {
  Component,
  OnDestroy,
  OnInit
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  NavigationEnd,
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet
} from '@angular/router';

import {
  Subject,
  filter,
  takeUntil
} from 'rxjs';

import {
  AuthService
} from './services/auth';

import {
  ThemeService
} from './services/theme';


@Component({
  selector: 'app-root',

  standalone: true,

  imports: [
    CommonModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive
  ],

  templateUrl:
    './app.html',

  styleUrl:
    './app.scss'
})
export class App
  implements OnInit, OnDestroy {

  menuAbierto = false;


  private readonly destruir$ =
    new Subject<void>();


  constructor(
    public readonly auth:
      AuthService,

    public readonly theme:
      ThemeService,

    private readonly router:
      Router
  ) {}


  ngOnInit(): void {

    /**
     * Restauramos una sola sesión compartida.
     */
    const restauracion =
      this.auth
        .restaurarSesion();


    restauracion
      ?.subscribe({

        error: () => {

          this.auth
            .limpiarSesion();
        }
      });


    /**
     * Si el usuario navega, cerramos cualquier menú móvil
     * que haya quedado abierto.
     */
    this.router.events
      .pipe(

        filter(
          (
            evento
          ): evento is NavigationEnd =>
            evento instanceof NavigationEnd
        ),

        takeUntil(
          this.destruir$
        )
      )
      .subscribe(
        () => {

          this.menuAbierto =
            false;
        }
      );
  }


  ngOnDestroy(): void {

    this.destruir$.next();

    this.destruir$.complete();
  }


  alternarMenu(): void {

    this.menuAbierto =
      !this.menuAbierto;
  }


  cerrarMenu(): void {

    this.menuAbierto =
      false;
  }


  alternarTema(): void {

    this.theme.toggle();
  }


  get inicialUsuario():
    string {

    const nombre =
      this.auth.usuario
        ?.nombre;


    if (!nombre) {

      return '?';
    }


    return nombre
      .charAt(0)
      .toUpperCase();
  }


  get etiquetaRol():
    string {

    const rol =
      this.auth.usuario
        ?.rol?.nombre;


    switch (rol) {

      case 'administrador':
        return 'Administrador';

      case 'reclutador':
        return 'Reclutador';

      case 'candidato':
        return 'Candidato';

      default:
        return '';
    }
  }


  cerrarSesion(): void {

    this.auth.logout();

    this.cerrarMenu();


    void this.router.navigate([
      '/login'
    ]);
  }
}
