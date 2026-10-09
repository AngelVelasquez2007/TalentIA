"""
============================================================
TalentIA - Verificación E2E de la API
Archivo sugerido: backend/e2e_check.py
============================================================

Este script prueba el flujo real de TalentIA contra FastAPI:

1. Health check.
2. PostgreSQL.
3. Catálogo de vacantes.
4. Login candidato.
5. Perfil e habilidades guardadas.
6. Matching TF-IDF + similitud coseno + habilidades.
7. Postulación (modo --full).
8. Login reclutador.
9. Ranking de candidatos.
10. Flujo de estados (modo --full).
11. Confirmación del estado desde el candidato.

No requiere paquetes adicionales: utiliza únicamente la biblioteca
estándar de Python.

Uso seguro / lectura:
    python e2e_check.py

Prueba completa con escritura:
    python e2e_check.py --full

IMPORTANTE:
El modo --full puede crear una postulación de Ana y avanzar su estado
hasta "seleccionado". Está pensado para la prueba final del proyecto.
============================================================
"""

from __future__ import annotations

import argparse
import json
import sys
from dataclasses import dataclass
from typing import Any
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen


DEFAULT_BASE_URL = "http://127.0.0.1:8000"
CANDIDATE_EMAIL = "ana@talentia.local"
RECRUITER_EMAIL = "reclutador@technova.local"
DEMO_PASSWORD = "TalentIA123"
TARGET_COMPANY = "TechNova Solutions"
PREFERRED_VACANCY = "Desarrollador Angular Junior"
TIMEOUT_SECONDS = 20


class CheckFailure(RuntimeError):
    """Error funcional durante la verificación E2E."""


@dataclass
class ApiResponse:
    status: int
    data: Any


class ApiClient:
    def __init__(self, base_url: str):
        self.base_url = base_url.rstrip("/")

    def request(
        self,
        method: str,
        path: str,
        *,
        token: str | None = None,
        body: Any | None = None,
        expected: set[int] | None = None,
    ) -> ApiResponse:
        url = f"{self.base_url}{path}"

        headers = {
            "Accept": "application/json",
        }

        payload: bytes | None = None

        if body is not None:
            payload = json.dumps(body).encode("utf-8")
            headers["Content-Type"] = "application/json"

        if token:
            headers["Authorization"] = f"Bearer {token}"

        request = Request(
            url=url,
            data=payload,
            headers=headers,
            method=method.upper(),
        )

        try:
            with urlopen(
                request,
                timeout=TIMEOUT_SECONDS,
            ) as response:
                raw = response.read().decode("utf-8")
                data = json.loads(raw) if raw else None
                result = ApiResponse(
                    status=response.status,
                    data=data,
                )

        except HTTPError as error:
            raw = error.read().decode("utf-8")

            try:
                data = json.loads(raw) if raw else None
            except json.JSONDecodeError:
                data = raw

            result = ApiResponse(
                status=error.code,
                data=data,
            )

        except URLError as error:
            raise CheckFailure(
                "No fue posible conectar con FastAPI en "
                f"{self.base_url}. Detalle: {error.reason}"
            ) from error

        if expected is not None and result.status not in expected:
            raise CheckFailure(
                f"{method.upper()} {path} devolvió HTTP {result.status}. "
                f"Respuesta: {result.data}"
            )

        return result


def pass_check(message: str) -> None:
    print(f"[OK]   {message}")


def info(message: str) -> None:
    print(f"[INFO] {message}")


def warn(message: str) -> None:
    print(f"[WARN] {message}")


def login(
    client: ApiClient,
    email: str,
) -> str:
    response = client.request(
        "POST",
        "/auth/login",
        body={
            "email": email,
            "password": DEMO_PASSWORD,
        },
        expected={200},
    )

    token = (
        response.data.get("access_token")
        if isinstance(response.data, dict)
        else None
    )

    if not token:
        raise CheckFailure(
            f"El login de {email} respondió 200 pero no entregó access_token."
        )

    pass_check(f"Login correcto: {email}")
    return token


