/**
 * ============================================================
 * TalentIA - Panel de reclutamiento
 * Archivo: src/app/pages/reclutador/reclutador.ts
 * ============================================================
 *
 * Esta pantalla está orientada a:
 *
 * - reclutadores;
 * - administradores.
 *
 * FUNCIONALIDADES:
 *
 * - consultar vacantes administrables;
 * - seleccionar una vacante;
 * - consultar candidatos postulados;
 * - visualizar ranking por compatibilidad IA;
 * - visualizar similitud textual;
 * - visualizar coincidencia de habilidades;
 * - consultar habilidades coincidentes y faltantes;
 * - cambiar el estado del proceso de selección.
 *
 * IMPORTANTE:
 *
 * La IA NO selecciona automáticamente candidatos.
 *
 * El sistema únicamente genera una puntuación orientativa
 * para apoyar el proceso humano de reclutamiento.
 *
 * FLUJO:
 *
 * Reclutador
 *     ↓
 * selecciona vacante
 *     ↓
 * GET /postulaciones/ranking/{vacante_id}
 *     ↓
 * FastAPI
 *     ↓
 * PostgreSQL
 *     ↓
 * candidatos ordenados por puntuación IA
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
  VacanteService
} from '../../services/vacante';

import {
  PostulacionService
} from '../../services/postulacion';

import {
  Vacante
} from '../../models/vacante';

import {
  CandidatoRanking,
  EstadoPostulacion
} from '../../models/postulacion';


@Component({
  selector: 'app-reclutador',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],

  templateUrl:
    './reclutador.html',

  styleUrl:
    './reclutador.scss'
})
export class Reclutador implements OnInit {

  /**
   * Vacantes que el usuario puede gestionar.
   *
   * Reclutador:
   *     vacantes de su empresa.
   *
   * Administrador:
   *     todas las vacantes.
   */
  vacantes: Vacante[] = [];


  /**
   * Identificador de la vacante seleccionada.
   */
  vacanteSeleccionadaId:
    number | null = null;


  /**
   * Ranking recibido desde FastAPI.
   */
  ranking:
    CandidatoRanking[] = [];


  /**
   * Indicadores de carga.
   */
  cargandoVacantes = false;

  cargandoRanking = false;


  /**
   * ID de la postulación que está siendo actualizada.
   */
  actualizandoPostulacion:
    number | null = null;


  /**
   * Mensajes visuales.
   */
  mensaje = '';

  error = '';


  constructor(
    public readonly auth:
      AuthService,

    private readonly vacanteService:
      VacanteService,

    private readonly postulacionService:
      PostulacionService
  ) {}


  // ==========================================================
  // INICIALIZACIÓN
  // ==========================================================

  ngOnInit(): void {

    /**
     * La interfaz valida el rol para mejorar la experiencia.
     *
     * La seguridad real permanece en FastAPI.
     */
    if (!this.puedeGestionar) {

      this.error =
        'No tienes permisos para acceder al panel de reclutamiento.';

      return;
    }


    this.cargarVacantes();
  }


  // ==========================================================
  // ROLES
  // ==========================================================

  get puedeGestionar(): boolean {

    const rol =
      this.auth.usuario
        ?.rol?.nombre;


    return (
      rol === 'reclutador' ||
      rol === 'administrador'
    );
  }


  // ==========================================================
  // VACANTE SELECCIONADA
  // ==========================================================

  get vacanteSeleccionada():
    Vacante | null {

    if (
      this.vacanteSeleccionadaId ===
      null
    ) {

      return null;
    }


    return (
      this.vacantes.find(
        (vacante) =>
          vacante.id ===
          this.vacanteSeleccionadaId
      ) ?? null
    );
  }


  // ==========================================================
  // ESTADÍSTICAS
  // ==========================================================

  /**
   * Número total de candidatos de la vacante.
   */
  get totalCandidatos(): number {

    return this.ranking.length;
  }


  /**
   * Promedio de compatibilidad IA.
   */
  get promedioCompatibilidad():
    number {

    if (
      this.ranking.length === 0
    ) {

      return 0;
    }


    const total =
      this.ranking.reduce(
        (
          acumulado,
          candidato
        ) => {

          return (
            acumulado +
            (
              candidato
                .puntuacion_ia ??
              0
            )
          );
        },
        0
      );


    return (
      total /
      this.ranking.length
    );
  }


  /**
   * Número de candidatos que llegaron a entrevista.
   */
  get totalEntrevistas():
    number {

    return this.ranking.filter(
      (candidato) =>
        candidato.estado ===
          'entrevista' ||
        candidato.estado ===
          'seleccionado'
    ).length;
  }


  /**
   * Número de candidatos seleccionados.
   */
  get totalSeleccionados():
    number {

    return this.ranking.filter(
      (candidato) =>
        candidato.estado ===
        'seleccionado'
    ).length;
  }


  // ==========================================================
  // CARGAR VACANTES
  // ==========================================================

  cargarVacantes(): void {

    this.cargandoVacantes =
      true;

    this.error = '';

    this.mensaje = '';


    this.vacanteService
      .listarMisVacantes()
      .subscribe({

        next: (vacantes) => {

          this.vacantes =
            vacantes;

          this.cargandoVacantes =
            false;


          /**
           * Seleccionamos automáticamente la primera
           * vacante disponible para mostrar información
           * inmediatamente.
           */
          if (
            this.vacantes.length > 0
          ) {

            this.vacanteSeleccionadaId =
              this.vacantes[0].id;

            this.cargarRanking();
          }
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          this.cargandoVacantes =
            false;

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible cargar las vacantes.'
            );
        }
      });
  }


  // ==========================================================
  // CAMBIO DE VACANTE
  // ==========================================================

  cambiarVacante(): void {

    this.ranking = [];

    this.error = '';

    this.mensaje = '';


    if (
      this.vacanteSeleccionadaId ===
      null
    ) {

      return;
    }


    this.cargarRanking();
  }


  // ==========================================================
  // RANKING IA
  // ==========================================================

  cargarRanking(): void {

    if (
      this.vacanteSeleccionadaId ===
      null
    ) {

      return;
    }


    this.cargandoRanking =
      true;

    this.error = '';


    this.postulacionService
      .obtenerRanking(
        this.vacanteSeleccionadaId
      )
      .subscribe({

        next: (ranking) => {

          /**
           * FastAPI ya devuelve el ranking ordenado
           * por puntuación.
           *
           * Ordenamos nuevamente como medida defensiva
           * para garantizar la presentación.
           */
          this.ranking =
            [...ranking].sort(
              (a, b) =>
                (
                  b.puntuacion_ia ??
                  0
                ) -
                (
                  a.puntuacion_ia ??
                  0
                )
            );

          this.cargandoRanking =
            false;
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          this.cargandoRanking =
            false;

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible cargar el ranking de candidatos.'
            );
        }
      });
  }


  // ==========================================================
  // POSICIÓN EN EL RANKING
  // ==========================================================

  /**
   * Las posiciones visuales empiezan en 1.
   */
  posicion(
    indice: number
  ): number {

    return indice + 1;
  }


  // ==========================================================
  // CLASIFICACIÓN VISUAL
  // ==========================================================

  /**
   * Convierte una puntuación en una categoría visual.
   *
   * Coincide conceptualmente con el backend:
   *
   * < 40   -> baja
   * < 65   -> media
   * < 80   -> alta
   * >= 80  -> muy alta
   */
  clasificacion(
    puntuacion:
      number | null
  ): string {

    const valor =
      puntuacion ?? 0;


    if (valor < 40) {

      return 'Baja';
    }


    if (valor < 65) {

      return 'Media';
    }


    if (valor < 80) {

      return 'Alta';
    }


    return 'Muy alta';
  }


  // ==========================================================
  // ESTADOS DISPONIBLES
  // ==========================================================

  /**
   * Devuelve únicamente transiciones compatibles
   * con las reglas del backend.
   *
   * pendiente
   *   -> revision
   *   -> rechazado
   *
   * revision
   *   -> entrevista
   *   -> rechazado
   *
   * entrevista
   *   -> seleccionado
   *   -> rechazado
   *
   * seleccionado / rechazado
   *   -> estados terminales
   */
  estadosDisponibles(
    estadoActual:
      EstadoPostulacion
  ): EstadoPostulacion[] {

    switch (
      estadoActual
    ) {

      case 'pendiente':

        return [
          'pendiente',
          'revision',
          'rechazado'
        ];


      case 'revision':

        return [
          'revision',
          'entrevista',
          'rechazado'
        ];


      case 'entrevista':

        return [
          'entrevista',
          'seleccionado',
          'rechazado'
        ];


      case 'seleccionado':

        return [
          'seleccionado'
        ];


      case 'rechazado':

        return [
          'rechazado'
        ];


      default:

        return [
          estadoActual
        ];
    }
  }


  // ==========================================================
  // ACTUALIZAR ESTADO
  // ==========================================================

  cambiarEstado(
    candidato:
      CandidatoRanking,

    nuevoEstado:
      EstadoPostulacion
  ): void {

    /**
     * No enviamos una petición innecesaria si el estado
     * seleccionado es exactamente el mismo.
     */
    if (
      candidato.estado ===
      nuevoEstado
    ) {

      return;
    }


    this.error = '';

    this.mensaje = '';

    this.actualizandoPostulacion =
      candidato.postulacion_id;


    this.postulacionService
      .cambiarEstado(
        candidato.postulacion_id,
        nuevoEstado
      )
      .subscribe({

        next: () => {

          this.actualizandoPostulacion =
            null;

          this.mensaje =
            `El estado de ${candidato.nombre} fue actualizado correctamente.`;

          /**
           * Recargamos desde PostgreSQL para que la pantalla
           * siempre represente la información real.
           */
          this.cargarRanking();
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          this.actualizandoPostulacion =
            null;

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible actualizar el estado del candidato.'
            );


          /**
           * Si la transición fue inválida,
           * restauramos los datos reales.
           */
          this.cargarRanking();
        }
      });
  }


  // ==========================================================
  // CLASE DE ESTADO
  // ==========================================================

  claseEstado(
    estado:
      EstadoPostulacion
  ): string {

    return (
      'estado-' +
      estado
    );
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
        'No fue posible conectar con FastAPI. ' +
        'Verifica que el backend esté ejecutándose.'
      );
    }


    if (
      respuesta.status === 403
    ) {

      return (
        typeof respuesta
          .error?.detail ===
        'string'
          ? respuesta.error.detail
          : 'No tienes permisos para realizar esta acción.'
      );
    }


    if (
      respuesta.status === 409
    ) {

      return (
        typeof respuesta
          .error?.detail ===
        'string'
          ? respuesta.error.detail
          : 'La transición de estado solicitada no es válida.'
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