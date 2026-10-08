"""Conexión a PostgreSQL mediante SQLAlchemy; una sesión por solicitud HTTP."""
import os
from pathlib import Path
from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base,sessionmaker
load_dotenv(Path(__file__).resolve().parents[1]/'.env')
DATABASE_URL=os.getenv('DATABASE_URL')
if not DATABASE_URL:raise RuntimeError('Falta DATABASE_URL en backend/.env (copia .env.example)')
engine=create_engine(DATABASE_URL,pool_pre_ping=True)
SessionLocal=sessionmaker(autocommit=False,autoflush=False,bind=engine)
Base=declarative_base()
def get_db():
    db=SessionLocal()
    try:yield db
    finally:db.close()
