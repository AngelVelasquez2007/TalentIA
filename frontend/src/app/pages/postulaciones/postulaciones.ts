/**
 * ============================================================
 * TalentIA - Página de postulaciones
 * Archivo: src/app/pages/postulaciones/postulaciones.ts
 * ============================================================
 *
 * Esta pantalla permite al candidato consultar las
 * postulaciones que ha realizado.
 *
 * La información proviene de:
 *
 * GET /postulaciones/mis-postulaciones
 *
 * Cada postulación conserva:
 *
 * - vacante;
 * - empresa;
 * - estado del proceso;
 * - puntuación IA;
 * - similitud textual;
 * - coincidencia de habilidades;
 * - habilidades coincidentes;
 * - habilidades faltantes;
 * - explicación generada por el motor de compatibilidad.
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
  Postulacion
} from '../../models/postulacion';


@Component({
  selector: 'app-postulaciones',

  standalone: true,

  imports: [
    CommonModule,
    RouterLink
  ],

  templateUrl: './postulaciones.html',

  styleUrl: './postulaciones.scss'
})
export class Postulaciones implements OnInit {

  /**
   * Postulaciones pertenecientes al candidato.
   */
  postulaciones: Postulacion[] = [];


  /**
   * Estado visual de carga.
   */
  cargando = false;


  /**
   * Mensaje de error visible.
   */
  error = '';


  constructor(
    public readonly auth: AuthService,
    private readonly postulacionService:
      PostulacionService
  ) {}


  // ==========================================================
  // INICIALIZACIÓN
  // ==========================================================

  ngOnInit(): void {

    /**
     * Esta página está orientada al candidato.
     *
     * El panel de reclutamiento tendrá posteriormente
     * su propia vista para analizar candidatos.
     */
    if (
      this.auth.usuario?.rol?.nombre ===
      'candidato'
    ) {

      this.cargarPostulaciones();
    }
  }


  // ==========================================================
  // CONSULTAR POSTULACIONES
  // ==========================================================

  cargarPostulaciones(): void {

    this.cargando = true;

    this.error = '';


    this.postulacionService
      .listarMisPostulaciones()
      .subscribe({

        next: (postulaciones) => {

          this.postulaciones =
            postulaciones;

          this.cargando =
            false;
        },


        error: (
          respuesta: HttpErrorResponse
        ) => {

          this.cargando =
            false;


          if (
            respuesta.status === 0
          ) {

            this.error =
              'No fue posible conectar con FastAPI. ' +
              'Verifica que el backend esté ejecutándose.';

            return;
          }


          if (
            typeof respuesta.error?.detail ===
            'string'
          ) {

            this.error =
              respuesta.error.detail;

            return;
          }


          this.error =
            'No fue posible cargar tus postulaciones.';
        }
      });
  }


  // ==========================================================
  // CLASE VISUAL DEL ESTADO
  // ==========================================================

  /**
   * Devuelve una clase CSS según el estado del proceso.
   *
   * No modifica ninguna regla del backend.
   * Su función es únicamente visual.
   */
  claseEstado(
    estado: string
  ): string {

    return `estado-${estado}`;
  }
}