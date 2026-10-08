"""
============================================================
TalentIA - Motor de compatibilidad IA / NLP
Archivo: app/matching.py
============================================================

Este módulo calcula la compatibilidad entre:

    PERFIL DEL CANDIDATO
              |
              v
        Motor TalentIA
              |
              v
        VACANTE LABORAL

El resultado combina dos componentes:

1. SIMILITUD TEXTUAL
   TF-IDF + similitud coseno.

2. COINCIDENCIA DE HABILIDADES
   Se comparan las competencias del candidato contra las
   requeridas por la vacante, teniendo en cuenta el peso
   asignado a cada habilidad.

PESO DEL RESULTADO FINAL:

    65% habilidades
    35% similitud textual

Si la vacante no contiene habilidades estructuradas,
el sistema intenta detectarlas automáticamente dentro
del texto de requisitos.

IMPORTANTE:
Este módulo sirve como apoyo para reclutamiento.
NO toma decisiones automáticas de contratación.
============================================================
"""

import re
import unicodedata

from dataclasses import dataclass

from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity


# ============================================================
# 1. CONFIGURACIÓN DEL MOTOR
# ============================================================

# Peso de cada componente en la puntuación final.
PESO_HABILIDADES = 0.65
PESO_TEXTO = 0.35


# ============================================================
# 2. STOPWORDS EN ESPAÑOL
# ============================================================

# Palabras muy frecuentes que normalmente aportan poco valor
# al comparar un perfil profesional contra una vacante.
#
# Ejemplo:
#
# "el candidato debe tener experiencia en Angular"
#
# Nos interesan principalmente:
#
# candidato
# experiencia
# Angular
#
# y no palabras como:
#
# el, en, debe, tener...
STOPWORDS_ES = {
    "a",
    "al",
    "algo",
    "como",
    "con",
    "contra",
    "cual",
    "cuando",
    "de",
    "del",
    "desde",
    "donde",
    "el",
    "ella",
    "ellos",
    "en",
    "entre",
    "era",
    "es",
    "esa",
    "ese",
    "eso",
    "esta",
    "este",
    "esto",
    "ha",
    "hay",
    "la",
    "las",
    "lo",
    "los",
    "mas",
    "me",
    "mi",
    "muy",
    "no",
    "o",
    "para",
    "pero",
    "por",
    "que",
    "se",
    "ser",
    "si",
    "sin",
    "sobre",
    "su",
    "sus",
    "tambien",
    "te",
    "tener",
    "un",
    "una",
    "uno",
    "unos",
    "unas",
    "y",
    "ya",
}


# ============================================================
# 3. CATÁLOGO DE HABILIDADES Y ALIAS
# ============================================================

# El nombre de la izquierda es el nombre canónico que mostrará
# TalentIA.
#
# Los elementos de la derecha son diferentes formas en las
# que esa habilidad puede aparecer en un CV o descripción.
#
# Ejemplo:
#
# PostgreSQL:
#
#   "postgresql"
#   "postgres"
#
# se interpretan como la misma competencia.
SKILL_ALIASES = {
    "Angular": {
        "angular",
        "angularjs",
    },

    "TypeScript": {
        "typescript",
        "ts",
    },

    "JavaScript": {
        "javascript",
        "js",
    },

    "HTML": {
        "html",
        "html5",
    },

    "CSS": {
        "css",
        "css3",
    },

    "Python": {
        "python",
    },

    "FastAPI": {
        "fastapi",
        "fast api",
    },

    "Django": {
        "django",
        "django rest framework",
        "drf",
    },

    "Flask": {
        "flask",
    },

    "PostgreSQL": {
        "postgresql",
        "postgres",
    },

    "MySQL": {
        "mysql",
    },

    "SQL": {
        "sql",
    },

    "REST": {
        "rest",
        "rest api",
        "api rest",
        "apis rest",
    },

    "Git": {
        "git",
    },

    "GitHub": {
        "github",
    },

    "Docker": {
        "docker",
    },

    "Kubernetes": {
        "kubernetes",
        "k8s",
    },

    "AWS": {
        "aws",
        "amazon web services",
    },

    "Azure": {
        "azure",
        "microsoft azure",
    },

    "React": {
        "react",
        "reactjs",
        "react js",
    },

    "Vue": {
        "vue",
        "vuejs",
        "vue js",
    },

    "Node.js": {
        "node",
        "nodejs",
        "node js",
        "node.js",
    },

    "Java": {
        "java",
    },

    "Spring Boot": {
        "spring boot",
        "springboot",
    },

    "C#": {
        "c#",
        "c sharp",
    },

    ".NET": {
        ".net",
        "dotnet",
    },

    "Machine Learning": {
        "machine learning",
        "aprendizaje automatico",
    },

    "Scikit-learn": {
        "scikit learn",
        "scikit-learn",
        "sklearn",
    },

    "Pandas": {
        "pandas",
    },

    "NumPy": {
        "numpy",
    },

    "Linux": {
        "linux",
    },

    "Scrum": {
        "scrum",
    },

    "Figma": {
        "figma",
    },
}


