/**
 * ============================================================
 * TalentIA - Catálogo moderno de vacantes
 * Archivo: src/app/pages/vacantes/vacantes.ts
 * ============================================================
 *
 * Responsabilidades:
 *
 * - cargar el catálogo público;
 * - buscar, filtrar y ordenar oportunidades;
 * - reaccionar correctamente a la restauración de sesión;
 * - recuperar el perfil persistido del candidato;
 * - analizar compatibilidad sin pedir el perfil nuevamente;
 * - postular utilizando PostgreSQL como fuente de verdad;
 * - gestionar publicación/cierre para reclutador y admin;
 * - liberar todos los estados visuales de carga correctamente.
 *
 * ============================================================
 */

import {
  ChangeDetectorRef,
  Component,
  OnDestroy,
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
  Subscription,
  take
} from 'rxjs';

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
  UsuarioService
} from '../../services/usuario';

import {
  Empresa
} from '../../models/empresa';

import {
  ModalidadVacante,
  Vacante,
  VacanteCreate
} from '../../models/vacante';

import {
  AnalisisCompatibilidad
} from '../../models/analisis';

import {
  Usuario
} from '../../models/usuario';


type FiltroModalidad =
  | 'todas'
  | ModalidadVacante;


type OrdenVacantes =
  | 'recientes'
  | 'salario'
  | 'alfabetico';


interface VacanteForm {
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
}


