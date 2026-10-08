/**
 * ============================================================
 * TalentIA - Página de inicio de sesión
 * Archivo: src/app/pages/login/login.ts
 * ============================================================
 *
 * Esta pantalla permite autenticar usuarios contra FastAPI.
 *
 * FLUJO:
 *
 * Usuario
 *    ↓
 * formulario Angular
 *    ↓
 * AuthService.login()
 *    ↓
 * POST /auth/login
 *    ↓
 * FastAPI verifica contraseña
 *    ↓
 * devuelve JWT
 *    ↓
 * Angular guarda JWT en sessionStorage
 *    ↓
 * GET /auth/me
 *    ↓
 * se obtiene usuario + rol
 *    ↓
 * redirección según rol
 *
 * ============================================================
 */

import {
  Component
} from '@angular/core';

import {
  CommonModule
} from '@angular/common';

import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  Router,
  RouterLink
} from '@angular/router';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  switchMap
} from 'rxjs';

import {
  AuthService
} from '../../services/auth';


@Component({
  selector: 'app-login',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],

  templateUrl: './login.html',

  styleUrl: './login.scss'
})
export class Login {

  /**
   * Formulario reactivo.
   */
  formulario: FormGroup;


  /**
   * Controla el estado visual mientras FastAPI responde.
   */
  cargando = false;


  /**
   * Mensaje mostrado cuando ocurre un error.
   */
  error = '';


  /**
   * Permite mostrar/ocultar la contraseña.
   */
  mostrarPassword = false;


  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {

    /**
     * Creamos las reglas del formulario.
     *
     * email:
     * - obligatorio;
     * - formato email.
     *
     * password:
     * - obligatorio;
     * - mínimo 8 caracteres.
     */
    this.formulario =
      this.fb.group({

        email: [
          '',
          [
            Validators.required,
            Validators.email
          ]
        ],

        password: [
          '',
          [
            Validators.required,
            Validators.minLength(8)
          ]
        ]
      });
  }


  // ==========================================================
  // 1. ACCESO CÓMODO A CONTROLES
  // ==========================================================

  /**
   * Facilita el uso desde el HTML:
   *
   * email.invalid
   * password.invalid
   */
  get email() {
    return this.formulario.get(
      'email'
    );
  }


  get password() {
    return this.formulario.get(
      'password'
    );
  }


  // ==========================================================
  // 2. MOSTRAR / OCULTAR PASSWORD
  // ==========================================================

  alternarPassword(): void {

    this.mostrarPassword =
      !this.mostrarPassword;
  }


  // ==========================================================
  // 3. INICIAR SESIÓN
  // ==========================================================

  iniciarSesion(): void {

    this.error = '';


    // --------------------------------------------------------
    // VALIDAR FORMULARIO
    // --------------------------------------------------------

    if (this.formulario.invalid) {

      /**
       * Hace que Angular muestre los errores aunque el usuario
       * no haya tocado todos los campos.
       */
      this.formulario.markAllAsTouched();

      return;
    }


    this.cargando = true;


    // --------------------------------------------------------
    // OBTENER DATOS
    // --------------------------------------------------------

    const datos = {

      email:
        this.formulario.value.email
          .trim()
          .toLowerCase(),

      password:
        this.formulario.value.password
    };


    // --------------------------------------------------------
    // LOGIN + OBTENER /auth/me
    // --------------------------------------------------------

    /**
     * switchMap permite encadenar dos peticiones:
     *
     * 1. login()
     * 2. cargarUsuarioActual()
     *
     * La segunda se ejecuta únicamente si la primera fue
     * exitosa.
     */
    this.auth
      .login(datos)
      .pipe(

        switchMap(() =>
          this.auth
            .cargarUsuarioActual()
        )

      )
      .subscribe({

        next: (usuario) => {

          this.cargando = false;


          // --------------------------------------------------
          // REDIRECCIÓN SEGÚN ROL
          // --------------------------------------------------

          const rol =
            usuario.rol.nombre;


          /**
           * Reclutadores y administradores irán al panel
           * administrativo.
           *
           * Crearemos esta ruta en los siguientes parches.
           */
          if (
            rol === 'reclutador' ||
            rol === 'administrador'
          ) {

            this.router.navigate([
              '/reclutador'
            ]);

            return;
          }


          /**
           * Los candidatos ingresan al catálogo.
           */
          this.router.navigate([
            '/vacantes'
          ]);
        },


        error: (
          respuesta: HttpErrorResponse
        ) => {

          this.cargando = false;


          // --------------------------------------------------
          // MENSAJES DE ERROR AMIGABLES
          // --------------------------------------------------

          if (
            respuesta.status === 401
          ) {

            this.error =
              'Correo o contraseña incorrectos.';

            return;
          }


          if (
            respuesta.status === 403
          ) {

            this.error =
              'Tu cuenta se encuentra desactivada.';

            return;
          }


          if (
            respuesta.status === 0
          ) {

            this.error =
              'No se pudo conectar con el servidor. ' +
              'Verifica que FastAPI esté ejecutándose.';

            return;
          }


          /**
           * Si FastAPI devuelve detail, lo utilizamos.
           */
          this.error =
            respuesta.error?.detail ||
            'Ocurrió un error al iniciar sesión.';
        }
      });
  }
}