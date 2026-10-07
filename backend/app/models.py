from sqlalchemy import (
    Column,
    Integer,
    String,
    Text,
    Boolean,
    ForeignKey,
    DateTime,
    UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


class Role(Base):
    __tablename__ = "roles"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(50), unique=True, nullable=False)

    usuarios = relationship("Usuario", back_populates="rol")


class Empresa(Base):
    __tablename__ = "empresas"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(120), nullable=False)
    descripcion = Column(Text, nullable=True)
    ciudad = Column(String(100), nullable=True)
    sitio_web = Column(String(255), nullable=True)
    activa = Column(Boolean, default=True)
    creada_en = Column(DateTime(timezone=True), server_default=func.now())

    usuarios = relationship("Usuario", back_populates="empresa")
    vacantes = relationship("Vacante", back_populates="empresa")


class Usuario(Base):
    __tablename__ = "usuarios"

    id = Column(Integer, primary_key=True, index=True)
    nombre = Column(String(100), nullable=False)
    apellido = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)

    rol_id = Column(Integer, ForeignKey("roles.id"), nullable=False)
    empresa_id = Column(Integer, ForeignKey("empresas.id"), nullable=True)

    activo = Column(Boolean, default=True)
    creado_en = Column(DateTime(timezone=True), server_default=func.now())

    rol = relationship("Role", back_populates="usuarios")
    empresa = relationship("Empresa", back_populates="usuarios")

    postulaciones = relationship(
        "Postulacion",
        back_populates="candidato"
    )


class Vacante(Base):
    __tablename__ = "vacantes"

    id = Column(Integer, primary_key=True, index=True)

    titulo = Column(String(150), nullable=False)
    descripcion = Column(Text, nullable=False)
    requisitos = Column(Text, nullable=False)

    salario_min = Column(Integer, nullable=True)
    salario_max = Column(Integer, nullable=True)

    modalidad = Column(String(50), nullable=False)
    ubicacion = Column(String(120), nullable=True)

    estado = Column(String(30), default="activa")

    empresa_id = Column(
        Integer,
        ForeignKey("empresas.id"),
        nullable=False
    )

    creada_en = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    empresa = relationship(
        "Empresa",
        back_populates="vacantes"
    )

    postulaciones = relationship(
        "Postulacion",
        back_populates="vacante"
    )


class Postulacion(Base):
    __tablename__ = "postulaciones"

    id = Column(Integer, primary_key=True, index=True)

    candidato_id = Column(
        Integer,
        ForeignKey("usuarios.id"),
        nullable=False
    )

    vacante_id = Column(
        Integer,
        ForeignKey("vacantes.id"),
        nullable=False
    )

    estado = Column(String(30), default="pendiente")

    puntuacion_ia = Column(Integer, nullable=True)

    creada_en = Column(
        DateTime(timezone=True),
        server_default=func.now()
    )

    candidato = relationship(
        "Usuario",
        back_populates="postulaciones"
    )

    vacante = relationship(
        "Vacante",
        back_populates="postulaciones"
    )

    __table_args__ = (
        UniqueConstraint(
            "candidato_id",
            "vacante_id",
            name="uq_candidato_vacante"
        ),
    )