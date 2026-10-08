"""
============================================================
TalentIA - Modelos de base de datos
Archivo: app/models.py
============================================================

Este módulo define el modelo relacional de TalentIA utilizando
SQLAlchemy ORM.

ENTIDADES PRINCIPALES:

    Role
      |
      | 1:N
      v
    Usuario ---------------- Empresa
      |                         |
      |                         | 1:N
      |                         v
      |                      Vacante
      |                         |
      |                         |
      +------ Postulacion ------+
                  |
                  v
            Resultado IA


Además se normalizan las habilidades mediante:

    Usuario ---- UsuarioHabilidad ---- Habilidad

    Vacante ---- VacanteHabilidad ---- Habilidad


Esto evita guardar todas las habilidades en una sola cadena
de texto y permite realizar búsquedas, filtros y análisis de
compatibilidad de manera estructurada.
============================================================
"""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    String,
    Text,
    UniqueConstraint,
)

from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from app.database import Base


# ============================================================
# 1. ROLES
# ============================================================

class Role(Base):
    """
    Representa los roles disponibles en TalentIA.

    Roles principales:

    - administrador
    - reclutador
    - candidato

    El rol determina qué operaciones puede realizar cada
    usuario dentro de la plataforma.
    """

    __tablename__ = "roles"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    nombre = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    descripcion = Column(
        String(255),
        nullable=True,
    )

    # Relación:
    # Un rol puede pertenecer a muchos usuarios.
    usuarios = relationship(
        "Usuario",
        back_populates="rol",
    )


# ============================================================
# 2. EMPRESAS
# ============================================================

class Empresa(Base):
    """
    Representa una organización que publica vacantes.

    Una empresa puede tener:

    - varios reclutadores;
    - varias vacantes;
    - información corporativa.
    """

    __tablename__ = "empresas"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    nombre = Column(
        String(150),
        nullable=False,
        index=True,
    )

    # NIT opcional para fines académicos/demostrativos.
    nit = Column(
        String(50),
        unique=True,
        nullable=True,
    )

    descripcion = Column(
        Text,
        nullable=True,
    )

    sector = Column(
        String(100),
        nullable=True,
    )

    ciudad = Column(
        String(100),
        nullable=True,
    )

    pais = Column(
        String(100),
        nullable=True,
        default="Colombia",
    )

    sitio_web = Column(
        String(255),
        nullable=True,
    )

    activa = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    creada_en = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    actualizada_en = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # --------------------------------------------------------
    # RELACIONES
    # --------------------------------------------------------

    # Una empresa puede tener varios usuarios/reclutadores.
    usuarios = relationship(
        "Usuario",
        back_populates="empresa",
    )

    # Una empresa puede publicar muchas vacantes.
    vacantes = relationship(
        "Vacante",
        back_populates="empresa",
        cascade="all, delete-orphan",
    )


# ============================================================
# 3. USUARIOS
# ============================================================

