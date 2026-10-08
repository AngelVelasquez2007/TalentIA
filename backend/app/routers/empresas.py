"""
============================================================
TalentIA - Gestión de empresas
Archivo: app/empresas.py
============================================================

Este router implementa la administración de empresas.

ENDPOINTS:

GET /empresas
    Lista empresas activas.

GET /empresas/{empresa_id}
    Consulta una empresa activa.

POST /empresas
    Crea una empresa.
    Solo administrador.

PUT /empresas/{empresa_id}
    Actualiza una empresa.
    Administrador:
        cualquier empresa.

    Reclutador:
        únicamente su propia empresa.

DELETE /empresas/{empresa_id}
    Desactiva una empresa.
    Solo administrador.

IMPORTANTE:

El DELETE es lógico.

En vez de ejecutar:

    DELETE FROM empresas ...

se realiza:

    activa = False

Esto conserva:

- vacantes;
- usuarios;
- postulaciones;
- historial.

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
    or_,
    select,
)

from sqlalchemy.exc import IntegrityError

from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.schemas import (
    EmpresaCreate,
    EmpresaResponse,
    EmpresaUpdate,
    MensajeResponse,
)

from app.security import (
    require_roles,
)


# ============================================================
# 1. ROUTER
# ============================================================

router = APIRouter(
    prefix="/empresas",
    tags=["Empresas"],
)


# ============================================================
# 2. FUNCIÓN AUXILIAR
# ============================================================

def obtener_empresa_o_404(
    db: Session,
    empresa_id: int,
) -> models.Empresa:
    """
    Busca una empresa por ID.

    Si no existe genera:

        HTTP 404 Not Found

    Centralizar esta búsqueda evita repetir el mismo código
    en PUT, DELETE y otros endpoints.
    """

    empresa = db.get(
        models.Empresa,
        empresa_id,
    )

    if empresa is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa no encontrada.",
        )

    return empresa


# ============================================================
# 3. LISTAR EMPRESAS
# ============================================================

@router.get(
    "",
    response_model=list[EmpresaResponse],
)
@router.get(
    "/",
    response_model=list[EmpresaResponse],
    include_in_schema=False,
)
def listar_empresas(
    buscar: str | None = Query(
        default=None,
        max_length=100,
        description=(
            "Busca por nombre, sector o ciudad."
        ),
    ),

    sector: str | None = Query(
        default=None,
        max_length=100,
    ),

    ciudad: str | None = Query(
        default=None,
        max_length=100,
    ),

    skip: int = Query(
        default=0,
        ge=0,
    ),

    limit: int = Query(
        default=50,
        ge=1,
        le=100,
    ),

    db: Session = Depends(get_db),
):
    """
    Lista empresas activas.

    Soporta filtros opcionales.

    Ejemplos:

        GET /empresas

        GET /empresas?buscar=software

        GET /empresas?ciudad=Bucaramanga

        GET /empresas?sector=Tecnología

    También implementa paginación:

        skip
        limit
    """

    consulta = select(
        models.Empresa
    ).where(
        models.Empresa.activa.is_(True)
    )

    # --------------------------------------------------------
    # BÚSQUEDA GENERAL
    # --------------------------------------------------------

    if buscar:
        patron = f"%{buscar.strip()}%"

        consulta = consulta.where(
            or_(
                models.Empresa.nombre.ilike(
                    patron
                ),
                models.Empresa.sector.ilike(
                    patron
                ),
                models.Empresa.ciudad.ilike(
                    patron
                ),
            )
        )

    # --------------------------------------------------------
    # FILTRO POR SECTOR
    # --------------------------------------------------------

    if sector:
        consulta = consulta.where(
            models.Empresa.sector.ilike(
                sector.strip()
            )
        )

    # --------------------------------------------------------
    # FILTRO POR CIUDAD
    # --------------------------------------------------------

    if ciudad:
        consulta = consulta.where(
            models.Empresa.ciudad.ilike(
                ciudad.strip()
            )
        )

    # --------------------------------------------------------
    # ORDEN Y PAGINACIÓN
    # --------------------------------------------------------

    consulta = (
        consulta
        .order_by(
            models.Empresa.nombre.asc()
        )
        .offset(skip)
        .limit(limit)
    )

    empresas = db.execute(
        consulta
    ).scalars().all()

    return empresas


# ============================================================
# 4. CONSULTAR EMPRESA
# ============================================================

@router.get(
    "/{empresa_id}",
    response_model=EmpresaResponse,
)
def obtener_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
):
    """
    Devuelve el detalle de una empresa activa.

    Las empresas desactivadas no aparecen públicamente.
    """

    empresa = db.get(
        models.Empresa,
        empresa_id,
    )

    if (
        empresa is None
        or not empresa.activa
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa no encontrada.",
        )

    return empresa


# ============================================================
# 5. CREAR EMPRESA
# ============================================================

@router.post(
    "",
    response_model=EmpresaResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/",
    response_model=EmpresaResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def crear_empresa(
    datos: EmpresaCreate,

    usuario_actual: models.Usuario = Depends(
        require_roles(
            "administrador"
        )
    ),

    db: Session = Depends(get_db),
):
    """
    Crea una nueva empresa.

    Solo un administrador puede realizar esta operación.

    El parámetro usuario_actual no se utiliza directamente,
    pero obliga a FastAPI a:

    1. validar el JWT;
    2. buscar al usuario;
    3. comprobar que tenga rol administrador.
    """

    # --------------------------------------------------------
    # VALIDAR NIT DUPLICADO
    # --------------------------------------------------------

    if datos.nit:
        empresa_existente = db.execute(
            select(models.Empresa).where(
                models.Empresa.nit
                == datos.nit
            )
        ).scalars().first()

        if empresa_existente:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Ya existe una empresa "
                    "registrada con ese NIT."
                ),
            )

    # --------------------------------------------------------
    # CREAR OBJETO SQLALCHEMY
    # --------------------------------------------------------

    nueva_empresa = models.Empresa(
        nombre=datos.nombre,
        nit=datos.nit,
        descripcion=datos.descripcion,
        sector=datos.sector,
        ciudad=datos.ciudad,
        pais=datos.pais,
        sitio_web=datos.sitio_web,
        activa=True,
    )

    db.add(
        nueva_empresa
    )

    # --------------------------------------------------------
    # GUARDAR
    # --------------------------------------------------------

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No fue posible crear la empresa. "
                "Revisa que el NIT no esté duplicado."
            ),
        )

    db.refresh(
        nueva_empresa
    )

    return nueva_empresa


# ============================================================
# 6. ACTUALIZAR EMPRESA
# ============================================================

@router.put(
    "/{empresa_id}",
    response_model=EmpresaResponse,
)
def actualizar_empresa(
    empresa_id: int,
    datos: EmpresaUpdate,

    usuario_actual: models.Usuario = Depends(
        require_roles(
            "administrador",
            "reclutador",
        )
    ),

    db: Session = Depends(get_db),
):
    """
    Actualiza una empresa.

    REGLAS:

    ADMINISTRADOR
        Puede modificar cualquier empresa.

    RECLUTADOR
        Solo puede modificar la empresa asociada
        a su propia cuenta.

    Además, un reclutador no puede activar/desactivar
    empresas.
    """

    empresa = obtener_empresa_o_404(
        db,
        empresa_id,
    )

    rol = (
        usuario_actual.rol.nombre
        .strip()
        .lower()
    )

    # --------------------------------------------------------
    # CONTROL DE PROPIEDAD
    # --------------------------------------------------------

    if rol == "reclutador":

        if (
            usuario_actual.empresa_id
            is None
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Tu cuenta de reclutador "
                    "no tiene una empresa asociada."
                ),
            )

        if (
            usuario_actual.empresa_id
            != empresa.id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Solo puedes modificar "
                    "tu propia empresa."
                ),
            )

    # --------------------------------------------------------
    # DATOS ENVIADOS REALMENTE
    # --------------------------------------------------------

    cambios = datos.model_dump(
        exclude_unset=True
    )

    # --------------------------------------------------------
    # UN RECLUTADOR NO PUEDE CAMBIAR 'activa'
    # --------------------------------------------------------

    if (
        rol == "reclutador"
        and "activa" in cambios
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "Un reclutador no puede "
                "activar o desactivar empresas."
            ),
        )

    # --------------------------------------------------------
    # VERIFICAR NIT
    # --------------------------------------------------------

    nuevo_nit = cambios.get(
        "nit"
    )

    if nuevo_nit:
        empresa_con_nit = db.execute(
            select(models.Empresa).where(
                models.Empresa.nit
                == nuevo_nit,
                models.Empresa.id
                != empresa.id,
            )
        ).scalars().first()

        if empresa_con_nit:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "Ya existe otra empresa "
                    "con ese NIT."
                ),
            )

    # --------------------------------------------------------
    # APLICAR CAMBIOS
    # --------------------------------------------------------

    for campo, valor in cambios.items():
        setattr(
            empresa,
            campo,
            valor,
        )

    # --------------------------------------------------------
    # GUARDAR
    # --------------------------------------------------------

    try:
        db.commit()

    except IntegrityError:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No fue posible actualizar "
                "la empresa."
            ),
        )

    db.refresh(
        empresa
    )

    return empresa


# ============================================================
# 7. DESACTIVAR EMPRESA
# ============================================================

@router.delete(
    "/{empresa_id}",
    response_model=MensajeResponse,
)
def desactivar_empresa(
    empresa_id: int,

    usuario_actual: models.Usuario = Depends(
        require_roles(
            "administrador"
        )
    ),

    db: Session = Depends(get_db),
):
    """
    Desactiva lógicamente una empresa.

    Solo administrador.

    No ejecutamos:

        db.delete(empresa)

    porque eso podría afectar información histórica.

    En su lugar:

        empresa.activa = False
    """

    empresa = obtener_empresa_o_404(
        db,
        empresa_id,
    )

    if not empresa.activa:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "La empresa ya está desactivada."
            ),
        )

    empresa.activa = False

    # --------------------------------------------------------
    # TAMBIÉN CERRAMOS SUS VACANTES ACTIVAS
    # --------------------------------------------------------

    # Una empresa desactivada no debería continuar recibiendo
    # nuevas postulaciones.
    for vacante in empresa.vacantes:

        if vacante.estado in {
            "activa",
            "pausada",
            "borrador",
        }:
            vacante.estado = "cerrada"

    db.commit()

    return {
        "message": (
            f"La empresa '{empresa.nombre}' "
            "fue desactivada correctamente."
        )
    }