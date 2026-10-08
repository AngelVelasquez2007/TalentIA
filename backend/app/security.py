"""Seguridad: hashing PBKDF2 y tokens JWT HS256 sin dependencias externas."""
import os, hashlib, hmac, base64, json, time, secrets
from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.database import get_db
from app import models

def hash_password(password):
    salt = secrets.token_bytes(16)
    digest = hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 260000)
    return 'pbkdf2_sha256$260000$'+salt.hex()+'$'+digest.hex()

def verify_password(password, stored):
    try:
        algorithm, count, salt, expected = stored.split('$')
        if algorithm != 'pbkdf2_sha256': return False
        actual = hashlib.pbkdf2_hmac('sha256', password.encode(), bytes.fromhex(salt), int(count))
        return hmac.compare_digest(actual, bytes.fromhex(expected))
    except (ValueError, TypeError): return False

def b64(data): return base64.urlsafe_b64encode(data).rstrip(b'=').decode()
def unb64(s): return base64.urlsafe_b64decode(s + '=' * (-len(s)%4))
def secret():
    value=os.getenv('JWT_SECRET','')
    if len(value)<32: raise RuntimeError('Configura JWT_SECRET de 32 caracteres o más en backend/.env')
    return value.encode()

def make_token(user_id):
    head=b64(json.dumps({'alg':'HS256','typ':'JWT'}).encode())
    body=b64(json.dumps({'sub':str(user_id),'exp':int(time.time())+8*3600}).encode())
    signature=b64(hmac.new(secret(), f'{head}.{body}'.encode(),hashlib.sha256).digest())
    return f'{head}.{body}.{signature}'

bearer=HTTPBearer(auto_error=False)
def current_user(credentials:HTTPAuthorizationCredentials|None=Depends(bearer),db:Session=Depends(get_db)):
    if not credentials: raise HTTPException(401,'Inicia sesión')
    try:
        h,p,s=credentials.credentials.split('.')
        if json.loads(unb64(h)).get('alg')!='HS256': raise ValueError()
        expected=b64(hmac.new(secret(),f'{h}.{p}'.encode(),hashlib.sha256).digest())
        if not hmac.compare_digest(s,expected): raise ValueError()
        data=json.loads(unb64(p))
        if int(data['exp'])<time.time(): raise ValueError()
        user=db.get(models.Usuario,int(data['sub']))
        if not user or not user.activo: raise ValueError()
        return user
    except (ValueError,KeyError,TypeError,OverflowError): raise HTTPException(401,'Token inválido o vencido')

def require_roles(*roles):
    def dependency(user=Depends(current_user)):
        if user.rol.nombre not in roles: raise HTTPException(403,'No tienes permisos para esta operación')
        return user
    return dependency
