"""
============================================================
TalentIA - Datos iniciales y demostración
Archivo: app/seed.py
============================================================

Este script prepara PostgreSQL con información suficiente
para demostrar TalentIA durante la sustentación.

CREA:

- 3 roles.
- 3 empresas.
- catálogo de habilidades.
- 1 administrador.
- 2 reclutadores.
- 3 candidatos.
- perfiles profesionales.
- habilidades de candidatos.
- 10 vacantes.
- habilidades ponderadas para cada vacante.

MODOS DE EJECUCIÓN:

1. Modo normal:

    python -m app.seed

   Conserva las tablas actuales e intenta completar los
   datos faltantes.

2. Reinicio completo:

    python -m app.seed --reset

   ELIMINA todas las tablas de TalentIA y las crea nuevamente.

   Debe utilizarse cuando cambió el modelo de base de datos,
   como ocurre durante esta actualización del proyecto.

IMPORTANTE:
--reset elimina los datos almacenados en las tablas.
============================================================
"""

import argparse

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import (
    Base,
    SessionLocal,
    engine,
)

from app import models

from app.security import hash_password


# ============================================================
# 1. CONTRASEÑA DE DEMOSTRACIÓN
# ============================================================

# Estas credenciales existen exclusivamente para la demo local.
#
# En un entorno de producción:
#
# - no se deberían incluir contraseñas conocidas;
# - los usuarios deberían crear sus propias claves;
# - se usaría un flujo de recuperación de contraseña.
DEMO_PASSWORD = "TalentIA123"


# ============================================================
# 2. CREAR ROLES
# ============================================================

def crear_roles(
    db: Session,
) -> dict[str, models.Role]:
    """
    Crea los tres roles principales de TalentIA.

    Devuelve un diccionario:

        {
            "administrador": Role(...),
            "reclutador": Role(...),
            "candidato": Role(...)
        }
    """

    configuracion = {
        "administrador": (
            "Acceso completo a la plataforma."
        ),
        "reclutador": (
            "Gestiona vacantes y candidatos "
            "de su empresa."
        ),
        "candidato": (
            "Consulta vacantes y realiza postulaciones."
        ),
    }

    resultado: dict[str, models.Role] = {}

    for nombre, descripcion in configuracion.items():

        rol = db.execute(
            select(models.Role).where(
                models.Role.nombre == nombre
            )
        ).scalars().first()

        if rol is None:
            rol = models.Role(
                nombre=nombre,
                descripcion=descripcion,
            )

            db.add(rol)
            db.flush()

        resultado[nombre] = rol

    return resultado


# ============================================================
# 3. CREAR EMPRESAS
# ============================================================

def crear_empresas(
    db: Session,
) -> dict[str, models.Empresa]:
    """
    Crea empresas de demostración.

    Se utilizan empresas ficticias para evitar presentar
    información real como si perteneciera a terceros.
    """

    datos_empresas = [
        {
            "nombre": "TechNova Solutions",
            "nit": "900111222-1",
            "descripcion": (
                "Empresa de desarrollo de software "
                "empresarial y soluciones web."
            ),
            "sector": "Tecnología",
            "ciudad": "Bucaramanga",
            "pais": "Colombia",
            "sitio_web": "https://example.com/technova",
        },
        {
            "nombre": "DataSphere Analytics",
            "nit": "900333444-2",
            "descripcion": (
                "Empresa especializada en analítica "
                "de datos, inteligencia artificial "
                "y automatización."
            ),
            "sector": "Analítica de datos",
            "ciudad": "Bogotá",
            "pais": "Colombia",
            "sitio_web": "https://example.com/datasphere",
        },
        {
            "nombre": "CloudBridge Labs",
            "nit": "900555666-3",
            "descripcion": (
                "Compañía dedicada a infraestructura "
                "cloud, DevOps y plataformas digitales."
            ),
            "sector": "Cloud y DevOps",
            "ciudad": "Medellín",
            "pais": "Colombia",
            "sitio_web": "https://example.com/cloudbridge",
        },
    ]

    resultado: dict[str, models.Empresa] = {}

    for datos in datos_empresas:

        empresa = db.execute(
            select(models.Empresa).where(
                models.Empresa.nit
                == datos["nit"]
            )
        ).scalars().first()

        if empresa is None:
            empresa = models.Empresa(
                **datos,
                activa=True,
            )

            db.add(empresa)
            db.flush()

        resultado[empresa.nombre] = empresa

    return resultado


