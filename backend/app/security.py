"""
============================================================
TalentIA - Seguridad y autenticación
Archivo: app/security.py
============================================================

Este módulo centraliza las funciones de seguridad de TalentIA.

RESPONSABILIDADES:

1. Crear hashes seguros de contraseñas.
2. Verificar contraseñas durante el login.
3. Crear tokens JWT firmados con HS256.
4. Validar tokens JWT recibidos desde Angular.
5. Obtener al usuario autenticado.
6. Restringir endpoints según roles.

FLUJO DE AUTENTICACIÓN:

Registro:
    contraseña
        |
        v
    PBKDF2-HMAC-SHA256
        |
        v
    password_hash
        |
        v
    PostgreSQL


Login:
    email + contraseña
        |
        v
    verificar hash
        |
        v
    generar JWT
        |
        v
    Angular


Petición protegida:
    Angular
        |
        | Authorization: Bearer TOKEN
        v
    FastAPI
        |
        v
    validar JWT
        |
        v
    obtener usuario
        |
        v
    comprobar rol
============================================================
"""

import base64
import hashlib
import hmac
import json
import os
import secrets
import time
from typing import Callable

from fastapi import (
    Depends,
    HTTPException,
    status,
)

from fastapi.security import (
    HTTPAuthorizationCredentials,
    HTTPBearer,
)

from sqlalchemy.orm import Session

from app import models
from app.database import get_db


# ============================================================
# 1. CONFIGURACIÓN DE CONTRASEÑAS
# ============================================================

# Algoritmo utilizado para derivar la contraseña.
PASSWORD_ALGORITHM = "pbkdf2_sha256"

# Número de iteraciones de PBKDF2.
#
# Cuantas más iteraciones se realicen, más costoso es intentar
# adivinar contraseñas por fuerza bruta.
PBKDF2_ITERATIONS = 310_000

# Cantidad de bytes aleatorios utilizados como salt.
SALT_SIZE = 16


# ============================================================
# 2. CONFIGURACIÓN JWT
# ============================================================

JWT_ALGORITHM = "HS256"

# Duración por defecto del token:
#
# 480 minutos = 8 horas.
DEFAULT_JWT_EXPIRE_MINUTES = 480


# ============================================================
# 3. CONFIGURACIÓN DEL ESQUEMA BEARER
# ============================================================

# FastAPI buscará encabezados como:
#
# Authorization: Bearer eyJhbGciOi...
#
# auto_error=False permite generar nuestros propios mensajes
# de error en español.
bearer_scheme = HTTPBearer(
    auto_error=False,
)


# ============================================================
# 4. HASH DE CONTRASEÑAS
# ============================================================

def hash_password(password: str) -> str:
    """
    Convierte una contraseña en un hash irreversible.

    IMPORTANTE:
    TalentIA nunca almacena la contraseña original.

    Se utiliza:

        PBKDF2
        +
        HMAC
        +
        SHA-256
        +
        salt aleatorio

    Ejemplo de resultado:

        pbkdf2_sha256$310000$SALT$HASH

    El salt evita que dos usuarios con la misma contraseña
    tengan exactamente el mismo hash.
    """

    if not password:
        raise ValueError(
            "La contraseña no puede estar vacía."
        )

    # Genera un salt criptográficamente seguro.
    salt = secrets.token_bytes(SALT_SIZE)

    # Genera la clave derivada.
    digest = hashlib.pbkdf2_hmac(
        "sha256",
        password.encode("utf-8"),
        salt,
        PBKDF2_ITERATIONS,
    )

    return (
        f"{PASSWORD_ALGORITHM}"
        f"${PBKDF2_ITERATIONS}"
        f"${salt.hex()}"
        f"${digest.hex()}"
    )


def verify_password(
    password: str,
    stored_hash: str,
) -> bool:
    """
    Comprueba si una contraseña coincide con el hash guardado.

    Nunca se "desencripta" la contraseña.

    En lugar de eso:

        contraseña recibida
              |
              v
        mismo algoritmo
              |
              v
        nuevo hash
              |
              v
        comparación segura

    hmac.compare_digest evita comparaciones vulnerables a
    ciertos ataques de temporización.
    """

    if not password or not stored_hash:
        return False

    try:
        (
            algorithm,
            iterations,
            salt_hex,
            expected_hex,
        ) = stored_hash.split("$")

        if algorithm != PASSWORD_ALGORITHM:
            return False

        salt = bytes.fromhex(salt_hex)

        expected_digest = bytes.fromhex(
            expected_hex
        )

        calculated_digest = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt,
            int(iterations),
        )

        return hmac.compare_digest(
            calculated_digest,
            expected_digest,
        )

    except (
        ValueError,
        TypeError,
        AttributeError,
    ):
        # Si el hash almacenado tiene un formato inválido,
        # simplemente consideramos que no coincide.
        return False


