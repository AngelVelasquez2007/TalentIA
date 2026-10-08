/**
 * ============================================================
 * TalentIA - Perfil profesional del candidato
 * Archivo: src/app/pages/perfil/perfil.ts
 * ============================================================
 *
 * Permite al candidato editar:
 *
 * - nombre;
 * - apellido;
 * - teléfono;
 * - ciudad;
 * - experiencia;
 * - descripción profesional;
 * - habilidades;
 * - nivel de cada habilidad;
 * - experiencia por habilidad.
 *
 * Estos datos posteriormente alimentan el motor de matching.
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
  FormsModule
} from '@angular/forms';

import {
  RouterLink
} from '@angular/router';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  AuthService
} from '../../services/auth';

import {
  UsuarioService
} from '../../services/usuario';

import {
  Habilidad
} from '../../models/vacante';

import {
  NivelHabilidad,
  UsuarioHabilidadInput,
  UsuarioPerfilUpdate
} from '../../models/usuario';


/**
 * Modelo interno de edición.
 */
interface HabilidadEditable {

  nombre: string;

  nivel: NivelHabilidad;

  experiencia_anios: number;
}


@Component({
  selector: 'app-perfil',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],

  templateUrl: './perfil.html',

  styleUrl: './perfil.scss'
})
export class Perfil implements OnInit {

  /**
   * Catálogo de habilidades existente.
   */
  catalogoHabilidades:
    Habilidad[] = [];


  /**
   * Estado del formulario.
   */
  form = {

    nombre: '',

    apellido: '',

    telefono: '',

    ciudad: '',

    perfil_profesional: '',

    experiencia_anios: 0
  };


  /**
   * Habilidades seleccionadas.
   */
  habilidades:
    HabilidadEditable[] = [];


  /**
   * Nueva habilidad escrita por el candidato.
   */
  nuevaHabilidad = '';


  /**
   * Indicadores visuales.
   */
  cargando = false;

  guardando = false;


  /**
   * Mensajes.
   */
  error = '';

  mensaje = '';


  constructor(
    public readonly auth:
      AuthService,

    private readonly usuarioService:
      UsuarioService
  ) {}


  // ==========================================================
  // INICIALIZACIÓN
  // ==========================================================

  ngOnInit(): void {

    this.cargarPerfil();

    this.cargarCatalogo();
  }


  // ==========================================================
  // PERFIL
  // ==========================================================