@Component({
  selector: 'app-vacantes',

  standalone: true,

  imports: [
    CommonModule,
    FormsModule,
    RouterLink
  ],

  templateUrl:
    './vacantes.html',

  styleUrl:
    './vacantes.scss'
})
export class Vacantes
  implements OnInit, OnDestroy {

  // ==========================================================
  // CATÁLOGO
  // ==========================================================

  vacantes: Vacante[] = [];

  empresas: Empresa[] = [];


  // ==========================================================
  // FILTROS
  // ==========================================================

  busqueda = '';

  modalidad:
    FiltroModalidad = 'todas';

  orden:
    OrdenVacantes = 'recientes';


  // ==========================================================
  // PERFIL Y MATCHING
  // ==========================================================

  seleccion:
    number | null = null;

  perfilCandidato:
    Usuario | null = null;

  analisis:
    AnalisisCompatibilidad | null = null;

  /**
   * Relaciona el resultado almacenado con la vacante
   * que realmente fue analizada. Evita mostrar un resultado
   * viejo si el usuario cambia de tarjeta rápidamente.
   */
  analisisVacanteId:
    number | null = null;


  // ==========================================================
  // ESTADOS VISUALES
  // ==========================================================

  cargando = false;

  cargandoPerfil = false;

  analizando = false;

  postulando = false;

  publicando = false;

  mensaje = '';

  error = '';


  // ==========================================================
  // CONTROL DE PETICIONES
  // ==========================================================

  /**
   * Cada nueva carga obtiene un identificador. Si una respuesta
   * antigua llega después de una más reciente, se ignora.
   */
  private cargaVacantesId = 0;

  private cargaPerfilId = 0;

  private analisisId = 0;

  private postulacionId = 0;

  private authSubscription:
    Subscription | null = null;

  private ultimoUsuarioProcesado:
    number | null = null;


  // ==========================================================
  // FORMULARIO DE PUBLICACIÓN
  // ==========================================================

  form:
    VacanteForm = {
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
    public readonly auth:
      AuthService,

    private readonly vacanteService:
      VacanteService,

    private readonly empresaService:
      EmpresaService,

    private readonly analisisService:
      AnalisisService,

    private readonly postulacionService:
      PostulacionService,

    private readonly usuarioService:
      UsuarioService,

    private readonly cdr:
      ChangeDetectorRef
  ) {}


  // ==========================================================
  // CICLO DE VIDA
  // ==========================================================

  ngOnInit(): void {

    /**
     * El catálogo es público y no depende de la sesión.
     */
    this.cargarVacantes();


    /**
     * /vacantes también es pública. En una recarga completa,
     * el componente puede crearse antes de que AuthService
     * termine GET /auth/me.
     *
     * Por eso NO comprobamos el rol una sola vez en ngOnInit.
     * Escuchamos usuario$ y reaccionamos cuando la restauración
     * de sesión realmente termina.
     */
    this.authSubscription =
      this.auth.usuario$
        .subscribe(
          (usuario) => {

            this.procesarCambioUsuario(
              usuario
            );
          }
        );
  }


  ngOnDestroy(): void {

    this.authSubscription
      ?.unsubscribe();
  }


  // ==========================================================
  // SESIÓN / ROLES
  // ==========================================================

  get esCandidato(): boolean {

    return (
      this.auth.usuario
        ?.rol?.nombre ===
      'candidato'
    );
  }


  get gestiona(): boolean {

    const rol =
      this.auth.usuario
        ?.rol?.nombre;


    return (
      rol === 'administrador'
      ||
      rol === 'reclutador'
    );
  }


  private procesarCambioUsuario(
    usuario:
      Usuario | null
  ): void {

    if (!usuario) {

      this.ultimoUsuarioProcesado =
        null;

      this.perfilCandidato =
        null;

      this.empresas = [];

      this.refrescarVista();

      return;
    }


    /**
     * Evita volver a ejecutar cargas por una emisión repetida
     * del mismo usuario.
     */
    if (
      this.ultimoUsuarioProcesado ===
      usuario.id
    ) {

      return;
    }


    this.ultimoUsuarioProcesado =
      usuario.id;


    if (
      usuario.rol.nombre ===
      'candidato'
    ) {

      this.cargarPerfilCandidato();
    } else {

      this.perfilCandidato =
        null;
    }


    if (
      usuario.rol.nombre ===
        'administrador'
      ||
      usuario.rol.nombre ===
        'reclutador'
    ) {

      this.cargarEmpresas();
    } else {

      this.empresas = [];
    }


    this.refrescarVista();
  }


  // ==========================================================
  // PERFIL DEL CANDIDATO
  // ==========================================================

  get perfilProfesionalGuardado(): string {

    return (
      this.perfilCandidato
        ?.perfil_profesional ??
      ''
    ).trim();
  }


  get habilidadesPerfil(): string[] {

    const nombres =
      (
        this.perfilCandidato
          ?.habilidades ??
        []
      )
        .map(
          (item) =>
            item
              ?.habilidad
              ?.nombre
              ?.trim() ??
            ''
        )
        .filter(
          (nombre) =>
            nombre.length > 0
        );


    /** Elimina duplicados ignorando mayúsculas. */
    const vistas =
      new Set<string>();


    return nombres.filter(
      (nombre) => {

        const clave =
          nombre.toLowerCase();


        if (
          vistas.has(clave)
        ) {

          return false;
        }


        vistas.add(clave);

        return true;
      }
    );
  }


  get experienciaPerfil(): number {

    return Number(
      this.perfilCandidato
        ?.experiencia_anios ??
      0
    );
  }


  get perfilListo(): boolean {

    return (
      this.perfilProfesionalGuardado
        .length >= 20
    );
  }


  // ==========================================================
  // ESTADÍSTICAS
  // ==========================================================

  get totalRemotas(): number {

    return this.vacantes
      .filter(
        (vacante) =>
          vacante.modalidad ===
          'remoto'
      )
      .length;
  }


  get totalHibridas(): number {

    return this.vacantes
      .filter(
        (vacante) =>
          vacante.modalidad ===
          'hibrido'
      )
      .length;
  }


  get totalEmpresas(): number {

    return new Set(
      this.vacantes
        .map(
          (vacante) =>
            vacante.empresa?.id
        )
        .filter(
          (
            id
          ): id is number =>
            typeof id === 'number'
        )
    ).size;
  }


  // ==========================================================
  // FILTROS
  // ==========================================================

  get filtradas(): Vacante[] {

    let resultado =
      [...this.vacantes];


    const termino =
      this.busqueda
        .trim()
        .toLowerCase();


    if (termino) {

      resultado =
        resultado.filter(
          (vacante) => {

            const habilidades =
              (
                vacante.habilidades ??
                []
              )
                .map(
                  (item) =>
                    item
                      .habilidad
                      .nombre
                );


            const contenido = [
              vacante.titulo,
              vacante.descripcion,
              vacante.requisitos,
              vacante.ubicacion ?? '',
              vacante.empresa?.nombre ?? '',
              vacante.modalidad,
              ...habilidades
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
      this.modalidad !==
      'todas'
    ) {

      resultado =
        resultado.filter(
          (vacante) =>
            vacante.modalidad ===
            this.modalidad
        );
    }


    switch (this.orden) {

      case 'salario':

        resultado.sort(
          (a, b) =>
            this.salarioOrden(b)
            -
            this.salarioOrden(a)
        );

        break;


      case 'alfabetico':

        resultado.sort(
          (a, b) =>
            a.titulo.localeCompare(
              b.titulo,
              'es'
            )
        );

        break;


      case 'recientes':

      default:

        resultado.sort(
          (a, b) =>
            this.fechaOrden(b.creada_en)
            -
            this.fechaOrden(a.creada_en)
        );
    }


    return resultado;
  }


  seleccionarModalidad(
    modalidad:
      FiltroModalidad
  ): void {

    this.modalidad =
      modalidad;
  }


  limpiarFiltros(): void {

    this.busqueda = '';

    this.modalidad =
      'todas';

    this.orden =
      'recientes';
  }


  // ==========================================================
  // CARGAR VACANTES
  // ==========================================================

  cargarVacantes(): void {

    const solicitudId =
      ++this.cargaVacantesId;


    this.cargando =
      true;

    this.error = '';

    this.refrescarVista();


    this.vacanteService
      .listar()
      .pipe(
        take(1)
      )
      .subscribe({

        next: (vacantes) => {

          if (
            solicitudId !==
            this.cargaVacantesId
          ) {

            return;
          }


          this.vacantes =
            Array.isArray(vacantes)
              ? vacantes
              : [];

          this.cargando =
            false;

          this.refrescarVista();
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          if (
            solicitudId !==
            this.cargaVacantesId
          ) {

            return;
          }


          this.vacantes = [];

          this.cargando =
            false;

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No pudimos cargar las oportunidades.'
            );

          this.refrescarVista();
        },


        complete: () => {

          if (
            solicitudId ===
            this.cargaVacantesId
          ) {

            this.cargando =
              false;

            this.refrescarVista();
          }
        }
      });
  }


  // ==========================================================
  // EMPRESAS
  // ==========================================================

  cargarEmpresas(): void {

    if (!this.gestiona) {

      this.empresas = [];

      return;
    }


    this.empresaService
      .listar()
      .pipe(
        take(1)
      )
      .subscribe({

        next: (empresas) => {

          this.empresas =
            Array.isArray(empresas)
              ? empresas
              : [];


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


          this.refrescarVista();
        },


        error: () => {

          this.empresas = [];

          this.refrescarVista();
        }
      });
  }


  // ==========================================================
  // CARGAR PERFIL ACTUAL
  // ==========================================================

  cargarPerfilCandidato(): void {

    if (
      !this.auth.autenticado
      ||
      !this.esCandidato
    ) {

      this.perfilCandidato =
        null;

      this.cargandoPerfil =
        false;

      this.refrescarVista();

      return;
    }


    const solicitudId =
      ++this.cargaPerfilId;


    this.cargandoPerfil =
      true;

    this.refrescarVista();


    this.usuarioService
      .obtenerMiPerfil()
      .pipe(
        take(1)
      )
      .subscribe({

        next: (usuario) => {

          if (
            solicitudId !==
            this.cargaPerfilId
          ) {

            return;
          }


          this.perfilCandidato =
            usuario;

          this.cargandoPerfil =
            false;

          this.refrescarVista();
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          if (
            solicitudId !==
            this.cargaPerfilId
          ) {

            return;
          }


          this.perfilCandidato =
            null;

          this.cargandoPerfil =
            false;

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible cargar tu perfil profesional.'
            );

          this.refrescarVista();
        },


        complete: () => {

          if (
            solicitudId ===
            this.cargaPerfilId
          ) {

            this.cargandoPerfil =
              false;

            this.refrescarVista();
          }
        }
      });
  }


  // ==========================================================
  // SELECCIONAR PARA MATCHING
  // ==========================================================

  seleccionarParaAnalisis(
    vacanteId:
      number
  ): void {

    if (
      this.seleccion ===
      vacanteId
    ) {

      this.seleccion =
        null;

      this.analisis =
        null;

      this.analisisVacanteId =
        null;

      this.error = '';

      this.mensaje = '';

      this.refrescarVista();

      return;
    }


    this.seleccion =
      vacanteId;

    this.analisis =
      null;

    this.analisisVacanteId =
      null;

    this.error = '';

    this.mensaje = '';


    /**
     * Recupera siempre la versión actual del perfil guardado.
     */
    this.cargarPerfilCandidato();

    this.refrescarVista();
  }


  // ==========================================================
  // ANALIZAR COMPATIBILIDAD
  // ==========================================================

  analizar(
    vacanteId:
      number
  ): void {

    if (this.analizando) {

      return;
    }


    this.error = '';

    this.mensaje = '';

    this.analisis =
      null;

    this.analisisVacanteId =
      null;


    if (
      !this.auth.autenticado
    ) {

      this.error =
        'Inicia sesión como candidato para analizar tu perfil.';

      this.refrescarVista();

      return;
    }


    if (!this.esCandidato) {

      this.error =
        'Esta función está disponible para candidatos.';

      this.refrescarVista();

      return;
    }


    if (this.cargandoPerfil) {

      this.error =
        'Estamos terminando de cargar tu perfil. Intenta nuevamente en un momento.';

      this.refrescarVista();

      return;
    }


    if (!this.perfilListo) {

      this.error =
        'Completa tu perfil profesional antes de calcular la compatibilidad.';

      this.refrescarVista();

      return;
    }


    const solicitudId =
      ++this.analisisId;


    this.analizando =
      true;

    this.refrescarVista();


    this.analisisService
      .analizarPerfilGuardado(
        vacanteId,
        this.perfilProfesionalGuardado,
        this.habilidadesPerfil
      )
      .pipe(
        take(1)
      )
      .subscribe({

        next: (resultado) => {

          if (
            solicitudId !==
            this.analisisId
          ) {

            return;
          }


          this.analizando =
            false;


          /**
           * Solo mostramos el resultado si el usuario sigue
           * viendo la misma vacante que inició el análisis.
           */
          if (
            this.seleccion ===
            vacanteId
          ) {

            this.analisis =
              resultado;

            this.analisisVacanteId =
              vacanteId;
          }


          this.refrescarVista();
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          if (
            solicitudId !==
            this.analisisId
          ) {

            return;
          }


          this.analizando =
            false;

          this.analisis =
            null;

          this.analisisVacanteId =
            null;

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No pudimos calcular tu compatibilidad.'
            );

          this.refrescarVista();
        },


        complete: () => {

          if (
            solicitudId ===
            this.analisisId
          ) {

            this.analizando =
              false;

            this.refrescarVista();
          }
        }
      });
  }


  // ==========================================================
  // POSTULAR
  // ==========================================================

  postular(
    vacanteId:
      number
  ): void {

    if (this.postulando) {

      return;
    }


    this.error = '';

    this.mensaje = '';


    if (!this.esCandidato) {

      this.error =
        'Solo los candidatos pueden postularse.';

      this.refrescarVista();

      return;
    }


    if (this.cargandoPerfil) {

      this.error =
        'Estamos terminando de cargar tu perfil. Intenta nuevamente.';

      this.refrescarVista();

      return;
    }


    if (!this.perfilListo) {

      this.error =
        'Completa tu perfil profesional antes de postularte.';

      this.refrescarVista();

      return;
    }


    const solicitudId =
      ++this.postulacionId;


    this.postulando =
      true;

    this.refrescarVista();


    /**
     * Importante:
     *
     * No reenviamos habilidades desde Angular. El backend
     * recupera directamente el perfil y las competencias
     * persistidas en PostgreSQL, por lo que la postulación
     * siempre utiliza la fuente de verdad del sistema.
     */
    this.postulacionService
      .postularseConPerfilGuardado(
        vacanteId
      )
      .pipe(
        take(1)
      )
      .subscribe({

        next: (postulacion) => {

          if (
            solicitudId !==
            this.postulacionId
          ) {

            return;
          }


          this.postulando =
            false;

          this.mensaje =
            `Postulación enviada. Compatibilidad: ${
              postulacion.puntuacion_ia ?? 0
            }%.`;

          this.refrescarVista();
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          if (
            solicitudId !==
            this.postulacionId
          ) {

            return;
          }


          this.postulando =
            false;

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible registrar la postulación.'
            );

          this.refrescarVista();
        },


        complete: () => {

          if (
            solicitudId ===
            this.postulacionId
          ) {

            this.postulando =
              false;

            this.refrescarVista();
          }
        }
      });
  }


  // ==========================================================
  // CERRAR VACANTE
  // ==========================================================

  cerrar(
    vacanteId:
      number
  ): void {

    const confirmado =
      window.confirm(
        '¿Cerrar esta vacante? Se conservará su historial.'
      );


    if (!confirmado) {

      return;
    }


    this.error = '';

    this.mensaje = '';


    this.vacanteService
      .cerrar(
        vacanteId
      )
      .pipe(
        take(1)
      )
      .subscribe({

        next: () => {

          this.mensaje =
            'Vacante cerrada correctamente.';

          this.cargarVacantes();
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible cerrar la vacante.'
            );

          this.refrescarVista();
        }
      });
  }


  // ==========================================================
  // CREAR VACANTE
  // ==========================================================

  crear(): void {

    if (this.publicando) {

      return;
    }


    this.error = '';

    this.mensaje = '';


    if (!this.gestiona) {

      this.error =
        'No tienes permisos para publicar vacantes.';

      this.refrescarVista();

      return;
    }


    if (
      this.form.titulo
        .trim()
        .length < 3
      ||
      this.form.descripcion
        .trim()
        .length < 10
      ||
      this.form.requisitos
        .trim()
        .length < 5
    ) {

      this.error =
        'Completa título, descripción y requisitos.';

      this.refrescarVista();

      return;
    }


    if (
      this.auth.usuario
        ?.rol?.nombre ===
        'administrador'
      &&
      !this.form.empresa_id
    ) {

      this.error =
        'Selecciona una empresa.';

      this.refrescarVista();

      return;
    }


    if (
      this.form.salario_min !== null
      &&
      this.form.salario_max !== null
      &&
      this.form.salario_min >
        this.form.salario_max
    ) {

      this.error =
        'El salario mínimo no puede superar el salario máximo.';

      this.refrescarVista();

      return;
    }


    const datos:
      VacanteCreate = {

        titulo:
          this.form.titulo
            .trim(),

        descripcion:
          this.form.descripcion
            .trim(),

        requisitos:
          this.form.requisitos
            .trim(),

        responsabilidades:
          this.form.responsabilidades
            .trim() ||
          null,

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
            .trim() ||
          null,

        experiencia_minima:
          Math.max(
            0,
            Number(
              this.form.experiencia_minima
            ) || 0
          ),

        estado:
          'activa',

        habilidades: []
      };


    if (
      this.form.empresa_id !==
      null
    ) {

      datos.empresa_id =
        this.form.empresa_id;
    }


    this.publicando =
      true;

    this.refrescarVista();


    this.vacanteService
      .crear(
        datos
      )
      .pipe(
        take(1)
      )
      .subscribe({

        next: () => {

          this.publicando =
            false;

          this.mensaje =
            'Vacante publicada correctamente.';

          this.limpiarFormulario();

          this.cargarVacantes();

          this.refrescarVista();
        },


        error: (
          respuesta:
            HttpErrorResponse
        ) => {

          this.publicando =
            false;

          this.error =
            this.obtenerMensajeError(
              respuesta,
              'No fue posible publicar la vacante.'
            );

          this.refrescarVista();
        },


        complete: () => {

          this.publicando =
            false;

          this.refrescarVista();
        }
      });
  }


  // ==========================================================
  // UTILIDADES
  // ==========================================================

  salarioTexto(
    vacante:
      Vacante
  ): string {

    if (
      vacante.salario_min ===
        null
      &&
      vacante.salario_max ===
        null
    ) {

      return 'Salario a convenir';
    }


    const formatter =
      new Intl.NumberFormat(
        'es-CO',
        {
          style:
            'currency',

          currency:
            'COP',

          maximumFractionDigits:
            0
        }
      );


    if (
      vacante.salario_min !==
        null
      &&
      vacante.salario_max !==
        null
    ) {

      return (
        `${formatter.format(
          vacante.salario_min
        )} – ${formatter.format(
          vacante.salario_max
        )}`
      );
    }


    return formatter.format(
      vacante.salario_min ??
      vacante.salario_max ??
      0
    );
  }


  private salarioOrden(
    vacante:
      Vacante
  ): number {

    return (
      vacante.salario_max ??
      vacante.salario_min ??
      0
    );
  }


  private fechaOrden(
    fecha:
      string
  ): number {

    const valor =
      new Date(fecha)
        .getTime();


    return Number.isNaN(valor)
      ? 0
      : valor;
  }


  private crearFormularioVacio():
    VacanteForm {

    return {
      titulo: '',

      empresa_id:
        this.auth?.usuario
          ?.rol?.nombre ===
          'reclutador'
          ? this.auth.usuario
              ?.empresa?.id ??
            null
          : null,

      descripcion: '',

      requisitos: '',

      responsabilidades: '',

      salario_min: null,

      salario_max: null,

      modalidad:
        'hibrido',

      tipo_contrato:
        'tiempo_completo',

      ubicacion: '',

      experiencia_minima: 0
    };
  }


  private limpiarFormulario(): void {

    this.form =
      this.crearFormularioVacio();
  }


  private refrescarVista(): void {

    try {

      this.cdr
        .detectChanges();

    } catch {

      /**
       * Si Angular ya está ejecutando un ciclo de detección,
       * la siguiente actualización normal reflejará el estado.
       */
    }
  }


  private obtenerMensajeError(
    respuesta:
      HttpErrorResponse,

    predeterminado:
      string
  ): string {

    if (
      respuesta.status === 0
    ) {

      const detalle =
        respuesta
          .error?.detail;


      if (
        typeof detalle ===
        'string'
      ) {

        return detalle;
      }


      return (
        'No hay conexión con FastAPI o la petición tardó demasiado. ' +
        'Verifica el backend e inténtalo nuevamente.'
      );
    }


    if (
      respuesta.status === 401
    ) {

      return (
        'Tu sesión expiró. Inicia sesión nuevamente.'
      );
    }


    if (
      respuesta.status === 403
    ) {

      return (
        typeof respuesta.error?.detail === 'string'
          ? respuesta.error.detail
          : 'No tienes permisos para esta operación.'
      );
    }


    if (
      respuesta.status === 409
      &&
      typeof respuesta.error?.detail ===
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


    return predeterminado;
  }
}
