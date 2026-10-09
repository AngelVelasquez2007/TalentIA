"""
============================================================
TalentIA - Gestión de vacantes
Archivo: app/routers/vacantes.py
============================================================

Este router administra las ofertas laborales de TalentIA.

FUNCIONALIDADES:

GET /vacantes
    Catálogo público de vacantes activas.

GET /vacantes/mis-vacantes
    Vacantes administrables por reclutador/administrador.

GET /vacantes/{id}
    Detalle de una vacante activa.

POST /vacantes
    Publicar una nueva vacante.

PUT /vacantes/{id}
    Modificar una vacante.

DELETE /vacantes/{id}
    Cerrar lógicamente una vacante.

El sistema también administra las habilidades requeridas
para cada oferta mediante la relación:

    Vacante
       |
       | N:M
       v
    Habilidad

utilizando:

    VacanteHabilidad

Cada competencia puede tener:

- peso de 1 a 5;
- indicador de obligatoriedad.

Estos valores serán utilizados posteriormente por el
motor de compatibilidad de TalentIA.
============================================================
"""

from datetime import (
    datetime,
    timezone,
)

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    Query,
    status,
)

from sqlalchemy import (
    delete,
    func,
    or_,
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
    normalizar_nombre_habilidad,
)

from app.schemas import (
    EstadoVacante,
    MensajeResponse,
    ModalidadVacante,
    VacanteCreate,
    VacanteResponse,
    VacanteUpdate,
)

from app.security import (
    require_roles,
)


# ============================================================
# 1. ROUTER
# ============================================================

router = APIRouter(
    prefix="/vacantes",
    tags=["Vacantes"],
)


# ============================================================
# 2. CARGAR VACANTE COMPLETA
# ============================================================

def cargar_vacante_completa(
    db: Session,
    vacante_id: int,
) -> models.Vacante | None:
    """
    Obtiene una vacante junto con:

    - empresa;
    - habilidades requeridas;
    - detalle de cada habilidad.

    Esto permite construir directamente VacanteResponse
    sin generar consultas adicionales innecesarias.
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

    return (
        db.execute(consulta)
        .unique()
        .scalars()
        .first()
    )


# ============================================================
# 3. OBTENER VACANTE O 404
# ============================================================

def obtener_vacante_o_404(
    db: Session,
    vacante_id: int,
) -> models.Vacante:
    """
    Busca una vacante sin importar su estado.

    Se utiliza en operaciones administrativas.
    """

    vacante = cargar_vacante_completa(
        db,
        vacante_id,
    )

    if vacante is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada.",
        )

    return vacante


# ============================================================
# 4. VERIFICAR EMPRESA
# ============================================================

def obtener_empresa_activa(
    db: Session,
    empresa_id: int,
) -> models.Empresa:
    """
    Verifica que la empresa exista y esté activa.
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
            detail=(
                "La empresa no existe "
                "o está desactivada."
            ),
        )

    return empresa


# ============================================================
# 5. BUSCAR O CREAR HABILIDAD
# ============================================================

def buscar_o_crear_habilidad(
    db: Session,
    nombre: str,
) -> models.Habilidad:
    """
    Obtiene una habilidad existente o crea una nueva.

    Ejemplo:

        "postgres"
            ↓
        normalización
            ↓
        "PostgreSQL"

    Esto evita almacenar aliases como competencias diferentes.
    """

    nombre_normalizado = (
        normalizar_nombre_habilidad(
            nombre
        )
    )

    habilidad = db.execute(
        select(models.Habilidad).where(
            func.lower(
                models.Habilidad.nombre
            )
            == nombre_normalizado.lower()
        )
    ).scalars().first()

    if habilidad:
        return habilidad

    habilidad = models.Habilidad(
        nombre=nombre_normalizado,
        categoria="Tecnología",
        activa=True,
    )

    db.add(
        habilidad
    )

    # Necesitamos obtener su ID antes de crear la relación.
    db.flush()

    return habilidad


# ============================================================
# 6. SINCRONIZAR HABILIDADES DE VACANTE
# ============================================================

