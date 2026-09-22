from fastapi import FastAPI
from app.api.routers import auth, cursos, disciplinas

app = FastAPI(title="API Tamburetei", version="1.0.0")

app.include_router(auth.router)
app.include_router(cursos.router)
app.include_router(disciplinas.router)


@app.get("/")
def read_root():
    return {"message": "API do Tamburetei rodando com sucesso!"}
