from fastapi import FastAPI

app = FastAPI(
    title="TalentIA API",
    description="API para la plataforma de reclutamiento TalentIA",
    version="1.0.0"
)


@app.get("/")
def home():
    return {
        "message": "TalentIA API funcionando correctamente"
    }


@app.get("/health")
def health():
    return {
        "status": "ok"
    }