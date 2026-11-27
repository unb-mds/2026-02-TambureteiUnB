import threading
import time
import uuid
from datetime import datetime, timedelta, timezone
import bcrypt
from jose import jwt, JWTError

from app.core.config import settings

SECRET_KEY = settings.SECRET_KEY
ALGORITHM = settings.ALGORITHM
ACCESS_TOKEN_EXPIRE_MINUTES = getattr(settings, "ACCESS_TOKEN_EXPIRE_MINUTES", 30)

# Mapa em memoria de IDs de tokens de recuperacao ja consumidos -> timestamp de expiracao (com limpeza automatica)
_USED_RESET_TOKENS_LOCK = threading.Lock()
_USED_RESET_TOKENS: dict[str, float] = {}
_MAX_USED_RESET_TOKENS = 10_000


def _prune_used_reset_tokens(now: float) -> None:
    expired = [jti for jti, exp in _USED_RESET_TOKENS.items() if exp <= now]
    for jti in expired:
        _USED_RESET_TOKENS.pop(jti, None)
    if len(_USED_RESET_TOKENS) > _MAX_USED_RESET_TOKENS:
        overflow = len(_USED_RESET_TOKENS) - _MAX_USED_RESET_TOKENS
        for jti in list(_USED_RESET_TOKENS.keys())[:overflow]:
            _USED_RESET_TOKENS.pop(jti, None)


def get_password_hash(password: str) -> str:
    pwd_bytes = password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pwd_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    pwd_bytes = plain_password.encode("utf-8")[:72]
    hashed_bytes = hashed_password.encode("utf-8")
    return bcrypt.checkpw(pwd_bytes, hashed_bytes)


def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})

    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def create_password_reset_token(email: str) -> str:
    expire = datetime.now(timezone.utc) + timedelta(minutes=15)
    jti = str(uuid.uuid4())
    to_encode = {"sub": email, "type": "password_reset", "jti": jti, "exp": expire}
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def verify_password_reset_token(token: str) -> str | None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        if payload.get("type") != "password_reset":
            return None
        jti = payload.get("jti")
        if jti:
            now = time.time()
            with _USED_RESET_TOKENS_LOCK:
                exp = _USED_RESET_TOKENS.get(jti)
                if exp is not None:
                    if exp > now:
                        return None
                    _USED_RESET_TOKENS.pop(jti, None)
        email: str = payload.get("sub")
        return email
    except JWTError:
        return None


def invalidate_password_reset_token(token: str) -> None:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        jti = payload.get("jti")
        if jti:
            now = time.time()
            exp = float(payload.get("exp") or (now + 15 * 60))
            with _USED_RESET_TOKENS_LOCK:
                _prune_used_reset_tokens(now)
                _USED_RESET_TOKENS[jti] = exp
    except JWTError:
        pass
