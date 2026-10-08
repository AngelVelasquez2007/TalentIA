"""
============================================================
TalentIA - Configuración de base de datos
Archivo: app/database.py
============================================================

Este módulo centraliza toda la conexión entre FastAPI,
SQLAlchemy y PostgreSQL.

Responsabilidades principales:
1. Leer la URL de PostgreSQL desde el archivo .env.
2. Crear el motor de SQLAlchemy.
3. Crear sesiones de base de datos.
4. Definir la clase Base utilizada por todos los modelos.
5. Proporcionar la dependencia get_db() para FastAPI.

Flujo general:

    FastAPI
       |
       v
    get_db()
       |
       v
    SessionLocal
       |
       v
    SQLAlchemy
       |
       v
    PostgreSQL

IMPORTANTE:
La contraseña de PostgreSQL NO se escribe directamente
en este archivo. Se obtiene desde el archivo .env.
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
# 1. LOCALIZACIÓN DEL ARCHIVO .env
# ============================================================

# __file__ apunta a:
#
# backend/app/database.py
#
# .parent       -> backend/app
# .parent.parent -> backend
#
# De esta manera podemos encontrar el archivo:
#
# backend/.env
#
# independientemente de la carpeta desde la que ejecutemos
# uvicorn.
BASE_DIR = Path(__file__).resolve().parent.parent

ENV_PATH = BASE_DIR / ".env"


# ============================================================
# 2. CARGAR VARIABLES DE ENTORNO
# ============================================================

# Lee las variables configuradas en backend/.env.
#
# Ejemplo:
#
# DATABASE_URL=postgresql+psycopg://usuario:clave@localhost:5432/talentia_db
#
# La información sensible permanece fuera del código fuente.
load_dotenv(dotenv_path=ENV_PATH)


# ============================================================
# 3. OBTENER DATABASE_URL
# ============================================================

DATABASE_URL = os.getenv("DATABASE_URL")


# Si la variable no existe detenemos inmediatamente la
# aplicación con un mensaje entendible.
#
# Esto es preferible a permitir que SQLAlchemy falle después
# con un error difícil de interpretar.
if not DATABASE_URL:
    raise RuntimeError(
        "No se encontró DATABASE_URL. "
        "Verifica que exista backend/.env y que contenga "
        "la configuración de PostgreSQL."
    )


# ============================================================
# 4. NORMALIZAR EL DRIVER DE POSTGRESQL
# ============================================================

# SQLAlchemy soporta diferentes drivers para PostgreSQL.
#
# TalentIA utiliza Psycopg 3.
#
# La URL recomendada es:
#
# postgresql+psycopg://usuario:clave@localhost:5432/bd
#
# Sin embargo, si existe una configuración antigua como:
#
# postgresql://usuario:clave@localhost:5432/bd
#
# la convertimos automáticamente.
#
# Esto hace que el proyecto sea más tolerante a configuraciones
# anteriores y evita depender de psycopg2.
if DATABASE_URL.startswith("postgresql://"):
    DATABASE_URL = DATABASE_URL.replace(
        "postgresql://",
        "postgresql+psycopg://",
        1,
    )


# ============================================================
# 5. MOTOR DE SQLALCHEMY
# ============================================================

# create_engine crea el objeto que administra las conexiones
# hacia PostgreSQL.
#
# pool_pre_ping=True:
#
# Antes de reutilizar una conexión del pool, SQLAlchemy
# comprueba que siga activa.
#
# Esto evita errores típicos cuando PostgreSQL cierra una
# conexión inactiva.
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
)


# ============================================================
# 6. FACTORÍA DE SESIONES
# ============================================================

# SessionLocal NO es una conexión abierta.
#
# Es una "fábrica" que permite crear sesiones cuando una
# petición HTTP necesita acceder a PostgreSQL.
#
# autoflush=False:
# Evita que SQLAlchemy envíe cambios automáticamente antes
# de que nosotros decidamos hacerlo.
#
# expire_on_commit=False:
# Permite seguir utilizando los objetos después de ejecutar
# commit(), algo útil cuando FastAPI debe devolverlos como JSON.
SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    expire_on_commit=False,
)


# ============================================================
# 7. CLASE BASE DE LOS MODELOS
# ============================================================

# Todos nuestros modelos SQLAlchemy heredarán de esta clase.
#
# Ejemplo:
#
# class Usuario(Base):
#     __tablename__ = "usuarios"
#
# class Vacante(Base):
#     __tablename__ = "vacantes"
#
# Gracias a esa herencia SQLAlchemy puede conocer todas las
# tablas que forman parte del sistema.
class Base(DeclarativeBase):
    pass


# ============================================================
# 8. DEPENDENCIA DE BASE DE DATOS PARA FASTAPI
# ============================================================

def get_db() -> Generator[Session, None, None]:
    """
    Crea una sesión de PostgreSQL para una petición HTTP.

    Esta función se utilizará con Depends() dentro de los
    endpoints de FastAPI.

    Ejemplo:

        @router.get("/vacantes")
        def listar_vacantes(
            db: Session = Depends(get_db)
        ):
            ...

    Funcionamiento:

        1. Se crea una sesión.
        2. FastAPI entrega la sesión al endpoint.
        3. El endpoint consulta o modifica PostgreSQL.
        4. Al terminar la petición, finally cierra la sesión.

    El bloque finally garantiza que la conexión sea liberada
    incluso si ocurre una excepción.
    """

    db = SessionLocal()

    try:
        yield db

    finally:
        db.close()