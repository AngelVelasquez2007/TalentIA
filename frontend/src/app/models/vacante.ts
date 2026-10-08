export interface Vacante {
  id: number;
  titulo: string;
  descripcion: string;
  requisitos: string;
  salario_min: number | null;
  salario_max: number | null;
  modalidad: string;
  ubicacion: string | null;
  empresa_id: number;
  estado: string;
}