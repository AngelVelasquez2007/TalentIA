from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.security import require_roles


router = APIRouter(
    prefix="/empresas",
    tags=["Empresas"]
)


@router.get("/", response_model=list[schemas.EmpresaRespuesta])
def listar_empresas(db: Session = Depends(get_db)):
    return db.query(models.Empresa).all()


@router.get("/{empresa_id}", response_model=schemas.EmpresaRespuesta)
def obtener_empresa(
    empresa_id: int,
    db: Session = Depends(get_db)
):
    empresa = (
        db.query(models.Empresa)
        .filter(models.Empresa.id == empresa_id)
        .first()
    )

    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa no encontrada"
        )

    return empresa


@router.post(
    "/",
    response_model=schemas.EmpresaRespuesta,
    status_code=status.HTTP_201_CREATED
)
def crear_empresa(
    datos: schemas.EmpresaCrear,
    db: Session = Depends(get_db),
    usuario = Depends(require_roles('administrador'))
):
    nueva_empresa = models.Empresa(
        nombre=datos.nombre,
        descripcion=datos.descripcion,
        ciudad=datos.ciudad,
        sitio_web=datos.sitio_web
    )

    db.add(nueva_empresa)
    db.commit()
    db.refresh(nueva_empresa)

    return nueva_empresa


@router.put("/{empresa_id}", response_model=schemas.EmpresaRespuesta)
def actualizar_empresa(
    empresa_id: int,
    datos: schemas.EmpresaActualizar,
    db: Session = Depends(get_db),
    usuario = Depends(require_roles("administrador"))
):
    empresa = (
        db.query(models.Empresa)
        .filter(models.Empresa.id == empresa_id)
        .first()
    )

    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa no encontrada"
        )

    cambios = datos.model_dump(exclude_unset=True)

    for campo, valor in cambios.items():
        setattr(empresa, campo, valor)

    db.commit()
    db.refresh(empresa)

    return empresa


@router.delete(
    "/{empresa_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def eliminar_empresa(
    empresa_id: int,
    db: Session = Depends(get_db),
    usuario = Depends(require_roles("administrador"))
):
    empresa = (
        db.query(models.Empresa)
        .filter(models.Empresa.id == empresa_id)
        .first()
    )

    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Empresa no encontrada"
        )

    db.delete(empresa)
    db.commit()

    return None