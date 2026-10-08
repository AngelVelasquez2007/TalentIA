"""
============================================================
TalentIA - API de análisis inteligente
Archivo: app/routers/analisis.py
============================================================

Este router expone mediante HTTP el motor de compatibilidad
implementado en:

    app/matching.py

Su función es comparar:

    PERFIL DEL CANDIDATO
              |
              v
      Motor IA / NLP
              |
              v
          VACANTE

El análisis combina:

1. TF-IDF.
2. Similitud coseno.
3. Habilidades detectadas.
4. Habilidades estructuradas.
5. Pesos configurados por el reclutador.

IMPORTANTE:

TalentIA NO toma decisiones automáticas de contratación.

El resultado es únicamente una herramienta de apoyo para:

- candidatos;
- reclutadores;
- procesos de preselección.

============================================================
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from pydantic import (
    BaseModel,
    Field,
)

from sqlalchemy import select

from sqlalchemy.orm import (
    Session,
    joinedload,
    selectinload,
)

from app import models

from app.database import get_db

from app.matching import (
    analizar_compatibilidad,
)

from app.schemas import (
    AnalisisCompatibilidadResponse,
    AnalisisPerfilRequest,
)

from app.security import (
    get_current_user,
)


# ============================================================
# 1. ROUTER
# ============================================================

router = APIRouter(
    prefix="/analisis",
    tags=["Análisis IA"],
)


# ============================================================
# 2. CARGAR VACANTE PARA ANÁLISIS
# ============================================================

def obtener_vacante_para_analisis(
    db: Session,
    vacante_id: int,
) -> models.Vacante:
    """
    Obtiene una vacante con toda la información necesaria
    para ejecutar el motor de compatibilidad.

    Se cargan:

    - empresa;
    - habilidades requeridas;
    - detalle de cada habilidad.

    Además se comprueba que:

    - la vacante exista;
    - esté activa;
    - su empresa esté activa.
    """

    consulta = (
        select(models.Vacante)
        .where(
            models.Vacante.id == vacante_id
        )
        .options(
            joinedload(
                models.Vacante.empresa
            ),
            selectinload(
                models.Vacante.habilidades
            ).joinedload(
                models.VacanteHabilidad.habilidad
            ),
        )
    )

    vacante = (
        db.execute(consulta)
        .unique()
        .scalars()
        .first()
    )

    if vacante is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada.",
        )

    if vacante.estado != "activa":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "La vacante ya no está disponible "
                "para análisis."
            ),
        )

    if (
        vacante.empresa is None
        or not vacante.empresa.activa
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "La empresa asociada a esta vacante "
                "no está activa."
            ),
        )

    return vacante


# ============================================================
# 3. OBTENER HABILIDADES DEL USUARIO AUTENTICADO
# ============================================================

def obtener_habilidades_usuario(
    usuario: models.Usuario,
) -> list[str]:
    """
    Extrae los nombres de las habilidades estructuradas
    asociadas al usuario autenticado.

    Ejemplo:

        UsuarioHabilidad
                |
                v
        Habilidad("Angular")

    se convierte en:

        ["Angular"]

    Estas habilidades se combinan posteriormente con las que
    Angular envíe explícitamente.
    """

    resultado: list[str] = []

    for relacion in usuario.habilidades or []:

        habilidad = getattr(
            relacion,
            "habilidad",
            None,
        )

        if habilidad is None:
            continue

        nombre = getattr(
            habilidad,
            "nombre",
            None,
        )

        if nombre:
            resultado.append(
                nombre
            )

    return resultado


# ============================================================
# 4. COMBINAR HABILIDADES
# ============================================================

def combinar_habilidades(
    habilidades_guardadas: list[str],
    habilidades_enviadas: list[str],
) -> list[str]:
    """
    Combina las habilidades almacenadas en PostgreSQL con las
    enviadas temporalmente desde Angular.

    También elimina duplicados ignorando mayúsculas.

    Ejemplo:

        guardadas:
        ["Angular", "Git"]

        enviadas:
        ["angular", "PostgreSQL"]

        resultado:
        ["Angular", "Git", "PostgreSQL"]
    """

    resultado: list[str] = []

    procesadas: set[str] = set()

    for habilidad in (
        habilidades_guardadas
        + habilidades_enviadas
    ):

        if not habilidad:
            continue

        limpia = habilidad.strip()

        if not limpia:
            continue

        clave = limpia.lower()

        if clave in procesadas:
            continue

        procesadas.add(
            clave
        )

        resultado.append(
            limpia
        )

    return resultado


# ============================================================
# 5. ENDPOINT PRINCIPAL DE IA
# ============================================================

@router.post(
    "/vacantes/{vacante_id}",
    response_model=AnalisisCompatibilidadResponse,
)
def analizar_vacante(
    vacante_id: int,

    datos: AnalisisPerfilRequest,

    usuario_actual: models.Usuario = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Analiza la compatibilidad entre un perfil y una vacante.

    REQUIERE AUTENTICACIÓN.

    Ejemplo:

        POST /analisis/vacantes/3

    Body:

        {
            "perfil_profesional":
                "Desarrollador Angular con experiencia "
                "en TypeScript, REST y PostgreSQL.",

            "habilidades": [
                "Angular",
                "TypeScript",
                "REST",
                "PostgreSQL"
            ]
        }

    Respuesta aproximada:

        {
            "puntuacion": 82.45,
            "similitud_texto": 71.30,
            "coincidencia_habilidades": 88.46,
            "clasificacion": "muy_alta",
            "habilidades_coincidentes": [
                "Angular",
                "TypeScript",
                "PostgreSQL"
            ],
            "habilidades_faltantes": [
                "Docker"
            ],
            "explicacion":
                "La compatibilidad estimada..."
        }
    """

    # --------------------------------------------------------
    # 1. CARGAR VACANTE
    # --------------------------------------------------------

    vacante = obtener_vacante_para_analisis(
        db,
        vacante_id,
    )

    # --------------------------------------------------------
    # 2. HABILIDADES GUARDADAS DEL USUARIO
    # --------------------------------------------------------

    habilidades_guardadas = (
        obtener_habilidades_usuario(
            usuario_actual
        )
    )

    # --------------------------------------------------------
    # 3. COMBINAR CON LAS ENVIADAS DESDE ANGULAR
    # --------------------------------------------------------

    habilidades = combinar_habilidades(
        habilidades_guardadas,
        datos.habilidades,
    )

    # --------------------------------------------------------
    # 4. EJECUTAR MOTOR IA / NLP
    # --------------------------------------------------------

    resultado = analizar_compatibilidad(
        perfil_profesional=(
            datos.perfil_profesional
        ),

        vacante=vacante,

        habilidades_candidato=(
            habilidades
        ),
    )

    return resultado


