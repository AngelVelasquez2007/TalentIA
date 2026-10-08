import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { Empresa } from '../models/empresa';

@Injectable({
  providedIn: 'root'
})
export class EmpresaService {

  private apiUrl = 'http://127.0.0.1:8000/empresas';

  constructor(private http: HttpClient) {}

  listar(): Observable<Empresa[]> {
    return this.http.get<Empresa[]>(`${this.apiUrl}/`);
  }

  obtener(id: number): Observable<Empresa> {
    return this.http.get<Empresa>(`${this.apiUrl}/${id}`);
  }

  crear(empresa: Partial<Empresa>): Observable<Empresa> {
    return this.http.post<Empresa>(
      `${this.apiUrl}/`,
      empresa
    );
  }

  actualizar(
    id: number,
    empresa: Partial<Empresa>
  ): Observable<Empresa> {
    return this.http.put<Empresa>(
      `${this.apiUrl}/${id}`,
      empresa
    );
  }

  eliminar(id: number): Observable<void> {
    return this.http.delete<void>(
      `${this.apiUrl}/${id}`
    );
  }
}