# ============================================================
# 4. CREAR CATÁLOGO DE HABILIDADES
# ============================================================

def crear_habilidades(
    db: Session,
) -> dict[str, models.Habilidad]:
    """
    Crea un catálogo amplio de competencias para perfiles
    y vacantes.
    """

    datos = [
        ("Angular", "Frontend"),
        ("TypeScript", "Frontend"),
        ("JavaScript", "Frontend"),
        ("HTML", "Frontend"),
        ("CSS", "Frontend"),
        ("React", "Frontend"),
        ("Vue", "Frontend"),

        ("Python", "Backend"),
        ("FastAPI", "Backend"),
        ("Django", "Backend"),
        ("Java", "Backend"),
        ("Spring Boot", "Backend"),
        ("Node.js", "Backend"),
        ("C#", "Backend"),
        (".NET", "Backend"),

        ("REST", "Arquitectura"),
        ("SQL", "Base de datos"),
        ("PostgreSQL", "Base de datos"),
        ("MySQL", "Base de datos"),

        ("Git", "Herramientas"),
        ("GitHub", "Herramientas"),

        ("Docker", "DevOps"),
        ("Kubernetes", "DevOps"),
        ("AWS", "Cloud"),
        ("Azure", "Cloud"),
        ("Linux", "Sistemas"),

        ("Machine Learning", "IA"),
        ("Scikit-learn", "IA"),
        ("Pandas", "Datos"),
        ("NumPy", "Datos"),

        ("Scrum", "Metodología"),
        ("Figma", "Diseño"),
    ]

    resultado: dict[str, models.Habilidad] = {}

    for nombre, categoria in datos:

        habilidad = db.execute(
            select(models.Habilidad).where(
                models.Habilidad.nombre == nombre
            )
        ).scalars().first()

        if habilidad is None:
            habilidad = models.Habilidad(
                nombre=nombre,
                categoria=categoria,
                activa=True,
            )

            db.add(habilidad)
            db.flush()

        resultado[nombre] = habilidad

    return resultado


# ============================================================
# 5. CREAR USUARIO
# ============================================================

def obtener_o_crear_usuario(
    db: Session,
    *,
    nombre: str,
    apellido: str,
    email: str,
    rol: models.Role,
    empresa: models.Empresa | None = None,
    ciudad: str | None = None,
    perfil_profesional: str | None = None,
    experiencia_anios: float = 0,
) -> models.Usuario:
    """
    Evita duplicar usuarios cuando seed.py se ejecuta
    más de una vez.
    """

    usuario = db.execute(
        select(models.Usuario).where(
            models.Usuario.email == email.lower()
        )
    ).scalars().first()

    if usuario:
        return usuario

    usuario = models.Usuario(
        nombre=nombre,
        apellido=apellido,
        email=email.lower(),

        password_hash=hash_password(
            DEMO_PASSWORD
        ),

        ciudad=ciudad,

        perfil_profesional=(
            perfil_profesional
        ),

        experiencia_anios=(
            experiencia_anios
        ),

        rol_id=rol.id,

        empresa_id=(
            empresa.id
            if empresa
            else None
        ),

        activo=True,
    )

    db.add(usuario)
    db.flush()

    return usuario


# ============================================================
# 6. CREAR USUARIOS DE DEMOSTRACIÓN
# ============================================================