# ============================================================
# 6. COMPATIBILIDAD CON EL FRONTEND ACTUAL
# ============================================================

class AnalisisLegacyRequest(BaseModel):
    """
    Esquema temporal de compatibilidad con la versión inicial
    del frontend.

    Actualmente Angular envía:

        {
            "vacante_id": 1,
            "perfil": "..."
        }

    Mientras actualizamos el frontend, mantenemos este
    endpoint funcionando.

    Después Angular utilizará el endpoint principal:

        POST /analisis/vacantes/{vacante_id}
    """

    vacante_id: int = Field(
        gt=0,
    )

    perfil: str = Field(
        min_length=20,
        max_length=5000,
    )


@router.post(
    "/compatibilidad",
    response_model=AnalisisCompatibilidadResponse,
    include_in_schema=False,
)
def compatibilidad_frontend_anterior(
    datos: AnalisisLegacyRequest,

    usuario_actual: models.Usuario = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Endpoint de compatibilidad con el Angular existente.

    No aparece en Swagger porque el endpoint recomendado
    para la versión final es:

        POST /analisis/vacantes/{id}

    Se conserva para que la aplicación no deje de funcionar
    durante la migración archivo por archivo.
    """

    vacante = obtener_vacante_para_analisis(
        db,
        datos.vacante_id,
    )

    habilidades = obtener_habilidades_usuario(
        usuario_actual
    )

    return analizar_compatibilidad(
        perfil_profesional=datos.perfil,
        vacante=vacante,
        habilidades_candidato=habilidades,
    )