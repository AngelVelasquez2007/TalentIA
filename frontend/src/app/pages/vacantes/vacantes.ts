/**
 * ============================================================
 * TalentIA - Página de vacantes
 * Archivo: src/app/pages/vacantes/vacantes.ts
 * ============================================================
 *
 * Esta pantalla permite:
 *
 * CANDIDATO / VISITANTE
 * - consultar vacantes;
 * - buscar oportunidades;
 * - visualizar empresas;
 *
 * CANDIDATO AUTENTICADO
 * - analizar compatibilidad mediante IA/NLP;
 * - consultar habilidades coincidentes y faltantes;
 * - postularse.
 *
 * RECLUTADOR / ADMINISTRADOR
 * - visualizar vacantes;
 * - publicar vacantes;
 * - cerrar vacantes.
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
  HttpErrorResponse
} from '@angular/common/http';

import {
  AuthService
} from '../../services/auth';

import {
  VacanteService
} from '../../services/vacante';

import {
  EmpresaService
} from '../../services/empresa';

import {
  AnalisisService
} from '../../services/analisis';

import {
  PostulacionService
} from '../../services/postulacion';

import {
  ModalidadVacante,
  Vacante,
  VacanteCreate
} from '../../models/vacante';

import {
  Empresa
} from '../../models/empresa';

import {
  AnalisisCompatibilidad
} from '../../models/analisis';


@Component({
  selector: 'app-vacantes',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule
  ],

  templateUrl: './vacantes.html',

  styleUrl: './vacantes.scss'
})
export class Vacantes implements OnInit {

  /**
   * Listado recibido desde FastAPI.
   */
  vacantes: Vacante[] = [];


  /**
   * Empresas utilizadas en el formulario administrativo.
   */
  empresas: Empresa[] = [];


  /**
   * Texto escrito en el buscador.
   */
  busqueda = '';


  /**
   * Vacante seleccionada para análisis.
   */
  seleccion: number | null = null;


  /**
   * Perfil profesional temporal utilizado para el análisis.
   */
  perfil = '';


  /**
   * Resultado generado por matching.py.
   */
  analisis: AnalisisCompatibilidad | null = null;


  /**
   * Indicadores visuales.
   */
  cargando = false;

  analizando = false;

  publicando = false;

  postulando = false;


  /**
   * Mensajes de interfaz.
   */
  mensaje = '';

  error = '';


  /**
   * Formulario utilizado para publicar una vacante.
   */
  form: {
    titulo: string;
    empresa_id: number | null;
    descripcion: string;
    requisitos: string;
    responsabilidades: string;
    salario_min: number | null;
    salario_max: number | null;
    modalidad: ModalidadVacante;
    tipo_contrato: string;
    ubicacion: string;
    experiencia_minima: number;
  } = {
    titulo: '',
    empresa_id: null,
    descripcion: '',
    requisitos: '',
    responsabilidades: '',
    salario_min: null,
    salario_max: null,
    modalidad: 'hibrido',
    tipo_contrato: 'tiempo_completo',
    ubicacion: '',
    experiencia_minima: 0
  };


  constructor(
    public readonly auth: AuthService,
    private readonly vacanteService: VacanteService,
    private readonly empresaService: EmpresaService,
    private readonly analisisService: AnalisisService,
    private readonly postulacionService: PostulacionService
  ) {}


  // ==========================================================
  // INICIALIZACIÓN
  // ==========================================================

  ngOnInit(): void {

    this.cargarVacantes();

    /**
     * Administradores y reclutadores pueden necesitar
     * información de empresas para publicar vacantes.
     */
    if (this.gestiona) {
      this.cargarEmpresas();
    }


    /**
     * Si existe usuario autenticado y tiene perfil guardado,
     * lo utilizamos inicialmente en el cuadro de análisis.
     */
    const perfilGuardado =
      this.auth.usuario?.perfil_profesional;

    if (perfilGuardado) {
      this.perfil = perfilGuardado;
    }
  }


  // ==========================================================
  // ROLES
  // ==========================================================

  /**
   * True para usuarios que pueden gestionar vacantes.
   */
  get gestiona(): boolean {

    const rol =
      this.auth.usuario?.rol?.nombre;

    return (
      rol === 'administrador' ||
      rol === 'reclutador'
    );
  }


  /**
   * Determina si la sesión pertenece a un candidato.
   */
  get esCandidato(): boolean {

    return (
      this.auth.usuario?.rol?.nombre ===
      'candidato'
    );
  }


  // ==========================================================
  // FILTRADO LOCAL
  // ==========================================================

  /**
   * Filtra las vacantes visibles utilizando:
   *
   * - título;
   * - descripción;
   * - requisitos;
   * - ubicación;
   * - empresa.
   */
  get filtradas(): Vacante[] {

    const termino =
      this.busqueda
        .trim()
        .toLowerCase();


    if (!termino) {
      return this.vacantes;
    }


    return this.vacantes.filter(
      (vacante) => {

        const texto = [
          vacante.titulo,
          vacante.descripcion,
          vacante.requisitos,
          vacante.ubicacion ?? '',
          vacante.empresa?.nombre ?? '',
          vacante.modalidad
        ]
          .join(' ')
          .toLowerCase();


        return texto.includes(
          termino
        );
      }
    );
  }


  // ==========================================================
  // CARGAR VACANTES
  // ==========================================================

  cargarVacantes(): void {

    this.cargando = true;

    this.error = '';


    this.vacanteService
      .listar()
      .subscribe({

        next: (vacantes) => {

          this.vacantes =
            vacantes;

          this.cargando =
            false;
        },


        error: (
          respuesta: HttpErrorResponse
        ) => {

          this.cargando =
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
  // CARGAR EMPRESAS
  // ==========================================================

  cargarEmpresas(): void {

    this.empresaService
      .listar()
      .subscribe({

        next: (empresas) => {

          this.empresas =
            empresas;


          /**
           * Para un reclutador dejamos seleccionada
           * automáticamente su propia empresa.
           */
          if (
            this.auth.usuario
              ?.rol?.nombre ===
              'reclutador'
          ) {

            this.form.empresa_id =
              this.auth.usuario
                ?.empresa?.id ??
              null;
          }
        },


        error: () => {

          /**
           * Las vacantes públicas pueden seguir funcionando
           * aunque falle esta petición secundaria.
           */
          this.empresas = [];
        }
      });
  }


  // ==========================================================
  // SELECCIONAR VACANTE PARA IA
  // ==========================================================

  seleccionarParaAnalisis(
    vacanteId: number
  ): void {

    this.seleccion =
      vacanteId;

    this.analisis =
      null;

    this.error =
      '';

    this.mensaje =
      '';
  }


  // ==========================================================
  // ANÁLISIS IA
  // ==========================================================

  analizar(
    vacanteId: number
  ): void {

    this.error = '';

    this.mensaje = '';

    this.analisis = null;


    if (!this.auth.autenticado) {

      this.error =
        'Debes iniciar sesión para analizar tu compatibilidad.';

      return;
    }


    if (!this.esCandidato) {

      this.error =
        'El análisis de perfil está disponible para candidatos.';

      return;
    }


    const perfilFinal =
      this.perfil.trim();


    if (perfilFinal.length < 20) {

      this.error =
        'Describe tu experiencia profesional con al menos 20 caracteres.';

      return;
    }


    this.analizando =
      true;


    this.analisisService
      .analizarVacante(
        vacanteId,
        {
          perfil_profesional:
            perfilFinal,

          /**
           * El backend combinará estas habilidades
           * con las competencias guardadas del candidato.
           */
          habilidades: []
        }
      )
      .subscribe({

        next: (resultado) => {

          this.analisis =
            resultado;

          this.analizando =
            false;
        },


        error: (
          respuesta: HttpErrorResponse
        ) => {

          this.analizando =
            false;

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible calcular la compatibilidad.'
            );
        }
      });
  }


  // ==========================================================
  // POSTULARSE
  // ==========================================================

  postular(
    vacanteId: number
  ): void {

    this.error = '';

    this.mensaje = '';


    if (!this.auth.autenticado) {

      this.error =
        'Debes iniciar sesión para postularte.';

      return;
    }


    if (!this.esCandidato) {

      this.error =
        'Solo los candidatos pueden realizar postulaciones.';

      return;
    }


    this.postulando =
      true;


    const perfilFinal =
      this.perfil.trim();


    /**
     * Si el candidato escribió un perfil suficientemente
     * completo lo utilizamos.
     *
     * Si no, FastAPI usará el perfil guardado en PostgreSQL.
     */
    const peticion =
      perfilFinal.length >= 20
        ? this.postulacionService
            .postularseConPerfil(
              vacanteId,
              perfilFinal
            )
        : this.postulacionService
            .postularseConPerfilGuardado(
              vacanteId
            );


    peticion.subscribe({

      next: (postulacion) => {

        this.postulando =
          false;

        this.mensaje =
          `Postulación registrada correctamente. Compatibilidad IA: ${
            postulacion.puntuacion_ia ?? 0
          }%.`;
      },


      error: (
        respuesta: HttpErrorResponse
      ) => {

        this.postulando =
          false;

        this.error =
          this.obtenerMensajeError(
            respuesta,
            'No fue posible registrar la postulación.'
          );
      }
    });
  }


  // ==========================================================
  // CERRAR VACANTE
  // ==========================================================

  cerrar(
    vacanteId: number
  ): void {

    this.error = '';

    this.mensaje = '';


    const confirmado =
      window.confirm(
        '¿Deseas cerrar esta vacante? No se eliminará físicamente de la base de datos.'
      );


    if (!confirmado) {
      return;
    }


    this.vacanteService
      .cerrar(
        vacanteId
      )
      .subscribe({

        next: () => {

          this.mensaje =
            'La vacante fue cerrada correctamente.';

          this.cargarVacantes();
        },


        error: (
          respuesta: HttpErrorResponse
        ) => {

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible cerrar la vacante.'
            );
        }
      });
  }


  // ==========================================================
  // CREAR VACANTE
  // ==========================================================

  crear(): void {

    this.error = '';

    this.mensaje = '';


    if (!this.gestiona) {

      this.error =
        'No tienes permisos para publicar vacantes.';

      return;
    }


    if (
      this.form.titulo.trim().length < 3 ||
      this.form.descripcion.trim().length < 10 ||
      this.form.requisitos.trim().length < 5
    ) {

      this.error =
        'Completa correctamente título, descripción y requisitos.';

      return;
    }


    /**
     * Para administradores sí es necesario seleccionar empresa.
     *
     * El reclutador utiliza automáticamente la empresa
     * asociada a su usuario desde FastAPI.
     */
    if (
      this.auth.usuario
        ?.rol?.nombre ===
        'administrador' &&
      !this.form.empresa_id
    ) {

      this.error =
        'Selecciona la empresa de la vacante.';

      return;
    }


    const nuevaVacante:
      VacanteCreate = {

        titulo:
          this.form.titulo.trim(),

        descripcion:
          this.form.descripcion.trim(),

        requisitos:
          this.form.requisitos.trim(),

        responsabilidades:
          this.form.responsabilidades
            .trim() || null,

        salario_min:
          this.form.salario_min,

        salario_max:
          this.form.salario_max,

        modalidad:
          this.form.modalidad,

        tipo_contrato:
          this.form.tipo_contrato,

        ubicacion:
          this.form.ubicacion
            .trim() || null,

        experiencia_minima:
          Number(
            this.form.experiencia_minima
          ) || 0,

        estado:
          'activa',

        habilidades: []
      };


    /**
     * Solo enviamos empresa_id si existe.
     */
    if (this.form.empresa_id) {

      nuevaVacante.empresa_id =
        this.form.empresa_id;
    }


    this.publicando =
      true;


    this.vacanteService
      .crear(
        nuevaVacante
      )
      .subscribe({

        next: () => {

          this.publicando =
            false;

          this.mensaje =
            'Vacante publicada correctamente.';

          this.limpiarFormulario();

          this.cargarVacantes();
        },


        error: (
          respuesta: HttpErrorResponse
        ) => {

          this.publicando =
            false;

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible publicar la vacante.'
            );
        }
      });
  }


  // ==========================================================
  // LIMPIAR FORMULARIO
  // ==========================================================

  private limpiarFormulario():
    void {

    const empresaActual =
      this.auth.usuario
        ?.rol?.nombre ===
        'reclutador'
        ? this.auth.usuario
            ?.empresa?.id ?? null
        : null;


    this.form = {

      titulo: '',

      empresa_id:
        empresaActual,

      descripcion: '',

      requisitos: '',

      responsabilidades: '',

      salario_min: null,

      salario_max: null,

      modalidad: 'hibrido',

      tipo_contrato:
        'tiempo_completo',

      ubicacion: '',

      experiencia_minima: 0
    };
  }


  // ==========================================================
  // MENSAJE DE ERROR
  // ==========================================================

  private obtenerMensajeError(
    respuesta: HttpErrorResponse,
    mensajePredeterminado: string
  ): string {

    if (respuesta.status === 0) {

      return (
        'No fue posible conectar con FastAPI. ' +
        'Verifica que el backend esté ejecutándose.'
      );
    }


    if (
      typeof respuesta.error
        ?.detail ===
      'string'
    ) {

      return respuesta.error.detail;
    }


    return mensajePredeterminado;
  }
}