/**
 * ============================================================
 * TalentIA - Página de registro
 * Archivo: src/app/pages/registro/registro.ts
 * ============================================================
 *
 * Permite registrar nuevos usuarios con rol "candidato".
 *
 * IMPORTANTE:
 *
 * El frontend NO permite escoger el rol.
 *
 * Cuando se envía:
 *
 * POST /auth/register
 *
 * FastAPI asigna automáticamente:
 *
 *     rol = candidato
 *
 * Esto evita que alguien modifique el formulario e intente
 * crearse una cuenta de administrador o reclutador.
 *
 * FLUJO:
 *
 * Formulario Angular
 *       ↓
 * Validaciones
 *       ↓
 * AuthService.registrar()
 *       ↓
 * POST /auth/register
 *       ↓
 * FastAPI
 *       ↓
 * PostgreSQL
 *       ↓
 * Redirección a /login
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
  AbstractControl,
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  Router,
  RouterLink
} from '@angular/router';

import {
  AuthService
} from '../../services/auth';


/**
 * ============================================================
 * VALIDADOR DE CONTRASEÑAS
 * ============================================================
 *
 * Comprueba que:
 *
 * password === confirmarPassword
 */
const passwordsIgualesValidator:
  ValidatorFn =
  (
    control: AbstractControl
  ): ValidationErrors | null => {

    const password =
      control.get('password')?.value;

    const confirmarPassword =
      control.get(
        'confirmarPassword'
      )?.value;


    if (
      !password ||
      !confirmarPassword
    ) {

      return null;
    }


    return (
      password === confirmarPassword
        ? null
        : {
            passwordsNoCoinciden:
              true
          }
    );
  };


@Component({
  selector: 'app-registro',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],

  templateUrl:
    './registro.html',

  styleUrl:
    './registro.scss'
})
export class Registro {

  /**
   * Formulario reactivo de registro.
   */
  formulario: FormGroup;


  /**
   * Estado visual mientras FastAPI procesa
   * la solicitud.
   */
  cargando = false;


  /**
   * Mensaje de error.
   */
  error = '';


  /**
   * Permite mostrar u ocultar la contraseña.
   */
  mostrarPassword = false;


  /**
   * Permite mostrar u ocultar la confirmación.
   */
  mostrarConfirmacion = false;


  constructor(
    private readonly fb:
      FormBuilder,

    private readonly auth:
      AuthService,

    private readonly router:
      Router
  ) {

    this.formulario =
      this.fb.group(
        {

          // --------------------------------------------------
          // NOMBRE
          // --------------------------------------------------

          nombre: [
            '',
            [
              Validators.required,
              Validators.minLength(2),
              Validators.maxLength(80)
            ]
          ],


          // --------------------------------------------------
          // APELLIDO
          // --------------------------------------------------

          apellido: [
            '',
            [
              Validators.required,
              Validators.minLength(2),
              Validators.maxLength(80)
            ]
          ],


          // --------------------------------------------------
          // EMAIL
          // --------------------------------------------------

          email: [
            '',
            [
              Validators.required,
              Validators.email
            ]
          ],


          // --------------------------------------------------
          // CONTRASEÑA
          // --------------------------------------------------

          /**
           * El backend exige:
           *
           * - mínimo 8 caracteres;
           * - al menos una letra;
           * - al menos un número.
           */
          password: [
            '',
            [
              Validators.required,

              Validators.minLength(
                8
              ),

              Validators.pattern(
                /^(?=.*[A-Za-z])(?=.*\d).+$/
              )
            ]
          ],


          // --------------------------------------------------
          // CONFIRMACIÓN
          // --------------------------------------------------

          confirmarPassword: [
            '',
            [
              Validators.required
            ]
          ]
        },

        {
          validators:
            passwordsIgualesValidator
        }
      );
  }


  // ==========================================================
  // ACCESOS RÁPIDOS AL FORMULARIO
  // ==========================================================

  get nombre() {

    return this.formulario.get(
      'nombre'
    );
  }


  get apellido() {

    return this.formulario.get(
      'apellido'
    );
  }


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


  get confirmarPassword() {

    return this.formulario.get(
      'confirmarPassword'
    );
  }


  // ==========================================================
  // MOSTRAR / OCULTAR CONTRASEÑAS
  // ==========================================================

  alternarPassword(): void {

    this.mostrarPassword =
      !this.mostrarPassword;
  }


  alternarConfirmacion(): void {

    this.mostrarConfirmacion =
      !this.mostrarConfirmacion;
  }


  // ==========================================================
  // REGISTRO
  // ==========================================================

  registrar(): void {

    this.error = '';


    // --------------------------------------------------------
    // VALIDAR FORMULARIO
    // --------------------------------------------------------

    if (
      this.formulario.invalid
    ) {

      this.formulario
        .markAllAsTouched();

      return;
    }


    this.cargando = true;


    // --------------------------------------------------------
    // CONSTRUIR PAYLOAD
    // --------------------------------------------------------

    const datos = {

      nombre:
        this.formulario
          .value
          .nombre
          .trim(),

      apellido:
        this.formulario
          .value
          .apellido
          .trim(),

      email:
        this.formulario
          .value
          .email
          .trim()
          .toLowerCase(),

      password:
        this.formulario
          .value
          .password
    };


    // --------------------------------------------------------
    // LLAMAR FASTAPI
    // --------------------------------------------------------

    this.auth
      .registrar(
        datos
      )
      .subscribe({

        next: () => {

          this.cargando =
            false;


          /**
           * Después del registro enviamos al login.
           *
           * La autenticación sigue siendo un paso separado:
           *
           * registro -> login -> JWT
           */
          this.router.navigate([
            '/login'
          ]);
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          this.cargando =
            false;

          this.error =
            this.obtenerMensajeError(
              respuesta
            );
        }
      });
  }


  // ==========================================================
  // MANEJO DE ERRORES
  // ==========================================================

  private obtenerMensajeError(
    respuesta: HttpErrorResponse
  ): string {

    /**
     * status 0 normalmente significa que Angular
     * no pudo establecer conexión con FastAPI.
     */
    if (
      respuesta.status === 0
    ) {

      return (
        'No fue posible conectar con el servidor. ' +
        'Verifica que FastAPI esté ejecutándose.'
      );
    }


    /**
     * 409 puede ocurrir si el correo ya existe.
     */
    if (
      respuesta.status === 409
    ) {

      return (
        typeof respuesta.error
          ?.detail ===
        'string'
          ? respuesta.error.detail
          : 'Ya existe una cuenta registrada con este correo.'
      );
    }


    /**
     * FastAPI puede devolver detail directamente
     * como string.
     */
    if (
      typeof respuesta.error
        ?.detail ===
      'string'
    ) {

      return respuesta.error.detail;
    }


    /**
     * Los errores de validación de Pydantic pueden
     * llegar como una lista.
     */
    if (
      Array.isArray(
        respuesta.error?.detail
      ) &&
      respuesta.error.detail.length
    ) {

      const primerError =
        respuesta.error.detail[0];

      if (
        typeof primerError?.msg ===
        'string'
      ) {

        return primerError.msg;
      }
    }


    return (
      'No fue posible crear la cuenta. ' +
      'Revisa la información e inténtalo nuevamente.'
    );
  }
}