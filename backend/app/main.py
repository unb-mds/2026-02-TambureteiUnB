from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.routers import auth, cursos, disciplinas, turmas, professores, catalogo, comentarios, comunidade, materiais, moderacao, dashboard, perfil

from app.core.config import settings
from app.api.routers import estatisticas_consolidadas

is_production = (settings.ENVIRONMENT or "").strip().lower() == "production"

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    docs_url=None if is_production else "/docs",
    redoc_url=None if is_production else "/redoc",
    openapi_url=None if is_production else f"{settings.API_V1_STR}/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.BACKEND_CORS_ORIGINS if isinstance(settings.BACKEND_CORS_ORIGINS, list) else [],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept"],
)

# Inclusão dos roteadores de API
app.include_router(auth.router)
app.include_router(cursos.router)
app.include_router(disciplinas.router)
app.include_router(turmas.router)
app.include_router(professores.router)
app.include_router(catalogo.router)
app.include_router(comentarios.router)
app.include_router(comunidade.router)
app.include_router(materiais.router)
app.include_router(estatisticas_consolidadas.router)
app.include_router(dashboard.router)
app.include_router(moderacao.router)
app.include_router(perfil.router)


@app.get("/")
def root():
    return {
        "project": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "status": "online",
        "docs": "/docs"
    }

@app.get("/health")
def health_check():
    return {"status": "ok"}
