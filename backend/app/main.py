"""
============================================================
TalentIA - Aplicación principal FastAPI
Archivo: backend/app/main.py
============================================================

Este archivo:

- crea la aplicación FastAPI;
- configura CORS;
- registra los routers;
- verifica la conexión con PostgreSQL;
- expone endpoints básicos de diagnóstico.

============================================================
"""

from contextlib import asynccontextmanager

from fastapi import FastAPI

from fastapi.middleware.cors import (
    CORSMiddleware,
)

from sqlalchemy import text

from app.database import (
    Base,
    engine,
)

# Importar los modelos garantiza que SQLAlchemy conozca
# todas las tablas antes de ejecutar create_all().
from app import models  # noqa: F401

from app.routers import (
    analisis,
    auth,
    empresas,
    postulaciones,
    usuarios,
    vacantes,
)


# ============================================================
# CICLO DE VIDA
# ============================================================


@asynccontextmanager
async def lifespan(
    app: FastAPI
):
    """
    Código ejecutado al iniciar y detener FastAPI.

    create_all() crea tablas inexistentes, pero no reemplaza
    migraciones reales en sistemas de producción.
    """

    Base.metadata.create_all(
        bind=engine
    )

    print(
        "TalentIA backend iniciado correctamente."
    )

    print(
        "Documentación Swagger: "
        "http://127.0.0.1:8000/docs"
    )

    yield

    print(
        "TalentIA backend detenido."
    )


# ============================================================
# APLICACIÓN
# ============================================================


app = FastAPI(
    title="TalentIA API",

    description=(
        "API REST para una plataforma académica de "
        "reclutamiento con análisis inteligente de "
        "compatibilidad entre candidatos y vacantes."
    ),

    version="1.0.0",

    lifespan=lifespan,

    contact={
        "name": "TalentIA",
    },
)


# ============================================================
# CORS
# ============================================================


origins = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]


app.add_middleware(
    CORSMiddleware,

    allow_origins=origins,

    allow_credentials=True,

    allow_methods=[
        "*"
    ],

    allow_headers=[
        "*"
    ],
)


# ============================================================
# ROUTERS
# ============================================================


app.include_router(
    auth.router
)

app.include_router(
    empresas.router
)

app.include_router(
    usuarios.router
)

app.include_router(
    vacantes.router
)

app.include_router(
    analisis.router
)

app.include_router(
    postulaciones.router
)


# ============================================================
# SISTEMA
# ============================================================


@app.get(
    "/",
    tags=["Sistema"],
)
def inicio():
    """
    Endpoint básico de información.
    """

    return {
        "aplicacion": "TalentIA",
        "version": "1.0.0",
        "backend": "FastAPI",
        "base_datos": "PostgreSQL",
        "ia": (
            "TF-IDF + similitud coseno + "
            "habilidades ponderadas"
        ),
        "estado": "operativo",
    }


@app.get(
    "/health",
    tags=["Sistema"],
)
def health():
    """
    Health check simple.
    """

    return {
        "status": "ok",
    }


@app.get(
    "/database-test",
    tags=["Sistema"],
)
def database_test():
    """
    Comprueba que FastAPI pueda ejecutar una consulta
    real contra PostgreSQL.
    """

    with engine.connect() as conexion:

        resultado = conexion.execute(
            text(
                "SELECT 1"
            )
        )

        valor = resultado.scalar_one()


    return {
        "database": "ok",
        "result": valor,
    }