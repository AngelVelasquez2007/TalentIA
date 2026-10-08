/** Catálogo, creación para reclutadores y postulaciones con compatibilidad. */
import { Component,OnInit,inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { VacanteService } from '../../services/vacante';
import { EmpresaService } from '../../services/empresa';
import { AuthService } from '../../services/auth';
import { Vacante } from '../../models/vacante';
import { Empresa } from '../../models/empresa';
@Component({selector:'app-vacantes',imports:[CommonModule,FormsModule],templateUrl:'./vacantes.html',styleUrl:'./vacantes.scss'})
export class Vacantes implements OnInit {
 private vacanteService=inject(VacanteService);private empresaService=inject(EmpresaService);private http=inject(HttpClient);auth=inject(AuthService);
 vacantes:Vacante[]=[];empresas:Empresa[]=[];cargando=false;error='';mensaje='';busqueda='';perfil='';seleccion:number|null=null;analisis:any=null;
 form:any={titulo:'',descripcion:'',requisitos:'',salario_min:null,salario_max:null,modalidad:'remoto',ubicacion:'',empresa_id:null};
 get gestiona(){return ['administrador','reclutador'].includes(this.auth.usuario?.rol||'')}
 get filtradas(){return this.vacantes.filter(v=>(v.titulo+' '+v.descripcion+' '+v.ubicacion).toLowerCase().includes(this.busqueda.toLowerCase()))}
 ngOnInit(){this.cargar();this.empresaService.listar().subscribe({next:r=>this.empresas=r,error:()=>this.error='No se pudieron cargar empresas'})}
 cargar(){this.cargando=true;this.vacanteService.listar().subscribe({next:r=>{this.vacantes=r;this.cargando=false},error:()=>{this.error='No se pudo conectar con FastAPI';this.cargando=false}})}
 crear(){this.error='';this.mensaje='';if(this.form.salario_min!=null&&this.form.salario_max!=null&&this.form.salario_min>this.form.salario_max){this.error='Salario mínimo mayor al máximo';return}
 this.vacanteService.crear(this.form).subscribe({next:()=>{this.mensaje='Vacante creada';this.cargar()},error:e=>this.error=typeof e.error?.detail==='string'?e.error.detail:'Verifica los campos y permisos'})}
 eliminar(id:number){if(!confirm('¿Eliminar vacante?'))return;this.vacanteService.eliminar(id).subscribe({next:()=>this.cargar(),error:()=>this.error='No se pudo eliminar'})}
 analizar(id:number){this.seleccion=id;this.analisis=null;this.error='';this.http.post<any>('http://127.0.0.1:8000/analisis/compatibilidad',{vacante_id:id,perfil:this.perfil}).subscribe({next:r=>this.analisis=r,error:e=>this.error=typeof e.error?.detail==='string'?e.error.detail:'Escribe un perfil de al menos 20 caracteres e inicia sesión'})}
 postular(id:number){this.error='';this.http.post('http://127.0.0.1:8000/postulaciones/',{vacante_id:id,perfil:this.perfil}).subscribe({next:()=>this.mensaje='Postulación registrada correctamente',error:e=>this.error=typeof e.error?.detail==='string'?e.error.detail:'No se pudo postular'})}
}
