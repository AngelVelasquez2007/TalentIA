/**
 * ============================================================
 * TalentIA - Servicio de autenticación
 * Archivo: src/app/services/auth.ts
 * ============================================================
 *
 * Gestiona:
 * - registro;
 * - login;
 * - JWT;
 * - usuario autenticado;
 * - restauración de sesión;
 * - roles;
 * - logout.
 *
 * La validación real del JWT y de los permisos permanece
 * siempre en FastAPI.
 * ============================================================
 */

import {
  Injectable
} from '@angular/core';

import {
  HttpClient
} from '@angular/common/http';

import {
  BehaviorSubject,
  Observable,
  finalize,
  of,
  shareReplay,
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

  private readonly apiUrl =
    'http://127.0.0.1:8000/auth';


  private readonly tokenKey =
    'talentia_access_token';


  private readonly usuarioSubject =
    new BehaviorSubject<Usuario | null>(
      null
    );


  readonly usuario$ =
    this.usuarioSubject
      .asObservable();


  /**
   * Petición compartida mientras Angular reconstruye
   * una sesión a partir del JWT existente.
   *
   * Evita varias llamadas concurrentes a /auth/me.
   */
  private restauracionEnCurso$:
    Observable<Usuario> | null =
    null;


  constructor(
    private readonly http:
      HttpClient
  ) {}


  // ==========================================================
  // ESTADO ACTUAL
  // ==========================================================

  get usuario():
    Usuario | null {

    return this
      .usuarioSubject
      .value;
  }


  get autenticado():
    boolean {

    return (
      this.obtenerToken() !==
      null
    );
  }


  obtenerUsuarioActual():
    Usuario | null {

    return this.usuario;
  }


  estaAutenticado():
    boolean {

    return this.autenticado;
  }


  // ==========================================================
  // REGISTRO
  // ==========================================================

  registrar(
    datos:
      RegistroRequest
  ): Observable<Usuario> {

    return this.http
      .post<Usuario>(
        `${this.apiUrl}/register`,
        datos
      );
  }


  // ==========================================================
  // LOGIN
  // ==========================================================

  login(
    datos:
      LoginRequest
  ): Observable<TokenResponse> {

    /**
     * Evitamos una sesión mezclada si el navegador
     * todavía tenía información anterior.
     */
    this.eliminarToken();

    this.usuarioSubject.next(
      null
    );

    this.restauracionEnCurso$ =
      null;


    return this.http
      .post<TokenResponse>(
        `${this.apiUrl}/login`,
        datos
      )
      .pipe(

        tap(
          (respuesta) => {

            this.guardarToken(
              respuesta.access_token
            );
          }
        )
      );
  }


  // ==========================================================
  // USUARIO AUTENTICADO
  // ==========================================================

  cargarUsuarioActual():
    Observable<Usuario> {

    return this.http
      .get<Usuario>(
        `${this.apiUrl}/me`
      )
      .pipe(

        tap(
          (usuario) => {

            this.usuarioSubject.next(
              usuario
            );
          }
        )
      );
  }


  // ==========================================================
  // RESTAURACIÓN DE SESIÓN
  // ==========================================================

  restaurarSesion():
    Observable<Usuario> | null {

    // Ya tenemos el usuario cargado.
    if (
      this.usuarioSubject.value
    ) {

      return of(
        this.usuarioSubject.value
      );
    }


    // No existe JWT que restaurar.
    if (
      !this.obtenerToken()
    ) {

      return null;
    }


    // Ya existe una restauración activa.
    if (
      this.restauracionEnCurso$
    ) {

      return this
        .restauracionEnCurso$;
    }


    const solicitud =
      this.cargarUsuarioActual()
        .pipe(

          finalize(
            () => {

              this.restauracionEnCurso$ =
                null;
            }
          ),

          shareReplay({
            bufferSize: 1,
            refCount: false
          })
        );


    this.restauracionEnCurso$ =
      solicitud;


    return solicitud;
  }


  // ==========================================================
  // ROLES
  // ==========================================================

  tieneRol(
    rol:
      string
  ): boolean {

    const usuario =
      this.usuario;


    if (!usuario) {

      return false;
    }


    return (
      usuario
        .rol
        .nombre
        .toLowerCase()
      ===
      rol.toLowerCase()
    );
  }


  tieneAlgunRol(
    roles:
      string[]
  ): boolean {

    const usuario =
      this.usuario;


    if (!usuario) {

      return false;
    }


    const actual =
      usuario
        .rol
        .nombre
        .toLowerCase();


    return roles
      .some(
        (rol) =>
          rol.toLowerCase() ===
          actual
      );
  }


  // ==========================================================
  // TOKEN
  // ==========================================================

  guardarToken(
    token:
      string
  ): void {

    sessionStorage.setItem(
      this.tokenKey,
      token
    );
  }


  obtenerToken():
    string | null {

    return sessionStorage
      .getItem(
        this.tokenKey
      );
  }


  eliminarToken():
    void {

    sessionStorage
      .removeItem(
        this.tokenKey
      );
  }


  // ==========================================================
  // LOGOUT / LIMPIEZA
  // ==========================================================

  logout():
    void {

    this.limpiarSesion();
  }


  limpiarSesion():
    void {

    this.eliminarToken();

    this.restauracionEnCurso$ =
      null;

    this.usuarioSubject.next(
      null
    );
  }
}