def crear_usuarios(
    db: Session,
    roles: dict[str, models.Role],
    empresas: dict[str, models.Empresa],
) -> dict[str, models.Usuario]:
    """
    Crea usuarios suficientes para demostrar los tres roles.
    """

    usuarios: dict[str, models.Usuario] = {}

    # --------------------------------------------------------
    # ADMINISTRADOR
    # --------------------------------------------------------

    usuarios["admin"] = obtener_o_crear_usuario(
        db,
        nombre="Administrador",
        apellido="TalentIA",
        email="admin@talentia.local",
        rol=roles["administrador"],
        ciudad="Bucaramanga",
    )

    # --------------------------------------------------------
    # RECLUTADORES
    # --------------------------------------------------------

    usuarios["reclutador_technova"] = (
        obtener_o_crear_usuario(
            db,
            nombre="Laura",
            apellido="Ramírez",
            email="reclutador@technova.local",
            rol=roles["reclutador"],
            empresa=empresas[
                "TechNova Solutions"
            ],
            ciudad="Bucaramanga",
        )
    )

    usuarios["reclutador_data"] = (
        obtener_o_crear_usuario(
            db,
            nombre="Carlos",
            apellido="Mendoza",
            email="reclutador@datasphere.local",
            rol=roles["reclutador"],
            empresa=empresas[
                "DataSphere Analytics"
            ],
            ciudad="Bogotá",
        )
    )

    # --------------------------------------------------------
    # CANDIDATOS
    # --------------------------------------------------------

    usuarios["candidato_frontend"] = (
        obtener_o_crear_usuario(
            db,
            nombre="Ana",
            apellido="Torres",
            email="ana@talentia.local",
            rol=roles["candidato"],
            ciudad="Bucaramanga",
            experiencia_anios=2,
            perfil_profesional=(
                "Desarrolladora frontend con dos años "
                "de experiencia creando aplicaciones web "
                "con Angular, TypeScript, JavaScript, HTML "
                "y CSS. Tengo experiencia consumiendo APIs "
                "REST, utilizando Git, GitHub y PostgreSQL. "
                "He trabajado con metodologías Scrum."
            ),
        )
    )

    usuarios["candidato_backend"] = (
        obtener_o_crear_usuario(
            db,
            nombre="Juan",
            apellido="Pérez",
            email="juan@talentia.local",
            rol=roles["candidato"],
            ciudad="Medellín",
            experiencia_anios=3,
            perfil_profesional=(
                "Desarrollador backend especializado en "
                "Python y FastAPI. Experiencia diseñando "
                "APIs REST, trabajando con PostgreSQL, SQL, "
                "Docker, Git y Linux. Conocimientos básicos "
                "de AWS y arquitectura de servicios."
            ),
        )
    )

    usuarios["candidato_datos"] = (
        obtener_o_crear_usuario(
            db,
            nombre="Sofía",
            apellido="Gómez",
            email="sofia@talentia.local",
            rol=roles["candidato"],
            ciudad="Bogotá",
            experiencia_anios=2.5,
            perfil_profesional=(
                "Analista de datos con experiencia en "
                "Python, SQL, PostgreSQL, Pandas y NumPy. "
                "He desarrollado modelos básicos de Machine "
                "Learning utilizando Scikit-learn y realizado "
                "análisis exploratorio de datos."
            ),
        )
    )

    return usuarios


# ============================================================
# 7. ASIGNAR HABILIDAD A USUARIO
# ============================================================

def asignar_habilidad_usuario(
    db: Session,
    usuario: models.Usuario,
    habilidad: models.Habilidad,
    *,
    nivel: str,
    experiencia_anios: float,
) -> None:
    """
    Crea la relación Usuario-Habilidad si todavía no existe.
    """

    existente = db.execute(
        select(
            models.UsuarioHabilidad
        ).where(
            models.UsuarioHabilidad.usuario_id
            == usuario.id,

            models.UsuarioHabilidad.habilidad_id
            == habilidad.id,
        )
    ).scalars().first()

    if existente:
        return

    relacion = models.UsuarioHabilidad(
        usuario_id=usuario.id,
        habilidad_id=habilidad.id,
        nivel=nivel,
        experiencia_anios=experiencia_anios,
    )

    db.add(relacion)


# ============================================================
# 8. HABILIDADES DE CANDIDATOS
# ============================================================

