/**
 * ============================================================
 * TalentIA - Perfil profesional del candidato
 * Archivo: src/app/pages/perfil/perfil.ts
 * ============================================================
 *
 * MODOS DE LA PANTALLA:
 *
 * 1. CONSULTA
 *    - Es el modo predeterminado.
 *    - Muestra la información profesional.
 *    - No muestra inputs permanentemente.
 *
 * 2. EDICIÓN
 *    - Se activa con "Editar perfil".
 *    - Permite modificar datos y habilidades.
 *    - Puede cancelarse sin guardar.
 *    - Al guardar correctamente vuelve a consulta.
 *
 * ============================================================
 */

import {
  ChangeDetectorRef,
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
  Usuario,
  UsuarioHabilidadInput,
  UsuarioPerfilUpdate
} from '../../models/usuario';


/**
 * Habilidad utilizada mientras se edita el perfil.
 */
interface HabilidadEditable {

  nombre: string;

  nivel: NivelHabilidad;

  experiencia_anios: number;
}


/**
 * Estado editable del formulario.
 */
interface PerfilFormState {

  nombre: string;

  apellido: string;

  telefono: string;

  ciudad: string;

  perfil_profesional: string;

  experiencia_anios: number;
}


/**
 * Copia utilizada cuando el usuario presiona Cancelar.
 */
interface CopiaPerfil {

  form: PerfilFormState;

  habilidades:
    HabilidadEditable[];
}


