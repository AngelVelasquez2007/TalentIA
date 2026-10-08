/** Sesión JWT; se usa sessionStorage para limitar persistencia del token. */
import { Injectable,inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
export interface Usuario {id:number;nombre:string;apellido:string;email:string;rol:string;empresa_id:number|null}
@Injectable({providedIn:'root'})
export class AuthService {
  private http=inject(HttpClient);private router=inject(Router);
  private base='http://127.0.0.1:8000/auth';
  get token(){return sessionStorage.getItem('talentia_token')}
  get usuario():Usuario|null {try{return JSON.parse(sessionStorage.getItem('talentia_user')||'null')}catch{return null}}
  get autenticado(){return !!this.token}
  login(email:string,password:string){return this.http.post<{access_token:string;usuario:Usuario}>(`${this.base}/login`,{email,password}).pipe(tap(r=>{sessionStorage.setItem('talentia_token',r.access_token);sessionStorage.setItem('talentia_user',JSON.stringify(r.usuario))}))}
  registro(data:unknown){return this.http.post(`${this.base}/registro`,data)}
  salir(){sessionStorage.removeItem('talentia_token');sessionStorage.removeItem('talentia_user');this.router.navigate(['/login'])}
}