  cargarPerfil(): void {

    this.cargando = true;

    this.error = '';


    this.usuarioService
      .obtenerMiPerfil()
      .subscribe({

        next: (usuario) => {

          this.form = {

            nombre:
              usuario.nombre,

            apellido:
              usuario.apellido,

            telefono:
              usuario.telefono ?? '',

            ciudad:
              usuario.ciudad ?? '',

            perfil_profesional:
              usuario
                .perfil_profesional ??
              '',

            experiencia_anios:
              usuario
                .experiencia_anios
          };


          /**
           * Transformamos la relación recibida desde
           * FastAPI al formato editable del formulario.
           */
          this.habilidades =
            usuario.habilidades.map(
              (item) => ({

                nombre:
                  item.habilidad.nombre,

                nivel:
                  item.nivel,

                experiencia_anios:
                  item.experiencia_anios
              })
            );


          this.cargando =
            false;
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          this.cargando =
            false;

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible cargar tu perfil.'
            );
        }
      });
  }


  // ==========================================================
  // CATÁLOGO
  // ==========================================================

  cargarCatalogo(): void {

    this.usuarioService
      .listarHabilidades()
      .subscribe({

        next: (habilidades) => {

          this.catalogoHabilidades =
            habilidades;
        },


        error: () => {

          /**
           * El formulario sigue funcionando porque
           * también permitimos escribir habilidades.
           */
          this.catalogoHabilidades =
            [];
        }
      });
  }


  // ==========================================================
  // AGREGAR HABILIDAD
  // ==========================================================

  agregarHabilidad(): void {

    const nombre =
      this.nuevaHabilidad
        .trim();


    if (!nombre) {
      return;
    }


    /**
     * Evitamos duplicados.
     */
    const existe =
      this.habilidades.some(
        (item) =>
          item.nombre
            .toLowerCase()
          ===
          nombre.toLowerCase()
      );


    if (existe) {

      this.error =
        'Esta habilidad ya está agregada.';

      return;
    }


    this.habilidades.push({

      nombre,

      nivel:
        'intermedio',

      experiencia_anios:
        0
    });


    this.nuevaHabilidad = '';

    this.error = '';
  }


  // ==========================================================
  // USAR HABILIDAD DEL CATÁLOGO
  // ==========================================================

  seleccionarDelCatalogo(
    nombre: string
  ): void {

    this.nuevaHabilidad =
      nombre;

    this.agregarHabilidad();
  }


  // ==========================================================
  // ELIMINAR HABILIDAD
  // ==========================================================

  eliminarHabilidad(
    indice: number
  ): void {

    this.habilidades.splice(
      indice,
      1
    );
  }


  // ==========================================================
  // GUARDAR PERFIL
  // ==========================================================

  guardar(): void {

    this.error = '';

    this.mensaje = '';


    // --------------------------------------------------------
    // VALIDACIONES
    // --------------------------------------------------------

    if (
      this.form.nombre.trim()
        .length < 2
    ) {

      this.error =
        'Ingresa un nombre válido.';

      return;
    }


    if (
      this.form.apellido.trim()
        .length < 2
    ) {

      this.error =
        'Ingresa un apellido válido.';

      return;
    }


    if (
      this.form.experiencia_anios < 0
    ) {

      this.error =
        'La experiencia no puede ser negativa.';

      return;
    }


    for (
      const habilidad
      of this.habilidades
    ) {

      if (
        habilidad.experiencia_anios <
        0
      ) {

        this.error =
          'La experiencia de una habilidad no puede ser negativa.';

        return;
      }
    }


    // --------------------------------------------------------
    // HABILIDADES
    // --------------------------------------------------------

    const habilidades:
      UsuarioHabilidadInput[] =
      this.habilidades.map(
        (item) => ({

          nombre:
            item.nombre.trim(),

          nivel:
            item.nivel,

          experiencia_anios:
            Number(
              item.experiencia_anios
            ) || 0
        })
      );


    // --------------------------------------------------------
    // PAYLOAD
    // --------------------------------------------------------

    const datos:
      UsuarioPerfilUpdate = {

        nombre:
          this.form.nombre.trim(),

        apellido:
          this.form.apellido.trim(),

        telefono:
          this.form.telefono
            .trim() || null,

        ciudad:
          this.form.ciudad
            .trim() || null,

        perfil_profesional:
          this.form
            .perfil_profesional
            .trim() || null,

        experiencia_anios:
          Number(
            this.form
              .experiencia_anios
          ) || 0,

        habilidades
      };


    this.guardando = true;


    this.usuarioService
      .actualizarPerfil(
        datos
      )
      .subscribe({

        next: (usuario) => {

          this.guardando =
            false;

          this.mensaje =
            'Tu perfil profesional fue actualizado correctamente.';


          /**
           * Sincronizamos la vista usando la respuesta
           * real enviada por PostgreSQL/FastAPI.
           */
          this.form.nombre =
            usuario.nombre;

          this.form.apellido =
            usuario.apellido;
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          this.guardando =
            false;

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible guardar tu perfil.'
            );
        }
      });
  }


  // ==========================================================
  // ERROR
  // ==========================================================

  private obtenerMensajeError(
    respuesta:
      HttpErrorResponse,

    predeterminado:
      string
  ): string {

    if (
      respuesta.status === 0
    ) {

      return (
        'No fue posible conectar con FastAPI. ' +
        'Verifica que el backend esté activo.'
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
        .length
    ) {

      const primerError =
        respuesta
          .error
          .detail[0];

      if (
        typeof primerError
          ?.msg ===
        'string'
      ) {

        return primerError.msg;
      }
    }


    return predeterminado;
  }
}