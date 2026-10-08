"""Análisis transparente de compatibilidad, sin servicios externos."""
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.matching import score
from app.security import current_user
router=APIRouter(prefix='/analisis',tags=['Compatibilidad IA'])
class Entrada(BaseModel):
    vacante_id:int
    perfil:str=Field(min_length=20,max_length=10000)
@router.post('/compatibilidad')
def compatibilidad(data:Entrada,db:Session=Depends(get_db),user=Depends(current_user)):
    v=db.get(models.Vacante,data.vacante_id)
    if not v:raise HTTPException(404,'Vacante no encontrada')
    return score(data.perfil,v.requisitos)
