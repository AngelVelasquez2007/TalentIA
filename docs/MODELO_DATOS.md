# Modelo de datos y normalización

## Diagrama entidad-relación

```mermaid
erDiagram
    ROLES ||--o{ USUARIOS : asigna
    EMPRESAS ||--o{ USUARIOS : vincula
    EMPRESAS ||--o{ VACANTES : publica
    USUARIOS ||--o{ VACANTES : crea
    USUARIOS ||--o{ USUARIO_HABILIDADES : posee
    HABILIDADES ||--o{ USUARIO_HABILIDADES : clasifica
    VACANTES ||--o{ VACANTE_HABILIDADES : requiere
    HABILIDADES ||--o{ VACANTE_HABILIDADES : clasifica
    USUARIOS ||--o{ POSTULACIONES : realiza
    VACANTES ||--o{ POSTULACIONES : recibe

    ROLES {
        int id PK
        varchar nombre UK
        varchar descripcion
    }

    EMPRESAS {
        int id PK
        varchar nombre
        varchar nit UK
        text descripcion
        varchar sector
        varchar ciudad
        varchar pais
        varchar sitio_web
        boolean activa
        datetime creada_en
        datetime actualizada_en
    }

    USUARIOS {
        int id PK
        varchar nombre
        varchar apellido
        varchar email UK
        varchar password_hash
        varchar telefono
        varchar ciudad
        text perfil_profesional
        float experiencia_anios
        int rol_id FK
        int empresa_id FK
        boolean activo
        datetime creado_en
        datetime actualizado_en
    }

    HABILIDADES {
        int id PK
        varchar nombre UK
        varchar categoria
        boolean activa
    }

    USUARIO_HABILIDADES {
        int usuario_id PK,FK
        int habilidad_id PK,FK
        varchar nivel
        float experiencia_anios
    }

    VACANTES {
        int id PK
        varchar titulo
        text descripcion
        text requisitos
        text responsabilidades
        int salario_min
        int salario_max
        varchar modalidad
        varchar tipo_contrato
        varchar ubicacion
        float experiencia_minima
        varchar estado
        int empresa_id FK
        int creada_por_id FK
        datetime creada_en
        datetime actualizada_en
        datetime fecha_cierre
    }

    VACANTE_HABILIDADES {
        int vacante_id PK,FK
        int habilidad_id PK,FK
        boolean obligatoria
        int peso
    }

    POSTULACIONES {
        int id PK
        int candidato_id FK
        int vacante_id FK
        varchar estado
        float puntuacion_ia
        float similitud_texto
        float coincidencia_habilidades
        text perfil_analizado
        json habilidades_coincidentes
        json habilidades_faltantes
        text explicacion_ia
        datetime creada_en
        datetime actualizada_en
    }
```

## Relaciones principales

- Un rol puede pertenecer a muchos usuarios.
- Una empresa puede tener varios usuarios asociados.
- Una empresa puede publicar muchas vacantes.
- Un usuario reclutador o administrador puede crear varias vacantes.
- Usuarios y habilidades forman una relación N:M mediante `usuario_habilidades`.
- Vacantes y habilidades forman una relación N:M mediante `vacante_habilidades`.
- Candidatos y vacantes forman una relación N:M mediante `postulaciones`.

## Restricciones de integridad

### Usuarios

```text
email UNIQUE
experiencia_anios >= 0
```

### Usuario-habilidad

```text
PK(usuario_id, habilidad_id)
nivel IN (basico, intermedio, avanzado, experto)
experiencia_anios >= 0
```

### Vacantes

```text
salario_min >= 0
salario_max >= 0
salario_min <= salario_max
experiencia_minima >= 0
modalidad IN (remoto, presencial, hibrido)
estado IN (borrador, activa, pausada, cerrada)
```

### Vacante-habilidad

```text
PK(vacante_id, habilidad_id)
peso BETWEEN 1 AND 5
```

### Postulaciones

```text
UNIQUE(candidato_id, vacante_id)
estado IN (
    pendiente,
    revision,
    entrevista,
    seleccionado,
    rechazado
)
puntuacion_ia BETWEEN 0 AND 100
similitud_texto BETWEEN 0 AND 100
coincidencia_habilidades BETWEEN 0 AND 100
```

## Normalización

### Primera Forma Normal — 1FN

Cada tabla tiene filas identificables y columnas destinadas a un único concepto.

Las habilidades no se almacenan como una cadena como:

```text
"Angular, TypeScript, Git, PostgreSQL"
```

sino mediante un catálogo y tablas puente.

### Segunda Forma Normal — 2FN

Las entidades principales utilizan una clave primaria simple `id`.

En las tablas con clave compuesta:

```text
usuario_habilidades
vacante_habilidades
```

los atributos adicionales dependen de la relación completa.

Por ejemplo, `nivel` depende de un usuario específico y una habilidad específica.

### Tercera Forma Normal — 3FN

Los datos descriptivos se almacenan en su entidad correspondiente.

Ejemplos:

- el nombre de un rol está en `roles`, no repetido en `usuarios`;
- el nombre de una empresa está en `empresas`, no repetido en `vacantes`;
- el nombre de una habilidad está en `habilidades`, no duplicado en las tablas puente.

Esto reduce anomalías de actualización e inconsistencias.

## Decisiones de diseño

`postulaciones` conserva `perfil_analizado` y los resultados del matching. Esto es intencional: representa una fotografía del análisis realizado en ese momento, aunque el candidato modifique posteriormente su perfil.

Los arrays de habilidades coincidentes y faltantes se almacenan como JSON porque forman parte del resultado histórico del análisis y no constituyen el catálogo principal de habilidades.
