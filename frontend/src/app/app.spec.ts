/**
 * ============================================================
 * TalentIA - Pruebas del componente raíz
 * Archivo: src/app/app.spec.ts
 * ============================================================
 */

import {
  TestBed
} from '@angular/core/testing';

import {
  provideRouter
} from '@angular/router';

import {
  BehaviorSubject
} from 'rxjs';

import {
  App
} from './app';

import {
  AuthService
} from './services/auth';

import {
  ThemeService
} from './services/theme';

import {
  Usuario
} from './models/usuario';


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


  restaurarSesion() {

    return null;
  }


  logout(): void {

    this.usuarioSubject.next(
      null
    );
  }


  limpiarSesion(): void {

    this.usuarioSubject.next(
      null
    );
  }
}


class ThemeServiceMock {

  isDark = false;


  toggle(): void {

    this.isDark =
      !this.isDark;
  }
}


describe(
  'App',
  () => {

    beforeEach(
      async () => {

        await TestBed
          .configureTestingModule({
            imports: [
              App
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
                  ThemeService,

                useClass:
                  ThemeServiceMock
              }
            ]
          })
          .compileComponents();
      }
    );


    it(
      'debe crear la aplicación',
      () => {

        const fixture =
          TestBed.createComponent(
            App
          );


        expect(
          fixture.componentInstance
        ).toBeTruthy();
      }
    );


    it(
      'debe mostrar la marca TalentIA',
      () => {

        const fixture =
          TestBed.createComponent(
            App
          );

        fixture.detectChanges();


        const elemento =
          fixture.nativeElement as HTMLElement;


        const marca =
          elemento.querySelector(
            '.brand'
          );


        expect(
          marca?.textContent
            ?.replace(/\s+/g, '')
        ).toContain(
          'TalentIA'
        );
      }
    );
  }
);