def sincronizar_habilidades(
    db: Session,
    vacante: models.Vacante,
    habilidades,
) -> None:
    """
    Reemplaza las habilidades actuales de una vacante
    por las recibidas desde Angular.

    Ejemplo:

    [
        {
            "nombre": "Angular",
            "peso": 5,
            "obligatoria": true
        },
        {
            "nombre": "Git",
            "peso": 2,
            "obligatoria": false
        }
    ]

    Esta función mantiene sincronizada la relación N:M.
    """

    # --------------------------------------------------------
    # ELIMINAR RELACIONES ANTERIORES
    # --------------------------------------------------------

    db.execute(
        delete(
            models.VacanteHabilidad
        ).where(
            models.VacanteHabilidad.vacante_id
            == vacante.id
        )
    )

    db.flush()

    # --------------------------------------------------------
    # EVITAR HABILIDADES DUPLICADAS
    # --------------------------------------------------------

    nombres_procesados: set[str] = set()

    for item in habilidades:

        nombre_normalizado = (
            normalizar_nombre_habilidad(
                item.nombre
            )
        )

        clave = (
            nombre_normalizado
            .strip()
            .lower()
        )

        if clave in nombres_procesados:
            continue

        nombres_procesados.add(
            clave
        )

        # ----------------------------------------------------
        # OBTENER CATÁLOGO
        # ----------------------------------------------------

        habilidad = buscar_o_crear_habilidad(
            db,
            nombre_normalizado,
        )

        # ----------------------------------------------------
        # CREAR RELACIÓN
        # ----------------------------------------------------

        relacion = models.VacanteHabilidad(
            vacante_id=vacante.id,
            habilidad_id=habilidad.id,
            obligatoria=item.obligatoria,
            peso=item.peso,
        )

        db.add(
            relacion
        )


# ============================================================
# 7. VALIDAR ACCESO A UNA VACANTE
# ============================================================

