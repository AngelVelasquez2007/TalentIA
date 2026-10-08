import { Component,inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router,RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
@Component({selector:'app-registro',imports:[FormsModule,RouterLink],templateUrl:'./registro.html'})
export class Registro {private auth=inject(AuthService);private router=inject(Router);nombre='';apellido='';email='';password='';error='';
 guardar(){this.error='';this.auth.registro({nombre:this.nombre,apellido:this.apellido,email:this.email,password:this.password}).subscribe({next:()=>this.router.navigate(['/login']),error:e=>this.error=typeof e.error?.detail==='string'?e.error.detail:'Revisa los datos (contraseña mínimo 8 caracteres)'})}
}
