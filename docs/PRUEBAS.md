# Checklist de rúbrica — TalentIA

Este documento relaciona los requisitos académicos con evidencias concretas del proyecto.

## Estado general

| Criterio | Estado | Evidencia |
|---|---|---|
| Mockups | CUMPLIDO | `docs/MOCKUPS.md` |
| Arquitectura | CUMPLIDO | `docs/ARQUITECTURA.md` |
| Frontend Angular | CUMPLIDO | `frontend/src/app/` |
| API REST | CUMPLIDO | `backend/app/routers/`, Swagger |
| Modelo de datos | CUMPLIDO | `docs/MODELO_DATOS.md` |
| Diagrama ER | CUMPLIDO | Mermaid en `MODELO_DATOS.md` |
| Normalización | CUMPLIDO | 1FN, 2FN y 3FN documentadas |
| Integración frontend/backend | CUMPLIDO | servicios Angular + API FastAPI |
| CRUD | CUMPLIDO | empresas, vacantes, perfil y postulaciones |
| Reglas de negocio | CUMPLIDO | roles, duplicados, estados, permisos |
| Autenticación | CUMPLIDO | login + JWT |
| Roles | CUMPLIDO | candidato, reclutador, administrador |
| Ejecución local | CUMPLIDO | `README.md` |
| UX | CUMPLIDO | loaders, mensajes, filtros, dark mode |
| Código/documentación | CUMPLIDO | comentarios + `docs/` |
| Pruebas | CUMPLIDO | Angular + build + E2E |
| Demo | LISTA PARA VALIDAR | `docs/SUSTENTACION.md` |
| Extras | CUMPLIDO | matching explicable + tema + E2E |

---

## 1. Mockups

Evidencia:

```text
docs/MOCKUPS.md
```

Incluye:

- login;
- registro;
- catálogo;
- matching;
- perfil;
- postulaciones;
- reclutador.

**Recomendación final:** anexar capturas reales de la aplicación para fortalecer esta evidencia.

---

## 2. Arquitectura

Evidencia:

```text
docs/ARQUITECTURA.md
```

Capas:

```text
Angular
FastAPI
SQLAlchemy
PostgreSQL
```

Incluye diagrama y flujo HTTP.

---

## 3. Angular

Evidencia:

```text
frontend/src/app/pages/
frontend/src/app/services/
frontend/src/app/guards/
frontend/src/app/interceptors/
frontend/src/app/app.routes.ts
```

Características:

- componentes standalone;
- routing;
- formularios;
- servicios;
- interceptores;
- guards;
- RxJS;
- SCSS.

---

## 4. Backend REST

Evidencia:

```text
backend/app/main.py
backend/app/routers/
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

Módulos:

```text
auth
usuarios
empresas
vacantes
analisis
postulaciones
```

---

## 5. Modelo relacional y ER

Evidencia:

```text
backend/app/models.py
docs/MODELO_DATOS.md
```

Tablas:

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

---

## 6. Normalización

Documentada hasta 3FN en:

```text
docs/MODELO_DATOS.md
```

Ejemplo central:

```text
usuarios N:M habilidades
```

resuelto mediante:

```text
usuario_habilidades
```

---

## 7. Integración

Ejemplo:

```text
Angular HttpClient
     ↓
POST /analisis/vacantes/{id}
     ↓
FastAPI
     ↓
matching.py
     ↓
JSON
     ↓
Angular presenta resultado
```

---

## 8. CRUD y reglas de negocio

### Empresas

- crear;
- listar;
- actualizar;
- desactivar.

### Vacantes

- crear;
- consultar;
- actualizar;
- cerrar.

### Perfil

- consultar;
- actualizar;
- habilidades.

### Postulaciones

- crear;
- consultar;
- ranking;
- cambiar estado.

Reglas:

- email único;
- postulación única candidato/vacante;
- reclutador limitado a su empresa;
- candidato no publica vacantes;
- estados controlados;
- validación de salarios;
- validación de experiencia;
- permisos por rol.

---

## 9. Autenticación y roles

Seguridad:

```text
PBKDF2-HMAC-SHA256
JWT HS256
Bearer authentication
```

Roles:

```text
candidato
reclutador
administrador
```

---

## 10. Ejecución local

Evidencia:

```text
README.md
backend/.env.example
backend/requirements.txt
frontend/package.json
```

---

## 11. UX

Características implementadas:

- navbar contextual;
- tema claro/oscuro;
- responsive;
- mensajes de error;
- mensajes de éxito;
- skeletons;
- timeout de API;
- filtros;
- búsqueda;
- ranking;
- empty states;
- estados de proceso;
- formularios en modo lectura/edición.

---

## 12. Calidad de código y documentación

Evidencia:

```text
README.md
docs/
comentarios de archivos
tipado TypeScript
schemas Pydantic
ORM SQLAlchemy
```

---

## 13. Pruebas

Evidencia:

```text
frontend/**/*.spec.ts
verificar_proyecto.ps1
backend/e2e_check.py
docs/PRUEBAS.md
```

Verificación:

```powershell
.\verificar_proyecto.ps1
python backend\e2e_check.py
python backend\e2e_check.py --full
```

---

## 14. Demostración

Guion:

```text
docs/SUSTENTACION.md
```

Secuencia sugerida:

```text
Ana
→ Perfil
→ Vacantes
→ Matching
→ Postulación

Reclutador
→ Ranking
→ Cambio de estado

psql
→ Persistencia

Swagger
→ API REST
```

---

## 15. Extras

El proyecto agrega valor mediante:

- motor de matching explicable;
- habilidades ponderadas;
- aliases de tecnologías;
- ranking;
- tema oscuro;
- scripts de verificación;
- E2E automatizado;
- manejo de timeouts;
- documentación técnica.

---

## Checklist previo a entrega

```text
[ ] Todos los comandos de verificación pasan
[ ] No hay errores rojos en consola del navegador
[ ] No quedan peticiones Pending indefinidamente
[ ] El matching usa perfil guardado
[ ] La postulación aparece en el reclutador
[ ] Los cambios de estado se reflejan en candidato
[ ] PostgreSQL conserva la información tras reiniciar
[ ] Swagger abre correctamente
[ ] backend/.env está ignorado por Git
[ ] node_modules y .venv están ignorados
[ ] Capturas reales añadidas
[ ] ZIP final abre y contiene README
```

Cuando todos estos puntos estén comprobados sobre el ZIP definitivo, TalentIA queda listo para entrega y sustentación.
