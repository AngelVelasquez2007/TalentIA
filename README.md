# TalentIA — Plataforma de Reclutamiento con IA

Proyecto académico de **Angular 22 + FastAPI + PostgreSQL**. Partimos del proyecto original y añadimos registro, login JWT, permisos, postulaciones, análisis orientativo de compatibilidad y panel web.

## Requisitos
- Node.js compatible con Angular 22, npm y Angular CLI (`npm install -g @angular/cli`).
- Python 3.11+ y PostgreSQL con `psql` disponible.
- VS Code; dos terminales para frontend/backend.

## 1. Crear base de datos desde psql
```sql
CREATE DATABASE talentia_db;
```
Desde consola: `psql -U postgres -d talentia_db`.

## 2. Backend (PowerShell)
```powershell
cd backend
python -m venv venv
.\venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```
Edita `backend/.env`: cambia contraseña y define `JWT_SECRET` aleatorio de 32+ caracteres. Si la contraseña contiene `@`, `#`, `:` u otros caracteres reservados, codifícala para URL.

```powershell
python -m app.seed
python -m uvicorn app.main:app --reload
```
API: http://127.0.0.1:8000/docs — prueba `/database-test`.

## 3. Frontend (otra terminal)
```powershell
cd frontend
npm install
npm start
```
Abre http://localhost:4200. Si tienes otra versión de Angular, respeta la versión del `package.json`.

## Flujo de demostración
1. Abrir Vacantes: lista pública desde PostgreSQL.
2. Crear cuenta en Registro: rol **candidato**.
3. Iniciar sesión; seleccionar vacante; escribir perfil de 20+ caracteres; analizar compatibilidad y postularse.
4. Abrir Postulaciones: ver estado y puntuación guardados.
5. Para probar administrador/reclutador, crear usuarios mediante el script documentado en `docs/SUSTENTACION.md`; nunca existe registro público de administradores.
6. Mostrar Swagger, consulta SQL y validación de postulaciones duplicadas (HTTP 409).

## Arquitectura
`Angular (componentes y servicios) → HttpClient/JWT → FastAPI (routers, validaciones y permisos) → SQLAlchemy → PostgreSQL`.

## Seguridad
- PBKDF2-HMAC-SHA256 con salt aleatorio; nunca se guarda la contraseña en claro.
- JWT HS256 firmado con secreto de entorno; expira a las 8 horas.
- Registro público solo de candidatos; modificación de empresas solo administradores.
- Reclutadores limitados a vacantes/postulaciones de su empresa.
- Token en `sessionStorage`: adecuado para demostración, no sustituye un diseño de producción con cookies HttpOnly, protección CSRF y controles anti-XSS.
- Los endpoints de lectura de vacantes/empresas son públicos.

## IA: alcance real
El algoritmo `app/matching.py` hace **NLP léxico determinista**: normaliza acentos, tokeniza, elimina algunas palabras vacías y calcula coincidencias sobre requisitos. Es un motor básico de matching, **no un modelo generativo entrenado ni una evaluación objetiva del candidato**. La puntuación es orientativa y no debe usarse para rechazar personas automáticamente.

## Notas
`create_all` crea tablas faltantes pero **no migra esquemas existentes**. Para cambios futuros usar Alembic. No se distribuyen `.env`, `venv`, `node_modules` ni datos privados. Más información: `docs/`.
