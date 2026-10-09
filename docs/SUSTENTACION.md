# Guía de sustentación — TalentIA

## 1. Presentación corta

**TalentIA** es una plataforma web de reclutamiento que conecta candidatos y empresas mediante un flujo completo de vacantes, perfiles, postulaciones y seguimiento.

El proyecto utiliza:

```text
Angular
FastAPI
PostgreSQL
SQLAlchemy
JWT
TF-IDF
Similitud coseno
Matching ponderado de habilidades
```

El motor de compatibilidad apoya al candidato y al reclutador, pero **no toma decisiones automáticas de contratación o rechazo**.

---

## 2. Problema que resuelve

En procesos de reclutamiento es difícil comparar rápidamente:

- requisitos de una vacante;
- experiencia del candidato;
- perfil profesional;
- habilidades técnicas.

TalentIA centraliza esa información y calcula una compatibilidad explicable para orientar la revisión.

---

## 3. Arquitectura

```text
Usuario
   ↓
Angular
   ↓  HTTP + JSON + JWT
FastAPI
   ↓
Reglas de negocio
   ↓
SQLAlchemy
   ↓
PostgreSQL
```

El matching se ejecuta en FastAPI.

### Responsabilidad del frontend

Angular maneja:

- navegación;
- formularios;
- login;
- visualización;
- loaders y mensajes;
- llamadas HTTP;
- guards de navegación.

### Responsabilidad del backend

FastAPI maneja:

- autenticación;
- autorización;
- validaciones;
- CRUD;
- reglas de negocio;
- matching;
- persistencia;
- códigos HTTP.

### Responsabilidad de PostgreSQL

Persistir:

- roles;
- empresas;
- usuarios;
- habilidades;
- vacantes;
- postulaciones;
- resultados del matching.

---

## 4. Modelo de datos

El proyecto utiliza ocho tablas principales:

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

Existen relaciones N:M para habilidades:

```text
usuarios ↔ habilidades
vacantes ↔ habilidades
```

y la tabla `postulaciones` relaciona:

```text
candidato ↔ vacante
```

La restricción:

```text
UNIQUE(candidato_id, vacante_id)
```

evita postulaciones duplicadas a una misma vacante.

---

## 5. Normalización

### 1FN

No se almacenan listas de habilidades como texto separado por comas.

### 2FN

En las tablas puente los atributos dependen de la clave compuesta completa.

Ejemplo:

```text
usuario_id + habilidad_id
→ nivel
→ experiencia_anios
```

### 3FN

Información como nombres de roles, empresas y habilidades se almacena una sola vez en su tabla correspondiente.

---

## 6. Seguridad

### Contraseñas

TalentIA utiliza:

```text
PBKDF2-HMAC-SHA256
salt aleatorio
310000 iteraciones
```

La contraseña nunca se guarda en texto plano.

### JWT

Al iniciar sesión:

```text
email + password
      ↓
FastAPI verifica credenciales
      ↓
JWT HS256
      ↓
Authorization: Bearer <token>
```

### Roles

Los roles principales son:

```text
candidato
reclutador
administrador
```

El frontend oculta acciones no permitidas por UX, pero **FastAPI vuelve a validar el rol**. Esto es importante porque ocultar un botón no constituye seguridad.

---

## 7. Motor de compatibilidad

TalentIA no utiliza un LLM.

Utiliza técnicas clásicas de NLP y recomendación:

```text
TF-IDF
+
similitud coseno
+
matching ponderado de habilidades
```

### Puntuación

Cuando la vacante tiene habilidades requeridas:

```text
score =
    habilidades * 0.65
    +
    similitud_textual * 0.35
```

### ¿Por qué las habilidades pesan más?

Porque para una vacante técnica resulta útil que tecnologías explícitamente requeridas tengan mayor influencia que coincidencias generales del texto.

### Clasificación

```text
0 - 39.99    Baja
40 - 64.99   Media
65 - 79.99   Alta
80 - 100     Muy alta
```

### Explicabilidad

El usuario no recibe solo un número.

También puede ver:

- similitud textual;
- coincidencia de habilidades;
- habilidades coincidentes;
- habilidades faltantes;
- interpretación.

---

## 8. Flujo del candidato

```text
Login
  ↓
Perfil
  ↓
Vacantes
  ↓
Evaluar con IA
  ↓
TalentIA usa perfil guardado
  ↓
Matching
  ↓
Postularme
  ↓
Mis postulaciones
```

Una mejora importante es que el candidato **no tiene que escribir nuevamente el perfil en cada vacante**.

FastAPI utiliza los datos persistidos.

---

## 9. Flujo del reclutador

```text
Login
  ↓
Dashboard reclutador
  ↓
Seleccionar vacante
  ↓
Ranking de candidatos
  ↓
Revisar explicación
  ↓
Cambiar etapa
```

Estados:

```text
pendiente
   ↓
revision
   ↓
entrevista
   ↓
seleccionado
```

También existe la transición a:

```text
rechazado
```

desde etapas permitidas.

`seleccionado` y `rechazado` son estados finales.

---

## 10. Preguntas que probablemente hará el docente

### ¿Por qué Angular?

Porque permite construir una SPA modular con componentes, servicios, routing, guards y consumo de API REST.

### ¿Por qué FastAPI?

Porque ofrece validación tipada, documentación Swagger automática, buen rendimiento y una estructura clara para APIs REST en Python.

