from fastapi import FastAPI
from sqlalchemy import text

from app.database import engine, Base
from app import models
from app.routers import empresas


Base.metadata.create_all(bind=engine)


app = FastAPI(
    title="TalentIA API",
    description="API REST para la plataforma de reclutamiento con IA",
    version="1.0.0"
)


app.include_router(empresas.router)


@app.get("/")
def home():
    return {
        "message": "TalentIA API funcionando"
    }


@app.get("/database-test")
def database_test():
    try:
        with engine.connect() as connection:
            connection.execute(text("SELECT 1"))

        return {
            "database": "PostgreSQL",
            "status": "conectado"
        }

    except Exception as error:
        return {
            "database": "PostgreSQL",
            "status": "error",
            "detail": str(error)
        }