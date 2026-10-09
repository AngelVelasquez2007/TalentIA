/**
 * ============================================================
 * TalentIA - Servicio global de tema
 * Archivo: src/app/services/theme.ts
 * ============================================================
 *
 * Gestiona el modo visual de toda la aplicación.
 *
 * TEMAS:
 *
 * - light
 * - dark
 *
 * FUNCIONAMIENTO:
 *
 * 1. Busca una preferencia guardada en localStorage.
 * 2. Si no existe, utiliza la preferencia del sistema.
 * 3. Aplica data-theme al elemento <html>.
 * 4. Guarda los cambios realizados por el usuario.
 *
 * Ejemplo:
 *
 * <html data-theme="dark">
 *
 * ============================================================
 */

import {
  Injectable
} from '@angular/core';

import {
  BehaviorSubject
} from 'rxjs';


export type AppTheme =
  | 'light'
  | 'dark';


@Injectable({
  providedIn: 'root'
})
export class ThemeService {

  /**
   * Clave utilizada en localStorage.
   */
  private readonly storageKey =
    'talentia_theme';


  /**
   * Tema inicial.
   */
  private readonly themeSubject =
    new BehaviorSubject<AppTheme>(
      this.obtenerTemaInicial()
    );


  /**
   * Observable disponible por si posteriormente
   * queremos reaccionar al cambio de tema.
   */
  readonly theme$ =
    this.themeSubject.asObservable();


  constructor() {

    /**
     * Aplicamos el tema inmediatamente cuando
     * Angular crea el servicio.
     */
    this.aplicarTema(
      this.themeSubject.value
    );
  }


  // ==========================================================
  // TEMA ACTUAL
  // ==========================================================

  get theme(): AppTheme {

    return this.themeSubject.value;
  }


  get isDark(): boolean {

    return (
      this.themeSubject.value ===
      'dark'
    );
  }


  // ==========================================================
  // ALTERNAR
  // ==========================================================

  toggle(): void {

    const nuevoTema:
      AppTheme =
      this.isDark
        ? 'light'
        : 'dark';


    this.setTheme(
      nuevoTema
    );
  }


  // ==========================================================
  // CAMBIAR TEMA
  // ==========================================================

  setTheme(
    theme: AppTheme
  ): void {

    this.themeSubject.next(
      theme
    );


    this.aplicarTema(
      theme
    );


    try {

      localStorage.setItem(
        this.storageKey,
        theme
      );

    } catch {

      /**
       * Si el navegador bloquea almacenamiento,
       * el cambio visual seguirá funcionando durante
       * la sesión actual.
       */
    }
  }


  // ==========================================================
  // TEMA INICIAL
  // ==========================================================

  private obtenerTemaInicial():
    AppTheme {

    try {

      const guardado =
        localStorage.getItem(
          this.storageKey
        );


      if (
        guardado === 'light' ||
        guardado === 'dark'
      ) {

        return guardado;
      }

    } catch {
      // Continuamos con preferencia del sistema.
    }


    /**
     * Si el usuario utiliza modo oscuro en Windows,
     * macOS, Android, etc., TalentIA lo respeta inicialmente.
     */
    if (
      typeof window !== 'undefined' &&
      window.matchMedia &&
      window.matchMedia(
        '(prefers-color-scheme: dark)'
      ).matches
    ) {

      return 'dark';
    }


    return 'light';
  }


  // ==========================================================
  // APLICAR
  // ==========================================================

  private aplicarTema(
    theme: AppTheme
  ): void {

    if (
      typeof document ===
      'undefined'
    ) {

      return;
    }


    document.documentElement
      .setAttribute(
        'data-theme',
        theme
      );
  }
}