### ¿Por qué PostgreSQL?

Porque el dominio es relacional y requiere PK, FK, restricciones únicas, transacciones y consistencia.

### ¿Por qué SQLAlchemy?

Permite representar el modelo relacional con ORM, mantener sesiones y trabajar con transacciones desde Python.

### ¿Por qué JWT?

Permite autenticar las llamadas posteriores sin reenviar la contraseña.

### ¿El frontend protege los endpoints?

No. El frontend controla UX. La autorización real está en FastAPI.

### ¿Qué evita que un candidato publique una vacante?

El backend valida roles. Aunque el candidato manipule Angular o llame directamente al endpoint, FastAPI debe responder con `403`.

### ¿Qué evita una postulación duplicada?

Dos capas:

```text
regla de negocio
+
restricción UNIQUE en PostgreSQL
```

### ¿Qué significa un 409?

Existe un conflicto con el estado actual del recurso. Un ejemplo es intentar postularse nuevamente a la misma vacante.

### ¿Qué significa un 422?

FastAPI/Pydantic rechazó datos que no cumplen el schema.

### ¿El score es una probabilidad de contratación?

No.

Es una métrica de compatibilidad entre información disponible del perfil y la vacante.

### ¿La IA selecciona candidatos automáticamente?

No.

El ranking ayuda a priorizar la revisión, pero cualquier cambio de estado requiere intervención del reclutador.

### ¿Por qué guardar el score en la postulación?

Para conservar el resultado utilizado en ese momento. Si el candidato modifica posteriormente su perfil, la postulación mantiene una fotografía histórica del análisis.

### ¿Qué pasa si PostgreSQL se cae?

La API devuelve error y Angular tiene timeout/manejo de estado para evitar loaders indefinidos.

### ¿Qué pasa si una petición tarda demasiado?

El frontend utiliza un interceptor global de timeout y libera la interfaz con un error controlado.

### ¿Por qué no usar un LLM?

Para este alcance académico, TF-IDF + coseno + habilidades ofrece un modelo:

- reproducible;
- interpretable;
- ligero;
- ejecutable localmente;
- sin depender de servicios externos.

---

## 11. SQL útil durante la sustentación

En `psql`:

```sql
\c talentia_db

\dt

SELECT id, nombre
FROM roles
ORDER BY id;

SELECT id, nombre, ciudad, activa
FROM empresas
ORDER BY id;

SELECT
    u.id,
    u.nombre,
    u.apellido,
    u.email,
    r.nombre AS rol
FROM usuarios u
JOIN roles r
    ON r.id = u.rol_id
ORDER BY u.id;

SELECT
    v.id,
    v.titulo,
    e.nombre AS empresa,
    v.estado
FROM vacantes v
JOIN empresas e
    ON e.id = v.empresa_id
ORDER BY v.id;

SELECT
    p.id,
    p.candidato_id,
    p.vacante_id,
    p.estado,
    p.puntuacion_ia
FROM postulaciones p
ORDER BY p.id;
```

---

## 12. Demo recomendada

Duración aproximada: 5–8 minutos.

### Parte 1 — candidato

Iniciar sesión:

```text
ana@talentia.local
TalentIA123
```

Mostrar:

```text
Mi perfil
→ datos persistidos
→ habilidades

Vacantes
→ filtros
→ Angular Junior

Evaluar con IA
→ perfil cargado automáticamente
→ score
→ coincidencias
→ faltantes

Postularse
→ Mis postulaciones
```

### Parte 2 — reclutador

Cerrar sesión.

Entrar:

```text
reclutador@technova.local
TalentIA123
```

Mostrar:

```text
Panel reclutador
→ seleccionar Angular Junior
→ ranking
→ Ana
→ score y explicación
→ cambiar estado
```

### Parte 3 — persistencia

Abrir `psql`:

```sql
SELECT id, candidato_id, vacante_id, estado, puntuacion_ia
FROM postulaciones
ORDER BY id DESC;
```

Demostrar que el cambio se guardó realmente en PostgreSQL.

### Parte 4 — API

Abrir:

```text
http://127.0.0.1:8000/docs
```

Mostrar routers, schemas y autorización.

---

## 13. Pruebas

El proyecto incluye:

```text
compileall de Python
TypeScript app
TypeScript tests
tests Angular
build de producción
verificación E2E
```

Comando general:

```powershell
.\verificar_proyecto.ps1
```

Con FastAPI iniciado:

```powershell
python backend\e2e_check.py
python backend\e2e_check.py --full
```

---

## 14. Limitaciones

Es importante reconocerlas en la sustentación.

- `create_all()` no reemplaza migraciones de producción como Alembic.
- El matching depende de la calidad del texto y del catálogo de habilidades.
- No procesa CV PDF automáticamente.
- No se integra con LinkedIn.
- No pretende reemplazar la evaluación humana.
- La configuración actual está orientada a ejecución académica/local.

Reconocer estas limitaciones demuestra comprensión técnica del alcance.

---

## 15. Cierre sugerido

> TalentIA demuestra integración frontend, backend y base de datos en un flujo de reclutamiento completo. Además del CRUD tradicional, incluye autenticación por roles, seguimiento de postulaciones y un motor de compatibilidad explicable que apoya al usuario sin automatizar decisiones sensibles de contratación.
