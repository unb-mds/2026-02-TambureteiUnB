from datetime import datetime, timedelta
from passlib.context import CryptContext
import jwt


SECRET_KEY = "1df4fffd8b89566e13d0b8f7a7a478f3b6d6e197c5f097abe9993337cc947672"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30 


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt