"""
Testes de Integração de Rotas: Ouvidoria e Denúncias Anônimas
Sprint QA-04 - VigiMinas.

Cobre:
- Registro de denúncia com denunciante_anonimo = True.
- Verificação de que o retorno da rota oculta os dados civis do denunciante.
- Consulta pública por número de protocolo assegurando sigilo absoluto.
"""

import pytest
import uuid
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_registro_denuncia_anonima_oculta_dados_civis(
    async_client: AsyncClient,
    auth_headers_fiscal: dict,
):
    # 1. Registro pelo endpoint público de denúncias
    payload = {
        "local_denunciado_identificacao": "Bar e Mercearia do Zé",
        "logradouro": "Rua do Comércio",
        "numero": "45",
        "bairro": "Centro",
        "relato_denuncia": "Comercialização de produtos alimentícios sem procedência comprovada.",
        "origem": "formulario_web",
        "gravidade": "media",
        "denunciante_anonimo": True,
        "denunciante_nome": "João da Silva Cidadão",  # Enviado por engano ou balcão
        "denunciante_telefone": "(33) 99999-1111",
        "denunciante_email": "joao.silva@email.com",
    }

    response = await async_client.post("/api/v1/denuncias", json=payload)
    assert response.status_code == 201

    dados = response.json()
    protocolo = dados["numero_protocolo"]
    assert dados["denunciante_anonimo"] is True
    # Invariante de proteção do denunciante anônimo: dados civis devem ser None
    assert dados["denunciante_nome"] is None
    assert dados["denunciante_telefone"] is None
    assert dados["denunciante_email"] is None

    # 2. Consulta pública por número de protocolo (sem login)
    resp_pub = await async_client.get(f"/api/v1/denuncias/consultar/{protocolo}")
    assert resp_pub.status_code == 200
    dados_pub = resp_pub.json()
    assert dados_pub["numero_protocolo"] == protocolo
    assert "denunciante_nome" not in dados_pub  # DTO público sequer expõe o campo