def crear_habilidades_candidatos(
    db: Session,
    usuarios: dict[str, models.Usuario],
    habilidades: dict[str, models.Habilidad],
) -> None:
    """
    Configura perfiles técnicos distintos para poder probar
    resultados de compatibilidad diferentes.
    """

    frontend = {
        "Angular": ("avanzado", 2),
        "TypeScript": ("avanzado", 2),
        "JavaScript": ("avanzado", 2),
        "HTML": ("avanzado", 3),
        "CSS": ("avanzado", 3),
        "REST": ("intermedio", 2),
        "Git": ("intermedio", 2),
        "GitHub": ("intermedio", 2),
        "PostgreSQL": ("basico", 1),
        "Scrum": ("intermedio", 2),
    }

    backend = {
        "Python": ("avanzado", 3),
        "FastAPI": ("avanzado", 2),
        "REST": ("avanzado", 3),
        "PostgreSQL": ("avanzado", 3),
        "SQL": ("avanzado", 3),
        "Docker": ("intermedio", 2),
        "Git": ("avanzado", 3),
        "Linux": ("intermedio", 2),
        "AWS": ("basico", 1),
    }

    datos = {
        "Python": ("avanzado", 3),
        "SQL": ("avanzado", 3),
        "PostgreSQL": ("intermedio", 2),
        "Pandas": ("avanzado", 2.5),
        "NumPy": ("avanzado", 2.5),
        "Machine Learning": (
            "intermedio",
            2,
        ),
        "Scikit-learn": (
            "intermedio",
            2,
        ),
        "Git": ("intermedio", 2),
    }

    configuraciones = [
        (
            usuarios["candidato_frontend"],
            frontend,
        ),
        (
            usuarios["candidato_backend"],
            backend,
        ),
        (
            usuarios["candidato_datos"],
            datos,
        ),
    ]

    for usuario, skills in configuraciones:

        for (
            nombre,
            (
                nivel,
                experiencia,
            ),
        ) in skills.items():

            asignar_habilidad_usuario(
                db,
                usuario,
                habilidades[nombre],
                nivel=nivel,
                experiencia_anios=experiencia,
            )


# ============================================================
# 9. CREAR VACANTE
# ============================================================

def obtener_o_crear_vacante(
    db: Session,
    *,
    titulo: str,
    empresa: models.Empresa,
    creador: models.Usuario | None,
    descripcion: str,
    requisitos: str,
    responsabilidades: str,
    salario_min: int,
    salario_max: int,
    modalidad: str,
    tipo_contrato: str,
    ubicacion: str,
    experiencia_minima: float,
) -> models.Vacante:
    """
    Crea una vacante si no existe una con el mismo título
    dentro de la misma empresa.
    """

    vacante = db.execute(
        select(models.Vacante).where(
            models.Vacante.titulo == titulo,
            models.Vacante.empresa_id
            == empresa.id,
        )
    ).scalars().first()

    if vacante:
        return vacante

    vacante = models.Vacante(
        titulo=titulo,
        descripcion=descripcion,
        requisitos=requisitos,
        responsabilidades=responsabilidades,
        salario_min=salario_min,
        salario_max=salario_max,
        modalidad=modalidad,
        tipo_contrato=tipo_contrato,
        ubicacion=ubicacion,
        experiencia_minima=experiencia_minima,
        estado="activa",
        empresa_id=empresa.id,
        creada_por_id=(
            creador.id
            if creador
            else None
        ),
    )

    db.add(vacante)
    db.flush()

    return vacante


# ============================================================
# 10. ASIGNAR HABILIDAD A VACANTE
# ============================================================

def asignar_habilidad_vacante(
    db: Session,
    vacante: models.Vacante,
    habilidad: models.Habilidad,
    *,
    peso: int,
    obligatoria: bool = True,
) -> None:
    """
    Crea la relación Vacante-Habilidad.

    El peso indica la importancia relativa dentro del motor IA.
    """

    existente = db.execute(
        select(
            models.VacanteHabilidad
        ).where(
            models.VacanteHabilidad.vacante_id
            == vacante.id,

            models.VacanteHabilidad.habilidad_id
            == habilidad.id,
        )
    ).scalars().first()

    if existente:
        return

    db.add(
        models.VacanteHabilidad(
            vacante_id=vacante.id,
            habilidad_id=habilidad.id,
            peso=peso,
            obligatoria=obligatoria,
        )
    )


# ============================================================
# 11. CREAR VACANTES DE DEMOSTRACIÓN
# ============================================================

