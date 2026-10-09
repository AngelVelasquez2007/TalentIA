# TalentIA — Plataforma de Reclutamiento con IA

TalentIA es una plataforma académica de reclutamiento construida con **Angular 22**, **FastAPI**, **SQLAlchemy** y **PostgreSQL**.

El sistema permite administrar vacantes, perfiles de candidatos y postulaciones, e incorpora un motor explicable de compatibilidad basado en **TF-IDF**, **similitud coseno** y **coincidencia ponderada de habilidades**.

> El motor de compatibilidad es una herramienta de apoyo. No contrata, rechaza ni toma decisiones automáticas sobre personas.

## Tecnologías

### Frontend
- Angular 22
- TypeScript
- RxJS
- Zone.js
- SCSS

### Backend
- Python
- FastAPI
- SQLAlchemy
- Pydantic
- scikit-learn

### Base de datos
- PostgreSQL

### Seguridad
- JWT HS256
- PBKDF2-HMAC-SHA256
- autorización por roles

## Arquitectura general

```text
Angular
  |
  | HttpClient + JWT
  v
FastAPI
  |
  +-- Auth / roles
  +-- Empresas
  +-- Usuarios
  +-- Vacantes
  +-- Postulaciones
  +-- Analisis de compatibilidad
  |
  v
SQLAlchemy
  |
  v
PostgreSQL
```

Consulta `docs/ARQUITECTURA.md` para el detalle.

## Roles

| Rol | Capacidades principales |
|---|---|
| Visitante | Consultar vacantes y empresas, registrarse e iniciar sesión |
| Candidato | Administrar perfil, habilidades, analizar vacantes, postularse y consultar sus postulaciones |
| Reclutador | Administrar vacantes de su empresa, consultar ranking y actualizar estados |
| Administrador | Gestionar empresas y operar funciones administrativas globales |

La seguridad no depende únicamente del frontend. Los permisos se vuelven a validar en FastAPI.

## Motor de compatibilidad

TalentIA combina:

```text
65% coincidencia ponderada de habilidades
35% similitud textual TF-IDF + coseno
```

Cuando una vacante no tiene habilidades estructuradas, el motor intenta detectar competencias conocidas en su descripción y requisitos.

Clasificación:

| Puntuación | Clasificación |
|---:|---|
| 0–39.99 | Baja |
| 40–64.99 | Media |
| 65–79.99 | Alta |
| 80–100 | Muy alta |

Más información en `docs/IA.md`.

## Modelo de datos

Entidades principales:

```text
roles
empresas
usuarios
habilidades
usuario_habilidades
vacantes
vacante_habilidades
postulaciones
```

El modelo ER y la normalización están documentados en `docs/MODELO_DATOS.md`.

## Requisitos

- Node.js compatible con Angular 22
- npm
- Python 3.11 o superior
- PostgreSQL
- PowerShell para los comandos de ejemplo en Windows

## Configuración de PostgreSQL

Crear la base:

```sql
CREATE DATABASE talentia_db;
```

Luego crear `backend/.env` tomando como base `backend/.env.example`.

Ejemplo conceptual:

```env
DATABASE_URL=postgresql+psycopg://postgres:TU_PASSWORD@localhost:5432/talentia_db
JWT_SECRET=UNA_CLAVE_ALEATORIA_DE_MINIMO_32_CARACTERES
JWT_EXPIRE_MINUTES=480
```

No se deben versionar credenciales reales.

## Instalación del backend

Desde la raíz del proyecto:

```powershell
cd backend
python -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
```

Inicializar datos de demostración:

```powershell
python -m app.seed
```

Iniciar FastAPI:

```powershell
python -m uvicorn app.main:app --reload
```

Servicios útiles:

```text
API:          http://127.0.0.1:8000
Swagger:      http://127.0.0.1:8000/docs
Health:       http://127.0.0.1:8000/health
Base de datos:http://127.0.0.1:8000/database-test
```

## Instalación del frontend

En otra terminal:

```powershell
cd frontend
npm install
npm start
```

Abrir:

```text
http://localhost:4200
```

## Usuarios de demostración

Después de ejecutar el seed:

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | admin@talentia.local | TalentIA123 |
| Reclutador TechNova | reclutador@technova.local | TalentIA123 |
| Reclutador DataSphere | reclutador@datasphere.local | TalentIA123 |
| Candidato | ana@talentia.local | TalentIA123 |
| Candidato | juan@talentia.local | TalentIA123 |
| Candidato | sofia@talentia.local | TalentIA123 |

Estas credenciales existen únicamente para demostración local.

## Flujo principal de demostración

```text
Candidato inicia sesión
        |
        v
Completa o consulta su perfil
        |
        v
Explora vacantes
        |
        v
TalentIA usa perfil + habilidades guardadas
        |
        v
Calcula compatibilidad
        |
        v
Candidato se postula
        |
        v
Postulación queda persistida
        |
        v
Reclutador consulta ranking
        |
        v
Actualiza estado del proceso
        |
        v
Candidato ve el estado actualizado
```

## Estados de una postulación

```text
pendiente
  |-- revision
  |     |-- entrevista
  |     |     |-- seleccionado
  |     |     \-- rechazado
  |     \-- rechazado
  \-- rechazado
```

`seleccionado` y `rechazado` son estados finales.

## Verificación técnica

Desde la raíz:

```powershell
.\verificar_proyecto.ps1
```

La verificación comprueba:

- sintaxis Python;
- TypeScript de aplicación;
- TypeScript de pruebas;
- tests Angular;
- build de producción.

Con FastAPI ejecutándose también puede utilizarse:

```powershell
python backend\e2e_check.py
python backend\e2e_check.py --full
```

El segundo comando modifica datos de demostración porque prueba el flujo completo de postulación y cambio de estados.

## Documentación

- `docs/ARQUITECTURA.md`
- `docs/MODELO_DATOS.md`
- `docs/IA.md`
- `docs/API.md`
- `docs/PRUEBAS.md`
- `docs/MOCKUPS.md`
- `docs/SUSTENTACION.md`

## Alcance y limitaciones

- El matching es clásico, determinista y explicable; no es un LLM.
- El resultado de compatibilidad no equivale a probabilidad de contratación.
- `Base.metadata.create_all()` crea tablas faltantes, pero no reemplaza un sistema de migraciones como Alembic.
- La configuración actual está orientada a ejecución local y demostración académica.
- Para un entorno productivo se requerirían controles adicionales de seguridad, despliegue, observabilidad, migraciones y gestión de secretos.
