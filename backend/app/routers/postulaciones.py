"""Postulaciones con autorización, no duplicados y evaluación orientativa."""
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.security import current_user,require_roles
from app.matching import score
router=APIRouter(prefix='/postulaciones',tags=['Postulaciones'])
class Crear(BaseModel):
    vacante_id:int
    perfil:str=Field(min_length=20,max_length=10000)
class Estado(BaseModel):
    estado:str

def dto(p):return {'id':p.id,'vacante_id':p.vacante_id,'candidato_id':p.candidato_id,'estado':p.estado,'puntuacion_ia':p.puntuacion_ia,'vacante':p.vacante.titulo}
@router.post('/',status_code=201)
def crear(data:Crear,db:Session=Depends(get_db),u=Depends(require_roles('candidato'))):
    v=db.get(models.Vacante,data.vacante_id)
    if not v or v.estado!='activa':raise HTTPException(404,'Vacante no disponible')
    if db.query(models.Postulacion).filter_by(vacante_id=v.id,candidato_id=u.id).first():raise HTTPException(409,'Ya te postulaste a esta vacante')
    result=score(data.perfil,v.requisitos)
    p=models.Postulacion(vacante_id=v.id,candidato_id=u.id,puntuacion_ia=result['puntuacion'])
    db.add(p);db.commit();db.refresh(p)
    return {**dto(p),'analisis':result}
@router.get('/')
def listar(db:Session=Depends(get_db),u=Depends(current_user)):
    query=db.query(models.Postulacion)
    if u.rol.nombre=='candidato':query=query.filter_by(candidato_id=u.id)
    elif u.rol.nombre=='reclutador':query=query.join(models.Vacante).filter(models.Vacante.empresa_id==u.empresa_id)
    return [dto(p) for p in query.all()]
@router.patch('/{id}/estado')
def estado(id:int,data:Estado,db:Session=Depends(get_db),u=Depends(require_roles('administrador','reclutador'))):
    if data.estado not in ('pendiente','revision','entrevista','aceptada','rechazada'):raise HTTPException(422,'Estado inválido')
    p=db.get(models.Postulacion,id)
    if not p:raise HTTPException(404,'Postulación no encontrada')
    if u.rol.nombre=='reclutador' and p.vacante.empresa_id!=u.empresa_id:raise HTTPException(403,'Postulación de otra empresa')
    p.estado=data.estado;db.commit();db.refresh(p)
    return dto(p)