# ============================================================
# 4. ESTRUCTURA INTERNA DE HABILIDAD REQUERIDA
# ============================================================

@dataclass
class HabilidadRequerida:
    """
    Representación interna de una habilidad requerida
    por una vacante.

    nombre:
        nombre normalizado de la habilidad.

    peso:
        importancia entre 1 y 5.

    obligatoria:
        indica si es una competencia fundamental.
    """

    nombre: str
    peso: int = 3
    obligatoria: bool = True


# ============================================================
# 5. NORMALIZACIÓN DE TEXTO
# ============================================================

def normalizar_texto(texto: str | None) -> str:
    """
    Normaliza texto antes de procesarlo.

    Pasos:

    1. convierte a minúsculas;
    2. elimina tildes;
    3. conserva caracteres útiles;
    4. elimina espacios repetidos.

    Ejemplo:

        "Desarrollador ÁNGULAR, Python."

    se convierte aproximadamente en:

        "desarrollador angular python"
    """

    if not texto:
        return ""

    texto = texto.lower().strip()

    # Separa caracteres con tilde.
    texto = unicodedata.normalize(
        "NFKD",
        texto,
    )

    # Elimina marcas de acentuación.
    texto = "".join(
        caracter
        for caracter in texto
        if not unicodedata.combining(caracter)
    )

    # Conservamos letras, números y ciertos símbolos técnicos.
    texto = re.sub(
        r"[^a-z0-9+#.\s-]",
        " ",
        texto,
    )

    # Unifica espacios múltiples.
    texto = re.sub(
        r"\s+",
        " ",
        texto,
    )

    return texto.strip()


# ============================================================
# 6. NORMALIZACIÓN DE NOMBRE DE HABILIDAD
# ============================================================

def normalizar_nombre_habilidad(
    nombre: str,
) -> str:
    """
    Intenta convertir un alias a su nombre canónico.

    Ejemplo:

        postgres
            ↓
        PostgreSQL

        reactjs
            ↓
        React
    """

    nombre_normalizado = normalizar_texto(
        nombre
    )

    for nombre_canonico, aliases in (
        SKILL_ALIASES.items()
    ):
        aliases_normalizados = {
            normalizar_texto(alias)
            for alias in aliases
        }

        if (
            nombre_normalizado
            == normalizar_texto(nombre_canonico)
            or nombre_normalizado
            in aliases_normalizados
        ):
            return nombre_canonico

    # Si no existe en nuestro catálogo, conservamos el nombre
    # original limpio.
    return nombre.strip()


# ============================================================
# 7. DETECTAR HABILIDADES EN UN TEXTO
# ============================================================

def detectar_habilidades(
    texto: str | None,
) -> set[str]:
    """
    Detecta habilidades conocidas dentro de un texto.

    Ejemplo:

        "Tengo experiencia en Angular, TS y PostgreSQL"

    podría producir:

        {
            "Angular",
            "TypeScript",
            "PostgreSQL"
        }
    """

    texto_normalizado = normalizar_texto(
        texto
    )

    if not texto_normalizado:
        return set()

    encontradas: set[str] = set()

    for (
        nombre_canonico,
        aliases,
    ) in SKILL_ALIASES.items():

        variantes = set(aliases)
        variantes.add(nombre_canonico)

        for variante in variantes:
            variante_normalizada = (
                normalizar_texto(variante)
            )

            # Usamos límites personalizados para evitar que,
            # por ejemplo, "java" coincida accidentalmente
            # dentro de "javascript".
            patron = (
                r"(?<![a-z0-9])"
                + re.escape(variante_normalizada)
                + r"(?![a-z0-9])"
            )

            if re.search(
                patron,
                texto_normalizado,
            ):
                encontradas.add(
                    nombre_canonico
                )

                break

    return encontradas