def get_skill_names(profile: dict[str, Any]) -> list[str]:
    result: list[str] = []

    for item in profile.get("habilidades") or []:
        habilidad = item.get("habilidad") or {}
        nombre = str(habilidad.get("nombre") or "").strip()

        if nombre:
            result.append(nombre)

    return result


def select_target_vacancy(
    vacancies: list[dict[str, Any]],
    applications: list[dict[str, Any]],
    *,
    full_mode: bool,
) -> dict[str, Any]:
    technova = [
        vacancy
        for vacancy in vacancies
        if (vacancy.get("empresa") or {}).get("nombre") == TARGET_COMPANY
    ]

    if not technova:
        raise CheckFailure(
            f"No se encontró ninguna vacante activa de {TARGET_COMPANY}."
        )

    applied_ids = {
        (application.get("vacante") or {}).get("id")
        for application in applications
    }

    preferred = next(
        (
            vacancy
            for vacancy in technova
            if vacancy.get("titulo") == PREFERRED_VACANCY
        ),
        None,
    )

    if full_mode:
        # Para probar creación de postulación preferimos una vacante
        # de TechNova a la que Ana todavía no se haya postulado.
        not_applied = [
            vacancy
            for vacancy in technova
            if vacancy.get("id") not in applied_ids
        ]

        if preferred and preferred.get("id") not in applied_ids:
            return preferred

        if not_applied:
            return not_applied[0]

    if preferred:
        return preferred

    return technova[0]


def find_application(
    applications: list[dict[str, Any]],
    vacancy_id: int,
) -> dict[str, Any] | None:
    return next(
        (
            application
            for application in applications
            if (application.get("vacante") or {}).get("id") == vacancy_id
        ),
        None,
    )


