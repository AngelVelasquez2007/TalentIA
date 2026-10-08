export interface Empresa {
  id: number;
  nombre: string;
  descripcion: string | null;
  ciudad: string | null;
  sitio_web: string | null;
  activa: boolean;
}