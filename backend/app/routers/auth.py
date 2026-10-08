"""
============================================================
TalentIA - Autenticación
Archivo: app/auth.py
============================================================

Este router implementa el flujo de autenticación de TalentIA.

ENDPOINTS PRINCIPALES:

POST /auth/register
    Registra un nuevo candidato.

POST /auth/login
    Valida email y contraseña y devuelve un JWT.

GET /auth/me
    Devuelve la información del usuario autenticado.

POST /auth/logout
    Explica el cierre de sesión en una arquitectura JWT.

FLUJO GENERAL:

REGISTRO
Angular
   |
   | nombre, apellido, email, password
   v
/auth/register
   |
   | valida Pydantic
   v
hash_password()
   |
   v
PostgreSQL


LOGIN
Angular
   |
   | email + password
   v
/auth/login
   |
   v
verify_password()
   |
   v
create_access_token()
   |
   v
JWT


USUARIO ACTUAL
Angular
   |
   | Authorization: Bearer TOKEN
   v
/auth/me
   |
   v
get_current_user()
   |
   v
Usuario
============================================================
"""

from fastapi import (
    APIRouter,
    Depends,
    HTTPException,
    status,
)

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import (
    Session,
    joinedload,
    selectinload,
)

from app import models
from app.database import get_db
from app.schemas import (
    LoginRequest,
    MensajeResponse,
    TokenResponse,
    UsuarioRegistro,
    UsuarioResponse,
)
from app.security import (
    create_access_token,
    get_current_user,
    hash_password,
    verify_password,
)


# ============================================================
# 1. CONFIGURACIÓN DEL ROUTER
# ============================================================

router = APIRouter(
    prefix="/auth",
    tags=["Autenticación"],
)


# ============================================================
# 2. FUNCIÓN AUXILIAR: CARGAR USUARIO COMPLETO
# ============================================================

def obtener_usuario_completo(
    db: Session,
    usuario_id: int,
) -> models.Usuario | None:
    """
    Obtiene un usuario junto con las relaciones necesarias
    para devolverlo correctamente al frontend.

    Cargamos:

    - rol;
    - empresa;
    - habilidades;
    - detalle de cada habilidad.

    Esto evita múltiples consultas innecesarias durante la
    serialización de la respuesta.
    """

    consulta = (
        select(models.Usuario)
        .where(
            models.Usuario.id == usuario_id
        )
        .options(
            joinedload(
                models.Usuario.rol
            ),
            joinedload(
                models.Usuario.empresa
            ),
            selectinload(
                models.Usuario.habilidades
            ).joinedload(
                models.UsuarioHabilidad.habilidad
            ),
        )
    )

    return db.execute(
        consulta
    ).scalars().first()


# ============================================================
# 3. REGISTRO DE CANDIDATO
# ============================================================

@router.post(
    "/register",
    response_model=UsuarioResponse,
    status_code=status.HTTP_201_CREATED,
)
def registrar_candidato(
    datos: UsuarioRegistro,
    db: Session = Depends(get_db),
):
    """
    Registra un nuevo usuario con rol candidato.

    SEGURIDAD:

    El cliente NO puede escoger su rol.

    Aunque alguien modifique manualmente la petición desde
    Swagger o Postman, este endpoint siempre asigna:

        candidato

    Esto evita escalamiento de privilegios.

    Ejemplo de entrada:

    {
        "nombre": "Laura",
        "apellido": "Gomez",
        "email": "laura@test.com",
        "password": "TalentIA123"
    }
    """

    # --------------------------------------------------------
    # 1. VERIFICAR CORREO DUPLICADO
    # --------------------------------------------------------

    usuario_existente = db.execute(
        select(models.Usuario).where(
            models.Usuario.email
            == datos.email.lower()
        )
    ).scalars().first()

    if usuario_existente:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Ya existe una cuenta registrada "
                "con este correo electrónico."
            ),
        )

    # --------------------------------------------------------
    # 2. BUSCAR ROL CANDIDATO
    # --------------------------------------------------------

    rol_candidato = db.execute(
        select(models.Role).where(
            models.Role.nombre == "candidato"
        )
    ).scalars().first()

    if rol_candidato is None:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=(
                "El rol candidato no está configurado. "
                "Ejecuta el proceso de inicialización "
                "de TalentIA."
            ),
        )

    # --------------------------------------------------------
    # 3. CREAR USUARIO
    # --------------------------------------------------------

    nuevo_usuario = models.Usuario(
        nombre=datos.nombre,
        apellido=datos.apellido,
        email=datos.email.lower(),

        # La contraseña original nunca se almacena.
        password_hash=hash_password(
            datos.password
        ),

        rol_id=rol_candidato.id,

        activo=True,
        experiencia_anios=0,
    )

    db.add(
        nuevo_usuario
    )

    # --------------------------------------------------------
    # 4. GUARDAR EN POSTGRESQL
    # --------------------------------------------------------

    try:
        db.commit()

    except IntegrityError:
        # Protección adicional por si dos peticiones intentan
        # registrar simultáneamente el mismo correo.
        db.rollback()

        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "No fue posible registrar el usuario. "
                "El correo electrónico ya podría existir."
            ),
        )

    # refresh actualiza el objeto con valores generados por BD:
    #
    # id
    # creado_en
    # actualizado_en
    db.refresh(
        nuevo_usuario
    )

    # --------------------------------------------------------
    # 5. DEVOLVER USUARIO COMPLETO
    # --------------------------------------------------------

    usuario_completo = obtener_usuario_completo(
        db,
        nuevo_usuario.id,
    )

    return usuario_completo


