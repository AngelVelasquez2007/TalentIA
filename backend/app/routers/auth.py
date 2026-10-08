"""Registro de candidatos, login JWT y consulta del usuario autenticado."""
from fastapi import APIRouter,Depends,HTTPException
from pydantic import BaseModel,Field
from sqlalchemy.orm import Session
from app.database import get_db
from app import models
from app.security import hash_password,verify_password,make_token,current_user
router=APIRouter(prefix='/auth',tags=['Autenticación'])
class Registro(BaseModel):
    nombre:str=Field(min_length=2,max_length=100)
    apellido:str=Field(min_length=2,max_length=100)
    email:str=Field(min_length=5,max_length=150)
    password:str=Field(min_length=8,max_length=128)
class Login(BaseModel):
    email:str
    password:str

def dto(u): return {'id':u.id,'nombre':u.nombre,'apellido':u.apellido,'email':u.email,'rol':u.rol.nombre,'empresa_id':u.empresa_id}
@router.post('/registro',status_code=201)
def registro(data:Registro,db:Session=Depends(get_db)):
    email=data.email.strip().lower()
    if db.query(models.Usuario).filter(models.Usuario.email==email).first(): raise HTTPException(409,'Email ya registrado')
    rol=db.query(models.Role).filter_by(nombre='candidato').first()
    if not rol: raise HTTPException(500,'Ejecuta primero el script de inicialización de roles')
    u=models.Usuario(nombre=data.nombre,apellido=data.apellido,email=email,password_hash=hash_password(data.password),rol_id=rol.id)
    db.add(u);db.commit();db.refresh(u)
    return dto(u)
@router.post('/login')
def login(data:Login,db:Session=Depends(get_db)):
    u=db.query(models.Usuario).filter_by(email=data.email.strip().lower()).first()
    if not u or not verify_password(data.password,u.password_hash) or not u.activo: raise HTTPException(401,'Credenciales incorrectas')
    return {'access_token':make_token(u.id),'token_type':'bearer','usuario':dto(u)}
@router.get('/me')
def me(u=Depends(current_user)):return dto(u)
