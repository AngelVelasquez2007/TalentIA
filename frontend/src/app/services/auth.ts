/**
 * ============================================================
 * TalentIA - Servicio de autenticación
 * Archivo: src/app/services/auth.ts
 * ============================================================
 *
 * Este servicio centraliza todo lo relacionado con:
 *
 * - registro;
 * - login;
 * - JWT;
 * - usuario autenticado;
 * - roles;
 * - cierre de sesión.
 *
 * FLUJO:
 *
 * Angular
 *    |
 *    | email + password
 *    v
 * POST /auth/login
 *    |
 *    v
 * FastAPI
 *    |
 *    v
 * JWT
 *    |
 *    v
 * sessionStorage
 *
 * Posteriormente el interceptor HTTP agregará:
 *
 * Authorization: Bearer TOKEN
 *
 * a las peticiones protegidas.
 * ============================================================
 */

import { Injectable } from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  BehaviorSubject,
  Observable,
  tap
} from 'rxjs';

import {
  LoginRequest,
  RegistroRequest,
  TokenResponse,
  Usuario
} from '../models/usuario';


@Injectable({
  providedIn: 'root'
})
export class AuthService {

  /**
   * URL base del backend FastAPI.
   *
   * Más adelante podríamos moverla a environments,
   * pero para la entrega local utilizamos esta URL.
   */
  private readonly apiUrl =
    'http://127.0.0.1:8000/auth';


  /**
   * Nombre utilizado para guardar el JWT.
   *
   * sessionStorage:
   *
   * - conserva el token mientras la pestaña/sesión exista;
   * - se elimina al cerrar completamente la sesión del navegador;
   * - evita persistencia indefinida como ocurriría con localStorage.
   */
  private readonly tokenKey =
    'talentia_access_token';


  /**
   * BehaviorSubject mantiene el estado actual del usuario.
   *
   * null:
   *     no hay usuario autenticado.
   *
   * Usuario:
   *     existe una sesión válida.
   */
  private readonly usuarioSubject =
    new BehaviorSubject<Usuario | null>(null);


  /**
   * Observable público.
   *
   * Los componentes pueden suscribirse sin modificar
   * directamente el estado interno.
   */
  readonly usuario$ =
    this.usuarioSubject.asObservable();

    /**
 * Usuario actual disponible directamente para las plantillas.
 *
 * usuario$ continúa disponible para programación reactiva,
 * mientras que este getter facilita condiciones visuales
 * dentro de los templates.
 */
get usuario(): Usuario | null {
  return this.usuarioSubject.value;
}


/**
 * Indica de forma sencilla si existe una sesión.
 *
 * La validación definitiva del JWT continúa realizándose
 * en FastAPI.
 */
get autenticado(): boolean {
  return this.estaAutenticado();
}

  constructor(
    private readonly http: HttpClient
  ) {}


  // ==========================================================
  // 1. REGISTRO
  // ==========================================================

  /**
   * Registra un nuevo candidato.
   *
   * El frontend NO envía rol.
   *
   * FastAPI asigna automáticamente:
   *
   *     candidato
   *
   * Esto evita que un usuario intente registrarse como
   * administrador modificando el formulario.
   */
  registrar(
    datos: RegistroRequest
  ): Observable<Usuario> {

    return this.http.post<Usuario>(
      `${this.apiUrl}/register`,
      datos
    );
  }


  // ==========================================================
  // 2. LOGIN
  // ==========================================================

  /**
   * Envía las credenciales al backend.
   *
   * Si son correctas:
   *
   * 1. FastAPI devuelve un JWT.
   * 2. Angular guarda el token.
   * 3. Posteriormente cargamos /auth/me.
   */
  login(
    datos: LoginRequest
  ): Observable<TokenResponse> {

    return this.http
      .post<TokenResponse>(
        `${this.apiUrl}/login`,
        datos
      )
      .pipe(
        tap((respuesta) => {

          this.guardarToken(
            respuesta.access_token
          );

        })
      );
  }


