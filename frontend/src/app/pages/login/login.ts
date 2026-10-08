/** Inicio de sesión y registro; los errores de la API se presentan en pantalla. */
import { Component,inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router,RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';
@Component({selector:'app-login',imports:[FormsModule,RouterLink],templateUrl:'./login.html'})
export class Login {private auth=inject(AuthService);private router=inject(Router);email='';password='';error='';cargando=false;
 entrar(){this.error='';this.cargando=true;this.auth.login(this.email,this.password).subscribe({next:()=>this.router.navigate(['/vacantes']),error:e=>{this.error=e.error?.detail||'No se pudo iniciar sesión';this.cargando=false}})}
}
