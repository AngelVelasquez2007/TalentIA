/** Componente raíz: navegación global y cierre de sesión. */
import { CommonModule } from '@angular/common';
import { Component,inject } from '@angular/core';
import { RouterOutlet,RouterLink } from '@angular/router';
import { AuthService } from './services/auth';
@Component({selector:'app-root',imports:[CommonModule,RouterOutlet,RouterLink],templateUrl:'./app.html',styleUrl:'./app.scss'})
export class App {auth=inject(AuthService)}
