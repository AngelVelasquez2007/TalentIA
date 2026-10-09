# API REST de TalentIA

Base local:

```text
http://127.0.0.1:8000
```

Swagger:

```text
http://127.0.0.1:8000/docs
```

## Sistema

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/` | Información básica |
| GET | `/health` | Health check |
| GET | `/database-test` | Verificación de PostgreSQL |

## Autenticación

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/auth/register` | Registro público de candidato |
| POST | `/auth/login` | Inicio de sesión y JWT |
| GET | `/auth/me` | Usuario autenticado |
| POST | `/auth/logout` | Cierre lógico de sesión |

## Usuarios

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/usuarios/me` | Perfil completo del usuario |
| PUT | `/usuarios/me/perfil` | Actualizar perfil del candidato |
| GET | `/usuarios/habilidades` | Catálogo de habilidades |

## Empresas

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/empresas/` | Listar empresas |
| GET | `/empresas/{empresa_id}` | Consultar empresa |
| POST | `/empresas/` | Crear empresa |
| PUT | `/empresas/{empresa_id}` | Actualizar empresa |
| DELETE | `/empresas/{empresa_id}` | Desactivar empresa |

## Vacantes

| Método | Endpoint | Uso |
|---|---|---|
| GET | `/vacantes/` | Listar vacantes |
| GET | `/vacantes/mis-vacantes` | Vacantes gestionadas por el reclutador |
| GET | `/vacantes/{vacante_id}` | Consultar vacante |
| POST | `/vacantes/` | Crear vacante |
| PUT | `/vacantes/{vacante_id}` | Actualizar vacante |
| DELETE | `/vacantes/{vacante_id}` | Cerrar vacante |

## Análisis

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/analisis/vacantes/{vacante_id}` | Analizar compatibilidad con una vacante |
| POST | `/analisis/compatibilidad` | Endpoint alternativo de compatibilidad |

## Postulaciones

| Método | Endpoint | Uso |
|---|---|---|
| POST | `/postulaciones/` | Crear postulación |
| GET | `/postulaciones/mis-postulaciones` | Seguimiento del candidato |
| GET | `/postulaciones/{postulacion_id}` | Consultar postulación |
| GET | `/postulaciones/vacante/{vacante_id}` | Postulaciones de una vacante |
| GET | `/postulaciones/ranking/{vacante_id}` | Ranking por compatibilidad |
| PUT | `/postulaciones/{postulacion_id}/estado` | Actualizar etapa |

## Autorización

Los endpoints protegidos reciben:

```http
Authorization: Bearer <JWT>
```

Los permisos se validan en FastAPI mediante el usuario autenticado y su rol.

## Códigos HTTP relevantes

| Código | Significado en TalentIA |
|---:|---|
| 200 | Operación exitosa |
| 201 | Recurso creado |
| 400 | Solicitud o transición inválida |
| 401 | No autenticado o token inválido |
| 403 | Usuario autenticado sin permiso |
| 404 | Recurso inexistente |
| 409 | Conflicto, por ejemplo postulación duplicada |
| 422 | Error de validación de datos |
| 500 | Error interno controlado/no esperado |

## Fuente de verdad

Para operaciones sensibles, el backend consulta PostgreSQL.

Por ejemplo, al postularse el candidato no necesita enviar nuevamente todo su perfil desde Angular. El backend puede recuperar el perfil y las habilidades persistidas, ejecutar el matching y guardar una fotografía del resultado.