# ============================================================
# 8. SIMILITUD TF-IDF + COSENO
# ============================================================

def calcular_similitud_textual(
    perfil: str,
    texto_vacante: str,
) -> float:
    """
    Calcula similitud textual entre candidato y vacante.

    TÉCNICA:

        TF-IDF
            +
        similitud coseno

    --------------------------------
    ¿Qué hace TF-IDF?
    --------------------------------

    Convierte palabras en valores numéricos considerando:

    TF:
        frecuencia de una palabra dentro de un documento.

    IDF:
        importancia de esa palabra respecto a los documentos
        comparados.

    --------------------------------
    ¿Qué hace similitud coseno?
    --------------------------------

    Compara el ángulo entre dos vectores.

    Resultado:

        0   -> muy poca similitud
        1   -> máxima similitud

    TalentIA lo transforma a:

        0 - 100 %
    """

    perfil_normalizado = normalizar_texto(
        perfil
    )

    vacante_normalizada = normalizar_texto(
        texto_vacante
    )

    if (
        not perfil_normalizado
        or not vacante_normalizada
    ):
        return 0.0

    try:
        vectorizador = TfidfVectorizer(
            stop_words=list(STOPWORDS_ES),

            # Analiza palabras individuales y también
            # combinaciones de dos palabras.
            #
            # Ejemplos:
            #
            # "python"
            # "machine learning"
            ngram_range=(1, 2),

            # Reduce el impacto excesivo de repeticiones.
            sublinear_tf=True,

            max_features=5000,
        )

        matriz = vectorizador.fit_transform(
            [
                perfil_normalizado,
                vacante_normalizada,
            ]
        )

        similitud = cosine_similarity(
            matriz[0:1],
            matriz[1:2],
        )[0][0]

        porcentaje = float(
            similitud * 100
        )

        return round(
            max(
                0.0,
                min(100.0, porcentaje),
            ),
            2,
        )

    except ValueError:
        # Puede ocurrir si después de limpiar stopwords
        # no queda vocabulario útil.
        return 0.0


# ============================================================
# 9. EXTRAER HABILIDADES ESTRUCTURADAS DE LA VACANTE
# ============================================================

def obtener_habilidades_vacante(
    vacante,
) -> list[HabilidadRequerida]:
    """
    Obtiene las competencias requeridas por una vacante.

    Primero intenta usar:

        vacante.habilidades

    proveniente de la relación SQLAlchemy:

        VacanteHabilidad

    Si la vacante todavía no tiene habilidades estructuradas,
    intenta detectarlas automáticamente dentro de:

        requisitos
        descripcion
    """

    resultado: list[HabilidadRequerida] = []

    relaciones = getattr(
        vacante,
        "habilidades",
        None,
    )

    if relaciones:
        for relacion in relaciones:
            habilidad = getattr(
                relacion,
                "habilidad",
                None,
            )

            if habilidad is None:
                continue

            nombre = getattr(
                habilidad,
                "nombre",
                "",
            )

            if not nombre:
                continue

            resultado.append(
                HabilidadRequerida(
                    nombre=normalizar_nombre_habilidad(
                        nombre
                    ),
                    peso=max(
                        1,
                        min(
                            5,
                            int(
                                getattr(
                                    relacion,
                                    "peso",
                                    3,
                                )
                            ),
                        ),
                    ),
                    obligatoria=bool(
                        getattr(
                            relacion,
                            "obligatoria",
                            True,
                        )
                    ),
                )
            )

    # --------------------------------------------------------
    # FALLBACK
    # --------------------------------------------------------
    #
    # Si todavía no se configuraron habilidades estructuradas,
    # extraemos tecnologías directamente del texto.
    if not resultado:

        texto = " ".join(
            [
                getattr(
                    vacante,
                    "requisitos",
                    "",
                )
                or "",
                getattr(
                    vacante,
                    "descripcion",
                    "",
                )
                or "",
            ]
        )

        detectadas = sorted(
            detectar_habilidades(texto)
        )

        resultado = [
            HabilidadRequerida(
                nombre=nombre,
                peso=3,
                obligatoria=True,
            )
            for nombre in detectadas
        ]

    return resultado