class Usuario(Base):
    """
    Representa cualquier persona que utiliza TalentIA.

    Puede ser:

    - candidato;
    - reclutador;
    - administrador.

    Los candidatos pueden almacenar información profesional
    que posteriormente será utilizada por el motor de IA.
    """

    __tablename__ = "usuarios"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    nombre = Column(
        String(100),
        nullable=False,
    )

    apellido = Column(
        String(100),
        nullable=False,
    )

    email = Column(
        String(150),
        unique=True,
        nullable=False,
        index=True,
    )

    # Nunca almacenamos la contraseña original.
    # Se almacena únicamente su hash.
    password_hash = Column(
        String(255),
        nullable=False,
    )

    telefono = Column(
        String(30),
        nullable=True,
    )

    ciudad = Column(
        String(100),
        nullable=True,
    )

    # Texto libre que describe experiencia, conocimientos
    # y perfil profesional del candidato.
    #
    # Ejemplo:
    #
    # "Desarrollador frontend con experiencia en Angular,
    # TypeScript, REST y PostgreSQL..."
    #
    # Este campo será una entrada importante del motor IA.
    perfil_profesional = Column(
        Text,
        nullable=True,
    )

    experiencia_anios = Column(
        Float,
        nullable=False,
        default=0,
    )

    # --------------------------------------------------------
    # CLAVES FORÁNEAS
    # --------------------------------------------------------

    rol_id = Column(
        Integer,
        ForeignKey("roles.id"),
        nullable=False,
        index=True,
    )

    # Solo es obligatorio para usuarios vinculados a una
    # empresa, por ejemplo reclutadores.
    #
    # Un candidato normalmente tendrá empresa_id = NULL.
    empresa_id = Column(
        Integer,
        ForeignKey("empresas.id"),
        nullable=True,
        index=True,
    )

    activo = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    creado_en = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    actualizado_en = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # --------------------------------------------------------
    # RELACIONES
    # --------------------------------------------------------

    rol = relationship(
        "Role",
        back_populates="usuarios",
    )

    empresa = relationship(
        "Empresa",
        back_populates="usuarios",
    )

    postulaciones = relationship(
        "Postulacion",
        back_populates="candidato",
        cascade="all, delete-orphan",
        foreign_keys="Postulacion.candidato_id",
    )

    # Vacantes creadas por este usuario.
    #
    # Normalmente será un reclutador o administrador.
    vacantes_creadas = relationship(
        "Vacante",
        back_populates="creador",
        foreign_keys="Vacante.creada_por_id",
    )

    # Habilidades estructuradas del candidato.
    habilidades = relationship(
        "UsuarioHabilidad",
        back_populates="usuario",
        cascade="all, delete-orphan",
    )

    # --------------------------------------------------------
    # REGLAS DE INTEGRIDAD
    # --------------------------------------------------------

    __table_args__ = (
        CheckConstraint(
            "experiencia_anios >= 0",
            name="ck_usuario_experiencia_positiva",
        ),
    )


# ============================================================
# 4. HABILIDADES
# ============================================================

class Habilidad(Base):
    """
    Catálogo normalizado de habilidades.

    Ejemplos:

    - Angular
    - TypeScript
    - Python
    - FastAPI
    - PostgreSQL
    - Docker
    - Git
    - Machine Learning

    Usar una tabla independiente evita duplicar información
    y mejora la normalización de la base de datos.
    """

    __tablename__ = "habilidades"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    nombre = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True,
    )

    categoria = Column(
        String(100),
        nullable=True,
    )

    activa = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    usuarios = relationship(
        "UsuarioHabilidad",
        back_populates="habilidad",
        cascade="all, delete-orphan",
    )

    vacantes = relationship(
        "VacanteHabilidad",
        back_populates="habilidad",
        cascade="all, delete-orphan",
    )


# ============================================================
# 5. HABILIDADES DEL USUARIO
# ============================================================

class UsuarioHabilidad(Base):
    """
    Tabla intermedia entre Usuario y Habilidad.

    Resuelve una relación muchos-a-muchos:

        Usuario N:M Habilidad

    Además permite guardar información adicional como:

    - nivel;
    - años de experiencia.
    """

    __tablename__ = "usuario_habilidades"

    usuario_id = Column(
        Integer,
        ForeignKey("usuarios.id"),
        primary_key=True,
    )

    habilidad_id = Column(
        Integer,
        ForeignKey("habilidades.id"),
        primary_key=True,
    )

    nivel = Column(
        String(30),
        nullable=False,
        default="intermedio",
    )

    experiencia_anios = Column(
        Float,
        nullable=False,
        default=0,
    )

    usuario = relationship(
        "Usuario",
        back_populates="habilidades",
    )

    habilidad = relationship(
        "Habilidad",
        back_populates="usuarios",
    )

    __table_args__ = (
        CheckConstraint(
            """
            nivel IN (
                'basico',
                'intermedio',
                'avanzado',
                'experto'
            )
            """,
            name="ck_usuario_habilidad_nivel",
        ),
        CheckConstraint(
            "experiencia_anios >= 0",
            name="ck_usuario_habilidad_experiencia",
        ),
    )


# ============================================================
# 6. VACANTES
# ============================================================