# ============================================================
# 4. LOGIN
# ============================================================

@router.post(
    "/login",
    response_model=TokenResponse,
)
def iniciar_sesion(
    datos: LoginRequest,
    db: Session = Depends(get_db),
):
    """
    Autentica un usuario y genera un JWT.

    El proceso es:

        buscar email
            ↓
        verificar contraseña
            ↓
        verificar cuenta activa
            ↓
        crear JWT
            ↓
        devolver token

    No distinguimos públicamente entre:

    - correo inexistente;
    - contraseña incorrecta.

    Ambos casos responden:

        "Correo o contraseña incorrectos"

    Esto evita revelar innecesariamente qué correos están
    registrados en la plataforma.
    """

    usuario = db.execute(
        select(models.Usuario)
        .where(
            models.Usuario.email
            == datos.email.lower()
        )
        .options(
            joinedload(
                models.Usuario.rol
            )
        )
    ).scalars().first()

    # --------------------------------------------------------
    # VERIFICAR CREDENCIALES
    # --------------------------------------------------------

    if (
        usuario is None
        or not verify_password(
            datos.password,
            usuario.password_hash,
        )
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Correo o contraseña incorrectos.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    # --------------------------------------------------------
    # VERIFICAR ESTADO DE LA CUENTA
    # --------------------------------------------------------

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                "La cuenta está desactivada. "
                "Contacta al administrador."
            ),
        )

    # --------------------------------------------------------
    # CREAR JWT
    # --------------------------------------------------------

    token = create_access_token(
        usuario
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
    )


# ============================================================
# 5. USUARIO AUTENTICADO
# ============================================================

@router.get(
    "/me",
    response_model=UsuarioResponse,
)
def obtener_mi_perfil(
    usuario_actual: models.Usuario = Depends(
        get_current_user
    ),
    db: Session = Depends(get_db),
):
    """
    Devuelve la información del usuario propietario del JWT.

    Angular utilizará este endpoint para saber:

    - quién inició sesión;
    - qué rol tiene;
    - a qué empresa pertenece;
    - qué perfil profesional posee;
    - qué habilidades tiene.

    Ejemplo:

        GET /auth/me

        Authorization:
        Bearer eyJhbGciOi...
    """

    usuario_completo = obtener_usuario_completo(
        db,
        usuario_actual.id,
    )

    if usuario_completo is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Usuario no encontrado.",
        )

    return usuario_completo


# ============================================================
# 6. LOGOUT
# ============================================================

@router.post(
    "/logout",
    response_model=MensajeResponse,
)
def cerrar_sesion(
    usuario_actual: models.Usuario = Depends(
        get_current_user
    ),
):
    """
    Confirma un cierre de sesión.

    TalentIA utiliza JWT stateless.

    Esto significa que el servidor no mantiene una sesión
    tradicional almacenada.

    El cierre real ocurre en Angular eliminando el JWT de:

        sessionStorage

    o del mecanismo de almacenamiento configurado.

    El endpoint existe para mantener una API clara y permitir
    ampliar posteriormente el sistema con una lista de
    revocación de tokens si fuera necesario.
    """

    return {
        "message": (
            f"Sesión cerrada para "
            f"{usuario_actual.email}."
        )
    }