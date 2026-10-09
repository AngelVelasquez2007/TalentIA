/**
 * ============================================================
 * TalentIA - Inicio de sesión
 * Archivo: src/app/pages/login/login.ts
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
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  Validators
} from '@angular/forms';

import {
  ActivatedRoute,
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

import {
  Usuario
} from '../../models/usuario';


@Component({
  selector: 'app-login',

  standalone: true,

  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink
  ],

  templateUrl:
    './login.html',

  styleUrl:
    './login.scss'
})
export class Login
  implements OnInit {

  formulario:
    FormGroup;


  cargando = false;

  error = '';

  mensaje = '';

  mostrarPassword = false;


  constructor(
    private readonly fb:
      FormBuilder,

    private readonly auth:
      AuthService,

    private readonly router:
      Router,

    private readonly route:
      ActivatedRoute
  ) {

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


  ngOnInit(): void {

    if (
      this.route.snapshot
        .queryParamMap
        .get('registro') ===
      'ok'
    ) {

      this.mensaje =
        'Cuenta creada correctamente. Ya puedes iniciar sesión.';
    }


    if (
      this.route.snapshot
        .queryParamMap
        .get('sesion') ===
      'expirada'
    ) {

      this.error =
        'Tu sesión expiró. Inicia sesión nuevamente.';
    }
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


  alternarPassword(): void {

    this.mostrarPassword =
      !this.mostrarPassword;
  }


  iniciarSesion(): void {

    if (this.cargando) {

      return;
    }


    this.error = '';

    this.mensaje = '';


    if (
      this.formulario.invalid
    ) {

      this.formulario
        .markAllAsTouched();

      return;
    }


    const email =
      String(
        this.formulario
          .value
          .email ??
        ''
      )
        .trim()
        .toLowerCase();


    const password =
      String(
        this.formulario
          .value
          .password ??
        ''
      );


    this.cargando =
      true;


    this.auth
      .login({
        email,
        password
      })
      .pipe(

        switchMap(
          () =>
            this.auth
              .cargarUsuarioActual()
        )
      )
      .subscribe({

        next: (usuario) => {

          this.cargando =
            false;

          void this.redirigirDespuesDelLogin(
            usuario
          );
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          this.cargando =
            false;

          /**
           * Evita quedar en un estado parcial si /login
           * devolvió token pero /auth/me falló después.
           */
          this.auth
            .limpiarSesion();


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


  private async redirigirDespuesDelLogin(
    usuario:
      Usuario
  ): Promise<void> {

    const returnUrl =
      this.route.snapshot
        .queryParamMap
        .get('returnUrl');


    /**
     * Solo aceptamos rutas locales conocidas.
     */
    if (
      returnUrl &&
      this.puedeVisitarReturnUrl(
        usuario,
        returnUrl
      )
    ) {

      await this.router.navigateByUrl(
        returnUrl
      );

      return;
    }


    const rol =
      usuario
        .rol
        .nombre;


    if (
      rol === 'reclutador' ||
      rol === 'administrador'
    ) {

      await this.router.navigate([
        '/reclutador'
      ]);

      return;
    }


    await this.router.navigate([
      '/vacantes'
    ]);
  }


  private puedeVisitarReturnUrl(
    usuario:
      Usuario,

    returnUrl:
      string
  ): boolean {

    if (
      !returnUrl.startsWith('/') ||
      returnUrl.startsWith('//')
    ) {

      return false;
    }


    const ruta =
      returnUrl
        .split('?')[0]
        .split('#')[0];


    const rol =
      usuario
        .rol
        .nombre;


    if (
      ruta.startsWith('/perfil') ||
      ruta.startsWith('/postulaciones')
    ) {

      return (
        rol === 'candidato'
      );
    }


    if (
      ruta.startsWith('/reclutador')
    ) {

      return (
        rol === 'reclutador' ||
        rol === 'administrador'
      );
    }


    return (
      ruta === '/vacantes' ||
      ruta === '/'
    );
  }


  private obtenerMensajeError(
    respuesta:
      HttpErrorResponse
  ): string {

    if (
      respuesta.status === 401
    ) {

      return (
        'Correo o contraseña incorrectos.'
      );
    }


    if (
      respuesta.status === 403
    ) {

      return (
        'Tu cuenta se encuentra desactivada.'
      );
    }


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
        'No se pudo conectar con el servidor. ' +
        'Verifica que FastAPI esté ejecutándose.'
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


    return (
      'Ocurrió un error al iniciar sesión.'
    );
  }
}
