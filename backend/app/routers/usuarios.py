"""
============================================================
TalentIA - Router de usuarios y perfil profesional
Archivo: backend/app/routers/usuarios.py
============================================================

Este módulo permite que el candidato gestione su perfil
profesional y sus habilidades.

FUNCIONALIDADES:

- Consultar el perfil autenticado.
- Actualizar datos personales.
- Actualizar perfil profesional.
- Actualizar años de experiencia.
- Registrar habilidades estructuradas.
- Consultar el catálogo de habilidades.

IMPORTANTE:

Las habilidades del candidato se utilizan posteriormente
por el motor de compatibilidad de TalentIA.

FLUJO:

Angular
   |
   | PUT /usuarios/me/perfil
   v
FastAPI
   |
   v
SQLAlchemy
   |
   v
PostgreSQL
   |
   v
matching.py
   |
   v
análisis candidato-vacante

============================================================
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)

from sqlalchemy import (
    func,
    select,
)

from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import (
    Session,
    joinedload,
    selectinload,
)

from app.database import get_db

from app.models import (
    Habilidad,
    Usuario,
    UsuarioHabilidad,
)

from app.schemas import (
    HabilidadResponse,
    UsuarioPerfilUpdate,
    UsuarioResponse,
)

from app.security import (
    get_current_user,
    require_roles,
)


router = APIRouter(
    prefix="/usuarios",
    tags=["Usuarios"],
)


# ============================================================
# FUNCIONES AUXILIARES
# ============================================================


def cargar_usuario_completo(
    db: Session,
    usuario_id: int,
) -> Usuario:
    """
    Recupera un usuario incluyendo:

    - rol;
    - empresa;
    - habilidades;
    - detalle de cada habilidad.

    Esto evita devolver relaciones incompletas al frontend.
    """

    consulta = (
        select(Usuario)
        .where(
            Usuario.id == usuario_id
        )
        .options(
            joinedload(
                Usuario.rol
            ),
            joinedload(
                Usuario.empresa
            ),
            selectinload(
                Usuario.habilidades
            ).joinedload(
                UsuarioHabilidad.habilidad
            ),
        )
    )

    usuario = db.scalar(
        consulta
    )

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado.",
        )

    return usuario


def buscar_o_crear_habilidad(
    db: Session,
    nombre: str,
) -> Habilidad:
    """
    Busca una habilidad ignorando mayúsculas/minúsculas.

    Si todavía no existe, se crea automáticamente.

    Ejemplo:

        "angular"
        "Angular"
        "ANGULAR"

    se consideran la misma habilidad.
    """

    nombre_limpio = (
        nombre
        .strip()
    )

    if not nombre_limpio:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="El nombre de la habilidad no puede estar vacío.",
        )

    habilidad = db.scalar(
        select(Habilidad)
        .where(
            func.lower(
                Habilidad.nombre
            )
            ==
            nombre_limpio.lower()
        )
    )

    if habilidad:
        return habilidad

    habilidad = Habilidad(
        nombre=nombre_limpio,
        categoria="Otra",
        activa=True,
    )

    db.add(
        habilidad
    )

    db.flush()

    return habilidad


# ============================================================
# 1. PERFIL ACTUAL
# ============================================================


@router.get(
    "/me",
    response_model=UsuarioResponse,
    summary="Consultar perfil del usuario autenticado",
)
def obtener_mi_perfil(
    usuario_actual: Usuario = Depends(
        get_current_user
    ),
    db: Session = Depends(
        get_db
    ),
) -> Usuario:
    """
    Devuelve el usuario autenticado con toda su información.

    Aunque existe:

        GET /auth/me

    este endpoint pertenece específicamente al módulo de
    perfil y permite mantener separadas las responsabilidades.
    """

    return cargar_usuario_completo(
        db,
        usuario_actual.id,
    )


# ============================================================
# 2. ACTUALIZAR PERFIL DEL CANDIDATO
# ============================================================


@router.put(
    "/me/perfil",
    response_model=UsuarioResponse,
    summary="Actualizar perfil profesional del candidato",
)
def actualizar_mi_perfil(
    datos: UsuarioPerfilUpdate,
    usuario_actual: Usuario = Depends(
        require_roles(
            "candidato"
        )
    ),
    db: Session = Depends(
        get_db
    ),
) -> Usuario:
    """
    Actualiza los datos profesionales del candidato.

    Puede modificar:

    - nombre;
    - apellido;
    - teléfono;
    - ciudad;
    - perfil profesional;
    - años de experiencia;
    - habilidades.

    Las habilidades se reemplazan por la lista enviada.

    Esto significa que Angular siempre envía el estado
    completo del perfil de habilidades.
    """

    usuario = db.get(
        Usuario,
        usuario_actual.id,
    )

    if not usuario:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado.",
        )

    cambios = datos.model_dump(
        exclude_unset=True
    )


    # --------------------------------------------------------
    # VALIDACIÓN DE EXPERIENCIA
    # --------------------------------------------------------

    if (
        "experiencia_anios" in cambios
        and cambios[
            "experiencia_anios"
        ] is not None
        and cambios[
            "experiencia_anios"
        ] < 0
    ):
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=(
                "Los años de experiencia "
                "no pueden ser negativos."
            ),
        )


    # --------------------------------------------------------
    # EXTRAER HABILIDADES
    # --------------------------------------------------------

    habilidades_datos = cambios.pop(
        "habilidades",
        None,
    )


    # --------------------------------------------------------
    # ACTUALIZAR DATOS SIMPLES
    # --------------------------------------------------------

    for campo, valor in cambios.items():
        setattr(
            usuario,
            campo,
            valor,
        )


    # --------------------------------------------------------
    # ACTUALIZAR HABILIDADES
    # --------------------------------------------------------

    if habilidades_datos is not None:

        """
        Eliminamos únicamente las relaciones del usuario.

        NO eliminamos el catálogo de habilidades porque otras
        personas y vacantes podrían utilizar esas mismas filas.
        """

        db.execute(
            UsuarioHabilidad.__table__
            .delete()
            .where(
                UsuarioHabilidad.usuario_id
                ==
                usuario.id
            )
        )


        nombres_registrados: set[str] = set()


        for item in habilidades_datos:

            nombre = (
                item["nombre"]
                .strip()
            )

            clave = nombre.lower()


            # Evita duplicados enviados por Angular.
            if clave in nombres_registrados:
                continue


            nombres_registrados.add(
                clave
            )


            habilidad = (
                buscar_o_crear_habilidad(
                    db,
                    nombre,
                )
            )


            relacion = UsuarioHabilidad(
                usuario_id=usuario.id,
                habilidad_id=habilidad.id,
                nivel=item["nivel"],
                experiencia_anios=item[
                    "experiencia_anios"
                ],
            )

            db.add(
                relacion
            )


    try:
        db.commit()

    except IntegrityError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No fue posible actualizar el perfil "
                "por un conflicto con los datos enviados."
            ),
        ) from error


    return cargar_usuario_completo(
        db,
        usuario.id,
    )


# ============================================================
# 3. CATÁLOGO DE HABILIDADES
# ============================================================


@router.get(
    "/habilidades",
    response_model=list[
        HabilidadResponse
    ],
    summary="Consultar catálogo de habilidades",
)
def listar_habilidades(
    buscar: str | None = Query(
        default=None,
        max_length=100,
    ),
    limite: int = Query(
        default=100,
        ge=1,
        le=300,
    ),
    db: Session = Depends(
        get_db
    ),
) -> list[Habilidad]:
    """
    Devuelve habilidades activas disponibles en TalentIA.

    Puede utilizarse para:

    - autocompletado;
    - sugerencias;
    - construcción del perfil profesional.
    """

    consulta = (
        select(Habilidad)
        .where(
            Habilidad.activa.is_(
                True
            )
        )
    )


    if (
        buscar
        and buscar.strip()
    ):

        termino = (
            f"%{buscar.strip()}%"
        )

        consulta = consulta.where(
            Habilidad.nombre.ilike(
                termino
            )
        )


    consulta = (
        consulta
        .order_by(
            Habilidad.nombre.asc()
        )
        .limit(
            limite
        )
    )


    return list(
        db.scalars(
            consulta
        ).all()
    )