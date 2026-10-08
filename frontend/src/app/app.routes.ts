import { Routes } from '@angular/router';
import { Vacantes } from './pages/vacantes/vacantes';
import { Login } from './pages/login/login';
import { Registro } from './pages/registro/registro';
import { Postulaciones } from './pages/postulaciones/postulaciones';
export const routes:Routes=[{path:'',redirectTo:'vacantes',pathMatch:'full'},{path:'vacantes',component:Vacantes},{path:'login',component:Login},{path:'registro',component:Registro},{path:'postulaciones',component:Postulaciones},{path:'**',redirectTo:'vacantes'}];
