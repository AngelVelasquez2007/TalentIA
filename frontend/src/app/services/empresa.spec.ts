/**
 * ============================================================
 * TalentIA - Pruebas del servicio de empresas
 * Archivo: src/app/services/empresa.spec.ts
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
  EmpresaService
} from './empresa';


describe(
  'EmpresaService',
  () => {

    let service:
      EmpresaService;

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
            EmpresaService
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
      'debe consultar el catálogo de empresas',
      () => {

        service
          .listar()
          .subscribe(
            (empresas) => {

              expect(empresas)
                .toEqual([]);
            }
          );


        const request =
          http.expectOne(
            'http://127.0.0.1:8000/empresas'
          );


        expect(request.request.method)
          .toBe('GET');


        request.flush([]);
      }
    );


    it(
      'debe enviar filtros como query params',
      () => {

        service
          .listar({
            buscar: 'software',
            ciudad: 'Bucaramanga',
            skip: 0,
            limit: 10
          })
          .subscribe();


        const request =
          http.expectOne(
            (req) =>
              req.url ===
                'http://127.0.0.1:8000/empresas'
          );


        expect(
          request.request.params.get(
            'buscar'
          )
        ).toBe('software');

        expect(
          request.request.params.get(
            'ciudad'
          )
        ).toBe('Bucaramanga');

        expect(
          request.request.params.get(
            'skip'
          )
        ).toBe('0');

        expect(
          request.request.params.get(
            'limit'
          )
        ).toBe('10');


        request.flush([]);
      }
    );
  }
);