class Vacante(Base):
    """
    Representa una oferta laboral publicada por una empresa.

    Contiene la información necesaria para:

    - mostrar ofertas al candidato;
    - filtrar vacantes;
    - recibir postulaciones;
    - calcular compatibilidad mediante IA.
    """

    __tablename__ = "vacantes"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    titulo = Column(
        String(150),
        nullable=False,
        index=True,
    )

    descripcion = Column(
        Text,
        nullable=False,
    )

    # Texto utilizado por el motor NLP.
    requisitos = Column(
        Text,
        nullable=False,
    )

    responsabilidades = Column(
        Text,
        nullable=True,
    )

    salario_min = Column(
        Integer,
        nullable=True,
    )

    salario_max = Column(
        Integer,
        nullable=True,
    )

    modalidad = Column(
        String(30),
        nullable=False,
        default="hibrido",
        index=True,
    )

    tipo_contrato = Column(
        String(50),
        nullable=False,
        default="tiempo_completo",
    )

    ubicacion = Column(
        String(120),
        nullable=True,
        index=True,
    )

    experiencia_minima = Column(
        Float,
        nullable=False,
        default=0,
    )

    # Estados permitidos:
    #
    # borrador
    # activa
    # pausada
    # cerrada
    estado = Column(
        String(30),
        nullable=False,
        default="activa",
        index=True,
    )

    # --------------------------------------------------------
    # CLAVES FORÁNEAS
    # --------------------------------------------------------

    empresa_id = Column(
        Integer,
        ForeignKey("empresas.id"),
        nullable=False,
        index=True,
    )

    # Usuario reclutador/administrador que creó la oferta.
    #
    # Puede ser NULL para permitir los datos de demostración
    # creados automáticamente por seed.py.
    creada_por_id = Column(
        Integer,
        ForeignKey("usuarios.id"),
        nullable=True,
        index=True,
    )

    creada_en = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    actualizada_en = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    fecha_cierre = Column(
        DateTime(timezone=True),
        nullable=True,
    )

    # --------------------------------------------------------
    # RELACIONES
    # --------------------------------------------------------

    empresa = relationship(
        "Empresa",
        back_populates="vacantes",
    )

    creador = relationship(
        "Usuario",
        back_populates="vacantes_creadas",
        foreign_keys=[creada_por_id],
    )

    postulaciones = relationship(
        "Postulacion",
        back_populates="vacante",
        cascade="all, delete-orphan",
    )

    habilidades = relationship(
        "VacanteHabilidad",
        back_populates="vacante",
        cascade="all, delete-orphan",
    )

    # --------------------------------------------------------
    # REGLAS DE BASE DE DATOS
    # --------------------------------------------------------

    __table_args__ = (
        CheckConstraint(
            "salario_min IS NULL OR salario_min >= 0",
            name="ck_vacante_salario_min",
        ),
        CheckConstraint(
            "salario_max IS NULL OR salario_max >= 0",
            name="ck_vacante_salario_max",
        ),
        CheckConstraint(
            """
            salario_min IS NULL
            OR salario_max IS NULL
            OR salario_min <= salario_max
            """,
            name="ck_vacante_rango_salario",
        ),
        CheckConstraint(
            "experiencia_minima >= 0",
            name="ck_vacante_experiencia",
        ),
        CheckConstraint(
            """
            modalidad IN (
                'remoto',
                'presencial',
                'hibrido'
            )
            """,
            name="ck_vacante_modalidad",
        ),
        CheckConstraint(
            """
            estado IN (
                'borrador',
                'activa',
                'pausada',
                'cerrada'
            )
            """,
            name="ck_vacante_estado",
        ),

        # Índice compuesto útil para filtros del frontend.
        Index(
            "ix_vacantes_estado_modalidad",
            "estado",
            "modalidad",
        ),
    )


# ============================================================
# 7. HABILIDADES REQUERIDAS POR UNA VACANTE
# ============================================================

class VacanteHabilidad(Base):
    """
    Tabla intermedia entre Vacante y Habilidad.

    Permite indicar:

    - qué habilidad requiere una vacante;
    - si es obligatoria;
    - su importancia relativa.

    El campo peso será utilizado por el motor de análisis para
    dar mayor relevancia a determinadas competencias.
    """

    __tablename__ = "vacante_habilidades"

    vacante_id = Column(
        Integer,
        ForeignKey("vacantes.id"),
        primary_key=True,
    )

    habilidad_id = Column(
        Integer,
        ForeignKey("habilidades.id"),
        primary_key=True,
    )

    obligatoria = Column(
        Boolean,
        nullable=False,
        default=True,
    )

    # Importancia de 1 a 5.
    peso = Column(
        Integer,
        nullable=False,
        default=3,
    )

    vacante = relationship(
        "Vacante",
        back_populates="habilidades",
    )

    habilidad = relationship(
        "Habilidad",
        back_populates="vacantes",
    )

    __table_args__ = (
        CheckConstraint(
            "peso >= 1 AND peso <= 5",
            name="ck_vacante_habilidad_peso",
        ),
    )


