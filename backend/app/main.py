"""Punto de entrada FastAPI: rutas, CORS y comprobación de salud."""
from fastapi import FastAPI,HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text
from app.database import engine,Base
from app import models
from app.routers import empresas,vacantes,auth,postulaciones,analisis
Base.metadata.create_all(bind=engine)
app=FastAPI(title='TalentIA API',version='1.0.0',description='Reclutamiento y compatibilidad orientativa')
app.add_middleware(CORSMiddleware,allow_origins=['http://localhost:4200','http://127.0.0.1:4200'],allow_credentials=True,allow_methods=['*'],allow_headers=['*'])
for router in (empresas.router,vacantes.router,auth.router,postulaciones.router,analisis.router):app.include_router(router)
@app.get('/')
def home():return {'message':'TalentIA API funcionando'}
@app.get('/database-test')
def database_test():
    try:
        with engine.connect() as conn:conn.execute(text('SELECT 1'))
        return {'database':'PostgreSQL','status':'conectado'}
    except Exception:raise HTTPException(503,'Base de datos no disponible')
