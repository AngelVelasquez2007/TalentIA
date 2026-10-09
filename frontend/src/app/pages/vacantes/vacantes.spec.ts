/**
 * ============================================================
 * TalentIA - Pruebas de la página de vacantes
 * Archivo: src/app/pages/vacantes/vacantes.spec.ts
 * ============================================================
 *
 * Se utilizan servicios simulados para que las pruebas:
 *
 * - no dependan de FastAPI;
 * - no dependan de PostgreSQL;
 * - no queden esperando peticiones HTTP;
 * - sean deterministas.
 * ============================================================
 */

import {
  ComponentFixture,
  TestBed
} from '@angular/core/testing';

import {
  provideRouter
} from '@angular/router';

import {
  BehaviorSubject,
  of
} from 'rxjs';

import {
  Vacantes
} from './vacantes';

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
  Usuario
} from '../../models/usuario';


class AuthServiceMock {

  private readonly usuarioSubject =
    new BehaviorSubject<Usuario | null>(
      null
    );


  readonly usuario$ =
    this.usuarioSubject.asObservable();


  get usuario(): Usuario | null {

    return this.usuarioSubject.value;
  }


  get autenticado(): boolean {

    return false;
  }
}


class VacanteServiceMock {

  listar() {

    return of([]);
  }


  crear() {

    return of(null);
  }


  cerrar() {

    return of({
      message:
        'Vacante cerrada correctamente.'
    });
  }
}


class EmpresaServiceMock {

  listar() {

    return of([]);
  }
}


class AnalisisServiceMock {

  analizarVacante() {

    return of({
      puntuacion: 0,
      similitud_texto: 0,
      coincidencia_habilidades: 0,
      clasificacion: 'baja',
      habilidades_coincidentes: [],
      habilidades_faltantes: [],
      explicacion: ''
    });
  }
}


class PostulacionServiceMock {

  postularseConPerfilGuardado() {

    return of({
      puntuacion_ia: 0
    });
  }
}


class UsuarioServiceMock {

  obtenerMiPerfil() {

    return of(null);
  }
}


describe(
  'Vacantes',
  () => {

    let component:
      Vacantes;

    let fixture:
      ComponentFixture<Vacantes>;


    beforeEach(
      async () => {

        await TestBed
          .configureTestingModule({
            imports: [
              Vacantes
            ],

            providers: [
              provideRouter([]),

              {
                provide:
                  AuthService,
                useClass:
                  AuthServiceMock
              },

              {
                provide:
                  VacanteService,
                useClass:
                  VacanteServiceMock
              },

              {
                provide:
                  EmpresaService,
                useClass:
                  EmpresaServiceMock
              },

              {
                provide:
                  AnalisisService,
                useClass:
                  AnalisisServiceMock
              },

              {
                provide:
                  PostulacionService,
                useClass:
                  PostulacionServiceMock
              },

              {
                provide:
                  UsuarioService,
                useClass:
                  UsuarioServiceMock
              }
            ]
          })
          .compileComponents();


        fixture =
          TestBed.createComponent(
            Vacantes
          );

        component =
          fixture.componentInstance;

        fixture.detectChanges();
      }
    );


    it(
      'debe crear la página',
      () => {

        expect(component)
          .toBeTruthy();
      }
    );


    it(
      'debe finalizar la carga del catálogo',
      () => {

        expect(component.cargando)
          .toBe(false);

        expect(component.vacantes)
          .toEqual([]);
      }
    );


    it(
      'debe limpiar los filtros',
      () => {

        component.busqueda =
          'Angular';

        component.modalidad =
          'remoto';

        component.orden =
          'salario';


        component.limpiarFiltros();


        expect(component.busqueda)
          .toBe('');

        expect(component.modalidad)
          .toBe('todas');

        expect(component.orden)
          .toBe('recientes');
      }
    );
  }
);