@Component({
  selector: 'app-perfil',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],

  templateUrl:
    './perfil.html',

  styleUrl:
    './perfil.scss'
})
export class Perfil
  implements OnInit {

  // ==========================================================
  // DATOS
  // ==========================================================

  catalogoHabilidades:
    Habilidad[] = [];


  habilidades:
    HabilidadEditable[] = [];


  nuevaHabilidad = '';


  form:
    PerfilFormState = {

      nombre: '',

      apellido: '',

      telefono: '',

      ciudad: '',

      perfil_profesional: '',

      experiencia_anios: 0
    };


  // ==========================================================
  // MODO DE LA PANTALLA
  // ==========================================================

  /**
   * false:
   * modo consulta.
   *
   * true:
   * modo edición.
   */
  modoEdicion = false;


  /**
   * Copia del perfil realizada justo antes
   * de comenzar a editar.
   *
   * Se utiliza para Cancelar.
   */
  private copiaAntesDeEditar:
    CopiaPerfil | null = null;


  // ==========================================================
  // ESTADOS VISUALES
  // ==========================================================

  cargando = false;

  guardando = false;

  error = '';

  mensaje = '';


  constructor(
    public readonly auth:
      AuthService,

    private readonly usuarioService:
      UsuarioService,

    private readonly cdr:
      ChangeDetectorRef
  ) {}


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.cargarPerfil();

    this.cargarCatalogo();
  }


  // ==========================================================
  // IDENTIDAD
  // ==========================================================

  get iniciales(): string {

    const nombre =
      this.form.nombre
        .trim();


    const apellido =
      this.form.apellido
        .trim();


    if (
      !nombre &&
      !apellido
    ) {

      return '?';
    }


    return (
      nombre.charAt(0) +
      apellido.charAt(0)
    )
      .toUpperCase();
  }


  get nombreCompleto(): string {

    const nombre = [

      this.form.nombre,

      this.form.apellido

    ]
      .filter(Boolean)
      .join(' ')
      .trim();


    return (
      nombre ||
      'Candidato TalentIA'
    );
  }


  get correo(): string {

    return (
      this.auth.usuario
        ?.email ??
      'Usuario autenticado'
    );
  }


  get totalHabilidades():
    number {

    return this
      .habilidades
      .length;
  }


  // ==========================================================
  // COMPLETITUD
  // ==========================================================

  get porcentajeCompletitud():
    number {

    let puntos = 0;


    // Nombre y apellido
    if (
      this.form.nombre
        .trim()
        .length >= 2
      &&
      this.form.apellido
        .trim()
        .length >= 2
    ) {

      puntos += 15;
    }


    // Ciudad
    if (
      this.form.ciudad
        .trim()
    ) {

      puntos += 10;
    }


    // Teléfono
    if (
      this.form.telefono
        .trim()
    ) {

      puntos += 10;
    }


    // Perfil profesional
    const longitudPerfil =
      this.form
        .perfil_profesional
        .trim()
        .length;


    if (
      longitudPerfil >= 120
    ) {

      puntos += 30;

    } else if (
      longitudPerfil >= 50
    ) {

      puntos += 20;

    } else if (
      longitudPerfil >= 20
    ) {

      puntos += 10;
    }


    // Experiencia
    if (
      Number(
        this.form
          .experiencia_anios
      ) >= 0
    ) {

      puntos += 10;
    }


    // Habilidades
    if (
      this.habilidades.length >= 5
    ) {

      puntos += 25;

    } else if (
      this.habilidades.length >= 3
    ) {

      puntos += 18;

    } else if (
      this.habilidades.length >= 1
    ) {

      puntos += 8;
    }


    return Math.min(
      puntos,
      100
    );
  }


  get estadoPerfil():
    string {

    if (
      this.porcentajeCompletitud >=
      90
    ) {

      return 'Perfil excelente';
    }


    if (
      this.porcentajeCompletitud >=
      70
    ) {

      return 'Perfil competitivo';
    }


    if (
      this.porcentajeCompletitud >=
      45
    ) {

      return 'Perfil en progreso';
    }


    return 'Perfil inicial';
  }


  get recomendacionPerfil():
    string {

    if (
      this.form
        .perfil_profesional
        .trim()
        .length < 80
    ) {

      return (
        'Amplía tu resumen profesional incluyendo ' +
        'tecnologías, responsabilidades y experiencia.'
      );
    }


    if (
      this.habilidades.length < 3
    ) {

      return (
        'Agrega al menos tres habilidades para obtener ' +
        'comparaciones más representativas.'
      );
    }


    if (
      !this.form.ciudad
        .trim()
    ) {

      return (
        'Añade tu ciudad para completar tu información profesional.'
      );
    }


    return (
      'Tu perfil contiene suficiente información para realizar análisis de compatibilidad.'
    );
  }


  // ==========================================================
  // NIVEL LEGIBLE
  // ==========================================================

  etiquetaNivel(
    nivel:
      NivelHabilidad
  ): string {

    switch (nivel) {

      case 'basico':

        return 'Básico';


      case 'intermedio':

        return 'Intermedio';


      case 'avanzado':

        return 'Avanzado';


      case 'experto':

        return 'Experto';


      default:

        return nivel;
    }
  }


  // ==========================================================
  // SUGERENCIAS DE HABILIDADES
  // ==========================================================

  get sugerencias():
    Habilidad[] {

    const existentes =
      new Set(
        this.habilidades.map(
          (item) =>
            item.nombre
              .toLowerCase()
        )
      );


    return (
      this.catalogoHabilidades ??
      []
    )
      .filter(
        (habilidad) => {

          const nombre =
            habilidad?.nombre ??
            '';


          return (
            nombre.length > 0
            &&
            !existentes.has(
              nombre.toLowerCase()
            )
          );
        }
      )
      .slice(
        0,
        10
      );
  }


  // ==========================================================
  // CARGAR PERFIL
  // ==========================================================

  cargarPerfil(): void {

    this.cargando =
      true;

    this.error =
      '';


    this.usuarioService
      .obtenerMiPerfil()
      .subscribe({

        next: (usuario) => {

          try {

            this.cargarDatosUsuario(
              usuario
            );


            this.cargando =
              false;


            this.refrescarVista();

          } catch (error) {

            console.error(
              'TalentIA - Error procesando perfil:',
              error
            );


            this.cargando =
              false;


            this.error =
              (
                'El perfil fue recibido, pero hubo un problema ' +
                'al procesar sus datos.'
              );


            this.refrescarVista();
          }
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


          this.refrescarVista();
        },


        complete: () => {

          this.cargando =
            false;


          this.refrescarVista();
        }
      });
  }


  // ==========================================================
  // CARGAR DATOS DEL USUARIO
  // ==========================================================

  private cargarDatosUsuario(
    usuario:
      Usuario
  ): void {

    this.form = {

      nombre:
        usuario.nombre ??
        '',

      apellido:
        usuario.apellido ??
        '',

      telefono:
        usuario.telefono ??
        '',

      ciudad:
        usuario.ciudad ??
        '',

      perfil_profesional:
        usuario
          .perfil_profesional ??
        '',

      experiencia_anios:
        Number(
          usuario
            .experiencia_anios ??
          0
        )
    };


    const habilidadesUsuario =
      Array.isArray(
        usuario.habilidades
      )
        ? usuario.habilidades
        : [];


    this.habilidades =
      habilidadesUsuario
        .map(
          (item) => ({

            nombre:
              item
                ?.habilidad
                ?.nombre ??
              '',

            nivel:
              item?.nivel ??
              'intermedio',

            experiencia_anios:
              Number(
                item
                  ?.experiencia_anios ??
                0
              )
          })
        )
        .filter(
          (item) =>
            item.nombre
              .trim()
              .length > 0
        );
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
            Array.isArray(
              habilidades
            )
              ? habilidades
              : [];


          this.refrescarVista();
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          console.warn(
            'TalentIA - No fue posible cargar habilidades:',
            respuesta
          );


          this.catalogoHabilidades =
            [];


          this.refrescarVista();
        }
      });
  }


  // ==========================================================
  // ACTIVAR EDICIÓN
  // ==========================================================

  editarPerfil(): void {

    /**
     * Guardamos una copia exacta antes
     * de permitir modificaciones.
     */
    this.copiaAntesDeEditar = {

      form: {
        ...this.form
      },

      habilidades:
        this.habilidades.map(
          (habilidad) => ({
            ...habilidad
          })
        )
    };


    this.error =
      '';

    this.mensaje =
      '';


    this.nuevaHabilidad =
      '';


    this.modoEdicion =
      true;


    this.refrescarVista();
  }


  // ==========================================================
  // CANCELAR EDICIÓN
  // ==========================================================

  cancelarEdicion(): void {

    /**
     * Restauramos los datos anteriores.
     */
    if (
      this.copiaAntesDeEditar
    ) {

      this.form = {
        ...this
          .copiaAntesDeEditar
          .form
      };


      this.habilidades =
        this
          .copiaAntesDeEditar
          .habilidades
          .map(
            (habilidad) => ({
              ...habilidad
            })
          );
    }


    this.modoEdicion =
      false;


    this.guardando =
      false;


    this.error =
      '';

    this.mensaje =
      'Edición cancelada.';


    this.nuevaHabilidad =
      '';


    this.copiaAntesDeEditar =
      null;


    this.refrescarVista();
  }


  // ==========================================================
  // AGREGAR HABILIDAD
  // ==========================================================

  agregarHabilidad(): void {

    /**
     * No permitimos modificar skills
     * fuera del modo edición.
     */
    if (
      !this.modoEdicion
    ) {

      return;
    }


    const nombre =
      this.nuevaHabilidad
        .trim();


    if (!nombre) {

      return;
    }


    this.error =
      '';

    this.mensaje =
      '';


    const existe =
      this.habilidades.some(
        (habilidad) =>
          habilidad.nombre
            .toLowerCase()
          ===
          nombre.toLowerCase()
      );


    if (existe) {

      this.error =
        'Esta habilidad ya está registrada.';


      return;
    }


    this.habilidades.push({

      nombre,

      nivel:
        'intermedio',

      experiencia_anios:
        0
    });


    this.nuevaHabilidad =
      '';
  }


  // ==========================================================
  // SELECCIONAR DEL CATÁLOGO
  // ==========================================================

  seleccionarDelCatalogo(
    nombre:
      string
  ): void {

    if (
      !this.modoEdicion
    ) {

      return;
    }


    this.nuevaHabilidad =
      nombre;


    this.agregarHabilidad();
  }


  // ==========================================================
  // ELIMINAR HABILIDAD
  // ==========================================================

  eliminarHabilidad(
    indice:
      number
  ): void {

    if (
      !this.modoEdicion
    ) {

      return;
    }


    this.habilidades.splice(
      indice,
      1
    );


    this.mensaje =
      '';

    this.error =
      '';
  }


  // ==========================================================
  // GUARDAR PERFIL
  // ==========================================================

  guardar(): void {

    /**
     * No hacemos nada si no estamos editando
     * o ya existe una petición en curso.
     */
    if (
      !this.modoEdicion ||
      this.guardando
    ) {

      return;
    }


    this.error =
      '';

    this.mensaje =
      '';


    // ========================================================
    // NOMBRE
    // ========================================================

    const nombre =
      this.form.nombre
        .trim();


    if (
      nombre.length < 2
    ) {

      this.error =
        'El nombre debe tener al menos 2 caracteres.';


      this.refrescarVista();

      return;
    }


    // ========================================================
    // APELLIDO
    // ========================================================

    const apellido =
      this.form.apellido
        .trim();


    if (
      apellido.length < 2
    ) {

      this.error =
        'El apellido debe tener al menos 2 caracteres.';


      this.refrescarVista();

      return;
    }


    // ========================================================
    // EXPERIENCIA
    // ========================================================

    const experiencia =
      Number(
        this.form
          .experiencia_anios
      );


    if (
      Number.isNaN(
        experiencia
      )
      ||
      experiencia < 0
    ) {

      this.error =
        'Los años de experiencia no pueden ser negativos.';


      this.refrescarVista();

      return;
    }


    // ========================================================
    // EXPERIENCIA POR HABILIDAD
    // ========================================================

    for (
      const habilidad
      of this.habilidades
    ) {

      const experienciaHabilidad =
        Number(
          habilidad
            .experiencia_anios
        );


      if (
        Number.isNaN(
          experienciaHabilidad
        )
        ||
        experienciaHabilidad < 0
      ) {

        this.error =
          (
            `La experiencia de "${habilidad.nombre}" ` +
            'no puede ser negativa.'
          );


        this.refrescarVista();

        return;
      }
    }


    // ========================================================
    // HABILIDADES
    // ========================================================

    const habilidades:
      UsuarioHabilidadInput[] =
      this.habilidades
        .filter(
          (item) =>
            item.nombre
              .trim()
              .length > 0
        )
        .map(
          (item) => ({

            nombre:
              item.nombre
                .trim(),

            nivel:
              item.nivel,

            experiencia_anios:
              Math.max(
                0,
                Number(
                  item
                    .experiencia_anios
                ) || 0
              )
          })
        );


    // ========================================================
    // PAYLOAD
    // ========================================================

    const datos:
      UsuarioPerfilUpdate = {

        nombre,

        apellido,

        telefono:
          this.form.telefono
            .trim() ||
          null,

        ciudad:
          this.form.ciudad
            .trim() ||
          null,

        perfil_profesional:
          this.form
            .perfil_profesional
            .trim() ||
          null,

        experiencia_anios:
          experiencia,

        habilidades
      };


    // ========================================================
    // INICIAR GUARDADO
    // ========================================================

    this.guardando =
      true;


    this.mensaje =
      'Guardando cambios...';


    this.refrescarVista();


    // ========================================================
    // PUT /usuarios/me/perfil
    // ========================================================

    this.usuarioService
      .actualizarPerfil(
        datos
      )
      .subscribe({

        next: (usuario) => {

          /**
           * Sincronizamos los datos que realmente
           * devuelve FastAPI/PostgreSQL.
           */
          this.cargarDatosUsuario(
            usuario
          );


          this.guardando =
            false;


          /**
           * Al guardar correctamente salimos
           * automáticamente del modo edición.
           */
          this.modoEdicion =
            false;


          this.copiaAntesDeEditar =
            null;


          this.nuevaHabilidad =
            '';


          this.error =
            '';


          this.mensaje =
            'Perfil profesional actualizado correctamente.';


          this.refrescarVista();
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          this.guardando =
            false;


          this.mensaje =
            '';


          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible guardar el perfil.'
            );


          this.refrescarVista();
        },


        complete: () => {

          this.guardando =
            false;


          this.refrescarVista();
        }
      });
  }


  // ==========================================================
  // ACTUALIZACIÓN DE VISTA
  // ==========================================================

  private refrescarVista(): void {

    try {

      this.cdr
        .detectChanges();

    } catch {

      /**
       * Angular realizará la siguiente
       * detección automáticamente.
       */
    }
  }


  // ==========================================================
  // ERRORES
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
        'No hay conexión con FastAPI. ' +
        'Verifica que el backend esté activo.'
      );
    }


    if (
      respuesta.status === 401
    ) {

      return (
        'Tu sesión no es válida. ' +
        'Cierra sesión y vuelve a ingresar.'
      );
    }


    if (
      respuesta.status === 403
    ) {

      return (
        'Tu usuario no tiene permiso para modificar este perfil.'
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
      )
      &&
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
      `${predeterminado} ` +
      `(HTTP ${respuesta.status})`
    );
  }
}