/**
 * ============================================================
 * TalentIA - Registro de candidatos
 * Archivo: src/app/pages/registro/registro.ts
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


const passwordsIgualesValidator:
  ValidatorFn =
  (
    control:
      AbstractControl
  ): ValidationErrors | null => {

    const password =
      control.get(
        'password'
      )?.value;

    const confirmacion =
      control.get(
        'confirmarPassword'
      )?.value;


    if (
      !password ||
      !confirmacion
    ) {

      return null;
    }


    return (
      password === confirmacion
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

  formulario:
    FormGroup;


  cargando = false;

  error = '';

  mostrarPassword = false;

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
          nombre: [
            '',
            [
              Validators.required,
              Validators.minLength(2),
              Validators.maxLength(80)
            ]
          ],

          apellido: [
            '',
            [
              Validators.required,
              Validators.minLength(2),
              Validators.maxLength(80)
            ]
          ],

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
              Validators.minLength(8),
              Validators.pattern(
                /^(?=.*[A-Za-z])(?=.*\d).+$/
              )
            ]
          ],

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


  alternarPassword(): void {

    this.mostrarPassword =
      !this.mostrarPassword;
  }


  alternarConfirmacion(): void {

    this.mostrarConfirmacion =
      !this.mostrarConfirmacion;
  }


  registrar(): void {

    if (this.cargando) {

      return;
    }


    this.error = '';


    if (
      this.formulario.invalid
    ) {

      this.formulario
        .markAllAsTouched();

      return;
    }


    const datos = {

      nombre:
        String(
          this.formulario
            .value
            .nombre ??
          ''
        ).trim(),

      apellido:
        String(
          this.formulario
            .value
            .apellido ??
          ''
        ).trim(),

      email:
        String(
          this.formulario
            .value
            .email ??
          ''
        )
          .trim()
          .toLowerCase(),

      password:
        String(
          this.formulario
            .value
            .password ??
          ''
        )
    };


    this.cargando =
      true;


    this.auth
      .registrar(
        datos
      )
      .subscribe({

        next: () => {

          this.cargando =
            false;


          void this.router.navigate(
            ['/login'],
            {
              queryParams: {
                registro:
                  'ok'
              }
            }
          );
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
        },


        complete: () => {

          this.cargando =
            false;
        }
      });
  }


  private obtenerMensajeError(
    respuesta:
      HttpErrorResponse
  ): string {

    if (
      respuesta.status === 0
    ) {

      if (
        typeof respuesta
          .error?.detail ===
        'string'
      ) {

        return respuesta
          .error
          .detail;
      }


      return (
        'No fue posible conectar con el servidor. ' +
        'Verifica que FastAPI esté ejecutándose.'
      );
    }


    if (
      respuesta.status === 409
    ) {

      return (
        typeof respuesta
          .error?.detail ===
        'string'
          ? respuesta
              .error
              .detail
          : 'Ya existe una cuenta registrada con este correo.'
      );
    }


    if (
      typeof respuesta
        .error?.detail ===
      'string'
    ) {

      return respuesta
        .error
        .detail;
    }


    if (
      Array.isArray(
        respuesta
          .error?.detail
      ) &&
      respuesta
        .error
        .detail
        .length > 0
    ) {

      const detalle =
        respuesta
          .error
          .detail[0];


      if (
        typeof detalle?.msg ===
        'string'
      ) {

        return detalle.msg;
      }
    }


    return (
      'No fue posible crear la cuenta. ' +
      'Revisa la información e inténtalo nuevamente.'
    );
  }
}