def crear_vacantes(
    db: Session,
    empresas: dict[str, models.Empresa],
    usuarios: dict[str, models.Usuario],
    habilidades: dict[str, models.Habilidad],
) -> None:
    """
    Crea un catálogo suficientemente amplio para probar:

    - filtros;
    - diferentes ciudades;
    - remoto/presencial/híbrido;
    - salarios;
    - tecnologías;
    - análisis IA.
    """

    tn = empresas[
        "TechNova Solutions"
    ]

    ds = empresas[
        "DataSphere Analytics"
    ]

    cb = empresas[
        "CloudBridge Labs"
    ]

    reclutador_tn = usuarios[
        "reclutador_technova"
    ]

    reclutador_ds = usuarios[
        "reclutador_data"
    ]

    admin = usuarios["admin"]

    definiciones = [
        {
            "titulo": "Desarrollador Angular Junior",
            "empresa": tn,
            "creador": reclutador_tn,
            "descripcion": (
                "Buscamos desarrollador frontend para "
                "participar en aplicaciones empresariales "
                "con Angular."
            ),
            "requisitos": (
                "Angular, TypeScript, HTML, CSS, Git "
                "y consumo de APIs REST."
            ),
            "responsabilidades": (
                "Construir componentes, consumir APIs, "
                "corregir errores y participar en Scrum."
            ),
            "salario_min": 3000000,
            "salario_max": 4500000,
            "modalidad": "hibrido",
            "tipo_contrato": "tiempo_completo",
            "ubicacion": "Bucaramanga",
            "experiencia_minima": 1,
            "skills": {
                "Angular": (5, True),
                "TypeScript": (5, True),
                "HTML": (3, True),
                "CSS": (3, True),
                "REST": (4, True),
                "Git": (2, False),
            },
        },
        {
            "titulo": "Frontend Developer React",
            "empresa": tn,
            "creador": reclutador_tn,
            "descripcion": (
                "Desarrollo de interfaces modernas para "
                "productos digitales."
            ),
            "requisitos": (
                "React, JavaScript, TypeScript, HTML, CSS, "
                "Git y REST."
            ),
            "responsabilidades": (
                "Desarrollar interfaces reutilizables "
                "y colaborar con backend."
            ),
            "salario_min": 4000000,
            "salario_max": 6000000,
            "modalidad": "remoto",
            "tipo_contrato": "tiempo_completo",
            "ubicacion": "Colombia",
            "experiencia_minima": 2,
            "skills": {
                "React": (5, True),
                "JavaScript": (4, True),
                "TypeScript": (4, False),
                "HTML": (3, True),
                "CSS": (3, True),
                "REST": (3, True),
                "Git": (2, False),
            },
        },
        {
            "titulo": "Backend Developer Python",
            "empresa": tn,
            "creador": reclutador_tn,
            "descripcion": (
                "Construcción de servicios backend "
                "para plataforma empresarial."
            ),
            "requisitos": (
                "Python, FastAPI, PostgreSQL, SQL, REST, "
                "Git y Docker."
            ),
            "responsabilidades": (
                "Diseñar APIs REST, implementar lógica "
                "de negocio y optimizar consultas."
            ),
            "salario_min": 4500000,
            "salario_max": 7000000,
            "modalidad": "hibrido",
            "tipo_contrato": "tiempo_completo",
            "ubicacion": "Bucaramanga",
            "experiencia_minima": 2,
            "skills": {
                "Python": (5, True),
                "FastAPI": (5, True),
                "PostgreSQL": (4, True),
                "SQL": (4, True),
                "REST": (4, True),
                "Docker": (3, False),
                "Git": (2, False),
            },
        },
        {
            "titulo": "Analista de Datos",
            "empresa": ds,
            "creador": reclutador_ds,
            "descripcion": (
                "Análisis y transformación de datos "
                "para apoyar decisiones empresariales."
            ),
            "requisitos": (
                "Python, SQL, PostgreSQL, Pandas, NumPy "
                "y conocimientos de estadística."
            ),
            "responsabilidades": (
                "Limpiar datos, construir reportes y "
                "generar análisis exploratorios."
            ),
            "salario_min": 3500000,
            "salario_max": 5500000,
            "modalidad": "hibrido",
            "tipo_contrato": "tiempo_completo",
            "ubicacion": "Bogotá",
            "experiencia_minima": 1,
            "skills": {
                "Python": (5, True),
                "SQL": (5, True),
                "PostgreSQL": (3, False),
                "Pandas": (5, True),
                "NumPy": (4, True),
            },
        },
        {
            "titulo": "Machine Learning Junior",
            "empresa": ds,
            "creador": reclutador_ds,
            "descripcion": (
                "Apoyo en construcción y evaluación de "
                "modelos de aprendizaje automático."
            ),
            "requisitos": (
                "Python, Machine Learning, Scikit-learn, "
                "Pandas, NumPy, SQL y Git."
            ),
            "responsabilidades": (
                "Preparar datos, entrenar modelos y "
                "documentar resultados."
            ),
            "salario_min": 4000000,
            "salario_max": 6500000,
            "modalidad": "remoto",
            "tipo_contrato": "tiempo_completo",
            "ubicacion": "Colombia",
            "experiencia_minima": 1,
            "skills": {
                "Python": (5, True),
                "Machine Learning": (5, True),
                "Scikit-learn": (5, True),
                "Pandas": (4, True),
                "NumPy": (4, True),
                "SQL": (3, False),
                "Git": (2, False),
            },
        },
        {
            "titulo": "Ingeniero de Datos Junior",
            "empresa": ds,
            "creador": reclutador_ds,
            "descripcion": (
                "Participación en pipelines y procesos "
                "de integración de información."
            ),
            "requisitos": (
                "Python, SQL, PostgreSQL, Linux, Docker "
                "y conocimientos de AWS."
            ),
            "responsabilidades": (
                "Crear procesos de transformación y "
                "automatización de datos."
            ),
            "salario_min": 4200000,
            "salario_max": 6500000,
            "modalidad": "hibrido",
            "tipo_contrato": "tiempo_completo",
            "ubicacion": "Bogotá",
            "experiencia_minima": 1.5,
            "skills": {
                "Python": (5, True),
                "SQL": (5, True),
                "PostgreSQL": (4, True),
                "Linux": (3, False),
                "Docker": (3, False),
                "AWS": (3, False),
            },
        },
        {
            "titulo": "DevOps Engineer",
            "empresa": cb,
            "creador": admin,
            "descripcion": (
                "Automatización de infraestructura y "
                "procesos de entrega continua."
            ),
            "requisitos": (
                "Docker, Kubernetes, AWS, Linux, Git "
                "y conocimientos de automatización."
            ),
            "responsabilidades": (
                "Mantener infraestructura cloud y "
                "automatizar despliegues."
            ),
            "salario_min": 6000000,
            "salario_max": 9000000,
            "modalidad": "remoto",
            "tipo_contrato": "tiempo_completo",
            "ubicacion": "Colombia",
            "experiencia_minima": 3,
            "skills": {
                "Docker": (5, True),
                "Kubernetes": (5, True),
                "AWS": (5, True),
                "Linux": (4, True),
                "Git": (3, True),
            },
        },
        {
            "titulo": "Cloud Engineer Azure",
            "empresa": cb,
            "creador": admin,
            "descripcion": (
                "Administración de infraestructura "
                "y servicios en Microsoft Azure."
            ),
            "requisitos": (
                "Azure, Linux, Docker, Git, redes "
                "y automatización."
            ),
            "responsabilidades": (
                "Configurar recursos cloud y apoyar "
                "procesos de despliegue."
            ),
            "salario_min": 5500000,
            "salario_max": 8500000,
            "modalidad": "hibrido",
            "tipo_contrato": "tiempo_completo",
            "ubicacion": "Medellín",
            "experiencia_minima": 2,
            "skills": {
                "Azure": (5, True),
                "Linux": (4, True),
                "Docker": (4, True),
                "Git": (3, False),
            },
        },
        {
            "titulo": "Desarrollador Java Spring Boot",
            "empresa": cb,
            "creador": admin,
            "descripcion": (
                "Desarrollo de servicios empresariales "
                "basados en Java."
            ),
            "requisitos": (
                "Java, Spring Boot, REST, SQL, "
                "PostgreSQL, Git y Docker."
            ),
            "responsabilidades": (
                "Diseñar servicios backend y "
                "mantener integraciones empresariales."
            ),
            "salario_min": 5000000,
            "salario_max": 8000000,
            "modalidad": "presencial",
            "tipo_contrato": "tiempo_completo",
            "ubicacion": "Medellín",
            "experiencia_minima": 2,
            "skills": {
                "Java": (5, True),
                "Spring Boot": (5, True),
                "REST": (4, True),
                "SQL": (4, True),
                "PostgreSQL": (3, False),
                "Git": (2, False),
                "Docker": (3, False),
            },
        },
        {
            "titulo": "Full Stack Developer",
            "empresa": tn,
            "creador": reclutador_tn,
            "descripcion": (
                "Desarrollo frontend y backend para "
                "soluciones web modernas."
            ),
            "requisitos": (
                "Angular, TypeScript, Python, FastAPI, "
                "REST, PostgreSQL, Git y Docker."
            ),
            "responsabilidades": (
                "Construir funcionalidades de extremo a "
                "extremo y participar en diseño técnico."
            ),
            "salario_min": 5500000,
            "salario_max": 8000000,
            "modalidad": "remoto",
            "tipo_contrato": "tiempo_completo",
            "ubicacion": "Colombia",
            "experiencia_minima": 2,
            "skills": {
                "Angular": (5, True),
                "TypeScript": (4, True),
                "Python": (5, True),
                "FastAPI": (5, True),
                "REST": (4, True),
                "PostgreSQL": (4, True),
                "Git": (2, False),
                "Docker": (3, False),
            },
        },
    ]

    for datos in definiciones:

        skills = datos.pop(
            "skills"
        )

        vacante = obtener_o_crear_vacante(
            db,
            **datos,
        )

        for (
            nombre_habilidad,
            (
                peso,
                obligatoria,
            ),
        ) in skills.items():

            asignar_habilidad_vacante(
                db,
                vacante,
                habilidades[
                    nombre_habilidad
                ],
                peso=peso,
                obligatoria=obligatoria,
            )


