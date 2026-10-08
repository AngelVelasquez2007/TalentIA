import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Vacante } from '../models/vacante';

@Injectable({
  providedIn: 'root'
})
export class VacanteService {

  private apiUrl = 'http://127.0.0.1:8000/vacantes';

  constructor(private http: HttpClient) {}

  listar(): Observable<Vacante[]> {
    return this.http.get<Vacante[]>(`${this.apiUrl}/`);
  }

  obtener(id: number): Observable<Vacante> {
    return this.http.get<Vacante>(
      `${this.apiUrl}/${id}`
    );
  }

  crear(vacante: Partial<Vacante>): Observable<Vacante> {
    return this.http.post<Vacante>(
      `${this.apiUrl}/`,
      vacante
    );
  }

  actualizar(
    id: number,
    vacante: Partial<Vacante>
  ): Observable<Vacante> {
    return this.http.put<Vacante>(
      `${this.apiUrl}/${id}`,
      vacante
    );
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }
}