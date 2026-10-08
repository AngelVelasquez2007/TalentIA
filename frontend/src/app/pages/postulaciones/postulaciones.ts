/** Panel de postulaciones según rol. */
import { Component,inject,OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { AuthService } from '../../services/auth';
interface Postulacion {id:number;vacante:string;estado:string;puntuacion_ia:number;candidato_id:number}
@Component({selector:'app-postulaciones',imports:[CommonModule],templateUrl:'./postulaciones.html'})
export class Postulaciones implements OnInit {auth=inject(AuthService);private http=inject(HttpClient);items:Postulacion[]=[];error='';base='http://127.0.0.1:8000/postulaciones';
 ngOnInit(){this.cargar()}
 cargar(){this.http.get<Postulacion[]>(this.base+'/').subscribe({next:r=>this.items=r,error:()=>this.error='No se pudieron cargar postulaciones'})}
 cambiar(id:number,estado:string){this.http.patch(`${this.base}/${id}/estado`,{estado}).subscribe({next:()=>this.cargar(),error:()=>this.error='No tienes permisos para modificar esta postulación'})}
}