def validar_permiso_vacante(
    usuario: models.Usuario,
    vacante: models.Vacante,
) -> None:
    """
    Comprueba si un usuario puede administrar una vacante.

    ADMINISTRADOR
        Puede gestionar cualquier vacante.

    RECLUTADOR
        Solo puede gestionar vacantes pertenecientes
        a su empresa.

    Si no tiene permiso:

        HTTP 403
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
                    "Solo puedes gestionar vacantes "
                    "de tu empresa."
                ),
            )

        return

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail=(
            "No tienes permisos para "
            "gestionar esta vacante."
        ),
    )


# ============================================================
# 8. VALIDACIÓN DE SALARIOS
# ============================================================

def validar_salarios(
    salario_min: int | None,
    salario_max: int | None,
) -> None:
    """
    Valida el rango salarial completo.

    Esto complementa las validaciones de Pydantic.

    Es especialmente importante durante PUT porque podría
    modificarse únicamente salario_min o salario_max.
    """

    if (
        salario_min is not None
        and salario_max is not None
        and salario_min > salario_max
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "El salario mínimo no puede "
                "ser mayor al salario máximo."
            ),
        )


# ============================================================
# 9. LISTADO PÚBLICO DE VACANTES
# ============================================================

@router.get(
    "",
    response_model=list[VacanteResponse],
)
@router.get(
    "/",
    response_model=list[VacanteResponse],
    include_in_schema=False,
)
def listar_vacantes(
    buscar: str | None = Query(
        default=None,
        max_length=150,
        description=(
            "Busca por título, descripción, "
            "requisitos, ubicación o empresa."
        ),
    ),

    modalidad: ModalidadVacante | None = Query(
        default=None,
    ),

    ubicacion: str | None = Query(
        default=None,
        max_length=120,
    ),

    empresa_id: int | None = Query(
        default=None,
        gt=0,
    ),

    salario_minimo: int | None = Query(
        default=None,
        ge=0,
    ),

    experiencia_maxima: float | None = Query(
        default=None,
        ge=0,
        le=60,
        description=(
            "Muestra vacantes cuya experiencia "
            "mínima requerida sea menor o igual "
            "al valor indicado."
        ),
    ),

    skip: int = Query(
        default=0,
        ge=0,
    ),

    limit: int = Query(
        default=20,
        ge=1,
        le=100,
    ),

    db: Session = Depends(get_db),
):
    """
    Devuelve el catálogo público de ofertas.

    Únicamente aparecen vacantes:

        estado = activa

    pertenecientes a empresas activas.

    Ejemplos:

        GET /vacantes

        GET /vacantes?buscar=angular

        GET /vacantes?modalidad=remoto

        GET /vacantes?ubicacion=Bucaramanga

        GET /vacantes?salario_minimo=3000000
    """

    consulta = (
        select(models.Vacante)
        .join(
            models.Empresa,
            models.Vacante.empresa_id
            == models.Empresa.id,
        )
        .where(
            models.Vacante.estado == "activa",
            models.Empresa.activa.is_(True),
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

    # --------------------------------------------------------
    # BÚSQUEDA GENERAL
    # --------------------------------------------------------

    if buscar:

        patron = (
            f"%{buscar.strip()}%"
        )

        consulta = consulta.where(
            or_(
                models.Vacante.titulo.ilike(
                    patron
                ),
                models.Vacante.descripcion.ilike(
                    patron
                ),
                models.Vacante.requisitos.ilike(
                    patron
                ),
                models.Vacante.ubicacion.ilike(
                    patron
                ),
                models.Empresa.nombre.ilike(
                    patron
                ),
            )
        )

    # --------------------------------------------------------
    # MODALIDAD
    # --------------------------------------------------------

    if modalidad:
        consulta = consulta.where(
            models.Vacante.modalidad
            == modalidad
        )

    # --------------------------------------------------------
    # UBICACIÓN
    # --------------------------------------------------------

    if ubicacion:
        consulta = consulta.where(
            models.Vacante.ubicacion.ilike(
                f"%{ubicacion.strip()}%"
            )
        )

    # --------------------------------------------------------
    # EMPRESA
    # --------------------------------------------------------

    if empresa_id:
        consulta = consulta.where(
            models.Vacante.empresa_id
            == empresa_id
        )

    # --------------------------------------------------------
    # SALARIO
    # --------------------------------------------------------

    if salario_minimo is not None:

        # Mostramos vacantes cuyo salario máximo o mínimo
        # alcance al menos la expectativa indicada.
        consulta = consulta.where(
            or_(
                models.Vacante.salario_max
                >= salario_minimo,

                models.Vacante.salario_min
                >= salario_minimo,
            )
        )

    # --------------------------------------------------------
    # EXPERIENCIA
    # --------------------------------------------------------

    if experiencia_maxima is not None:
        consulta = consulta.where(
            models.Vacante.experiencia_minima
            <= experiencia_maxima
        )

    # --------------------------------------------------------
    # ORDEN
    # --------------------------------------------------------

    consulta = (
        consulta
        .order_by(
            models.Vacante.creada_en.desc()
        )
        .offset(skip)
        .limit(limit)
    )

    vacantes = (
        db.execute(consulta)
        .unique()
        .scalars()
        .all()
    )

    return vacantes


# ============================================================
# 10. MIS VACANTES
# ============================================================

@router.get(
    "/mis-vacantes",
    response_model=list[VacanteResponse],
)
def listar_mis_vacantes(
    estado: EstadoVacante | None = Query(
        default=None,
    ),

    usuario_actual: models.Usuario = Depends(
        require_roles(
            "administrador",
            "reclutador",
        )
    ),

    db: Session = Depends(get_db),
):
    """
    Devuelve las vacantes administrables por el usuario.

    ADMINISTRADOR:
        ve todas.

    RECLUTADOR:
        ve únicamente las de su empresa.

    A diferencia del catálogo público, aquí también pueden
    aparecer:

    - borrador;
    - pausada;
    - cerrada.
    """

    consulta = (
        select(models.Vacante)
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

    rol = (
        usuario_actual.rol.nombre
        .strip()
        .lower()
    )

    if rol == "reclutador":

        if usuario_actual.empresa_id is None:
            return []

        consulta = consulta.where(
            models.Vacante.empresa_id
            == usuario_actual.empresa_id
        )

    if estado:
        consulta = consulta.where(
            models.Vacante.estado
            == estado
        )

    consulta = consulta.order_by(
        models.Vacante.creada_en.desc()
    )

    return (
        db.execute(consulta)
        .unique()
        .scalars()
        .all()
    )


# ============================================================
# 11. DETALLE PÚBLICO
# ============================================================

@router.get(
    "/{vacante_id}",
    response_model=VacanteResponse,
)
def obtener_vacante(
    vacante_id: int,
    db: Session = Depends(get_db),
):
    """
    Devuelve una vacante pública.

    Una vacante cerrada, pausada o en borrador no se muestra
    mediante este endpoint público.
    """

    vacante = cargar_vacante_completa(
        db,
        vacante_id,
    )

    if (
        vacante is None
        or vacante.estado != "activa"
        or vacante.empresa is None
        or not vacante.empresa.activa
    ):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada.",
        )

    return vacante


# ============================================================
# 12. CREAR VACANTE
# ============================================================

@router.post(
    "",
    response_model=VacanteResponse,
    status_code=status.HTTP_201_CREATED,
)
@router.post(
    "/",
    response_model=VacanteResponse,
    status_code=status.HTTP_201_CREATED,
    include_in_schema=False,
)
def crear_vacante(
    datos: VacanteCreate,

    usuario_actual: models.Usuario = Depends(
        require_roles(
            "administrador",
            "reclutador",
        )
    ),

    db: Session = Depends(get_db),
):
    """
    Publica una nueva vacante.

    ADMINISTRADOR
        Debe indicar empresa_id.

    RECLUTADOR
        La empresa se obtiene directamente de su cuenta.
        No puede publicar para otra organización.
    """

    rol = (
        usuario_actual.rol.nombre
        .strip()
        .lower()
    )

    # --------------------------------------------------------
    # DETERMINAR EMPRESA
    # --------------------------------------------------------

    if rol == "reclutador":

        if usuario_actual.empresa_id is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Tu cuenta de reclutador "
                    "no tiene una empresa asociada."
                ),
            )

        if (
            datos.empresa_id is not None
            and datos.empresa_id
            != usuario_actual.empresa_id
        ):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "No puedes publicar vacantes "
                    "para otra empresa."
                ),
            )

        empresa_id = (
            usuario_actual.empresa_id
        )

    else:

        if datos.empresa_id is None:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=(
                    "El administrador debe indicar "
                    "empresa_id."
                ),
            )

        empresa_id = datos.empresa_id

    # --------------------------------------------------------
    # VERIFICAR EMPRESA
    # --------------------------------------------------------

    obtener_empresa_activa(
        db,
        empresa_id,
    )

    # --------------------------------------------------------
    # VALIDAR SALARIO
    # --------------------------------------------------------

    validar_salarios(
        datos.salario_min,
        datos.salario_max,
    )

    # --------------------------------------------------------
    # CREAR VACANTE
    # --------------------------------------------------------

    nueva_vacante = models.Vacante(
        titulo=datos.titulo,
        descripcion=datos.descripcion,
        requisitos=datos.requisitos,
        responsabilidades=(
            datos.responsabilidades
        ),
        salario_min=datos.salario_min,
        salario_max=datos.salario_max,
        modalidad=datos.modalidad,
        tipo_contrato=datos.tipo_contrato,
        ubicacion=datos.ubicacion,
        experiencia_minima=(
            datos.experiencia_minima
        ),
        estado=datos.estado,
        empresa_id=empresa_id,
        creada_por_id=usuario_actual.id,
        fecha_cierre=(
            datetime.now(timezone.utc)
            if datos.estado == "cerrada"
            else None
        ),
    )

    db.add(
        nueva_vacante
    )

    # Obtenemos el ID sin hacer todavía commit.
    db.flush()

    # --------------------------------------------------------
    # HABILIDADES
    # --------------------------------------------------------

    sincronizar_habilidades(
        db,
        nueva_vacante,
        datos.habilidades,
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
                "No fue posible crear la vacante "
                "por un conflicto de datos."
            ),
        )

    # Recargamos todo para devolver empresa + habilidades.
    return cargar_vacante_completa(
        db,
        nueva_vacante.id,
    )


# ============================================================
# 13. ACTUALIZAR VACANTE
# ============================================================

@router.put(
    "/{vacante_id}",
    response_model=VacanteResponse,
)
def actualizar_vacante(
    vacante_id: int,
    datos: VacanteUpdate,

    usuario_actual: models.Usuario = Depends(
        require_roles(
            "administrador",
            "reclutador",
        )
    ),

    db: Session = Depends(get_db),
):
    """
    Modifica una vacante existente.

    Un reclutador solo puede editar ofertas de su empresa.

    La lista de habilidades se sincroniza únicamente cuando
    Angular envía explícitamente el campo "habilidades".
    """

    vacante = obtener_vacante_o_404(
        db,
        vacante_id,
    )

    validar_permiso_vacante(
        usuario_actual,
        vacante,
    )

    cambios = datos.model_dump(
        exclude_unset=True
    )

    # --------------------------------------------------------
    # HABILIDADES SE PROCESAN APARTE
    # --------------------------------------------------------

    nuevas_habilidades = cambios.pop(
        "habilidades",
        None,
    )

    # --------------------------------------------------------
    # VALIDACIÓN SALARIAL CON LOS VALORES EXISTENTES
    # --------------------------------------------------------

    salario_min = cambios.get(
        "salario_min",
        vacante.salario_min,
    )

    salario_max = cambios.get(
        "salario_max",
        vacante.salario_max,
    )

    validar_salarios(
        salario_min,
        salario_max,
    )

    # --------------------------------------------------------
    # APLICAR CAMPOS SIMPLES
    # --------------------------------------------------------

    estado_anterior = vacante.estado

    for campo, valor in cambios.items():
        setattr(
            vacante,
            campo,
            valor,
        )

    # Mantiene fecha_cierre coherente con el estado.
    if "estado" in cambios:
        if vacante.estado == "cerrada":
            if (
                estado_anterior != "cerrada"
                or vacante.fecha_cierre is None
            ):
                vacante.fecha_cierre = datetime.now(
                    timezone.utc
                )
        else:
            vacante.fecha_cierre = None

    # --------------------------------------------------------
    # ACTUALIZAR HABILIDADES
    # --------------------------------------------------------

    if nuevas_habilidades is not None:

        # model_dump convirtió los objetos Pydantic a dicts,
        # por lo que los reconstruimos de manera simple.
        from app.schemas import (
            VacanteHabilidadInput,
        )

        habilidades_objetos = [
            VacanteHabilidadInput(
                **item
            )
            for item in nuevas_habilidades
        ]

        sincronizar_habilidades(
            db,
            vacante,
            habilidades_objetos,
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
                "la vacante."
            ),
        )

    return cargar_vacante_completa(
        db,
        vacante.id,
    )


# ============================================================
# 14. CERRAR VACANTE
# ============================================================

@router.delete(
    "/{vacante_id}",
    response_model=MensajeResponse,
)
def cerrar_vacante(
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
    Realiza una eliminación lógica.

    NO hacemos:

        db.delete(vacante)

    En su lugar:

        estado = "cerrada"

    Esto conserva todas las postulaciones y resultados
    históricos asociados a la oferta.
    """

    vacante = obtener_vacante_o_404(
        db,
        vacante_id,
    )

    validar_permiso_vacante(
        usuario_actual,
        vacante,
    )

    if vacante.estado == "cerrada":
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "La vacante ya está cerrada."
            ),
        )

    vacante.estado = "cerrada"
    vacante.fecha_cierre = datetime.now(
        timezone.utc
    )

    try:
        db.commit()

    except SQLAlchemyError as error:
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "No fue posible cerrar la vacante."
            ),
        ) from error

    return {
        "message": (
            f"La vacante '{vacante.titulo}' "
            "fue cerrada correctamente."
        )
    }