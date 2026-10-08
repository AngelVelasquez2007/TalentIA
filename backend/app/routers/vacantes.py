from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app import models, schemas
from app.security import require_roles


router = APIRouter(
    prefix="/vacantes",
    tags=["Vacantes"]
)


@router.get("/", response_model=list[schemas.VacanteRespuesta])
def listar_vacantes(db: Session = Depends(get_db)):
    return db.query(models.Vacante).all()


@router.get("/{vacante_id}", response_model=schemas.VacanteRespuesta)
def obtener_vacante(
    vacante_id: int,
    db: Session = Depends(get_db)
):
    vacante = (
        db.query(models.Vacante)
        .filter(models.Vacante.id == vacante_id)
        .first()
    )

    if not vacante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada"
        )

    return vacante


@router.post(
    "/",
    response_model=schemas.VacanteRespuesta,
    status_code=status.HTTP_201_CREATED
)
def crear_vacante(
    datos: schemas.VacanteCrear,
    db: Session = Depends(get_db),
    usuario = Depends(require_roles("administrador", "reclutador"))
):
    empresa = (
        db.query(models.Empresa)
        .filter(models.Empresa.id == datos.empresa_id)
        .first()
    )

    if not empresa:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="La empresa no existe"
        )

    if usuario.rol.nombre == "reclutador" and usuario.empresa_id != datos.empresa_id:
        raise HTTPException(403, "Solo puedes publicar para tu empresa")

    nueva_vacante = models.Vacante(
        titulo=datos.titulo,
        descripcion=datos.descripcion,
        requisitos=datos.requisitos,
        salario_min=datos.salario_min,
        salario_max=datos.salario_max,
        modalidad=datos.modalidad,
        ubicacion=datos.ubicacion,
        empresa_id=datos.empresa_id
    )

    db.add(nueva_vacante)
    db.commit()
    db.refresh(nueva_vacante)

    return nueva_vacante


@router.put(
    "/{vacante_id}",
    response_model=schemas.VacanteRespuesta
)
def actualizar_vacante(
    vacante_id: int,
    datos: schemas.VacanteActualizar,
    db: Session = Depends(get_db),
    usuario = Depends(require_roles("administrador", "reclutador"))
):
    vacante = (
        db.query(models.Vacante)
        .filter(models.Vacante.id == vacante_id)
        .first()
    )

    if not vacante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada"
        )

    if usuario.rol.nombre == "reclutador" and usuario.empresa_id != vacante.empresa_id:
        raise HTTPException(403, "Solo puedes modificar vacantes de tu empresa")

    cambios = datos.model_dump(exclude_unset=True)

    if "empresa_id" in cambios:
        empresa = (
            db.query(models.Empresa)
            .filter(
                models.Empresa.id == cambios["empresa_id"]
            )
            .first()
        )

        if not empresa:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="La empresa no existe"
            )

    if usuario.rol.nombre == "reclutador" and "empresa_id" in cambios and cambios["empresa_id"] != usuario.empresa_id:
        raise HTTPException(403, "No puedes transferir vacantes a otra empresa")

    salario_min = cambios.get(
        "salario_min",
        vacante.salario_min
    )

    salario_max = cambios.get(
        "salario_max",
        vacante.salario_max
    )

    if (
        salario_min is not None
        and salario_max is not None
        and salario_min > salario_max
    ):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "El salario mínimo no puede ser "
                "mayor al salario máximo"
            )
        )

    for campo, valor in cambios.items():
        setattr(vacante, campo, valor)

    db.commit()
    db.refresh(vacante)

    return vacante


@router.delete(
    "/{vacante_id}",
    status_code=status.HTTP_204_NO_CONTENT
)
def eliminar_vacante(
    vacante_id: int,
    db: Session = Depends(get_db),
    usuario = Depends(require_roles("administrador", "reclutador"))
):
    vacante = (
        db.query(models.Vacante)
        .filter(models.Vacante.id == vacante_id)
        .first()
    )

    if not vacante:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Vacante no encontrada"
        )

    if usuario.rol.nombre == "reclutador" and usuario.empresa_id != vacante.empresa_id:
        raise HTTPException(403, "Solo puedes modificar vacantes de tu empresa")

    db.delete(vacante)
    db.commit()

    return None