# ============================================================
# 10. HABILIDADES DEL CANDIDATO
# ============================================================

def obtener_habilidades_candidato(
    perfil_profesional: str,
    habilidades: list[str] | None = None,
) -> set[str]:
    """
    Combina:

    - habilidades enviadas explícitamente por Angular;
    - habilidades detectadas en el perfil profesional.

    De esta manera el análisis funciona incluso si el usuario
    todavía no ha estructurado completamente su perfil.
    """

    resultado = detectar_habilidades(
        perfil_profesional
    )

    for habilidad in habilidades or []:
        if not habilidad:
            continue

        resultado.add(
            normalizar_nombre_habilidad(
                habilidad
            )
        )

    return resultado


# ============================================================
# 11. COINCIDENCIA PONDERADA DE HABILIDADES
# ============================================================

def calcular_coincidencia_habilidades(
    habilidades_candidato: set[str],
    habilidades_requeridas: list[
        HabilidadRequerida
    ],
) -> tuple[
    float,
    list[str],
    list[str],
]:
    """
    Calcula qué porcentaje de las habilidades requeridas
    posee el candidato.

    Las habilidades tienen peso.

    Ejemplo:

        Angular      peso 5
        TypeScript   peso 5
        Git          peso 2

    Si el candidato tiene Angular y Git:

        puntos obtenidos = 5 + 2 = 7
        puntos posibles = 5 + 5 + 2 = 12

        compatibilidad = 7 / 12 * 100
    """

    if not habilidades_requeridas:
        return (
            0.0,
            [],
            [],
        )

    candidato_normalizado = {
        normalizar_nombre_habilidad(
            habilidad
        )
        for habilidad in habilidades_candidato
    }

    total_peso = 0
    peso_coincidente = 0

    coincidentes: list[str] = []
    faltantes: list[str] = []

    for requerida in habilidades_requeridas:

        peso = max(
            1,
            min(
                5,
                requerida.peso,
            ),
        )

        total_peso += peso

        nombre = normalizar_nombre_habilidad(
            requerida.nombre
        )

        if nombre in candidato_normalizado:
            peso_coincidente += peso

            coincidentes.append(
                nombre
            )

        else:
            faltantes.append(
                nombre
            )

    if total_peso == 0:
        porcentaje = 0.0

    else:
        porcentaje = (
            peso_coincidente
            / total_peso
            * 100
        )

    return (
        round(porcentaje, 2),
        sorted(set(coincidentes)),
        sorted(set(faltantes)),
    )


# ============================================================
# 12. CLASIFICACIÓN
# ============================================================

def clasificar_puntuacion(
    puntuacion: float,
) -> str:
    """
    Convierte un porcentaje en una categoría fácil
    de interpretar desde Angular.
    """

    if puntuacion < 40:
        return "baja"

    if puntuacion < 65:
        return "media"

    if puntuacion < 80:
        return "alta"

    return "muy_alta"


# ============================================================
# 13. CREAR EXPLICACIÓN DEL RESULTADO
# ============================================================

def generar_explicacion(
    puntuacion: float,
    similitud_texto: float,
    coincidencia_habilidades: float,
    coincidentes: list[str],
    faltantes: list[str],
) -> str:
    """
    Genera una explicación legible para el usuario.

    Esto ayuda a que el resultado sea interpretable.

    No mostramos únicamente:

        82%

    sino también POR QUÉ obtuvo esa puntuación.
    """

    clasificacion = clasificar_puntuacion(
        puntuacion
    )

    nombres_clasificacion = {
        "baja": "baja",
        "media": "media",
        "alta": "alta",
        "muy_alta": "muy alta",
    }

    partes = [
        (
            f"La compatibilidad estimada es "
            f"{nombres_clasificacion[clasificacion]} "
            f"({puntuacion:.2f}%)."
        ),
        (
            f"La similitud textual TF-IDF/coseno "
            f"es {similitud_texto:.2f}% y la "
            f"coincidencia de habilidades es "
            f"{coincidencia_habilidades:.2f}%."
        ),
    ]

    if coincidentes:
        partes.append(
            "Competencias coincidentes: "
            + ", ".join(coincidentes)
            + "."
        )

    if faltantes:
        partes.append(
            "Competencias requeridas que no fueron "
            "detectadas: "
            + ", ".join(faltantes)
            + "."
        )

    partes.append(
        "Este resultado es una herramienta de apoyo y "
        "no reemplaza la evaluación humana del candidato."
    )

    return " ".join(partes)