# ============================================================
# 12. PROCESO COMPLETO
# ============================================================

def ejecutar_seed(
    reset: bool = False,
) -> None:
    """
    Ejecuta toda la inicialización de TalentIA.
    """

    print()
    print("=" * 60)
    print(" TalentIA - Inicialización de PostgreSQL")
    print("=" * 60)

    # --------------------------------------------------------
    # RESET OPCIONAL
    # --------------------------------------------------------

    if reset:
        print(
            "ADVERTENCIA: eliminando tablas existentes..."
        )

        Base.metadata.drop_all(
            bind=engine
        )

        print(
            "Tablas anteriores eliminadas."
        )

    # --------------------------------------------------------
    # CREAR TABLAS
    # --------------------------------------------------------

    Base.metadata.create_all(
        bind=engine
    )

    print(
        "Estructura de tablas lista."
    )

    # --------------------------------------------------------
    # INSERTAR DATOS
    # --------------------------------------------------------

    db = SessionLocal()

    try:
        roles = crear_roles(
            db
        )

        print(
            "Roles listos."
        )

        empresas = crear_empresas(
            db
        )

        print(
            "Empresas listas."
        )

        habilidades = crear_habilidades(
            db
        )

        print(
            f"{len(habilidades)} habilidades listas."
        )

        usuarios = crear_usuarios(
            db,
            roles,
            empresas,
        )

        print(
            "Usuarios de demostración listos."
        )

        crear_habilidades_candidatos(
            db,
            usuarios,
            habilidades,
        )

        print(
            "Perfiles técnicos listos."
        )

        crear_vacantes(
            db,
            empresas,
            usuarios,
            habilidades,
        )

        print(
            "Vacantes de demostración listas."
        )

        db.commit()

    except Exception:

        db.rollback()

        print(
            "\nERROR: la inicialización fue revertida."
        )

        raise

    finally:
        db.close()

    # --------------------------------------------------------
    # RESUMEN
    # --------------------------------------------------------

    print()
    print("=" * 60)
    print(" TalentIA preparado correctamente")
    print("=" * 60)

    print()
    print("CREDENCIALES DE DEMOSTRACIÓN")
    print("-" * 60)

    print(
        "Administrador:"
    )
    print(
        "  admin@talentia.local"
    )

    print()
    print(
        "Reclutador TechNova:"
    )
    print(
        "  reclutador@technova.local"
    )

    print()
    print(
        "Reclutador DataSphere:"
    )
    print(
        "  reclutador@datasphere.local"
    )

    print()
    print(
        "Candidato Frontend:"
    )
    print(
        "  ana@talentia.local"
    )

    print()
    print(
        "Candidato Backend:"
    )
    print(
        "  juan@talentia.local"
    )

    print()
    print(
        "Candidato Datos:"
    )
    print(
        "  sofia@talentia.local"
    )

    print()
    print(
        f"Contraseña para todos: {DEMO_PASSWORD}"
    )

    print()
    print(
        "Vacantes creadas: 10"
    )

    print("=" * 60)
    print()


# ============================================================
# 13. EJECUCIÓN DESDE TERMINAL
# ============================================================

if __name__ == "__main__":

    parser = argparse.ArgumentParser(
        description=(
            "Inicializa los datos de TalentIA."
        )
    )

    parser.add_argument(
        "--reset",
        action="store_true",
        help=(
            "Elimina las tablas existentes "
            "antes de crear el nuevo modelo."
        ),
    )

    argumentos = parser.parse_args()

    ejecutar_seed(
        reset=argumentos.reset
    )