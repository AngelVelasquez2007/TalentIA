/**
 * ============================================================
 * TalentIA - Dashboard del reclutador
 * Archivo: src/app/pages/reclutador/reclutador.ts
 * ============================================================
 *
 * Panel ATS de TalentIA.
 *
 * Esta versión corrige principalmente:
 *
 * - loaders que podían permanecer activos;
 * - respuestas antiguas que podían sobrescribir una selección
 *   más reciente;
 * - recargas innecesarias después de cambiar un estado;
 * - manejo consistente de errores y timeouts;
 * - sincronización visual del ranking.
 *
 * El ranking es orientativo. TalentIA no selecciona ni rechaza
 * candidatos automáticamente.
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


type FiltroEstado =
  | 'todos'
  | EstadoPostulacion;


type OrdenCandidatos =
  | 'compatibilidad'
  | 'nombre'
  | 'estado';


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
export class Reclutador
  implements OnInit {

  // ==========================================================
  // DATOS
  // ==========================================================

  vacantes:
    Vacante[] = [];


  candidatos:
    CandidatoRanking[] = [];


  vacanteSeleccionadaId:
    number | null = null;


  // ==========================================================
  // FILTROS
  // ==========================================================

  busqueda = '';


  filtroEstado:
    FiltroEstado = 'todos';


  orden:
    OrdenCandidatos =
    'compatibilidad';


  // ==========================================================
  // ESTADOS VISUALES
  // ==========================================================

  cargandoVacantes = false;

  cargandoRanking = false;

  cambiandoEstadoId:
    number | null = null;


  mensaje = '';

  error = '';


  // ==========================================================
  // CONTROL DE PETICIONES
  // ==========================================================

  private cargaVacantesId = 0;

  private cargaRankingId = 0;

  private cambioEstadoId = 0;


  constructor(
    public readonly auth:
      AuthService,

    private readonly vacanteService:
      VacanteService,

    private readonly postulacionService:
      PostulacionService,

    private readonly cdr:
      ChangeDetectorRef
  ) {}


  // ==========================================================
  // INIT
  // ==========================================================

  ngOnInit(): void {

    this.cargarVacantes();
  }


  // ==========================================================
  // VACANTE ACTUAL
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
      )
      ??
      null
    );
  }


  // ==========================================================
  // ESTADÍSTICAS
  // ==========================================================

  get totalCandidatos(): number {

    return this.candidatos.length;
  }


  get promedioCompatibilidad():
    number {

    const scores =
      this.candidatos
        .map(
          (candidato) =>
            candidato
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


    if (!scores.length) {

      return 0;
    }


    return (
      scores.reduce(
        (
          acumulado,
          score
        ) =>
          acumulado + score,
        0
      )
      /
      scores.length
    );
  }


  get enRevision(): number {

    return this.candidatos.filter(
      (candidato) =>
        candidato.estado ===
        'revision'
    ).length;
  }


  get entrevistas(): number {

    return this.candidatos.filter(
      (candidato) =>
        candidato.estado ===
        'entrevista'
    ).length;
  }


  get seleccionados(): number {

    return this.candidatos.filter(
      (candidato) =>
        candidato.estado ===
        'seleccionado'
    ).length;
  }


  // ==========================================================
  // FILTROS Y ORDEN
  // ==========================================================

  get candidatosFiltrados():
    CandidatoRanking[] {

    let resultado =
      [...this.candidatos];


    const termino =
      this.busqueda
        .trim()
        .toLowerCase();


    if (termino) {

      resultado =
        resultado.filter(
          (candidato) => {

            const contenido = [
              candidato.nombre,
              candidato.email
            ]
              .join(' ')
              .toLowerCase();


            return contenido
              .includes(
                termino
              );
          }
        );
    }


    if (
      this.filtroEstado !==
      'todos'
    ) {

      resultado =
        resultado.filter(
          (candidato) =>
            candidato.estado ===
            this.filtroEstado
        );
    }


    switch (
      this.orden
    ) {

      case 'nombre':

        resultado.sort(
          (a, b) =>
            a.nombre.localeCompare(
              b.nombre
            )
        );

        break;


      case 'estado':

        resultado.sort(
          (a, b) =>
            a.estado.localeCompare(
              b.estado
            )
        );

        break;


      case 'compatibilidad':

      default:

        resultado.sort(
          (a, b) =>
            this.score(b)
            -
            this.score(a)
        );
    }


    return resultado;
  }


  // ==========================================================
  // CARGAR VACANTES
  // ==========================================================

  cargarVacantes(): void {

    const idActual =
      ++this.cargaVacantesId;


    this.cargandoVacantes =
      true;

    this.error =
      '';


    this.refrescarVista();


    this.vacanteService
      .listarMisVacantes()
      .subscribe({

        next: (vacantes) => {

          if (
            idActual !==
            this.cargaVacantesId
          ) {

            return;
          }


          const lista =
            Array.isArray(
              vacantes
            )
              ? vacantes
              : [];


          this.vacantes =
            lista;


          this.cargandoVacantes =
            false;


          // --------------------------------------------------
          // CONSERVAR SELECCIÓN SI SIGUE EXISTIENDO
          // --------------------------------------------------

          const seleccionSigueDisponible =
            this.vacanteSeleccionadaId !==
              null
            &&
            lista.some(
              (vacante) =>
                vacante.id ===
                this.vacanteSeleccionadaId
            );


          if (
            seleccionSigueDisponible
          ) {

            /**
             * Refrescamos el ranking de la misma vacante.
             */
            this.cargarRanking(
              this.vacanteSeleccionadaId!
            );

          } else if (
            lista.length > 0
          ) {

            this.seleccionarVacante(
              lista[0].id
            );

          } else {

            this.vacanteSeleccionadaId =
              null;

            this.candidatos =
              [];

            this.cargandoRanking =
              false;
          }


          this.refrescarVista();
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          if (
            idActual !==
            this.cargaVacantesId
          ) {

            return;
          }


          this.cargandoVacantes =
            false;

          this.cargandoRanking =
            false;

          this.vacantes =
            [];

          this.candidatos =
            [];

          this.vacanteSeleccionadaId =
            null;


          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible cargar las vacantes.'
            );


          this.refrescarVista();
        },


        complete: () => {

          if (
            idActual !==
            this.cargaVacantesId
          ) {

            return;
          }


          this.cargandoVacantes =
            false;


          this.refrescarVista();
        }
      });
  }


  // ==========================================================
  // SELECCIONAR VACANTE
  // ==========================================================

  seleccionarVacante(
    vacanteId:
      number | null
  ): void {

    this.vacanteSeleccionadaId =
      vacanteId;


    this.candidatos =
      [];

    this.busqueda =
      '';

    this.filtroEstado =
      'todos';

    this.mensaje =
      '';

    this.error =
      '';


    /**
     * Invalida cualquier ranking anterior que todavía
     * estuviera en vuelo.
     */
    ++this.cargaRankingId;


    if (
      vacanteId === null
    ) {

      this.cargandoRanking =
        false;

      this.refrescarVista();

      return;
    }


    this.cargarRanking(
      vacanteId
    );
  }


  // ==========================================================
  // RANKING
  // ==========================================================

  cargarRanking(
    vacanteId:
      number
  ): void {

    const idActual =
      ++this.cargaRankingId;


    this.cargandoRanking =
      true;

    this.error =
      '';


    this.refrescarVista();


    this.postulacionService
      .obtenerRanking(
        vacanteId
      )
      .subscribe({

        next: (candidatos) => {

          if (
            idActual !==
              this.cargaRankingId
            ||
            this.vacanteSeleccionadaId !==
              vacanteId
          ) {

            return;
          }


          const lista =
            Array.isArray(
              candidatos
            )
              ? candidatos
              : [];


          this.candidatos =
            [...lista]
              .sort(
                (a, b) =>
                  this.score(b)
                  -
                  this.score(a)
              );


          this.cargandoRanking =
            false;

          this.error =
            '';


          this.refrescarVista();
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          if (
            idActual !==
              this.cargaRankingId
            ||
            this.vacanteSeleccionadaId !==
              vacanteId
          ) {

            return;
          }


          this.candidatos =
            [];

          this.cargandoRanking =
            false;


          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible cargar el ranking de candidatos.'
            );


          this.refrescarVista();
        },


        complete: () => {

          if (
            idActual !==
              this.cargaRankingId
            ||
            this.vacanteSeleccionadaId !==
              vacanteId
          ) {

            return;
          }


          this.cargandoRanking =
            false;


          this.refrescarVista();
        }
      });
  }


  // ==========================================================
  // RECARGAR
  // ==========================================================

  recargarRanking(): void {

    if (
      this.vacanteSeleccionadaId ===
      null
    ) {

      this.cargarVacantes();

      return;
    }


    this.cargarRanking(
      this.vacanteSeleccionadaId
    );
  }


  // ==========================================================
  // CAMBIAR ESTADO
  // ==========================================================

  cambiarEstado(
    candidato:
      CandidatoRanking,

    nuevoEstado:
      EstadoPostulacion
  ): void {

    if (
      nuevoEstado ===
      candidato.estado
      ||
      this.cambiandoEstadoId !==
        null
    ) {

      return;
    }


    const cambioActual =
      ++this.cambioEstadoId;


    this.error =
      '';

    this.mensaje =
      '';

    this.cambiandoEstadoId =
      candidato.postulacion_id;


    this.refrescarVista();


    this.postulacionService
      .actualizarEstado(
        candidato.postulacion_id,
        {
          estado:
            nuevoEstado
        }
      )
      .subscribe({

        next: (postulacion) => {

          if (
            cambioActual !==
            this.cambioEstadoId
          ) {

            return;
          }


          /**
           * El score del ranking no cambia al avanzar de etapa,
           * por lo que no necesitamos hacer otra petición HTTP.
           * Actualizamos únicamente el candidato afectado.
           */
          this.candidatos =
            this.candidatos.map(
              (actual) =>
                actual.postulacion_id ===
                candidato.postulacion_id
                  ? {
                      ...actual,
                      estado:
                        postulacion.estado
                    }
                  : actual
            );


          this.cambiandoEstadoId =
            null;


          this.mensaje =
            (
              `El estado de ${candidato.nombre} `
              +
              `cambió a ${this.etiquetaEstado(postulacion.estado)}.`
            );


          this.refrescarVista();
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          if (
            cambioActual !==
            this.cambioEstadoId
          ) {

            return;
          }


          this.cambiandoEstadoId =
            null;


          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible actualizar el estado del candidato.'
            );


          /**
           * candidato.estado nunca fue modificado de forma
           * optimista, así que el select vuelve al valor real.
           */
          this.refrescarVista();
        },


        complete: () => {

          if (
            cambioActual !==
            this.cambioEstadoId
            &&
            this.cambiandoEstadoId !==
            null
          ) {

            return;
          }


          this.cambiandoEstadoId =
            null;


          this.refrescarVista();
        }
      });
  }


  // ==========================================================
  // TRANSICIONES PERMITIDAS
  // ==========================================================

  opcionesEstado(
    estado:
      EstadoPostulacion
  ): EstadoPostulacion[] {

    /**
     * Estas transiciones son exactamente las mismas que valida
     * FastAPI en TRANSICIONES_ESTADO.
     */
    switch (estado) {

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
          estado
        ];
    }
  }


  // ==========================================================
  // UTILIDADES DEL MATCHING
  // ==========================================================

  score(
    candidato:
      CandidatoRanking
  ): number {

    return (
      candidato
        .puntuacion_ia
      ??
      0
    );
  }


  coincidencias(
    candidato:
      CandidatoRanking
  ): string[] {

    return (
      candidato
        .habilidades_coincidentes
      ??
      []
    );
  }


  brechas(
    candidato:
      CandidatoRanking
  ): string[] {

    return (
      candidato
        .habilidades_faltantes
      ??
      []
    );
  }


  clasificacion(
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


  claseScore(
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
  // USUARIO
  // ==========================================================

  iniciales(
    nombre:
      string
  ): string {

    const partes =
      nombre
        .trim()
        .split(/\s+/)
        .filter(Boolean);


    if (!partes.length) {

      return '?';
    }


    if (
      partes.length === 1
    ) {

      return partes[0]
        .charAt(0)
        .toUpperCase();
    }


    return (
      partes[0].charAt(0)
      +
      partes[
        partes.length - 1
      ].charAt(0)
    ).toUpperCase();
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

        return 'Pendiente';


      case 'revision':

        return 'En revisión';


      case 'entrevista':

        return 'Entrevista';


      case 'seleccionado':

        return 'Seleccionado';


      case 'rechazado':

        return 'Rechazado';


      default:

        return estado;
    }
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
       * Angular realizará el siguiente ciclo automáticamente.
       */
    }
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
        'No tienes permiso para gestionar este proceso.'
      );
    }


    if (
      respuesta.status === 409
      &&
      typeof respuesta
        .error?.detail ===
      'string'
    ) {

      return respuesta
        .error
        .detail;
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