  // ==========================================================
  // 3. OBTENER USUARIO AUTENTICADO
  // ==========================================================

  /**
   * Consulta:
   *
   *     GET /auth/me
   *
   * El interceptor agregará automáticamente:
   *
   *     Authorization: Bearer JWT
   */
  cargarUsuarioActual():
    Observable<Usuario> {

    return this.http
      .get<Usuario>(
        `${this.apiUrl}/me`
      )
      .pipe(
        tap((usuario) => {

          this.usuarioSubject.next(
            usuario
          );

        })
      );
  }


  // ==========================================================
  // 4. ESTADO ACTUAL
  // ==========================================================

  /**
   * Permite leer el usuario inmediatamente sin necesidad
   * de realizar una suscripción.
   */
  obtenerUsuarioActual():
    Usuario | null {

    return this.usuarioSubject.value;
  }


  /**
   * Indica si existe un JWT almacenado.
   *
   * Tener un token no garantiza por sí solo que siga siendo
   * válido; FastAPI realiza la validación real.
   */
  estaAutenticado(): boolean {

    return this.obtenerToken() !== null;
  }


  // ==========================================================
  // 5. ROLES
  // ==========================================================

  /**
   * Comprueba si el usuario actual posee un rol.
   *
   * Ejemplo:
   *
   * auth.tieneRol('reclutador')
   */
  tieneRol(
    rol: string
  ): boolean {

    const usuario =
      this.usuarioSubject.value;

    if (!usuario) {
      return false;
    }

    return (
      usuario.rol.nombre
        .toLowerCase()
      ===
      rol.toLowerCase()
    );
  }


  /**
   * Permite comprobar varios roles.
   *
   * Ejemplo:
   *
   * auth.tieneAlgunRol([
   *   'administrador',
   *   'reclutador'
   * ])
   */
  tieneAlgunRol(
    roles: string[]
  ): boolean {

    const usuario =
      this.usuarioSubject.value;

    if (!usuario) {
      return false;
    }

    const rolActual =
      usuario.rol.nombre.toLowerCase();

    return roles
      .map((rol) =>
        rol.toLowerCase()
      )
      .includes(rolActual);
  }


  // ==========================================================
  // 6. JWT
  // ==========================================================

  /**
   * Guarda el JWT en sessionStorage.
   */
  guardarToken(
    token: string
  ): void {

    sessionStorage.setItem(
      this.tokenKey,
      token
    );
  }


  /**
   * Obtiene el JWT almacenado.
   *
   * Devuelve null si no existe.
   */
  obtenerToken():
    string | null {

    return sessionStorage.getItem(
      this.tokenKey
    );
  }


  /**
   * Elimina el JWT.
   */
  eliminarToken(): void {

    sessionStorage.removeItem(
      this.tokenKey
    );
  }


  // ==========================================================
  // 7. CIERRE DE SESIÓN
  // ==========================================================

  /**
   * Cierra la sesión local.
   *
   * TalentIA utiliza JWT stateless.
   *
   * Por eso el cierre efectivo consiste en:
   *
   * - eliminar el JWT;
   * - limpiar el usuario actual.
   */
  logout(): void {

    this.eliminarToken();

    this.usuarioSubject.next(
      null
    );
  }


  // ==========================================================
  // 8. RESTAURAR SESIÓN
  // ==========================================================

  /**
   * Se utilizará cuando Angular arranque.
   *
   * Si existe un JWT guardado intentamos consultar /auth/me.
   *
   * Esto permite mantener la sesión mientras la pestaña
   * permanezca abierta.
   */
  restaurarSesion():
    Observable<Usuario> | null {

    if (!this.obtenerToken()) {
      return null;
    }

    return this.cargarUsuarioActual();
  }


  // ==========================================================
  // 9. LIMPIAR SESIÓN INVÁLIDA
  // ==========================================================

  /**
   * Será utilizado por el interceptor cuando FastAPI
   * responda HTTP 401.
   */
  limpiarSesion(): void {

    this.eliminarToken();

    this.usuarioSubject.next(
      null
    );
  }
}