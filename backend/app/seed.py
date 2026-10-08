"""Inicializa roles y empresa de demostración; operación idempotente."""
from app.database import SessionLocal,Base,engine
from app import models
Base.metadata.create_all(bind=engine)
with SessionLocal() as db:
    for name in ('administrador','reclutador','candidato'):
        if not db.query(models.Role).filter_by(nombre=name).first():db.add(models.Role(nombre=name))
    db.commit()
    if not db.query(models.Empresa).first():
        e=models.Empresa(nombre='TechNova Demo',descripcion='Empresa de demostración',ciudad='Bucaramanga')
        db.add(e);db.commit();db.refresh(e)
        db.add(models.Vacante(titulo='Desarrollador Angular',descripcion='Construcción de aplicaciones web con APIs y bases de datos.',requisitos='Angular TypeScript HTML CSS REST PostgreSQL',modalidad='hibrido',ubicacion='Bucaramanga',empresa_id=e.id))
        db.commit()
print('Roles y datos de demostración listos')
