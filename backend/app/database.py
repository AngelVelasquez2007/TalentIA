"""
============================================================
TalentIA - Configuración de base de datos
Archivo: backend/app/database.py
============================================================

Gestiona la conexión:

FastAPI
   ↓
SQLAlchemy
   ↓
Psycopg
   ↓
PostgreSQL

Esta versión agrega límites de espera para evitar
peticiones indefinidamente bloqueadas.
============================================================
"""

import os

from pathlib import Path

from typing import Generator

from dotenv import load_dotenv

from sqlalchemy import create_engine

from sqlalchemy.orm import (
    DeclarativeBase,
    Session,
    sessionmaker,
)


# ============================================================
# RUTAS
# ============================================================

BASE_DIR = (
    Path(__file__)
    .resolve()
    .parent
    .parent
)

ENV_PATH = (
    BASE_DIR /
    ".env"
)


# ============================================================
# VARIABLES DE ENTORNO
# ============================================================

load_dotenv(
    dotenv_path=
        ENV_PATH
)


DATABASE_URL = os.getenv(
    "DATABASE_URL"
)


if not DATABASE_URL:

    raise RuntimeError(
        "No se encontró DATABASE_URL. "
        "Verifica backend/.env."
    )


# ============================================================
# NORMALIZAR POSTGRESQL
# ============================================================

if DATABASE_URL.startswith(
    "postgresql://"
):

    DATABASE_URL = (
        DATABASE_URL.replace(
            "postgresql://",
            "postgresql+psycopg://",
            1,
        )
    )


# ============================================================
# MOTOR SQLALCHEMY
# ============================================================

"""
Configuraciones importantes:

pool_pre_ping:
    comprueba que una conexión reutilizada siga viva.

pool_recycle:
    recicla conexiones antiguas.

pool_timeout:
    evita esperar indefinidamente por una conexión
    disponible del pool.

connect_timeout:
    máximo de segundos para establecer conexión
    con PostgreSQL.

statement_timeout:
    PostgreSQL cancela consultas que superen
    15 segundos.
"""

engine = create_engine(

    DATABASE_URL,

    pool_pre_ping=True,

    pool_recycle=1800,

    pool_timeout=10,

    connect_args={

        "connect_timeout":
            5,

        "options":
            "-c statement_timeout=15000",
    },
)


# ============================================================
# SESIONES
# ============================================================

SessionLocal = sessionmaker(

    bind=engine,

    autoflush=False,

    expire_on_commit=False,
)


# ============================================================
# BASE SQLALCHEMY
# ============================================================

class Base(
    DeclarativeBase
):
    pass


# ============================================================
# DEPENDENCIA FASTAPI
# ============================================================

def get_db() -> Generator[
    Session,
    None,
    None,
]:
    """
    Crea una sesión por petición y garantiza su cierre.
    """

    db = SessionLocal()


    try:

        yield db


    finally:

        db.close()