# ============================================================
# 14. ANÁLISIS PRINCIPAL
# ============================================================

def analizar_compatibilidad(
    perfil_profesional: str,
    vacante,
    habilidades_candidato: list[str] | None = None,
) -> dict:
    """
    Ejecuta el análisis completo candidato-vacante.

    PARÁMETROS
    ----------

    perfil_profesional:
        texto profesional escrito por el candidato.

    vacante:
        objeto Vacante de SQLAlchemy.

    habilidades_candidato:
        lista opcional de habilidades estructuradas.

    RESULTADO
    ---------

    Devuelve un diccionario compatible con:

        AnalisisCompatibilidadResponse

    definido en schemas.py.
    """

    # --------------------------------------------------------
    # 1. TEXTO DE LA VACANTE
    # --------------------------------------------------------

    texto_vacante = " ".join(
        [
            getattr(
                vacante,
                "titulo",
                "",
            )
            or "",

            getattr(
                vacante,
                "descripcion",
                "",
            )
            or "",

            getattr(
                vacante,
                "requisitos",
                "",
            )
            or "",

            getattr(
                vacante,
                "responsabilidades",
                "",
            )
            or "",
        ]
    )

    # --------------------------------------------------------
    # 2. TF-IDF + COSINE SIMILARITY
    # --------------------------------------------------------

    similitud_texto = (
        calcular_similitud_textual(
            perfil_profesional,
            texto_vacante,
        )
    )

    # --------------------------------------------------------
    # 3. HABILIDADES DEL CANDIDATO
    # --------------------------------------------------------

    habilidades_detectadas = (
        obtener_habilidades_candidato(
            perfil_profesional,
            habilidades_candidato,
        )
    )

    # --------------------------------------------------------
    # 4. HABILIDADES REQUERIDAS
    # --------------------------------------------------------

    habilidades_requeridas = (
        obtener_habilidades_vacante(
            vacante
        )
    )

    # --------------------------------------------------------
    # 5. COINCIDENCIA DE HABILIDADES
    # --------------------------------------------------------

    (
        coincidencia_habilidades,
        habilidades_coincidentes,
        habilidades_faltantes,
    ) = calcular_coincidencia_habilidades(
        habilidades_detectadas,
        habilidades_requeridas,
    )

    # --------------------------------------------------------
    # 6. CALCULAR PUNTUACIÓN FINAL
    # --------------------------------------------------------

    if habilidades_requeridas:
        puntuacion = (
            coincidencia_habilidades
            * PESO_HABILIDADES
            +
            similitud_texto
            * PESO_TEXTO
        )

    else:
        # Si no logramos identificar tecnologías concretas,
        # usamos únicamente el análisis textual para evitar
        # penalizar artificialmente al candidato.
        puntuacion = similitud_texto

    puntuacion = round(
        max(
            0.0,
            min(
                100.0,
                puntuacion,
            ),
        ),
        2,
    )

    # --------------------------------------------------------
    # 7. CLASIFICACIÓN
    # --------------------------------------------------------

    clasificacion = (
        clasificar_puntuacion(
            puntuacion
        )
    )

    # --------------------------------------------------------
    # 8. EXPLICACIÓN
    # --------------------------------------------------------

    explicacion = generar_explicacion(
        puntuacion,
        similitud_texto,
        coincidencia_habilidades,
        habilidades_coincidentes,
        habilidades_faltantes,
    )

    # --------------------------------------------------------
    # 9. RESPUESTA
    # --------------------------------------------------------

    return {
        "puntuacion": puntuacion,

        "similitud_texto": (
            similitud_texto
        ),

        "coincidencia_habilidades": (
            coincidencia_habilidades
        ),

        "clasificacion": clasificacion,

        "habilidades_coincidentes": (
            habilidades_coincidentes
        ),

        "habilidades_faltantes": (
            habilidades_faltantes
        ),

        "explicacion": explicacion,
    }


# ============================================================
# 15. ALIAS DE COMPATIBILIDAD
# ============================================================

# Si alguno de los archivos anteriores utilizaba el nombre
# calculate_match, este alias evita romper temporalmente
# importaciones mientras terminamos los routers.
calculate_match = analizar_compatibilidad