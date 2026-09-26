import ast
from pathlib import Path


def test_fronteiras_de_importacao():
    app = Path(__file__).resolve().parents[2] / "app"
    for pasta, proibidos in [
        ("api/routers", ("app.repositories",)),
        ("services", ("app.pipeline",)),
        ("domain", ("fastapi", "sqlalchemy", "app.api", "app.repositories")),
    ]:
        for arquivo in (app / pasta).glob("*.py"):
            for node in ast.walk(ast.parse(arquivo.read_text(encoding="utf-8-sig"))):
                if isinstance(node, ast.ImportFrom):
                    assert not (node.module or "").startswith(proibidos), arquivo.name
