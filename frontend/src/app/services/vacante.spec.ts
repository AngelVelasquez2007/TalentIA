/**
 * ============================================================
 * TalentIA - Pruebas del servicio de vacantes
 * Archivo: src/app/services/vacante.spec.ts
 * ============================================================
 */

import {
  TestBed
} from '@angular/core/testing';

import {
  provideHttpClient
} from '@angular/common/http';

import {
  HttpTestingController,
  provideHttpClientTesting
} from '@angular/common/http/testing';

import {
  VacanteService
} from './vacante';


describe(
  'VacanteService',
  () => {

    let service:
      VacanteService;

    let http:
      HttpTestingController;


    beforeEach(
      () => {

        TestBed.configureTestingModule({
          providers: [
            provideHttpClient(),
            provideHttpClientTesting()
          ]
        });


        service =
          TestBed.inject(
            VacanteService
          );

        http =
          TestBed.inject(
            HttpTestingController
          );
      }
    );


    afterEach(
      () => {

        http.verify();
      }
    );


    it(
      'debe crearse correctamente',
      () => {

        expect(service)
          .toBeTruthy();
      }
    );


    it(
      'debe consultar las vacantes públicas',
      () => {

        service
          .listar()
          .subscribe(
            (vacantes) => {

              expect(vacantes)
                .toEqual([]);
            }
          );


        const request =
          http.expectOne(
            'http://127.0.0.1:8000/vacantes'
          );


        expect(request.request.method)
          .toBe('GET');


        request.flush([]);
      }
    );


    it(
      'debe enviar los filtros de vacantes',
      () => {

        service
          .listar({
            buscar: 'Angular',
            modalidad: 'remoto',
            experiencia_maxima: 2,
            limit: 20
          })
          .subscribe();


        const request =
          http.expectOne(
            (req) =>
              req.url ===
                'http://127.0.0.1:8000/vacantes'
          );


        expect(
          request.request.params.get(
            'buscar'
          )
        ).toBe('Angular');

        expect(
          request.request.params.get(
            'modalidad'
          )
        ).toBe('remoto');

        expect(
          request.request.params.get(
            'experiencia_maxima'
          )
        ).toBe('2');

        expect(
          request.request.params.get(
            'limit'
          )
        ).toBe('20');


        request.flush([]);
      }
    );


    it(
      'debe cerrar una vacante mediante DELETE',
      () => {

        service
          .cerrar(7)
          .subscribe(
            (respuesta) => {

              expect(respuesta.message)
                .toBe(
                  'Vacante cerrada correctamente.'
                );
            }
          );


        const request =
          http.expectOne(
            'http://127.0.0.1:8000/vacantes/7'
          );


        expect(request.request.method)
          .toBe('DELETE');


        request.flush({
          message:
            'Vacante cerrada correctamente.'
        });
      }
    );
  }
);
