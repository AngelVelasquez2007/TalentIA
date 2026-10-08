"""
============================================================
TalentIA - Aplicación principal FastAPI
Archivo: app/main.py
============================================================

Este archivo es el punto de entrada del backend de TalentIA.

RESPONSABILIDADES:

1. Crear la aplicación FastAPI.
2. Configurar CORS para Angular.
3. Registrar todos los routers.
4. Crear las tablas si todavía no existen.
5. Exponer endpoints básicos de diagnóstico.
6. Centralizar la documentación principal de la API.

ARQUITECTURA:

Angular
    |
    | HTTP / JSON
    v
FastAPI
    |
    +---- /auth
    |
    +---- /empresas
    |
    +---- /vacantes
    |
    +---- /analisis
    |
    +---- /postulaciones
    |
    v
SQLAlchemy
    |
    v
PostgreSQL


Motor IA:

Perfil candidato
        |
        v
matching.py
        |
        +-- TF-IDF
        +-- similitud coseno
        +-- habilidades ponderadas
        |
        v
Compatibilidad 0 - 100 %
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

# Importar models es importante para que SQLAlchemy conozca
# todas las tablas antes de ejecutar create_all().
from app import models  # noqa: F401

from app.routers import (
    analisis,
    auth,
    empresas,
    postulaciones,
    vacantes,
)


# ============================================================
# 1. CICLO DE VIDA DE LA APLICACIÓN
# ============================================================

@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Código ejecutado cuando FastAPI inicia y termina.

    Al iniciar:

        Base.metadata.create_all()

    garantiza que las tablas definidas en models.py existan.

    IMPORTANTE:

    create_all() crea tablas faltantes, pero NO reemplaza
    migraciones profesionales.

    Durante el desarrollo académico utilizamos seed.py
    --reset cuando cambia el modelo completo.
    """

    Base.metadata.create_all(
        bind=engine
    )

    print()
    print("=" * 60)
    print(" TalentIA API iniciada")
    print("=" * 60)
    print(" Swagger:")
    print(" http://127.0.0.1:8000/docs")
    print()
    print(" Angular esperado:")
    print(" http://localhost:4200")
    print("=" * 60)
    print()

    yield

    print()
    print("TalentIA API detenida.")
    print()


# ============================================================
# 2. CREAR FASTAPI
# ============================================================

app = FastAPI(
    title="TalentIA API",

    description="""
# TalentIA - Plataforma de Reclutamiento con IA

API REST desarrollada con **FastAPI**, **SQLAlchemy**
y **PostgreSQL**.

## Funcionalidades

### Autenticación
- Registro de candidatos.
- Login.
- JWT.
- Roles.
- Control de acceso.

### Empresas
- Crear.
- Consultar.
- Modificar.
- Desactivar.

### Vacantes
- Catálogo.
- Búsqueda.
- Filtros.
- Crear.
- Modificar.
- Cerrar.
- Habilidades ponderadas.

### Inteligencia Artificial / NLP
TalentIA compara el perfil del candidato con los requisitos
de una vacante utilizando:

- TF-IDF.
- Similitud coseno.
- Detección de habilidades.
- Habilidades ponderadas.

El resultado genera una puntuación entre **0 y 100 %**.

### Postulaciones
- Postulación de candidatos.
- Persistencia del análisis IA.
- Seguimiento del estado.
- Ranking orientativo para reclutadores.

> El análisis inteligente es una herramienta de apoyo.
> No toma decisiones automáticas de contratación.
""",

    version="1.0.0",

    lifespan=lifespan,

    contact={
        "name": "Proyecto TalentIA",
    },
)


# ============================================================
# 3. CONFIGURAR CORS
# ============================================================

# CORS = Cross-Origin Resource Sharing.
#
# Angular y FastAPI se ejecutan en puertos diferentes:
#
# Angular:
#     http://localhost:4200
#
# FastAPI:
#     http://127.0.0.1:8000
#
# Para el navegador son orígenes diferentes.
# Sin CORS, el navegador bloquearía las peticiones.

ORIGENES_PERMITIDOS = [
    "http://localhost:4200",
    "http://127.0.0.1:4200",
]


app.add_middleware(
    CORSMiddleware,

    allow_origins=ORIGENES_PERMITIDOS,

    # Permite enviar Authorization: Bearer ...
    allow_credentials=True,

    # Angular puede utilizar GET, POST, PUT, DELETE, OPTIONS...
    allow_methods=["*"],

    # Permite Content-Type, Authorization, etc.
    allow_headers=["*"],
)


# ============================================================
# 4. REGISTRAR ROUTERS
# ============================================================

# Cada router contiene un área funcional independiente.
#
# Esto evita tener cientos de endpoints dentro de main.py.

app.include_router(
    auth.router
)

app.include_router(
    empresas.router
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
# 5. ENDPOINT RAÍZ
# ============================================================

@app.get(
    "/",
    tags=["Sistema"],
)
def raiz():
    """
    Endpoint básico para comprobar rápidamente que FastAPI
    está funcionando.
    """

    return {
        "aplicacion": "TalentIA",
        "version": "1.0.0",
        "backend": "FastAPI",
        "database": "PostgreSQL",
        "ia": (
            "TF-IDF + similitud coseno "
            "+ habilidades ponderadas"
        ),
        "status": "funcionando",
    }


# ============================================================
# 6. HEALTH CHECK
# ============================================================

@app.get(
    "/health",
    tags=["Sistema"],
)
def health_check():
    """
    Comprueba que el proceso de FastAPI está disponible.

    No realiza consulta a PostgreSQL.
    """

    return {
        "status": "ok",
        "service": "TalentIA API",
    }


# ============================================================
# 7. PRUEBA DE POSTGRESQL
# ============================================================

@app.get(
    "/database-test",
    tags=["Sistema"],
)
def database_test():
    """
    Comprueba una conexión real contra PostgreSQL.

    Ejecuta:

        SELECT 1

    Si PostgreSQL responde correctamente se devuelve:

        {
            "database": "PostgreSQL",
            "status": "conectado",
            "resultado": 1
        }
    """

    with engine.connect() as connection:

        resultado = connection.execute(
            text("SELECT 1")
        ).scalar()

    return {
        "database": "PostgreSQL",
        "status": "conectado",
        "resultado": resultado,
    }