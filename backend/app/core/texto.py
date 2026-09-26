import re
import unicodedata


def slugify(text: str) -> str:
    """Gera um slug canônico a partir de uma string textual (ex: 'Cálculo 1' -> 'calculo-1')."""
    text = unicodedata.normalize("NFKD", text).encode("ascii", "ignore").decode("ascii")
    text = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    return re.sub(r"[-\s]+", "-", text)
