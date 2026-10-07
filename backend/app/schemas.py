from pydantic import BaseModel, ConfigDict, Field


class EmpresaBase(BaseModel):
    nombre: str = Field(min_length=2, max_length=120)
    descripcion: str | None = None
    ciudad: str | None = None
    sitio_web: str | None = None


class EmpresaCrear(EmpresaBase):
    pass


class EmpresaActualizar(BaseModel):
    nombre: str | None = Field(default=None, min_length=2, max_length=120)
    descripcion: str | None = None
    ciudad: str | None = None
    sitio_web: str | None = None
    activa: bool | None = None


class EmpresaRespuesta(EmpresaBase):
    id: int
    activa: bool

    model_config = ConfigDict(from_attributes=True)