# ============================================================
# 5. UTILIDADES BASE64 URL-SAFE
# ============================================================

def _base64url_encode(data: bytes) -> str:
    """
    Codifica bytes utilizando Base64 compatible con URL.

    JWT utiliza Base64 URL-safe sin "=" al final.
    """

    return (
        base64.urlsafe_b64encode(data)
        .rstrip(b"=")
        .decode("utf-8")
    )


def _base64url_decode(data: str) -> bytes:
    """
    Decodifica una cadena Base64 URL-safe.

    Agrega nuevamente el padding "=" cuando sea necesario.
    """

    padding = "=" * (-len(data) % 4)

    return base64.urlsafe_b64decode(
        data + padding
    )


# ============================================================
# 6. OBTENER CONFIGURACIÓN JWT
# ============================================================

def _get_jwt_secret() -> bytes:
    """
    Obtiene JWT_SECRET desde backend/.env.

    Ejemplo:

        JWT_SECRET=TalentIA_Clave_Muy_Segura_123456789

    Exigimos al menos 32 caracteres para evitar utilizar
    secretos demasiado débiles.
    """

    secret = os.getenv(
        "JWT_SECRET",
        "",
    ).strip()

    if len(secret) < 32:
        raise RuntimeError(
            "JWT_SECRET debe existir en backend/.env "
            "y tener mínimo 32 caracteres."
        )

    return secret.encode("utf-8")


def _get_expiration_minutes() -> int:
    """
    Obtiene la duración configurada para los tokens.

    En .env puede configurarse opcionalmente:

        JWT_EXPIRE_MINUTES=480

    Si no existe se utilizan 8 horas.
    """

    value = os.getenv(
        "JWT_EXPIRE_MINUTES",
        str(DEFAULT_JWT_EXPIRE_MINUTES),
    )

    try:
        minutes = int(value)

        if minutes <= 0:
            raise ValueError

        return minutes

    except ValueError:
        return DEFAULT_JWT_EXPIRE_MINUTES


# ============================================================
# 7. CREAR JWT
# ============================================================

def create_access_token(
    user: models.Usuario,
) -> str:
    """
    Genera un token JWT para un usuario autenticado.

    Un JWT tiene tres partes:

        HEADER.PAYLOAD.SIGNATURE

    HEADER:
        algoritmo utilizado.

    PAYLOAD:
        datos básicos de la sesión.

    SIGNATURE:
        firma criptográfica que evita modificaciones.

    Ejemplo conceptual:

        {
            "sub": "7",
            "email": "ana@test.com",
            "role": "candidato",
            "iat": 123456,
            "exp": 124000
        }

    IMPORTANTE:
    El contenido de un JWT puede ser leído por el cliente.
    Por eso nunca guardamos contraseñas ni información secreta
    dentro del token.
    """

    now = int(time.time())

    expiration = (
        now
        + _get_expiration_minutes() * 60
    )

    # --------------------------------------------------------
    # HEADER
    # --------------------------------------------------------

    header = {
        "alg": JWT_ALGORITHM,
        "typ": "JWT",
    }

    # --------------------------------------------------------
    # PAYLOAD
    # --------------------------------------------------------

    payload = {
        # sub = subject.
        # Identifica al usuario propietario del token.
        "sub": str(user.id),

        "email": user.email,

        "role": (
            user.rol.nombre
            if user.rol
            else None
        ),

        # issued at
        "iat": now,

        # expiration time
        "exp": expiration,
    }

    # Convertimos header y payload a JSON compacto.
    header_json = json.dumps(
        header,
        separators=(",", ":"),
    ).encode("utf-8")

    payload_json = json.dumps(
        payload,
        separators=(",", ":"),
    ).encode("utf-8")

    encoded_header = _base64url_encode(
        header_json
    )

    encoded_payload = _base64url_encode(
        payload_json
    )

    unsigned_token = (
        f"{encoded_header}."
        f"{encoded_payload}"
    )

    # --------------------------------------------------------
    # FIRMA HS256
    # --------------------------------------------------------

    signature = hmac.new(
        _get_jwt_secret(),
        unsigned_token.encode("utf-8"),
        hashlib.sha256,
    ).digest()

    encoded_signature = _base64url_encode(
        signature
    )

    return (
        f"{unsigned_token}."
        f"{encoded_signature}"
    )


# ============================================================
# 8. DECODIFICAR Y VALIDAR JWT
# ============================================================

