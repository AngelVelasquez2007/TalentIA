"""
============================================================
TalentIA - Esquemas Pydantic
Archivo: app/schemas.py
============================================================

Este módulo define los contratos de entrada y salida de la API.

DIFERENCIA ENTRE models.py Y schemas.py:

models.py
    Define cómo se almacenan los datos en PostgreSQL.

schemas.py
    Define cómo entran y salen los datos por la API REST.

Ejemplo:

Angular
   |
   | JSON
   v
Pydantic Schema
   |
   | valida
   v
FastAPI
   |
   v
SQLAlchemy Model
   |
   v
PostgreSQL


Pydantic permite validar:

- tipos de datos;
- campos obligatorios;
- longitudes;
- correos;
- contraseñas;
- salarios;
- estados;
- modalidades;
- habilidades;
- resultados del motor de IA.

============================================================
"""

import re

from datetime import datetime
from typing import Literal

from pydantic import (
    BaseModel,
    ConfigDict,
    Field,
    field_validator,
    model_validator,
)


# ============================================================
# TIPOS REUTILIZABLES
# ============================================================

ModalidadVacante = Literal[
    "remoto",
    "presencial",
    "hibrido",
]

EstadoVacante = Literal[
    "borrador",
    "activa",
    "pausada",
    "cerrada",
]

EstadoPostulacion = Literal[
    "pendiente",
    "revision",
    "entrevista",
    "seleccionado",
    "rechazado",
]

NivelHabilidad = Literal[
    "basico",
    "intermedio",
    "avanzado",
    "experto",
]


# ============================================================
# CONFIGURACIÓN BASE
# ============================================================

class SchemaBase(BaseModel):
    """
    Clase base para todos los esquemas de TalentIA.

    from_attributes=True permite convertir automáticamente
    objetos de SQLAlchemy en respuestas Pydantic.

    Ejemplo:

        usuario_sqlalchemy
                |
                v
        UsuarioResponse
                |
                v
              JSON
    """

    model_config = ConfigDict(
        from_attributes=True,
        str_strip_whitespace=True,
    )


# ============================================================
# VALIDADORES COMUNES
# ============================================================

def validar_correo(correo: str) -> str:
    """
    Valida un correo electrónico mediante una expresión regular.

    Se utiliza una validación suficientemente estricta para
    el proyecto académico sin depender de paquetes externos.
    """

    correo = correo.strip().lower()

    patron = r"^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$"

    if not re.match(patron, correo):
        raise ValueError(
            "El correo electrónico no tiene un formato válido."
        )

    return correo


def validar_password(password: str) -> str:
    """
    Aplica las reglas mínimas de seguridad de TalentIA.

    La contraseña debe:

    - tener mínimo 8 caracteres;
    - contener al menos una letra;
    - contener al menos un número.
    """

    if len(password) < 8:
        raise ValueError(
            "La contraseña debe tener mínimo 8 caracteres."
        )

    if not re.search(r"[A-Za-z]", password):
        raise ValueError(
            "La contraseña debe contener al menos una letra."
        )

    if not re.search(r"\d", password):
        raise ValueError(
            "La contraseña debe contener al menos un número."
        )

    return password


# ============================================================
# 1. ROLES
# ============================================================

class RoleResponse(SchemaBase):
    """
    Representación pública de un rol.
    """

    id: int
    nombre: str
    descripcion: str | None = None


# ============================================================
# 2. EMPRESAS
# ============================================================

class EmpresaBase(SchemaBase):
    """
    Campos comunes utilizados para crear y mostrar empresas.
    """

    nombre: str = Field(
        min_length=2,
        max_length=150,
    )

    nit: str | None = Field(
        default=None,
        max_length=50,
    )

    descripcion: str | None = None

    sector: str | None = Field(
        default=None,
        max_length=100,
    )

    ciudad: str | None = Field(
        default=None,
        max_length=100,
    )

    pais: str | None = Field(
        default="Colombia",
        max_length=100,
    )

    sitio_web: str | None = Field(
        default=None,
        max_length=255,
    )


class EmpresaCreate(EmpresaBase):
    """
    Datos necesarios para registrar una nueva empresa.
    """

    pass


