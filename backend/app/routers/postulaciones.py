"""
============================================================
TalentIA - Gestión de postulaciones
Archivo: app/routers/postulaciones.py
============================================================

Este router administra el proceso de postulación de candidatos.

FUNCIONALIDADES PRINCIPALES:

POST /postulaciones
    Un candidato se postula a una vacante.

    Antes de guardar la postulación:
    - se valida la vacante;
    - se ejecuta el motor IA/NLP;
    - se calcula compatibilidad;
    - se guardan los resultados en PostgreSQL.

GET /postulaciones/mis-postulaciones
    El candidato consulta sus postulaciones.

GET /postulaciones/vacante/{vacante_id}
    Reclutadores y administradores consultan candidatos
    postulados a una vacante.

GET /postulaciones/ranking/{vacante_id}
    Devuelve candidatos ordenados por puntuación IA.

PUT /postulaciones/{id}/estado
    Permite al reclutador avanzar el proceso de selección.

IMPORTANTE:

La IA funciona como apoyo al reclutador.
No selecciona ni rechaza candidatos automáticamente.

============================================================
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy import (
    func,
    select,
)

from sqlalchemy.exc import IntegrityError, SQLAlchemyError

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
    CandidatoRankingResponse,
    PostulacionCreate,
    PostulacionEstadoUpdate,
    PostulacionResponse,
)

from app.security import (
    get_current_user,
    require_roles,
)


# ============================================================
# 1. ROUTER
# ============================================================

router = APIRouter(
    prefix="/postulaciones",
    tags=["Postulaciones"],
)


# ============================================================
# 2. CARGAR POSTULACIÓN COMPLETA
# ============================================================

def cargar_postulacion_completa(
    db: Session,
    postulacion_id: int,
) -> models.Postulacion | None:
    """
    Obtiene una postulación junto con:

    - candidato;
    - vacante;
    - empresa de la vacante.

    Esto permite construir PostulacionResponse directamente.
    """

    consulta = (
        select(models.Postulacion)
        .where(
            models.Postulacion.id
            == postulacion_id
        )
        .options(
            joinedload(
                models.Postulacion.candidato
            ),
            joinedload(
                models.Postulacion.vacante
            ).joinedload(
                models.Vacante.empresa
            ),
        )
    )

    return (
        db.execute(consulta)
        .unique()
        .scalars()
        .first()
    )


# ============================================================
# 3. CARGAR VACANTE PARA POSTULACIÓN
# ============================================================

def cargar_vacante(
    db: Session,
    vacante_id: int,
) -> models.Vacante:
    """
    Carga la vacante con sus habilidades y empresa.

    También comprueba que siga disponible.
    """

    consulta = (
        select(models.Vacante)
        .where(
            models.Vacante.id
            == vacante_id
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
                "para recibir postulaciones."
            ),
        )

    if (
        vacante.empresa is None
        or not vacante.empresa.activa
    ):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "La empresa de esta vacante "
                "no está activa."
            ),
        )

    return vacante


# ============================================================
# 4. OBTENER HABILIDADES DEL CANDIDATO
# ============================================================

def obtener_habilidades_candidato(
    db: Session,
    candidato_id: int,
) -> list[str]:
    """
    Obtiene las habilidades estructuradas almacenadas
    en PostgreSQL para un candidato.

    Ejemplo:

        Angular
        TypeScript
        PostgreSQL
        Git
    """

    usuario = (
        db.execute(
            select(models.Usuario)
            .where(
                models.Usuario.id
                == candidato_id
            )
            .options(
                selectinload(
                    models.Usuario.habilidades
                ).joinedload(
                    models.UsuarioHabilidad.habilidad
                )
            )
        )
        .unique()
        .scalars()
        .first()
    )

    if usuario is None:
        return []

    resultado: list[str] = []

    for relacion in usuario.habilidades:

        if relacion.habilidad:
            resultado.append(
                relacion.habilidad.nombre
            )

    return resultado


# ============================================================
# 5. COMPROBAR PERMISO DEL RECLUTADOR
# ============================================================

def validar_acceso_reclutador(
    usuario: models.Usuario,
    vacante: models.Vacante,
) -> None:
    """
    Verifica que un reclutador tenga permiso para consultar
    o modificar postulaciones de una vacante.

    ADMINISTRADOR:
        Puede consultar cualquier vacante.

    RECLUTADOR:
        Solo vacantes pertenecientes a su empresa.
    """

    rol = (
        usuario.rol.nombre
        .strip()
        .lower()
    )

    if rol == "administrador":
        return

    if rol == "reclutador":

        if usuario.empresa_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Tu cuenta de reclutador "
                    "no tiene una empresa asociada."
                ),
            )

        if (
            usuario.empresa_id
            != vacante.empresa_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "No puedes consultar candidatos "
                    "de otra empresa."
                ),
            )

        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No tienes permisos para esta operación.",
    )


# ============================================================
# 6. CREAR POSTULACIÓN
# ============================================================

@router.post(
    "",
    response_model=PostulacionResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/",
    response_model=PostulacionResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def crear_postulacion(
    datos: PostulacionCreate,

    usuario_actual: models.Usuario = Depends(
        require_roles(
            "candidato"
        )
    ),

    db: Session = Depends(get_db),
):
    """
    Registra una postulación.

    FLUJO:

        candidato
            ↓
        seleccionar vacante
            ↓
        validar duplicado
            ↓
        obtener perfil
            ↓
        ejecutar motor IA
            ↓
        guardar puntuación
            ↓
        guardar postulación

    Un candidato no puede postularse dos veces a la misma
    vacante.
    """

    # --------------------------------------------------------
    # 1. CARGAR VACANTE
    # --------------------------------------------------------

    vacante = cargar_vacante(
        db,
        datos.vacante_id,
    )

    # --------------------------------------------------------
    # 2. VERIFICAR POSTULACIÓN DUPLICADA
    # --------------------------------------------------------

    existente = (
        db.execute(
            select(models.Postulacion)
            .where(
                models.Postulacion.candidato_id
                == usuario_actual.id,

                models.Postulacion.vacante_id
                == vacante.id,
            )
        )
        .scalars()
        .first()
    )

    if existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Ya te postulaste anteriormente "
                "a esta vacante."
            ),
        )

    # --------------------------------------------------------
    # 3. DETERMINAR PERFIL A ANALIZAR
    # --------------------------------------------------------

    perfil = (
        datos.perfil_profesional
        or usuario_actual.perfil_profesional
        or ""
    ).strip()

    if len(perfil) < 20:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "Debes completar un perfil profesional "
                "de al menos 20 caracteres antes "
                "de postularte."
            ),
        )

    # --------------------------------------------------------
    # 4. OBTENER HABILIDADES DEL CANDIDATO
    # --------------------------------------------------------

    habilidades = obtener_habilidades_candidato(
        db,
        usuario_actual.id,
    )

    # --------------------------------------------------------
    # 5. EJECUTAR MOTOR DE COMPATIBILIDAD
    # --------------------------------------------------------

    resultado_ia = analizar_compatibilidad(
        perfil_profesional=perfil,
        vacante=vacante,
        habilidades_candidato=habilidades,
    )

    # --------------------------------------------------------
    # 6. CREAR POSTULACIÓN
    # --------------------------------------------------------

    postulacion = models.Postulacion(
        candidato_id=usuario_actual.id,
        vacante_id=vacante.id,

        estado="pendiente",

        # Resultado final.
        puntuacion_ia=(
            resultado_ia["puntuacion"]
        ),

        # Componente TF-IDF/coseno.
        similitud_texto=(
            resultado_ia["similitud_texto"]
        ),

        # Componente de habilidades.
        coincidencia_habilidades=(
            resultado_ia[
                "coincidencia_habilidades"
            ]
        ),

        # Snapshot del perfil utilizado.
        perfil_analizado=perfil,

        habilidades_coincidentes=(
            resultado_ia[
                "habilidades_coincidentes"
            ]
        ),

        habilidades_faltantes=(
            resultado_ia[
                "habilidades_faltantes"
            ]
        ),

        explicacion_ia=(
            resultado_ia["explicacion"]
        ),
    )

    db.add(
        postulacion
    )

    # --------------------------------------------------------
    # 7. GUARDAR
    # --------------------------------------------------------

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        # También existe un UNIQUE CONSTRAINT en PostgreSQL,
        # por lo que esta validación funciona incluso ante
        # peticiones simultáneas.
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Ya existe una postulación "
                "para esta vacante."
            ),
        )

    return cargar_postulacion_completa(
        db,
        postulacion.id,
    )


# ============================================================
# 7. MIS POSTULACIONES
# ============================================================

@router.get(
    "/mis-postulaciones",
    response_model=list[PostulacionResponse],
)
def listar_mis_postulaciones(
    usuario_actual: models.Usuario = Depends(
        require_roles(
            "candidato"
        )
    ),

    db: Session = Depends(get_db),
):
    """
    Devuelve únicamente las postulaciones del candidato
    autenticado.

    Un candidato nunca puede consultar postulaciones
    pertenecientes a otro usuario.
    """

    consulta = (
        select(models.Postulacion)
        .where(
            models.Postulacion.candidato_id
            == usuario_actual.id
        )
        .options(
            joinedload(
                models.Postulacion.candidato
            ),
            joinedload(
                models.Postulacion.vacante
            ).joinedload(
                models.Vacante.empresa
            ),
        )
        .order_by(
            models.Postulacion.creada_en.desc()
        )
    )

    return (
        db.execute(consulta)
        .unique()
        .scalars()
        .all()
    )


# ============================================================
# 8. VER UNA POSTULACIÓN
# ============================================================

@router.get(
    "/{postulacion_id}",
    response_model=PostulacionResponse,
)
def obtener_postulacion(
    postulacion_id: int,

    usuario_actual: models.Usuario = Depends(
        get_current_user
    ),

    db: Session = Depends(get_db),
):
    """
    Consulta una postulación concreta.

    CANDIDATO:
        solo puede consultar la suya.

    RECLUTADOR:
        solo si pertenece a la empresa de la vacante.

    ADMINISTRADOR:
        puede consultar cualquiera.
    """

    postulacion = cargar_postulacion_completa(
        db,
        postulacion_id,
    )

    if postulacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Postulación no encontrada.",
        )

    rol = (
        usuario_actual.rol.nombre
        .strip()
        .lower()
    )

    # --------------------------------------------------------
    # CANDIDATO
    # --------------------------------------------------------

    if rol == "candidato":

        if (
            postulacion.candidato_id
            != usuario_actual.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "No puedes consultar "
                    "esta postulación."
                ),
            )

        return postulacion

    # --------------------------------------------------------
    # RECLUTADOR / ADMIN
    # --------------------------------------------------------

    if rol in {
        "reclutador",
        "administrador",
    }:

        validar_acceso_reclutador(
            usuario_actual,
            postulacion.vacante,
        )

        return postulacion

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="No tienes permisos.",
    )


# ============================================================
# 9. POSTULACIONES POR VACANTE
# ============================================================

@router.get(
    "/vacante/{vacante_id}",
    response_model=list[PostulacionResponse],
)
def listar_postulaciones_vacante(
    vacante_id: int,

    usuario_actual: models.Usuario = Depends(
        require_roles(
            "administrador",
            "reclutador",
        )
    ),

    db: Session = Depends(get_db),
):
    """
    Permite al reclutador consultar todos los candidatos
    que se postularon a una determinada vacante.

    El resultado se ordena por compatibilidad IA,
    de mayor a menor.

    IMPORTANTE:
    Este ordenamiento ayuda a revisar candidatos, pero no
    selecciona automáticamente a ninguna persona.
    """

    vacante = db.get(
        models.Vacante,
        vacante_id,
    )

    if vacante is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada.",
        )

    validar_acceso_reclutador(
        usuario_actual,
        vacante,
    )

    consulta = (
        select(models.Postulacion)
        .where(
            models.Postulacion.vacante_id
            == vacante_id
        )
        .options(
            joinedload(
                models.Postulacion.candidato
            ),
            joinedload(
                models.Postulacion.vacante
            ).joinedload(
                models.Vacante.empresa
            ),
        )
        .order_by(
            func.coalesce(
                models.Postulacion.puntuacion_ia,
                0,
            ).desc(),
            models.Postulacion.creada_en.asc(),
        )
    )

    return (
        db.execute(consulta)
        .unique()
        .scalars()
        .all()
    )


# ============================================================
# 10. RANKING DE CANDIDATOS
# ============================================================

@router.get(
    "/ranking/{vacante_id}",
    response_model=list[
        CandidatoRankingResponse
    ],
)
def ranking_candidatos(
    vacante_id: int,

    usuario_actual: models.Usuario = Depends(
        require_roles(
            "administrador",
            "reclutador",
        )
    ),

    db: Session = Depends(get_db),
):
    """
    Genera una vista optimizada para el panel del reclutador.

    Devuelve candidatos ordenados por puntuacion_ia.

    Ejemplo:

        1. Laura Gomez      91.3 %
        2. Carlos Perez     84.8 %
        3. Maria Torres     70.2 %

    El ranking es únicamente informativo.
    """

    vacante = db.get(
        models.Vacante,
        vacante_id,
    )

    if vacante is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada.",
        )

    validar_acceso_reclutador(
        usuario_actual,
        vacante,
    )

    consulta = (
        select(models.Postulacion)
        .where(
            models.Postulacion.vacante_id
            == vacante_id
        )
        .options(
            joinedload(
                models.Postulacion.candidato
            )
        )
        .order_by(
            func.coalesce(
                models.Postulacion.puntuacion_ia,
                0,
            ).desc()
        )
    )

    postulaciones = (
        db.execute(consulta)
        .unique()
        .scalars()
        .all()
    )

    resultado = []

    for postulacion in postulaciones:

        candidato = postulacion.candidato

        resultado.append(
            CandidatoRankingResponse(
                postulacion_id=(
                    postulacion.id
                ),

                candidato_id=(
                    candidato.id
                ),

                nombre=(
                    f"{candidato.nombre} "
                    f"{candidato.apellido}"
                ),

                email=candidato.email,

                estado=postulacion.estado,

                puntuacion_ia=(
                    postulacion.puntuacion_ia
                ),

                similitud_texto=(
                    postulacion.similitud_texto
                ),

                coincidencia_habilidades=(
                    postulacion
                    .coincidencia_habilidades
                ),

                habilidades_coincidentes=(
                    postulacion
                    .habilidades_coincidentes
                ),

                habilidades_faltantes=(
                    postulacion
                    .habilidades_faltantes
                ),

                explicacion_ia=(
                    postulacion.explicacion_ia
                ),
            )
        )

    return resultado


# ============================================================
# 11. TRANSICIONES DE ESTADO
# ============================================================

TRANSICIONES_ESTADO = {
    "pendiente": {
        "revision",
        "rechazado",
    },

    "revision": {
        "entrevista",
        "rechazado",
    },

    "entrevista": {
        "seleccionado",
        "rechazado",
    },

    # Estados terminales.
    "seleccionado": set(),
    "rechazado": set(),
}


def validar_transicion_estado(
    estado_actual: str,
    nuevo_estado: str,
) -> None:
    """
    Implementa una regla de negocio para evitar cambios
    incoherentes en el proceso de selección.

    Flujo normal:

        pendiente
            ↓
        revision
            ↓
        entrevista
            ↓
        seleccionado

    En las etapas correspondientes también se puede rechazar
    una candidatura.

    Una candidatura seleccionada o rechazada se considera
    finalizada.
    """

    if estado_actual == nuevo_estado:
        return

    permitidos = TRANSICIONES_ESTADO.get(
        estado_actual,
        set(),
    )

    if nuevo_estado not in permitidos:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                f"No se permite cambiar una "
                f"postulación de '{estado_actual}' "
                f"a '{nuevo_estado}'."
            ),
        )


# ============================================================
# 12. CAMBIAR ESTADO
# ============================================================

@router.put(
    "/{postulacion_id}/estado",
    response_model=PostulacionResponse,
)
def cambiar_estado_postulacion(
    postulacion_id: int,

    datos: PostulacionEstadoUpdate,

    usuario_actual: models.Usuario = Depends(
        require_roles(
            "administrador",
            "reclutador",
        )
    ),

    db: Session = Depends(get_db),
):
    """
    Permite modificar el estado de una candidatura.

    Ejemplo:

        pendiente
            ↓
        revision
            ↓
        entrevista
            ↓
        seleccionado

    o:

        revision
            ↓
        rechazado
    """

    postulacion = cargar_postulacion_completa(
        db,
        postulacion_id,
    )

    if postulacion is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Postulación no encontrada.",
        )

    # --------------------------------------------------------
    # VERIFICAR EMPRESA
    # --------------------------------------------------------

    validar_acceso_reclutador(
        usuario_actual,
        postulacion.vacante,
    )

    # --------------------------------------------------------
    # REGLA DE TRANSICIÓN
    # --------------------------------------------------------

    validar_transicion_estado(
        postulacion.estado,
        datos.estado,
    )

    postulacion.estado = datos.estado

    try:
        db.commit()

    except SQLAlchemyError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "No fue posible actualizar el estado "
                "de la postulación."
            ),
        ) from error

    return cargar_postulacion_completa(
        db,
        postulacion.id,
    )