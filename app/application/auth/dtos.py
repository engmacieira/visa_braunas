import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.domain.auth.entities import PerfilUsuario, TipoOperacaoAuditoria


class LoginDTO(BaseModel):
    """Schema de requisição de login."""
    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(..., max_length=150, description="E-mail funcional do servidor")
    senha: str = Field(..., min_length=6, max_length=128, description="Senha do usuário")


class TokenDTO(BaseModel):
    """Schema de resposta contendo o token de acesso."""
    access_token: str
    token_type: str = "Bearer"
    expires_in_minutes: int
    usuario_id: uuid.UUID
    perfil: PerfilUsuario
    nome_completo: str


class TokenPayloadDTO(BaseModel):
    """Estrutura do payload contido no JWT."""
    sub: str
    perfil: PerfilUsuario
    exp: int
    iat: int


class UsuarioCreateDTO(BaseModel):
    """Schema para cadastro de novo servidor/usuário."""
    model_config = ConfigDict(extra="forbid")

    email: EmailStr = Field(..., max_length=150)
    senha: str = Field(..., min_length=6, max_length=128, description="Senha de acesso inicial")
    perfil: PerfilUsuario = PerfilUsuario.DIGITADOR
    nome_completo: str = Field(..., min_length=3, max_length=200)
    cpf: str = Field(..., min_length=11, max_length=14, description="CPF com ou sem pontuação (11 dígitos)")
    matricula: Optional[str] = Field(None, max_length=50)
    cargo: str = Field(default="Fiscal Sanitário", min_length=2, max_length=100)
    portaria_nomeacao: Optional[str] = Field(None, max_length=100)
    telefone_contato: Optional[str] = Field(None, max_length=20)
    url_assinatura_rubrica: Optional[str] = None


class UsuarioUpdateDTO(BaseModel):
    """Schema para atualização cadastral de servidor/usuário."""
    email: Optional[EmailStr] = None
    perfil: Optional[PerfilUsuario] = None
    nome_completo: Optional[str] = Field(None, min_length=3, max_length=200)
    matricula: Optional[str] = Field(None, max_length=50)
    cargo: Optional[str] = Field(None, max_length=100)
    portaria_nomeacao: Optional[str] = Field(None, max_length=100)
    telefone_contato: Optional[str] = Field(None, max_length=20)
    url_assinatura_rubrica: Optional[str] = None
    is_active: Optional[bool] = None


class UsuarioResponseDTO(BaseModel):
    """Schema de apresentação de servidor/usuário."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: str
    perfil: PerfilUsuario
    nome_completo: str
    cpf: str
    matricula: Optional[str] = None
    cargo: str
    portaria_nomeacao: Optional[str] = None
    telefone_contato: Optional[str] = None
    url_assinatura_rubrica: Optional[str] = None
    ultimo_login: Optional[datetime] = None
    is_active: bool
    criado_em: datetime
    atualizado_em: datetime


class LogAuditoriaResponseDTO(BaseModel):
    """Schema de resposta da trilha de auditoria."""
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    tabela_afetada: str
    registro_id: str
    identificador_entidade: Optional[str] = None
    operacao: TipoOperacaoAuditoria
    acao: str
    detalhes: Optional[str] = None
    dados_anteriores: Optional[Dict[str, Any]] = None
    dados_novos: Optional[Dict[str, Any]] = None
    usuario_id: Optional[uuid.UUID] = None
    usuario_nome: Optional[str] = None
    usuario_matricula: Optional[str] = None
    ip_origem: Optional[str] = None
    user_agent: Optional[str] = None
    criado_em: datetime
