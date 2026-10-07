from pydantic import BaseModel, ConfigDict, Field
from typing import Literal
from pydantic import model_validator


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


class VacanteBase(BaseModel):
    titulo: str = Field(min_length=3, max_length=150)
    descripcion: str = Field(min_length=10)
    requisitos: str = Field(min_length=5)

    salario_min: int | None = Field(default=None, ge=0)
    salario_max: int | None = Field(default=None, ge=0)

    modalidad: Literal["presencial", "remoto", "hibrido"]

    ubicacion: str | None = None


class VacanteCrear(VacanteBase):
    empresa_id: int

    @model_validator(mode="after")
    def validar_salarios(self):
        if (
            self.salario_min is not None
            and self.salario_max is not None
            and self.salario_min > self.salario_max
        ):
            raise ValueError(
                "El salario mínimo no puede ser mayor al salario máximo"
            )

        return self


class VacanteActualizar(BaseModel):
    titulo: str | None = Field(
        default=None,
        min_length=3,
        max_length=150
    )

    descripcion: str | None = Field(
        default=None,
        min_length=10
    )

    requisitos: str | None = Field(
        default=None,
        min_length=5
    )

    salario_min: int | None = Field(default=None, ge=0)
    salario_max: int | None = Field(default=None, ge=0)

    modalidad: Literal[
        "presencial",
        "remoto",
        "hibrido"
    ] | None = None

    ubicacion: str | None = None

    estado: Literal[
        "activa",
        "cerrada"
    ] | None = None

    empresa_id: int | None = None


class VacanteRespuesta(VacanteBase):
    id: int
    empresa_id: int
    estado: str

    model_config = ConfigDict(from_attributes=True)