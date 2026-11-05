import base64
import hashlib
import hmac
import json
import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

from app.core.config import settings

# ==============================================================================
# HASHING E VERIFICAÇÃO DE SENHAS
# ==============================================================================
try:
    import bcrypt

    def get_password_hash(password: str) -> str:
        """Gera hash seguro usando bcrypt (rounds=12)."""
        salt = bcrypt.gensalt(rounds=12)
        hashed = bcrypt.hashpw(password.encode("utf-8"), salt)
        return hashed.decode("utf-8")

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Valida a senha plana contra o hash bcrypt."""
        try:
            if hashed_password.startswith("$2b$") or hashed_password.startswith("$2a$"):
                return bcrypt.checkpw(
                    plain_password.encode("utf-8"),
                    hashed_password.encode("utf-8"),
                )
            # Suporte retroativo caso venha de PBKDF2/SHA256
            if hashed_password.startswith("pbkdf2_sha256$"):
                _, salt, key_hex = hashed_password.split("$")
                test_key = hashlib.pbkdf2_hmac(
                    "sha256",
                    plain_password.encode("utf-8"),
                    salt.encode("utf-8"),
                    100_000,
                )
                return secrets.compare_digest(test_key.hex(), key_hex)
            return False
        except Exception:
            return False

except ImportError:
    def get_password_hash(password: str) -> str:
        """Gera hash seguro com PBKDF2-HMAC-SHA256 (100.000 iterações)."""
        salt = secrets.token_hex(16)
        key = hashlib.pbkdf2_hmac(
            "sha256",
            password.encode("utf-8"),
            salt.encode("utf-8"),
            100_000,
        )
        return f"pbkdf2_sha256${salt}${key.hex()}"

    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """Valida a senha plana contra PBKDF2-HMAC-SHA256."""
        try:
            if hashed_password.startswith("pbkdf2_sha256$"):
                _, salt, key_hex = hashed_password.split("$")
                test_key = hashlib.pbkdf2_hmac(
                    "sha256",
                    plain_password.encode("utf-8"),
                    salt.encode("utf-8"),
                    100_000,
                )
                return secrets.compare_digest(test_key.hex(), key_hex)
            if "$" in hashed_password:
                salt, expected_hash = hashed_password.split("$", 1)
                test_hash = hashlib.sha256(f"{salt}{plain_password}".encode("utf-8")).hexdigest()
                return secrets.compare_digest(test_hash, expected_hash)
            return False
        except Exception:
            return False


# ==============================================================================
# GERAÇÃO E DECODIFICAÇÃO DE JWT (JSON WEB TOKEN)
# ==============================================================================
def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("utf-8")


def _b64url_decode(data: str) -> bytes:
    padding = 4 - (len(data) % 4)
    if padding and padding < 4:
        data += "=" * padding
    return base64.urlsafe_b64decode(data.encode("utf-8"))


try:
    import jwt

    def create_access_token(
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        """Cria um token JWT assinado com a SECRET_KEY e algoritmo configurado."""
        to_encode = data.copy()
        now = datetime.now(timezone.utc)
        if expires_delta:
            expire = now + expires_delta
        else:
            expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode.update({"exp": int(expire.timestamp()), "iat": int(now.timestamp())})
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)

    def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
        """Decodifica e valida assinatura e expiração do token JWT."""
        try:
            payload = jwt.decode(
                token,
                settings.SECRET_KEY,
                algorithms=[settings.ALGORITHM],
            )
            return payload
        except Exception:
            return None

except ImportError:
    def create_access_token(
        data: Dict[str, Any],
        expires_delta: Optional[timedelta] = None,
    ) -> str:
        """Geração nativa de token JWT compatível com RFC 7519."""
        now = datetime.now(timezone.utc)
        if expires_delta:
            expire = now + expires_delta
        else:
            expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

        header = {"alg": "HS256", "typ": "JWT"}
        payload = data.copy()
        payload.update({"exp": int(expire.timestamp()), "iat": int(now.timestamp())})

        header_b64 = _b64url_encode(json.dumps(header, separators=(",", ":")).encode("utf-8"))
        payload_b64 = _b64url_encode(json.dumps(payload, separators=(",", ":")).encode("utf-8"))
        signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")

        signature = hmac.new(
            settings.SECRET_KEY.encode("utf-8"),
            signing_input,
            hashlib.sha256,
        ).digest()
        signature_b64 = _b64url_encode(signature)
        return f"{header_b64}.{payload_b64}.{signature_b64}"

    def decode_access_token(token: str) -> Optional[Dict[str, Any]]:
        """Validação e decodificação nativa de token JWT compatível com RFC 7519."""
        try:
            parts = token.split(".")
            if len(parts) != 3:
                return None
            header_b64, payload_b64, signature_b64 = parts
            signing_input = f"{header_b64}.{payload_b64}".encode("utf-8")

            expected_sig = hmac.new(
                settings.SECRET_KEY.encode("utf-8"),
                signing_input,
                hashlib.sha256,
            ).digest()

            actual_sig = _b64url_decode(signature_b64)
            if not secrets.compare_digest(expected_sig, actual_sig):
                return None

            payload = json.loads(_b64url_decode(payload_b64).decode("utf-8"))
            exp = payload.get("exp")
            if exp and datetime.now(timezone.utc).timestamp() > exp:
                return None
            return payload
        except Exception:
            return None