def run(full_mode: bool, base_url: str) -> None:
    client = ApiClient(base_url)

    print()
    print("=" * 62)
    print("TalentIA - Verificación E2E")
    print("=" * 62)
    print(f"API: {client.base_url}")
    print(f"Modo: {'COMPLETO (con escritura)' if full_mode else 'LECTURA'}")
    print()

    # ========================================================
    # 1. SISTEMA
    # ========================================================

    health = client.request(
        "GET",
        "/health",
        expected={200},
    )

    if health.data != {"status": "ok"}:
        raise CheckFailure(
            f"/health respondió un contenido inesperado: {health.data}"
        )

    pass_check("FastAPI responde correctamente.")

    database = client.request(
        "GET",
        "/database-test",
        expected={200},
    )

    if not isinstance(database.data, dict) or database.data.get("database") != "ok":
        raise CheckFailure(
            f"La prueba de PostgreSQL no fue satisfactoria: {database.data}"
        )

    pass_check("PostgreSQL responde correctamente.")

    # ========================================================
    # 2. VACANTES PÚBLICAS
    # ========================================================

    vacancies_response = client.request(
        "GET",
        "/vacantes",
        expected={200},
    )

    vacancies = vacancies_response.data

    if not isinstance(vacancies, list) or not vacancies:
        raise CheckFailure(
            "GET /vacantes no devolvió vacantes activas. "
            "Ejecuta el seed antes de continuar."
        )

    pass_check(f"Catálogo público: {len(vacancies)} vacante(s) activa(s).")

    # ========================================================
    # 3. CANDIDATO
    # ========================================================

    candidate_token = login(
        client,
        CANDIDATE_EMAIL,
    )

    profile_response = client.request(
        "GET",
        "/usuarios/me",
        token=candidate_token,
        expected={200},
    )

    profile = profile_response.data

    if not isinstance(profile, dict):
        raise CheckFailure("/usuarios/me no devolvió un objeto JSON válido.")

    role_name = (profile.get("rol") or {}).get("nombre")

    if role_name != "candidato":
        raise CheckFailure(
            f"Ana debería tener rol candidato, pero recibió: {role_name}"
        )

    professional_profile = str(
        profile.get("perfil_profesional") or ""
    ).strip()

    skills = get_skill_names(profile)

    if len(professional_profile) < 20:
        raise CheckFailure(
            "El perfil profesional de Ana tiene menos de 20 caracteres. "
            "Completa /perfil antes de ejecutar la prueba E2E."
        )

    if not skills:
        raise CheckFailure(
            "Ana no tiene habilidades guardadas. "
            "Agrega habilidades desde /perfil antes de continuar."
        )

    pass_check(
        "Perfil candidato cargado: "
        f"{len(skills)} habilidad(es), "
        f"{profile.get('experiencia_anios', 0)} año(s) de experiencia."
    )

    # ========================================================
    # 4. POSTULACIONES EXISTENTES
    # ========================================================

    applications_response = client.request(
        "GET",
        "/postulaciones/mis-postulaciones",
        token=candidate_token,
        expected={200},
    )

    applications = applications_response.data

    if not isinstance(applications, list):
        raise CheckFailure(
            "/postulaciones/mis-postulaciones no devolvió una lista."
        )

    pass_check(
        f"Mis postulaciones responde correctamente: {len(applications)} registro(s)."
    )

    vacancy = select_target_vacancy(
        vacancies,
        applications,
        full_mode=full_mode,
    )

    vacancy_id = int(vacancy["id"])
    vacancy_title = str(vacancy.get("titulo") or vacancy_id)

    info(f"Vacante usada en la prueba: #{vacancy_id} - {vacancy_title}")

    # ========================================================
    # 5. MATCHING
    # ========================================================

    analysis_response = client.request(
        "POST",
        f"/analisis/vacantes/{vacancy_id}",
        token=candidate_token,
        body={
            "perfil_profesional": professional_profile,
            "habilidades": skills,
        },
        expected={200},
    )

    analysis = analysis_response.data

    required_analysis_fields = {
        "puntuacion",
        "similitud_texto",
        "coincidencia_habilidades",
        "clasificacion",
        "habilidades_coincidentes",
        "habilidades_faltantes",
        "explicacion",
    }

    if not isinstance(analysis, dict) or not required_analysis_fields.issubset(analysis):
        raise CheckFailure(
            f"El motor de matching devolvió un contrato incompleto: {analysis}"
        )

    score = analysis.get("puntuacion")

    if not isinstance(score, (int, float)) or not 0 <= float(score) <= 100:
        raise CheckFailure(
            f"Puntuación de matching fuera de rango: {score}"
        )

    pass_check(
        "Matching operativo: "
        f"{float(score):.1f}% ({analysis.get('clasificacion')})."
    )

    application = find_application(
        applications,
        vacancy_id,
    )

    # ========================================================
    # 6. POSTULACIÓN - MODO COMPLETO
    # ========================================================

    if full_mode and application is None:
        create_response = client.request(
            "POST",
            "/postulaciones",
            token=candidate_token,
            body={
                "vacante_id": vacancy_id,
            },
            expected={201, 409},
        )

        if create_response.status == 201:
            application = create_response.data
            pass_check("Postulación creada correctamente.")
        else:
            warn(
                "La API indicó que la postulación ya existía; "
                "se volverá a consultar."
            )

        refreshed = client.request(
            "GET",
            "/postulaciones/mis-postulaciones",
            token=candidate_token,
            expected={200},
        ).data

        application = find_application(
            refreshed,
            vacancy_id,
        )

        if application is None:
            raise CheckFailure(
                "No fue posible localizar la postulación después de crearla."
            )

    elif application is not None:
        pass_check(
            "La postulación candidato → vacante ya existe "
            f"(estado: {application.get('estado')})."
        )

    elif not full_mode:
        info(
            "Modo lectura: no se creará una postulación. "
            "Usa --full para probar escritura y flujo de estados."
        )

    # ========================================================
    # 7. RECLUTADOR
    # ========================================================

    recruiter_token = login(
        client,
        RECRUITER_EMAIL,
    )

    recruiter_profile = client.request(
        "GET",
        "/auth/me",
        token=recruiter_token,
        expected={200},
    ).data

    recruiter_role = (
        (recruiter_profile or {}).get("rol") or {}
    ).get("nombre")

    if recruiter_role != "reclutador":
        raise CheckFailure(
            f"La cuenta reclutador recibió rol inesperado: {recruiter_role}"
        )

    pass_check("Rol de reclutador validado.")

    ranking = client.request(
        "GET",
        f"/postulaciones/ranking/{vacancy_id}",
        token=recruiter_token,
        expected={200},
    ).data

    if not isinstance(ranking, list):
        raise CheckFailure("El ranking no devolvió una lista JSON.")

    pass_check(
        f"Ranking de la vacante responde: {len(ranking)} candidato(s)."
    )

    if application is not None:
        application_id = int(application["id"])

        ranking_item = next(
            (
                item
                for item in ranking
                if item.get("postulacion_id") == application_id
            ),
            None,
        )

        if ranking_item is None:
            raise CheckFailure(
                "La postulación existe para Ana pero no aparece en el ranking del reclutador."
            )

        pass_check("Ana aparece correctamente en el ranking del reclutador.")

        # ====================================================
        # 8. TRANSICIONES - MODO COMPLETO
        # ====================================================

        if full_mode:
            current_state = str(
                ranking_item.get("estado")
                or application.get("estado")
                or ""
            )

            transitions = {
                "pendiente": "revision",
                "revision": "entrevista",
                "entrevista": "seleccionado",
            }

            while current_state in transitions:
                next_state = transitions[current_state]

                updated = client.request(
                    "PUT",
                    f"/postulaciones/{application_id}/estado",
                    token=recruiter_token,
                    body={
                        "estado": next_state,
                    },
                    expected={200},
                ).data

                current_state = str(
                    updated.get("estado")
                    if isinstance(updated, dict)
                    else ""
                )

                if current_state != next_state:
                    raise CheckFailure(
                        "La transición de estado respondió 200 pero "
                        f"no quedó en '{next_state}'."
                    )

                pass_check(
                    f"Transición de estado correcta: {next_state}."
                )

            if current_state == "seleccionado":
                pass_check("Flujo de selección completado hasta seleccionado.")
            elif current_state == "rechazado":
                warn(
                    "La postulación ya estaba rechazada. "
                    "Es un estado terminal y no puede avanzar a seleccionado."
                )
            else:
                raise CheckFailure(
                    f"Estado de postulación no reconocido: {current_state}"
                )

            # Confirmar sincronización desde la vista del candidato.
            final_applications = client.request(
                "GET",
                "/postulaciones/mis-postulaciones",
                token=candidate_token,
                expected={200},
            ).data

            final_application = find_application(
                final_applications,
                vacancy_id,
            )

            if final_application is None:
                raise CheckFailure(
                    "La postulación desapareció de la vista del candidato."
                )

            final_state = final_application.get("estado")
            pass_check(
                "El candidato ve el estado actualizado: "
                f"{final_state}."
            )

    elif full_mode:
        raise CheckFailure(
            "El modo completo esperaba una postulación pero no pudo obtenerla."
        )

    # ========================================================
    # RESULTADO
    # ========================================================

    print()
    print("=" * 62)
    print("RESULTADO: VERIFICACIÓN E2E COMPLETADA SIN ERRORES")
    print("=" * 62)
    print()

    if not full_mode:
        print(
            "La comprobación fue de lectura. Para validar también "
            "postulación y cambios de estado ejecuta:\n"
            "\n    python e2e_check.py --full\n"
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Verificación E2E de TalentIA.",
    )

    parser.add_argument(
        "--full",
        action="store_true",
        help=(
            "Prueba también creación de postulación y transiciones "
            "de estado. Puede modificar datos de demostración."
        ),
    )

    parser.add_argument(
        "--base-url",
        default=DEFAULT_BASE_URL,
        help=(
            "URL base de FastAPI. "
            f"Predeterminada: {DEFAULT_BASE_URL}"
        ),
    )

    return parser.parse_args()


def main() -> int:
    args = parse_args()

    try:
        run(
            full_mode=args.full,
            base_url=args.base_url,
        )
        return 0

    except CheckFailure as error:
        print()
        print("=" * 62)
        print("RESULTADO: FALLÓ LA VERIFICACIÓN E2E")
        print("=" * 62)
        print(f"[ERROR] {error}")
        print()
        return 1

    except KeyboardInterrupt:
        print("\nPrueba cancelada por el usuario.")
        return 130


if __name__ == "__main__":
    sys.exit(main())