class EmpresaUpdate(SchemaBase):
    """
    Datos modificables de una empresa.

    Todos son opcionales porque una actualización puede
    modificar únicamente uno de ellos.
    """

    nombre: str | None = Field(
        default=None,
        min_length=2,
        max_length=150,
    )

    nit: str | None = Field(
        default=None,
        max_length=50,
    )

    descripcion: str | None = None

    sector: str | None = Field(
        default=None,
        max_length=100,
    )

    ciudad: str | None = Field(
        default=None,
        max_length=100,
    )

    pais: str | None = Field(
        default=None,
        max_length=100,
    )

    sitio_web: str | None = Field(
        default=None,
        max_length=255,
    )

    activa: bool | None = None


class EmpresaResumen(SchemaBase):
    """
    Versión reducida de empresa utilizada dentro de otras
    respuestas para evitar enviar información innecesaria.
    """

    id: int
    nombre: str
    sector: str | None = None
    ciudad: str | None = None


class EmpresaResponse(EmpresaBase):
    """
    Respuesta completa de una empresa.
    """

    id: int
    activa: bool
    creada_en: datetime
    actualizada_en: datetime


# ============================================================
# 3. HABILIDADES
# ============================================================

class HabilidadCreate(SchemaBase):
    """
    Permite registrar una habilidad en el catálogo.
    """

    nombre: str = Field(
        min_length=1,
        max_length=100,
    )

    categoria: str | None = Field(
        default=None,
        max_length=100,
    )


class HabilidadResponse(SchemaBase):
    """
    Representación de una habilidad almacenada.
    """

    id: int
    nombre: str
    categoria: str | None = None
    activa: bool


# ============================================================
# 4. HABILIDADES DE USUARIO
# ============================================================

class UsuarioHabilidadInput(SchemaBase):
    """
    Habilidad enviada desde Angular para el perfil del
    candidato.

    Se utiliza el nombre en lugar del ID para que la interfaz
    sea más sencilla.

    Ejemplo:

    {
        "nombre": "Angular",
        "nivel": "avanzado",
        "experiencia_anios": 2
    }
    """

    nombre: str = Field(
        min_length=1,
        max_length=100,
    )

    nivel: NivelHabilidad = "intermedio"

    experiencia_anios: float = Field(
        default=0,
        ge=0,
        le=60,
    )


class UsuarioHabilidadResponse(SchemaBase):
    """
    Respuesta de una habilidad asociada a un candidato.
    """

    nivel: NivelHabilidad
    experiencia_anios: float

    habilidad: HabilidadResponse


# ============================================================
# 5. REGISTRO Y AUTENTICACIÓN
# ============================================================

class UsuarioRegistro(SchemaBase):
    """
    Datos utilizados para registrar un candidato.

    Por seguridad, el frontend NO envía rol_id.

    El backend asignará automáticamente:

        candidato

    De esta forma una persona no puede registrarse como
    administrador modificando manualmente el JSON.
    """

    nombre: str = Field(
        min_length=2,
        max_length=100,
    )

    apellido: str = Field(
        min_length=2,
        max_length=100,
    )

    email: str = Field(
        min_length=5,
        max_length=150,
    )

    password: str = Field(
        min_length=8,
        max_length=128,
    )

    @field_validator("email")
    @classmethod
    def validar_email(cls, value: str) -> str:
        return validar_correo(value)

    @field_validator("password")
    @classmethod
    def validar_clave(cls, value: str) -> str:
        return validar_password(value)


class LoginRequest(SchemaBase):
    """
    Credenciales enviadas al endpoint de autenticación.
    """

    email: str
    password: str

    @field_validator("email")
    @classmethod
    def validar_email(cls, value: str) -> str:
        return validar_correo(value)


class TokenResponse(SchemaBase):
    """
    Respuesta generada cuando el login es exitoso.

    access_token:
        JWT firmado por el backend.

    token_type:
        Esquema HTTP utilizado. Normalmente Bearer.
    """

    access_token: str
    token_type: str = "bearer"


# ============================================================
# 6. PERFIL DEL USUARIO
# ============================================================

class UsuarioPerfilUpdate(SchemaBase):
    """
    Datos que un candidato puede modificar en su perfil.

    Este perfil posteriormente será utilizado por el motor
    de compatibilidad.
    """

    nombre: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    apellido: str | None = Field(
        default=None,
        min_length=2,
        max_length=100,
    )

    telefono: str | None = Field(
        default=None,
        max_length=30,
    )

    ciudad: str | None = Field(
        default=None,
        max_length=100,
    )

    perfil_profesional: str | None = Field(
        default=None,
        max_length=5000,
    )

    experiencia_anios: float | None = Field(
        default=None,
        ge=0,
        le=60,
    )

    habilidades: list[UsuarioHabilidadInput] | None = None


