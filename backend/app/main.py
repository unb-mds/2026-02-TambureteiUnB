from fastapi import FastAPI

app = FastAPI(title="API Tamburetei", version="1.0.0")


@app.get("/")
def read_root():
    return {"message": "API do Tamburetei rodando com sucesso!"}