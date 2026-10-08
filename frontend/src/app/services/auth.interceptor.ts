/** Adjunta el JWT solamente a solicitudes dirigidas a nuestra API local. */
import { HttpInterceptorFn } from '@angular/common/http';
export const authInterceptor:HttpInterceptorFn=(req,next)=>{
  const token=sessionStorage.getItem('talentia_token');
  if(token && req.url.startsWith('http://127.0.0.1:8000/'))req=req.clone({setHeaders:{Authorization:`Bearer ${token}`}});
  return next(req);
};
