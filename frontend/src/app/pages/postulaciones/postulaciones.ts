/**
 * ============================================================
 * TalentIA - Dashboard de postulaciones
 * Archivo: src/app/pages/postulaciones/postulaciones.ts
 * ============================================================
 *
 * Esta versión endurece el manejo asíncrono para que la
 * pantalla nunca quede atrapada en "cargando" cuando una
 * petición termina, falla o es reemplazada por otra más nueva.
 *
 * Permite al candidato:
 *
 * - consultar sus postulaciones;
 * - revisar el estado de cada proceso;
 * - visualizar resultados de compatibilidad;
 * - consultar fortalezas y brechas;
 * - actualizar manualmente la información mostrada.
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
  RouterLink
} from '@angular/router';

import {
  HttpErrorResponse
} from '@angular/common/http';

import {
  AuthService
} from '../../services/auth';

import {
  PostulacionService
} from '../../services/postulacion';

import {
  EstadoPostulacion,
  Postulacion
} from '../../models/postulacion';


@Component({
  selector: 'app-postulaciones',

  standalone: true,

  imports: [
    CommonModule,
    RouterLink
  ],

  templateUrl:
    './postulaciones.html',

  styleUrl:
    './postulaciones.scss'
})
export class Postulaciones
  implements OnInit {

  // ==========================================================
  // DATOS
  // ==========================================================

  postulaciones:
    Postulacion[] = [];


  // ==========================================================
  // ESTADO VISUAL
  // ==========================================================

  cargando = false;

  error = '';


  // ==========================================================
  // CONTROL DE PETICIONES
  // ==========================================================

  /**
   * Permite ignorar respuestas antiguas si el usuario pulsa
   * "Actualizar" varias veces o navega rápidamente.
   */
  private cargaId = 0;


  constructor(
    public readonly auth:
      AuthService,

    private readonly postulacionService:
      PostulacionService,

    private readonly cdr:
      ChangeDetectorRef
  ) {}


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.cargarPostulaciones();
  }


  // ==========================================================
  // CARGAR POSTULACIONES
  // ==========================================================

  cargarPostulaciones(): void {

    const idActual =
      ++this.cargaId;


    this.cargando =
      true;

    this.error =
      '';


    this.refrescarVista();


    this.postulacionService
      .listarMisPostulaciones()
      .subscribe({

        // ====================================================
        // ÉXITO
        // ====================================================

        next: (
          postulaciones
        ) => {

          /**
           * Si ya comenzó una carga más reciente,
           * ignoramos esta respuesta.
           */
          if (
            idActual !==
            this.cargaId
          ) {

            return;
          }


          const lista =
            Array.isArray(
              postulaciones
            )
              ? postulaciones
              : [];


          this.postulaciones =
            [...lista]
              .sort(
                (a, b) =>
                  this.fechaTimestamp(b)
                  -
                  this.fechaTimestamp(a)
              );


          this.cargando =
            false;

          this.error =
            '';


          this.refrescarVista();
        },


        // ====================================================
        // ERROR
        // ====================================================

        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          if (
            idActual !==
            this.cargaId
          ) {

            return;
          }


          this.cargando =
            false;

          this.postulaciones =
            [];


          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible cargar tus postulaciones.'
            );


          this.refrescarVista();
        },


        // ====================================================
        // COMPLETE
        // ====================================================

        complete: () => {

          if (
            idActual !==
            this.cargaId
          ) {

            return;
          }


          /**
           * Protección adicional: aunque next() ya haya
           * liberado el loader, complete() garantiza que
           * nunca permanezca activo tras una respuesta HTTP.
           */
          this.cargando =
            false;


          this.refrescarVista();
        }
      });
  }


  // ==========================================================
  // ESTADÍSTICAS
  // ==========================================================

  get total(): number {

    return this
      .postulaciones
      .length;
  }


  get enProceso(): number {

    return this
      .postulaciones
      .filter(
        (postulacion) =>
          postulacion.estado ===
            'pendiente'
          ||
          postulacion.estado ===
            'revision'
          ||
          postulacion.estado ===
            'entrevista'
      )
      .length;
  }


  get entrevistas(): number {

    return this
      .postulaciones
      .filter(
        (postulacion) =>
          postulacion.estado ===
          'entrevista'
      )
      .length;
  }


  get seleccionadas(): number {

    return this
      .postulaciones
      .filter(
        (postulacion) =>
          postulacion.estado ===
          'seleccionado'
      )
      .length;
  }


  get promedioCompatibilidad():
    number {

    const puntuaciones =
      this.postulaciones
        .map(
          (postulacion) =>
            postulacion
              .puntuacion_ia
        )
        .filter(
          (
            valor
          ): valor is number =>
            valor !== null
            &&
            valor !== undefined
        );


    if (
      puntuaciones.length === 0
    ) {

      return 0;
    }


    const suma =
      puntuaciones.reduce(
        (
          acumulado,
          valor
        ) =>
          acumulado + valor,
        0
      );


    return (
      suma /
      puntuaciones.length
    );
  }


  // ==========================================================
  // HABILIDADES SEGURAS
  // ==========================================================

  coincidencias(
    postulacion:
      Postulacion
  ): string[] {

    return (
      postulacion
        .habilidades_coincidentes
      ??
      []
    );
  }


  brechas(
    postulacion:
      Postulacion
  ): string[] {

    return (
      postulacion
        .habilidades_faltantes
      ??
      []
    );
  }


  // ==========================================================
  // ESTADO LEGIBLE
  // ==========================================================

  etiquetaEstado(
    estado:
      EstadoPostulacion
  ): string {

    switch (estado) {

      case 'pendiente':

        return 'Postulación enviada';


      case 'revision':

        return 'En revisión';


      case 'entrevista':

        return 'Entrevista';


      case 'seleccionado':

        return 'Seleccionado';


      case 'rechazado':

        return 'Proceso finalizado';


      default:

        return estado;
    }
  }


  // ==========================================================
  // DESCRIPCIÓN DEL ESTADO
  // ==========================================================

  descripcionEstado(
    estado:
      EstadoPostulacion
  ): string {

    switch (estado) {

      case 'pendiente':

        return (
          'Tu postulación fue registrada y está esperando revisión.'
        );


      case 'revision':

        return (
          'El equipo de reclutamiento está revisando tu perfil.'
        );


      case 'entrevista':

        return (
          'Tu perfil avanzó a la etapa de entrevista.'
        );


      case 'seleccionado':

        return (
          'El proceso registra tu perfil como seleccionado.'
        );


      case 'rechazado':

        return (
          'Esta postulación ya no continúa en el proceso actual.'
        );


      default:

        return '';
    }
  }


  // ==========================================================
  // PROGRESO
  // ==========================================================

  progreso(
    estado:
      EstadoPostulacion
  ): number {

    switch (estado) {

      case 'pendiente':

        return 25;


      case 'revision':

        return 50;


      case 'entrevista':

        return 75;


      case 'seleccionado':

        return 100;


      case 'rechazado':

        return 100;


      default:

        return 0;
    }
  }


  // ==========================================================
  // PIPELINE
  // ==========================================================

  etapaAlcanzada(
    estado:
      EstadoPostulacion,

    etapa:
      number
  ): boolean {

    /**
     * Una postulación rechazada finaliza el proceso,
     * pero no marcamos etapas posteriores como superadas.
     */
    if (
      estado ===
      'rechazado'
    ) {

      return false;
    }


    return (
      this.posicionEstado(
        estado
      )
      >=
      etapa
    );
  }


  private posicionEstado(
    estado:
      EstadoPostulacion
  ): number {

    switch (estado) {

      case 'pendiente':

        return 1;


      case 'revision':

        return 2;


      case 'entrevista':

        return 3;


      case 'seleccionado':

        return 4;


      default:

        return 0;
    }
  }


  // ==========================================================
  // CLASIFICACIÓN DEL MATCHING
  // ==========================================================

  clasificacionIA(
    puntuacion:
      number | null | undefined
  ): string {

    const valor =
      puntuacion ?? 0;


    if (
      valor >= 80
    ) {

      return 'Muy alta';
    }


    if (
      valor >= 65
    ) {

      return 'Alta';
    }


    if (
      valor >= 40
    ) {

      return 'Media';
    }


    return 'Baja';
  }


  claseCompatibilidad(
    puntuacion:
      number | null | undefined
  ): string {

    const valor =
      puntuacion ?? 0;


    if (
      valor >= 80
    ) {

      return 'very-high';
    }


    if (
      valor >= 65
    ) {

      return 'high';
    }


    if (
      valor >= 40
    ) {

      return 'medium';
    }


    return 'low';
  }


  // ==========================================================
  // FECHA
  // ==========================================================

  fechaTexto(
    postulacion:
      Postulacion
  ): string {

    const fecha =
      this.obtenerFecha(
        postulacion
      );


    if (!fecha) {

      return 'Fecha registrada';
    }


    const date =
      new Date(
        fecha
      );


    if (
      Number.isNaN(
        date.getTime()
      )
    ) {

      return 'Fecha registrada';
    }


    return new Intl
      .DateTimeFormat(
        'es-CO',
        {
          day:
            '2-digit',

          month:
            'short',

          year:
            'numeric'
        }
      )
      .format(
        date
      );
  }


  private fechaTimestamp(
    postulacion:
      Postulacion
  ): number {

    const fecha =
      this.obtenerFecha(
        postulacion
      );


    if (!fecha) {

      return 0;
    }


    const timestamp =
      new Date(
        fecha
      )
      .getTime();


    if (
      Number.isNaN(
        timestamp
      )
    ) {

      return 0;
    }


    return timestamp;
  }


  private obtenerFecha(
    postulacion:
      Postulacion
  ): string | null {

    /**
     * El modelo actual usa creada_en, pero conservamos
     * compatibilidad con nombres antiguos por si una base de
     * datos de prueba contiene una respuesta anterior.
     */
    const registro =
      postulacion as
        Postulacion & {
          fecha_postulacion?:
            string;

          postulado_en?:
            string;
        };


    return (
      registro.creada_en
      ??
      registro.fecha_postulacion
      ??
      registro.postulado_en
      ??
      null
    );
  }


  // ==========================================================
  // DETECCIÓN DE CAMBIOS
  // ==========================================================

  private refrescarVista(): void {

    try {

      this.cdr
        .detectChanges();

    } catch {

      /**
       * Si Angular ya se encuentra ejecutando un ciclo de
       * detección, el siguiente ciclo actualizará la vista.
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

      const detail =
        respuesta
          .error?.detail;


      if (
        typeof detail ===
        'string'
      ) {

        return detail;
      }


      return (
        'No hay conexión con FastAPI o la petición tardó demasiado. '
        +
        'Verifica el backend y vuelve a intentarlo.'
      );
    }


    if (
      respuesta.status === 401
    ) {

      return (
        'Tu sesión ya no es válida. Vuelve a iniciar sesión.'
      );
    }


    if (
      respuesta.status === 403
    ) {

      return (
        'Tu cuenta no tiene permiso para consultar estas postulaciones.'
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


    return predeterminado;
  }
}
