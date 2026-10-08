# Modelo entidad-relación y normalización

```mermaid
erDiagram
  ROLES ||--o{ USUARIOS : asigna
  EMPRESAS ||--o{ USUARIOS : emplea
  EMPRESAS ||--o{ VACANTES : publica
  USUARIOS ||--o{ POSTULACIONES : realiza
  VACANTES ||--o{ POSTULACIONES : recibe
  ROLES { int id PK string nombre UK }
  EMPRESAS { int id PK string nombre string ciudad boolean activa }
  USUARIOS { int id PK string email UK string password_hash int rol_id FK int empresa_id FK }
  VACANTES { int id PK string titulo string requisitos int empresa_id FK string modalidad }
  POSTULACIONES { int id PK int candidato_id FK int vacante_id FK string estado int puntuacion_ia }
```

**PK**: `id` de cada entidad. **FK**: `usuarios.rol_id`, `usuarios.empresa_id`, `vacantes.empresa_id`, `postulaciones.candidato_id` y `postulaciones.vacante_id`. Una persona puede tener muchas postulaciones; una vacante puede recibir muchas; la tabla puente resuelve N:M. Restricción única `(candidato_id,vacante_id)`.

**1FN**: columnas atómicas y sin grupos repetidos; cada fila identificada por PK. **2FN**: todas las tablas tienen PK simple `id`, y sus atributos no dependen de una parte de una clave compuesta. **3FN**: nombre de rol reside en `roles` y nombre de empresa en `empresas`; las demás tablas referencian sus IDs en vez de duplicarlos. Los requisitos de la vacante se almacenan como texto libre, adecuado al alcance académico; un catálogo de habilidades requeriría entidades adicionales para búsquedas avanzadas.

**Reglas**: correo único, candidato-vacante único, salario mínimo <= máximo validado por API, permisos por rol, estados controlados por API.
