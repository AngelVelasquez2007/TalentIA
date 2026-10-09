# Estado de verificación — TalentIA

Este documento resume el estado técnico del proyecto antes de la entrega.

## 1. Backend

| Verificación | Estado |
|---|---|
| Estructura FastAPI | OK |
| Routers registrados | OK |
| Sintaxis Python | OK |
| SQLAlchemy | OK |
| PostgreSQL configurado | OK para ejecución local |
| Manejo de sesiones DB | OK |
| `rollback()` en operaciones críticas | OK |
| Roles y autorización | OK |
| Hash de contraseñas | OK |
| JWT | OK |
| Motor de matching | OK |

## 2. Frontend

| Verificación | Estado |
|---|---|
| Angular standalone | OK |
| Routing | OK |
| Guards | OK |
| Interceptor JWT | OK |
| Timeout HTTP global | OK |
| Restauración de sesión | OK |
| Perfil candidato | OK |
| Catálogo de vacantes | OK |
| Matching desde perfil persistido | OK |
| Postulaciones | OK |
| Dashboard reclutador | OK |
| Tema claro/oscuro | OK |
| TypeScript aplicación | OK |
| TypeScript pruebas | OK |

## 3. Flujos implementados

### Candidato

```text
registro
login
perfil
habilidades
vacantes
matching
postulación
seguimiento
logout
```

### Reclutador

```text
login
vacantes de empresa
ranking
detalle de matching
cambio de estados
logout
```

### Administrador

```text
login
empresas
vacantes
operaciones administrativas autorizadas
```

## 4. Base de datos

Modelo principal:

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

Se utilizan:

```text
PK
FK
UNIQUE
CHECK
relaciones N:M
integridad referencial
```

## 5. Matching

Implementado con:

```text
TF-IDF
similitud coseno
aliases de habilidades
coincidencia ponderada
explicación
```

Ponderación:

```text
65% habilidades
35% similitud textual
```

No realiza contratación o rechazo automático.

## 6. Protección frente a loaders indefinidos

Se aplicaron correcciones para:

```text
Cargando...
Guardando...
Analizando...
Enviando...
```

Incluyendo:

- timeout global HTTP;
- estados liberados en éxito y error;
- protección ante solicitudes concurrentes;
- límites de conexión/consulta a PostgreSQL;
- control de respuestas HTTP tardías.

## 7. Verificación automatizada

Desde la raíz:

```powershell
.\verificar_proyecto.ps1
```

Comprueba:

```text
Python compileall
TypeScript aplicación
TypeScript pruebas
tests Angular
build de producción
```

Prueba E2E:

```powershell
python backend\e2e_check.py
```

Prueba E2E con mutaciones:

```powershell
python backend\e2e_check.py --full
```

## 8. Documentación

| Documento | Estado |
|---|---|
| `README.md` | Actualizado |
| `docs/ARQUITECTURA.md` | Actualizado |
| `docs/MODELO_DATOS.md` | Actualizado |
| `docs/IA.md` | Actualizado |
| `docs/API.md` | Actualizado |
| `docs/PRUEBAS.md` | Actualizado |
| `docs/MOCKUPS.md` | Actualizado |
| `docs/SUSTENTACION.md` | Actualizado |
| `docs/RUBRICA.md` | Actualizado |

## 9. Antes de entregar

Todavía deben hacerse estas verificaciones sobre la copia FINAL del proyecto:

```text
[ ] Ejecutar .\verificar_proyecto.ps1
[ ] Ejecutar python backend\e2e_check.py
[ ] Ejecutar python backend\e2e_check.py --full
[ ] Probar manualmente candidato
[ ] Probar manualmente reclutador
[ ] Revisar consola del navegador
[ ] Revisar Network del navegador
[ ] Confirmar que backend/.env NO esté versionado
[ ] Confirmar que node_modules NO esté versionado
[ ] Confirmar que .venv NO esté versionado
[ ] Tomar capturas para evidencias
[ ] Revisar README desde un entorno limpio
[ ] Crear ZIP final sin archivos innecesarios
```

## 10. Restricción importante

Este documento no debe utilizarse como sustituto de las pruebas finales.

Una verificación real debe ejecutarse sobre el mismo código que será entregado.