def decode_access_token(
    token: str,
) -> dict:
    """
    Verifica y decodifica un JWT.

    Comprobaciones realizadas:

    1. Debe tener tres partes.
    2. Debe utilizar HS256.
    3. La firma debe ser válida.
    4. Debe contener sub.
    5. Debe contener exp.
    6. No debe estar vencido.

    Si alguna comprobación falla se genera HTTP 401.
    """

    try:
        parts = token.split(".")

        if len(parts) != 3:
            raise ValueError(
                "Formato JWT inválido."
            )

        (
            encoded_header,
            encoded_payload,
            received_signature,
        ) = parts

        # ----------------------------------------------------
        # LEER HEADER
        # ----------------------------------------------------

        header = json.loads(
            _base64url_decode(
                encoded_header
            ).decode("utf-8")
        )

        if (
            header.get("alg")
            != JWT_ALGORITHM
        ):
            raise ValueError(
                "Algoritmo JWT inválido."
            )

        # ----------------------------------------------------
        # VERIFICAR FIRMA
        # ----------------------------------------------------

        unsigned_token = (
            f"{encoded_header}."
            f"{encoded_payload}"
        )

        expected_signature = hmac.new(
            _get_jwt_secret(),
            unsigned_token.encode("utf-8"),
            hashlib.sha256,
        ).digest()

        expected_signature_encoded = (
            _base64url_encode(
                expected_signature
            )
        )

        if not hmac.compare_digest(
            received_signature,
            expected_signature_encoded,
        ):
            raise ValueError(
                "Firma inválida."
            )

        # ----------------------------------------------------
        # LEER PAYLOAD
        # ----------------------------------------------------

        payload = json.loads(
            _base64url_decode(
                encoded_payload
            ).decode("utf-8")
        )

        if "sub" not in payload:
            raise ValueError(
                "El token no tiene usuario."
            )

        if "exp" not in payload:
            raise ValueError(
                "El token no tiene expiración."
            )

        expiration = int(
            payload["exp"]
        )

        # ----------------------------------------------------
        # COMPROBAR EXPIRACIÓN
        # ----------------------------------------------------

        if expiration <= int(time.time()):
            raise ValueError(
                "Token vencido."
            )

        return payload

    except (
        ValueError,
        TypeError,
        KeyError,
        json.JSONDecodeError,
        UnicodeDecodeError,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token inválido o vencido.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )


# ============================================================
# 9. USUARIO AUTENTICADO
# ============================================================

def get_current_user(
    credentials: (
        HTTPAuthorizationCredentials | None
    ) = Depends(bearer_scheme),

    db: Session = Depends(get_db),
) -> models.Usuario:
    """
    Obtiene al usuario asociado al JWT recibido.

    Angular enviará:

        Authorization: Bearer TOKEN

    FastAPI:

        1. obtiene el token;
        2. valida la firma;
        3. obtiene user_id desde sub;
        4. busca el usuario en PostgreSQL;
        5. comprueba que siga activo.

    Devolver el usuario desde PostgreSQL es importante porque
    un JWT podría seguir siendo técnicamente válido aunque el
    administrador haya desactivado posteriormente la cuenta.
    """

    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Debes iniciar sesión.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if (
        credentials.scheme.lower()
        != "bearer"
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Esquema de autenticación inválido.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    payload = decode_access_token(
        credentials.credentials
    )

    try:
        user_id = int(
            payload["sub"]
        )

    except (
        ValueError,
        TypeError,
        KeyError,
    ):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Token de usuario inválido.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    usuario = db.get(
        models.Usuario,
        user_id,
    )

    if usuario is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="El usuario del token ya no existe.",
            headers={
                "WWW-Authenticate": "Bearer"
            },
        )

    if not usuario.activo:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="La cuenta está desactivada.",
        )

    return usuario


# ============================================================
# 10. CONTROL DE ACCESO POR ROLES
# ============================================================

def require_roles(
    *allowed_roles: str,
) -> Callable:
    """
    Crea una dependencia de FastAPI que restringe un endpoint
    según el rol del usuario.

    Ejemplo:

        @router.post("/vacantes")
        def crear_vacante(
            usuario = Depends(
                require_roles(
                    "administrador",
                    "reclutador",
                )
            )
        ):
            ...

    Un candidato autenticado recibiría:

        HTTP 403 Forbidden

    porque está autenticado, pero no tiene autorización.
    """

    normalized_roles = {
        role.strip().lower()
        for role in allowed_roles
    }

    def role_dependency(
        usuario: models.Usuario = Depends(
            get_current_user
        ),
    ) -> models.Usuario:

        if usuario.rol is None:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="El usuario no tiene un rol asignado.",
            )

        user_role = (
            usuario.rol.nombre
            .strip()
            .lower()
        )

        if user_role not in normalized_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "No tienes permisos para realizar "
                    "esta operación."
                ),
            )

        return usuario

    return role_dependency


# ============================================================
# 11. ALIAS DE COMPATIBILIDAD
# ============================================================

# Mientras terminamos de reemplazar los routers antiguos,
# algunos archivos podrían importar:
#
#     current_user
#
# Lo mantenemos como alias temporal/compatible.
#
# También es un nombre perfectamente válido para utilizar en
# FastAPI, por lo que puede quedarse en el proyecto final.
current_user = get_current_user