# ============================================================
# 8. POSTULACIONES
# ============================================================

class Postulacion(Base):
    """
    Relaciona un candidato con una vacante.

    Una postulación también almacena los resultados generados
    por el motor de IA.

    Esto permite que el reclutador vea posteriormente:

    - porcentaje de compatibilidad;
    - similitud de texto;
    - coincidencia de habilidades;
    - habilidades encontradas;
    - habilidades faltantes;
    - explicación del análisis.
    """

    __tablename__ = "postulaciones"

    id = Column(
        Integer,
        primary_key=True,
        index=True,
    )

    candidato_id = Column(
        Integer,
        ForeignKey("usuarios.id"),
        nullable=False,
        index=True,
    )

    vacante_id = Column(
        Integer,
        ForeignKey("vacantes.id"),
        nullable=False,
        index=True,
    )

    # Estados:
    #
    # pendiente
    # revision
    # entrevista
    # seleccionado
    # rechazado
    estado = Column(
        String(30),
        nullable=False,
        default="pendiente",
        index=True,
    )

    # ========================================================
    # RESULTADOS DEL MOTOR IA
    # ========================================================

    # Resultado final de 0 a 100.
    puntuacion_ia = Column(
        Float,
        nullable=True,
    )

    # Componente calculado con TF-IDF + similitud coseno.
    similitud_texto = Column(
        Float,
        nullable=True,
    )

    # Porcentaje basado en habilidades estructuradas.
    coincidencia_habilidades = Column(
        Float,
        nullable=True,
    )

    # Guardamos qué perfil fue utilizado en el análisis.
    #
    # Esto permite reproducir el resultado incluso si el
    # candidato cambia posteriormente su perfil.
    perfil_analizado = Column(
        Text,
        nullable=True,
    )

    # PostgreSQL puede almacenar directamente arreglos JSON.
    #
    # Ejemplo:
    #
    # ["Angular", "TypeScript", "REST"]
    habilidades_coincidentes = Column(
        JSON,
        nullable=True,
    )

    # Ejemplo:
    #
    # ["Docker", "AWS"]
    habilidades_faltantes = Column(
        JSON,
        nullable=True,
    )

    # Texto explicativo generado por nuestro motor.
    #
    # No pretende reemplazar una decisión humana.
    explicacion_ia = Column(
        Text,
        nullable=True,
    )

    creada_en = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        nullable=False,
    )

    actualizada_en = Column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )

    # --------------------------------------------------------
    # RELACIONES
    # --------------------------------------------------------

    candidato = relationship(
        "Usuario",
        back_populates="postulaciones",
        foreign_keys=[candidato_id],
    )

    vacante = relationship(
        "Vacante",
        back_populates="postulaciones",
    )

    # --------------------------------------------------------
    # REGLAS DE NEGOCIO A NIVEL DE BD
    # --------------------------------------------------------

    __table_args__ = (
        # Un candidato NO puede postularse dos veces
        # a la misma vacante.
        UniqueConstraint(
            "candidato_id",
            "vacante_id",
            name="uq_candidato_vacante",
        ),

        CheckConstraint(
            """
            estado IN (
                'pendiente',
                'revision',
                'entrevista',
                'seleccionado',
                'rechazado'
            )
            """,
            name="ck_postulacion_estado",
        ),

        CheckConstraint(
            """
            puntuacion_ia IS NULL
            OR (
                puntuacion_ia >= 0
                AND puntuacion_ia <= 100
            )
            """,
            name="ck_postulacion_puntuacion",
        ),

        CheckConstraint(
            """
            similitud_texto IS NULL
            OR (
                similitud_texto >= 0
                AND similitud_texto <= 100
            )
            """,
            name="ck_postulacion_similitud",
        ),

        CheckConstraint(
            """
            coincidencia_habilidades IS NULL
            OR (
                coincidencia_habilidades >= 0
                AND coincidencia_habilidades <= 100
            )
            """,
            name="ck_postulacion_habilidades",
        ),

        # Facilita el ranking de candidatos por vacante.
        Index(
            "ix_postulacion_vacante_puntuacion",
            "vacante_id",
            "puntuacion_ia",
        ),
    )