class UsuarioResumen(SchemaBase):
    """
    Información reducida del usuario.

    Se utiliza principalmente dentro de postulaciones.
    """

    id: int
    nombre: str
    apellido: str
    email: str
    ciudad: str | None = None


class UsuarioResponse(SchemaBase):
    """
    Información pública del usuario autenticado.

    Nunca contiene password_hash.
    """

    id: int
    nombre: str
    apellido: str
    email: str

    telefono: str | None = None
    ciudad: str | None = None

    perfil_profesional: str | None = None
    experiencia_anios: float

    activo: bool

    creado_en: datetime
    actualizado_en: datetime

    rol: RoleResponse

    empresa: EmpresaResumen | None = None

    habilidades: list[UsuarioHabilidadResponse] = []


# ============================================================
# 7. HABILIDADES DE VACANTE
# ============================================================

class VacanteHabilidadInput(SchemaBase):
    """
    Define una competencia requerida por una vacante.

    peso:
        importancia de la habilidad de 1 a 5.

    obligatoria:
        indica si el candidato debería poseerla.
    """

    nombre: str = Field(
        min_length=1,
        max_length=100,
    )

    obligatoria: bool = True

    peso: int = Field(
        default=3,
        ge=1,
        le=5,
    )


class VacanteHabilidadResponse(SchemaBase):
    """
    Respuesta de una habilidad asociada a una vacante.
    """

    obligatoria: bool
    peso: int

    habilidad: HabilidadResponse


# ============================================================
# 8. VACANTES
# ============================================================

class VacanteBase(SchemaBase):
    """
    Información principal de una oferta laboral.
    """

    titulo: str = Field(
        min_length=3,
        max_length=150,
    )

    descripcion: str = Field(
        min_length=10,
        max_length=10000,
    )

    requisitos: str = Field(
        min_length=5,
        max_length=10000,
    )

    responsabilidades: str | None = Field(
        default=None,
        max_length=10000,
    )

    salario_min: int | None = Field(
        default=None,
        ge=0,
    )

    salario_max: int | None = Field(
        default=None,
        ge=0,
    )

    modalidad: ModalidadVacante = "hibrido"

    tipo_contrato: str = Field(
        default="tiempo_completo",
        max_length=50,
    )

    ubicacion: str | None = Field(
        default=None,
        max_length=120,
    )

    experiencia_minima: float = Field(
        default=0,
        ge=0,
        le=60,
    )

    @model_validator(mode="after")
    def validar_rango_salario(self):
        """
        Evita situaciones como:

            salario_min = 5.000.000
            salario_max = 2.000.000
        """

        if (
            self.salario_min is not None
            and self.salario_max is not None
            and self.salario_min > self.salario_max
        ):
            raise ValueError(
                "El salario mínimo no puede ser mayor "
                "que el salario máximo."
            )

        return self


class VacanteCreate(VacanteBase):
    """
    Datos utilizados para publicar una vacante.

    empresa_id puede ser utilizado por un administrador.

    Para un reclutador normal, posteriormente el backend
    utilizará automáticamente la empresa asociada a su cuenta.
    """

    empresa_id: int | None = None

    estado: EstadoVacante = "activa"

    habilidades: list[VacanteHabilidadInput] = []


class VacanteUpdate(SchemaBase):
    """
    Campos permitidos para editar una oferta existente.
    """

    titulo: str | None = Field(
        default=None,
        min_length=3,
        max_length=150,
    )

    descripcion: str | None = Field(
        default=None,
        min_length=10,
        max_length=10000,
    )

    requisitos: str | None = Field(
        default=None,
        min_length=5,
        max_length=10000,
    )

    responsabilidades: str | None = Field(
        default=None,
        max_length=10000,
    )

    salario_min: int | None = Field(
        default=None,
        ge=0,
    )

    salario_max: int | None = Field(
        default=None,
        ge=0,
    )

    modalidad: ModalidadVacante | None = None

    tipo_contrato: str | None = Field(
        default=None,
        max_length=50,
    )

    ubicacion: str | None = Field(
        default=None,
        max_length=120,
    )

    experiencia_minima: float | None = Field(
        default=None,
        ge=0,
        le=60,
    )

    estado: EstadoVacante | None = None

    fecha_cierre: datetime | None = None

    habilidades: list[VacanteHabilidadInput] | None = None

    @model_validator(mode="after")
    def validar_rango_salario(self):
        if (
            self.salario_min is not None
            and self.salario_max is not None
            and self.salario_min > self.salario_max
        ):
            raise ValueError(
                "El salario mínimo no puede ser mayor "
                "que el salario máximo."
            )

        return self


