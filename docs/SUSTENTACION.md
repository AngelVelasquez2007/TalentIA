# Guía de sustentación — TalentIA

## ¿Qué problema resuelve?
Permite consultar vacantes, registrar candidatos y hacer seguimiento a postulaciones; incluye un puntaje **orientativo** de coincidencia entre texto de perfil y requisitos.

## Arquitectura explicada
- **Angular**: `app.ts` navegación; `pages/vacantes` catálogo, publicación y postulación; `pages/login`, `pages/registro`, `pages/postulaciones` interfaces; `services/*` solicitudes HTTP y token.
- **FastAPI**: `main.py` instancia aplicación, CORS y routers; `routers/empresas.py`, `vacantes.py` CRUD; `auth.py` registro y login; `postulaciones.py` flujo de candidatura; `analisis.py` matching.
- **SQLAlchemy**: `models.py` representa tablas, relaciones y constraints; `database.py` crea sesiones.
- **PostgreSQL**: persistencia relacional.

## Explica funciones clave
- `get_db`: abre una sesión y la cierra con `finally`, incluso si falla la petición.
- `hash_password`: aplica PBKDF2 con salt y 260000 iteraciones; `verify_password` compara sin revelar información de tiempo.
- `make_token`: JWT HS256 con expiración; `current_user` verifica firma, fecha y usuario activo; `require_roles` exige permisos.
- `registro`: valida campos y correo único, asigna solo rol candidato.
- `crear_vacante`: verifica existencia de empresa y que reclutador publique solo para su empresa.
- `crear` en postulaciones: exige rol candidato, vacante activa, impide duplicados y persiste puntuación.
- `score`: divide coincidencias entre número de tokens requeridos. No es una probabilidad real de contratación.

## Roles y permisos
| Operación | Visitante | Candidato | Reclutador | Administrador |
|---|---|---|---|---|
| Listar empresas y vacantes | Sí | Sí | Sí | Sí |
| Registrarse candidato | Sí | Sí | Sí | Sí |
| Publicar vacantes | No | No | Su empresa | Sí |
| Gestionar empresas | No | No | No | Sí |
| Postularse | No | Sí | No | No |
| Cambiar estado de postulaciones | No | No | Su empresa | Sí |

## Preguntas frecuentes
**¿Por qué JWT?** Permite enviar una identidad firmada en `Authorization: Bearer` sin reenviar contraseña.
**¿Por qué PK/FK?** Garantizan identidad y relaciones válidas.
**¿Qué evita duplicar candidaturas?** `UniqueConstraint(candidato_id,vacante_id)` y verificación de negocio HTTP 409.
**¿Qué pasa con un salario mínimo superior al máximo?** Pydantic rechaza la creación; actualización se comprueba en el router.
**¿Por qué 422?** Datos de entrada inválidos. **¿Por qué 404?** Recurso no encontrado. **¿Por qué 403?** Sin permiso. **¿Por qué 401?** Sin autenticación.
**¿Es IA generativa?** No. Es NLP léxico de coincidencia, explicable pero limitado.
**¿Por qué no se muestra todo a candidatos?** El frontend oculta controles, pero el backend también verifica roles; ocultar botones no es seguridad.

## SQL para mostrar
```sql
\dt
SELECT id,nombre FROM roles;
SELECT id,nombre FROM empresas;
SELECT v.titulo,e.nombre FROM vacantes v JOIN empresas e ON e.id=v.empresa_id;
SELECT candidato_id,vacante_id,estado,puntuacion_ia FROM postulaciones;
```

## Crear usuario de demostración de rol privilegiado
Primero regístrate normalmente en `/registro`, luego en psql, **solo para pruebas locales**, ejecuta:
```sql
UPDATE usuarios SET rol_id=(SELECT id FROM roles WHERE nombre='administrador') WHERE email='TU_CORREO_DE_PRUEBA';
```
Cierra sesión e inicia de nuevo. Para reclutador asigna rol `reclutador` y `empresa_id` de una empresa existente:
```sql
UPDATE usuarios SET rol_id=(SELECT id FROM roles WHERE nombre='reclutador'), empresa_id=(SELECT id FROM empresas LIMIT 1) WHERE email='OTRO_CORREO_DE_PRUEBA';
```
No utilizar esto como mecanismo de administración en producción.

## Pruebas de exposición
1. Registrar candidato (201), volver a registrar correo (409).
2. Login válido (200), incorrecto (401).
3. GET vacantes (200), GET ID inexistente (404).
4. Candidato intenta crear vacante (403).
5. Candidato aplica (201), aplica de nuevo (409).
6. Perfil compatible: mostrar coincidencias y faltantes.
7. Reclutador cambia estado de una postulación de su empresa.
8. Verificar persistencia con SQL y reiniciar servidores.

## Limitaciones conocidas
- `create_all` no migra tablas; no hay Alembic.
- No hay integración con un LLM externo ni análisis de CV PDF.
- No se han implementado tests end-to-end automatizados completos.
- El puntaje léxico no debe usarse para decisiones de contratación automatizadas.
- Se requiere PostgreSQL local y configurar `.env` para ejecutar.