class VacanteResumen(SchemaBase):
    """
    Versión reducida utilizada dentro de una postulación.
    """

    id: int
    titulo: str
    modalidad: ModalidadVacante
    ubicacion: str | None = None
    estado: EstadoVacante

    empresa: EmpresaResumen


class VacanteResponse(VacanteBase):
    """
    Respuesta completa de una vacante.
    """

    id: int

    estado: EstadoVacante

    creada_en: datetime
    actualizada_en: datetime

    fecha_cierre: datetime | None = None

    empresa: EmpresaResumen

    habilidades: list[VacanteHabilidadResponse] = []


# ============================================================
# 9. ANÁLISIS DE COMPATIBILIDAD CON IA / NLP
# ============================================================

class AnalisisPerfilRequest(SchemaBase):
    """
    Información enviada al motor de compatibilidad.

    El usuario puede analizar temporalmente un perfil sin
    necesidad de guardar primero todos los cambios.
    """

    perfil_profesional: str = Field(
        min_length=20,
        max_length=5000,
    )

    habilidades: list[str] = []


class AnalisisCompatibilidadResponse(SchemaBase):
    """
    Resultado generado por el motor inteligente de TalentIA.

    puntuacion:
        resultado combinado final entre 0 y 100.

    similitud_texto:
        comparación semántico-estadística mediante
        TF-IDF + similitud coseno.

    coincidencia_habilidades:
        porcentaje basado en competencias requeridas.

    clasificacion:
        interpretación simple del porcentaje final.

    IMPORTANTE:
    Este resultado sirve como apoyo al reclutador.
    No debe tomar decisiones automáticas de contratación.
    """

    puntuacion: float = Field(
        ge=0,
        le=100,
    )

    similitud_texto: float = Field(
        ge=0,
        le=100,
    )

    coincidencia_habilidades: float = Field(
        ge=0,
        le=100,
    )

    clasificacion: Literal[
        "baja",
        "media",
        "alta",
        "muy_alta",
    ]

    habilidades_coincidentes: list[str]

    habilidades_faltantes: list[str]

    explicacion: str


# ============================================================
# 10. POSTULACIONES
# ============================================================

class PostulacionCreate(SchemaBase):
    """
    Datos enviados cuando un candidato desea postularse.

    vacante_id:
        identifica la oferta.

    perfil_profesional:
        opcionalmente permite utilizar el perfil actual
        introducido por el candidato.
    """

    vacante_id: int = Field(
        gt=0,
    )

    perfil_profesional: str | None = Field(
        default=None,
        min_length=20,
        max_length=5000,
    )


class PostulacionEstadoUpdate(SchemaBase):
    """
    Permite al reclutador cambiar el estado de una candidatura.
    """

    estado: EstadoPostulacion


class PostulacionResponse(SchemaBase):
    """
    Respuesta completa de una postulación.

    Incluye el resultado del análisis inteligente.
    """

    id: int

    estado: EstadoPostulacion

    puntuacion_ia: float | None = None

    similitud_texto: float | None = None

    coincidencia_habilidades: float | None = None

    perfil_analizado: str | None = None

    habilidades_coincidentes: list[str] | None = None

    habilidades_faltantes: list[str] | None = None

    explicacion_ia: str | None = None

    creada_en: datetime
    actualizada_en: datetime

    candidato: UsuarioResumen

    vacante: VacanteResumen


# ============================================================
# 11. RANKING PARA RECLUTADOR
# ============================================================

class CandidatoRankingResponse(SchemaBase):
    """
    Respuesta simplificada para el panel del reclutador.

    Los candidatos podrán ordenarse por puntuacion_ia.
    """

    postulacion_id: int

    candidato_id: int

    nombre: str

    email: str

    estado: EstadoPostulacion

    puntuacion_ia: float | None = None

    similitud_texto: float | None = None

    coincidencia_habilidades: float | None = None

    habilidades_coincidentes: list[str] | None = None

    habilidades_faltantes: list[str] | None = None

    explicacion_ia: str | None = None


# ============================================================
# 12. RESPUESTAS GENÉRICAS
# ============================================================

class MensajeResponse(SchemaBase):
    """
    Respuesta sencilla para operaciones como eliminar,
    cerrar sesión o confirmar una acción.
    """

    message: str