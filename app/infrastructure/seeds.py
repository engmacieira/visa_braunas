"""
Módulo de Carga Inicial, Fixtures Realistas e Mecanismo Idempotente de Seeds (Braúnas/MG).
Sprint QA-03 - VigiMinas.

Este módulo implementa a carga parametrizada dos dados oficiais e regulatórios da Vigilância
Sanitária de Braúnas/MG, com idempotência estrita (evitando violações de índices condicionais uq_*),
senhas com hashing seguro (bcrypt via app.core.security) e respeito ao ciclo de vida
(is_active=True, is_deleted=False).

Pode ser executado via CLI:
    python -m app.infrastructure.seeds
Ou invocado programmaticamente por fixtures e testes automatizados.
"""

import asyncio
import logging
from dataclasses import dataclass, field
from datetime import date, datetime, time, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import get_password_hash
from app.domain.auth.entities import PerfilUsuario
from app.domain.fiscalizacao.enums import (
    ResultadoInspecao,
    StatusInspecao,
    TipoMotivoInspecao,
)
from app.infrastructure.database import async_engine
from app.infrastructure.models import (
    AlvaraSanitarioModel,
    CnaeModel,
    ConfiguracaoInstitucionalModel,
    DenunciaModel,
    EstabelecimentoCnaeModel,
    EstabelecimentoDocumentoModel,
    EstabelecimentoFornecedorModel,
    EstabelecimentoFuncionarioModel,
    EstabelecimentoModel,
    EstabelecimentoResponsavelTecnicoModel,
    InspecaoModel,
    MetasExercicioModel,
    RepresentanteLegalModel,
    RequerimentoAlvaraDadosModel,
    RequerimentoAlvaraModel,
    ResponsavelTecnicoModel,
    TipoDocumentoModel,
    UsuarioModel,
)

logger = logging.getLogger("vigiminas.seeds")
if not logger.handlers:
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")


@dataclass
class SeedCounters:
    """Contadores de auditoria do seed para relatório de execução."""
    created: Dict[str, int] = field(default_factory=dict)
    skipped: Dict[str, int] = field(default_factory=dict)

    def inc_created(self, entity_name: str, count: int = 1) -> None:
        self.created[entity_name] = self.created.get(entity_name, 0) + count

    def inc_skipped(self, entity_name: str, count: int = 1) -> None:
        self.skipped[entity_name] = self.skipped.get(entity_name, 0) + count

    def summary(self) -> str:
        lines = ["=== Relatório de Carga de Seeds (Idempotente) ==="]
        all_keys = sorted(set(self.created.keys()).union(self.skipped.keys()))
        for k in all_keys:
            c = self.created.get(k, 0)
            s = self.skipped.get(k, 0)
            lines.append(f" - {k:<38}: Criados={c:>2} | Ignorados={s:>2}")
        return "\n".join(lines)


# ==============================================================================
# 1. SEED: CONFIGURAÇÃO INSTITUCIONAL (SINGLETON)
# ==============================================================================
async def seed_configuracao_institucional(
    session: AsyncSession, counters: SeedCounters
) -> ConfiguracaoInstitucionalModel:
    stmt = select(ConfiguracaoInstitucionalModel).where(
        ConfiguracaoInstitucionalModel.singleton_key == 1,
        ConfiguracaoInstitucionalModel.is_deleted.is_(False),
    )
    res = await session.execute(stmt)
    config = res.scalars().first()

    if config is not None:
        counters.inc_skipped("configuracao_institucional")
        logger.info("[SKIP] Configuração Institucional de Braúnas/MG já cadastrada.")
        return config

    config = ConfiguracaoInstitucionalModel(
        singleton_key=1,
        municipio="Braúnas",
        uf="MG",
        nome_prefeitura="Prefeitura Municipal de Braúnas",
        nome_secretaria="Secretaria Municipal de Saúde",
        orgao_vigilancia="Coordenação de Vigilância em Saúde e Vigilância Sanitária",
        cnpj_institucional="18.303.187/0001-44",
        logradouro="Avenida Juscelino Kubitschek",
        numero="100",
        bairro="Centro",
        cep="35.189-000",
        telefone_oficial="(33) 3294-1100",
        email_oficial="visa@braunas.mg.gov.br",
        url_brasao_prefeitura="https://braunas.mg.gov.br/assets/brasao.png",
        url_logo_vigilancia="https://braunas.mg.gov.br/assets/visa_logo.png",
        texto_padrao_rodape_alvara="Documento emitido nos termos da Lei Complementar Municipal e Código de Saúde de Minas Gerais.",
        is_active=True,
        is_deleted=False,
    )
    session.add(config)
    await session.flush()
    counters.inc_created("configuracao_institucional")
    logger.info("[CREATE] Configuração Institucional de Braúnas/MG criada.")
    return config


# ==============================================================================
# 2. SEED: USUÁRIOS E SERVIDORES INICIAIS
# ==============================================================================
USUARIOS_SEED_DATA = [
    {
        "email": "admin@braunas.mg.gov.br",
        "nome_completo": "Administrador Master do Sistema",
        "cpf": "111.222.333-44",
        "perfil": PerfilUsuario.ADMIN_MASTER,
        "matricula": "ADM-001",
        "cargo": "Administrador de Sistemas",
        "portaria_nomeacao": "Decreto Municipal nº 001/2024",
        "telefone_contato": "(33) 99911-0001",
        "senha_plana": "AdminMaster@2026",
    },
    {
        "email": "coordenador.visa@braunas.mg.gov.br",
        "nome_completo": "Carlos Eduardo de Paula",
        "cpf": "222.333.444-55",
        "perfil": PerfilUsuario.COORDENADOR,
        "matricula": "CRD-2024",
        "cargo": "Coordenador de Vigilância Sanitária",
        "portaria_nomeacao": "Portaria Municipal nº 045/2024",
        "telefone_contato": "(33) 99911-0002",
        "senha_plana": "CoordVisa@2026",
    },
    {
        "email": "fiscal1.visa@braunas.mg.gov.br",
        "nome_completo": "Mariana Souza Silveira",
        "cpf": "333.444.555-66",
        "perfil": PerfilUsuario.FISCAL_TECNICO,
        "matricula": "FISC-101",
        "cargo": "Fiscal Técnico Sanitário",
        "portaria_nomeacao": "Portaria Municipal nº 123/2024",
        "telefone_contato": "(33) 99911-0003",
        "senha_plana": "Fiscal1@2026",
    },
    {
        "email": "fiscal2.visa@braunas.mg.gov.br",
        "nome_completo": "Rodrigo Silva Drumond",
        "cpf": "444.555.666-77",
        "perfil": PerfilUsuario.FISCAL_TECNICO,
        "matricula": "FISC-102",
        "cargo": "Fiscal Técnico Sanitário",
        "portaria_nomeacao": "Portaria Municipal nº 124/2024",
        "telefone_contato": "(33) 99911-0004",
        "senha_plana": "Fiscal2@2026",
    },
    {
        "email": "digitador.visa@braunas.mg.gov.br",
        "nome_completo": "Ana Luiza Pereira",
        "cpf": "555.666.777-88",
        "perfil": PerfilUsuario.DIGITADOR,
        "matricula": "DIG-301",
        "cargo": "Digitador Operacional",
        "portaria_nomeacao": "Portaria Municipal nº 150/2024",
        "telefone_contato": "(33) 99911-0005",
        "senha_plana": "Digitador@2026",
    },
]


async def seed_usuarios(session: AsyncSession, counters: SeedCounters) -> Dict[str, UsuarioModel]:
    usuarios_map: Dict[str, UsuarioModel] = {}

    for udata in USUARIOS_SEED_DATA:
        stmt = select(UsuarioModel).where(
            (UsuarioModel.email == udata["email"]) | (UsuarioModel.cpf == udata["cpf"]),
            UsuarioModel.is_deleted.is_(False),
        )
        res = await session.execute(stmt)
        user = res.scalars().first()

        if user is not None:
            counters.inc_skipped("usuarios")
            usuarios_map[udata["email"]] = user
            logger.info(f"[SKIP] Usuário {udata['email']} já existe.")
            continue

        senha_criptografada = get_password_hash(udata["senha_plana"])
        user = UsuarioModel(
            email=udata["email"],
            senha_hash=senha_criptografada,
            perfil=udata["perfil"],
            nome_completo=udata["nome_completo"],
            cpf=udata["cpf"],
            matricula=udata["matricula"],
            cargo=udata["cargo"],
            portaria_nomeacao=udata["portaria_nomeacao"],
            telefone_contato=udata["telefone_contato"],
            is_active=True,
            is_deleted=False,
        )
        session.add(user)
        await session.flush()
        usuarios_map[udata["email"]] = user
        counters.inc_created("usuarios")
        logger.info(f"[CREATE] Usuário {udata['email']} ({udata['perfil'].value}) criado.")

    return usuarios_map


# ==============================================================================
# 3. SEED: METAS DO EXERCÍCIO DE 2026
# ==============================================================================
async def seed_metas_exercicio(
    session: AsyncSession, admin_user: UsuarioModel, counters: SeedCounters
) -> MetasExercicioModel:
    stmt = select(MetasExercicioModel).where(
        MetasExercicioModel.ano_exercicio == 2026,
        MetasExercicioModel.is_deleted.is_(False),
    )
    res = await session.execute(stmt)
    meta = res.scalars().first()

    if meta is not None:
        counters.inc_skipped("metas_exercicio")
        logger.info("[SKIP] Metas do exercício 2026 já cadastradas.")
        return meta

    meta = MetasExercicioModel(
        ano_exercicio=2026,
        meta_inspecoes_vapt=12,
        meta_cobertura_risco_1=Decimal("100.00"),
        meta_cobertura_risco_2=Decimal("100.00"),
        meta_cobertura_risco_3=Decimal("100.00"),
        dias_validade_padrao_alvara=365,
        dias_prazo_padrao_notificacao=30,
        observacoes_pactuacao="Pactuação oficial dos Indicadores 11 a 15 para o município de Braúnas/MG.",
        configurado_por=admin_user.id,
        is_active=True,
        is_deleted=False,
    )
    session.add(meta)
    await session.flush()
    counters.inc_created("metas_exercicio")
    logger.info("[CREATE] Metas do exercício 2026 criadas.")
    return meta


# ==============================================================================
# 4. SEED: CATÁLOGO DE TIPOS DE DOCUMENTOS REGULATÓRIOS
# ==============================================================================
TIPOS_DOCUMENTOS_DATA = [
    {
        "codigo_identificador": "ALVARA_SANITARIO",
        "nome_documento": "Alvará Sanitário de Funcionamento",
        "descricao": "Licença sanitária anual emitida pelo órgão competente municipal.",
        "categoria": "licenciamento",
        "possui_validade": True,
        "validade_padrao_meses": 12,
        "exige_orgao_emissor": True,
        "exige_responsavel_emissao": True,
    },
    {
        "codigo_identificador": "LIMPEZA_CAIXA_AGUA",
        "nome_documento": "Certificado de Higienização de Caixa d'Água / Reservatório",
        "descricao": "Comprovante de desinfecção semestral dos reservatórios de água potável.",
        "categoria": "infraestrutura_saneamento",
        "possui_validade": True,
        "validade_padrao_meses": 6,
        "exige_orgao_emissor": True,
        "exige_responsavel_emissao": False,
    },
    {
        "codigo_identificador": "CONTROLE_PRAGAS_VETORES",
        "nome_documento": "Certificado de Desratização e Desinsetização",
        "descricao": "Comprovante de controle integrado de pragas e vetores urbanos.",
        "categoria": "controle_ambiental",
        "possui_validade": True,
        "validade_padrao_meses": 6,
        "exige_orgao_emissor": True,
        "exige_responsavel_emissao": True,
    },
    {
        "codigo_identificador": "PGRSS",
        "nome_documento": "Plano de Gerenciamento de Resíduos de Serviços de Saúde",
        "descricao": "Documento técnico de gestão de resíduos biológicos, químicos e infectantes.",
        "categoria": "controle_ambiental",
        "possui_validade": True,
        "validade_padrao_meses": 12,
        "exige_orgao_emissor": True,
        "exige_responsavel_emissao": True,
    },
    {
        "codigo_identificador": "LIVRO_REGISTRO_ESPECIAIS",
        "nome_documento": "Livro de Registro de Medicamentos Controlados / SNGPC",
        "descricao": "Escrituração e controle de substâncias sob regime especial (Portaria 344/98).",
        "categoria": "gestao_qualidade",
        "possui_validade": False,
        "validade_padrao_meses": None,
        "exige_orgao_emissor": True,
        "exige_responsavel_emissao": True,
    },
    {
        "codigo_identificador": "CERTIFICADO_CURSO_MANIPULADORES",
        "nome_documento": "Certificado de Boas Práticas e Capacitação de Manipuladores",
        "descricao": "Comprovante de treinamento em higiene e boas práticas de manipulação de alimentos.",
        "categoria": "habilitacao_profissional",
        "possui_validade": True,
        "validade_padrao_meses": 12,
        "exige_orgao_emissor": True,
        "exige_responsavel_emissao": False,
    },
]


async def seed_tipos_documentos(
    session: AsyncSession, counters: SeedCounters
) -> Dict[str, TipoDocumentoModel]:
    docs_map: Dict[str, TipoDocumentoModel] = {}

    for ddata in TIPOS_DOCUMENTOS_DATA:
        stmt = select(TipoDocumentoModel).where(
            TipoDocumentoModel.codigo_identificador == ddata["codigo_identificador"],
            TipoDocumentoModel.is_deleted.is_(False),
        )
        res = await session.execute(stmt)
        doc = res.scalars().first()

        if doc is not None:
            counters.inc_skipped("tipos_documentos")
            docs_map[ddata["codigo_identificador"]] = doc
            continue

        doc = TipoDocumentoModel(
            codigo_identificador=ddata["codigo_identificador"],
            nome_documento=ddata["nome_documento"],
            descricao=ddata["descricao"],
            categoria=ddata["categoria"],
            possui_validade=ddata["possui_validade"],
            validade_padrao_meses=ddata["validade_padrao_meses"],
            exige_orgao_emissor=ddata["exige_orgao_emissor"],
            exige_responsavel_emissao=ddata["exige_responsavel_emissao"],
            is_active=True,
            is_deleted=False,
        )
        session.add(doc)
        await session.flush()
        docs_map[ddata["codigo_identificador"]] = doc
        counters.inc_created("tipos_documentos")
        logger.info(f"[CREATE] Tipo de Documento {ddata['codigo_identificador']} criado.")

    return docs_map


# ==============================================================================
# 5. SEED: CATÁLOGO DE CNAES SANITÁRIOS DE BRAÚNAS/MG
# ==============================================================================
CNAES_SEED_DATA = [
    {
        "codigo": "4711-3/02",
        "descricao": "Comércio varejista de mercadorias em geral, com predominância de produtos alimentícios - supermercados",
        "grau_risco_padrao": "Risco III",
        "competencia_padrao": "Municipal",
        "exige_rt": True,
        "exige_projeto_arquitetonico": True,
    },
    {
        "codigo": "4771-7/01",
        "descricao": "Comércio varejista de produtos farmacêuticos, sem manipulação de fórmulas",
        "grau_risco_padrao": "Risco III",
        "competencia_padrao": "Municipal",
        "exige_rt": True,
        "exige_projeto_arquitetonico": True,
    },
    {
        "codigo": "1091-1/02",
        "descricao": "Padaria e confeitaria com predominância de produção própria",
        "grau_risco_padrao": "Risco II",
        "competencia_padrao": "Municipal",
        "exige_rt": False,
        "exige_projeto_arquitetonico": False,
    },
    {
        "codigo": "5611-2/01",
        "descricao": "Restaurantes e similares",
        "grau_risco_padrao": "Risco II",
        "competencia_padrao": "Municipal",
        "exige_rt": False,
        "exige_projeto_arquitetonico": False,
    },
    {
        "codigo": "5611-2/03",
        "descricao": "Lanchonetes, casas de chá, de sucos e similares",
        "grau_risco_padrao": "Risco II",
        "competencia_padrao": "Municipal",
        "exige_rt": False,
        "exige_projeto_arquitetonico": False,
    },
    {
        "codigo": "8630-5/04",
        "descricao": "Atividade odontológica",
        "grau_risco_padrao": "Risco III",
        "competencia_padrao": "Municipal",
        "exige_rt": True,
        "exige_projeto_arquitetonico": True,
    },
    {
        "codigo": "9602-5/01",
        "descricao": "Cabeleireiros, manicure e pedicure",
        "grau_risco_padrao": "Risco I",
        "competencia_padrao": "Municipal",
        "exige_rt": False,
        "exige_projeto_arquitetonico": False,
    },
    {
        "codigo": "4722-9/01",
        "descricao": "Comércio varejista de carnes - açougues",
        "grau_risco_padrao": "Risco II",
        "competencia_padrao": "Municipal",
        "exige_rt": False,
        "exige_projeto_arquitetonico": False,
    },
    {
        "codigo": "4520-0/01",
        "descricao": "Serviços de manutenção e reparação mecânica de veículos automotores",
        "grau_risco_padrao": "Risco I",
        "competencia_padrao": "Municipal",
        "exige_rt": False,
        "exige_projeto_arquitetonico": False,
    },
    {
        "codigo": "4789-0/99",
        "descricao": "Comércio varejista de outros produtos não especificados anteriormente",
        "grau_risco_padrao": "Dispensado",
        "competencia_padrao": "Municipal",
        "exige_rt": False,
        "exige_projeto_arquitetonico": False,
    },
]


async def seed_cnaes(session: AsyncSession, counters: SeedCounters) -> Dict[str, CnaeModel]:
    cnaes_map: Dict[str, CnaeModel] = {}

    for cdata in CNAES_SEED_DATA:
        stmt = select(CnaeModel).where(
            CnaeModel.codigo == cdata["codigo"],
            CnaeModel.is_deleted.is_(False),
        )
        res = await session.execute(stmt)
        cnae = res.scalars().first()

        if cnae is not None:
            counters.inc_skipped("cnaes")
            cnaes_map[cdata["codigo"]] = cnae
            continue

        cnae = CnaeModel(
            codigo=cdata["codigo"],
            descricao=cdata["descricao"],
            grau_risco_padrao=cdata["grau_risco_padrao"],
            competencia_padrao=cdata["competencia_padrao"],
            exige_rt=cdata["exige_rt"],
            exige_projeto_arquitetonico=cdata["exige_projeto_arquitetonico"],
            is_active=True,
            is_deleted=False,
        )
        session.add(cnae)
        await session.flush()
        cnaes_map[cdata["codigo"]] = cnae
        counters.inc_created("cnaes")
        logger.info(f"[CREATE] CNAE {cdata['codigo']} ({cdata['grau_risco_padrao']}) criado.")

    return cnaes_map


# ==============================================================================
# 6. SEED: REPRESENTANTES LEGAIS E RESPONSÁVEIS TÉCNICOS
# ==============================================================================
REPRESENTANTES_DATA = [
    {
        "cpf": "123.456.789-01",
        "nome_completo": "José Carlos Ferreira",
        "rg_numero": "MG-12.345.678",
        "rg_orgao_emissor": "SSP/MG",
        "telefone": "(33) 98801-1122",
        "email": "jose.ferreira@farmaciabraunas.com.br",
        "endereco_residencial": "Rua Minas Gerais, 45, Centro, Braúnas/MG",
    },
    {
        "cpf": "234.567.890-12",
        "nome_completo": "Antônio Augusto Mendes",
        "rg_numero": "MG-23.456.789",
        "rg_orgao_emissor": "SSP/MG",
        "telefone": "(33) 98802-2233",
        "email": "antonio.mendes@superbraunas.com.br",
        "endereco_residencial": "Avenida Juscelino Kubitschek, 210, Centro, Braúnas/MG",
    },
    {
        "cpf": "345.678.901-23",
        "nome_completo": "Maria de Fátima Alves",
        "rg_numero": "MG-34.567.890",
        "rg_orgao_emissor": "SSP/MG",
        "telefone": "(33) 98803-3344",
        "email": "fatima.padaria@braunas.com.br",
        "endereco_residencial": "Rua São Vicente, 88, Bairro Novo Horizonte, Braúnas/MG",
    },
    {
        "cpf": "456.789.012-34",
        "nome_completo": "Sebastião Pereira Santos",
        "rg_numero": "MG-45.678.901",
        "rg_orgao_emissor": "SSP/MG",
        "telefone": "(33) 98804-4455",
        "email": "sebastiao.restaurante@braunas.com.br",
        "endereco_residencial": "Praça da Matriz, 12, Centro, Braúnas/MG",
    },
    {
        "cpf": "567.890.123-45",
        "nome_completo": "Juliana Cristina Ramos",
        "rg_numero": "MG-56.789.012",
        "rg_orgao_emissor": "SSP/MG",
        "telefone": "(33) 98805-5566",
        "email": "juliana.salao@braunas.com.br",
        "endereco_residencial": "Rua Getúlio Vargas, 140, Centro, Braúnas/MG",
    },
    {
        "cpf": "678.901.234-56",
        "nome_completo": "Marcos Vinícius de Oliveira",
        "rg_numero": "MG-67.890.123",
        "rg_orgao_emissor": "SSP/MG",
        "telefone": "(33) 98806-6677",
        "email": "marcos.utilidades@braunas.com.br",
        "endereco_residencial": "Rua Bahia, 55, Centro, Braúnas/MG",
    },
]


async def seed_representantes_legais(
    session: AsyncSession, counters: SeedCounters
) -> Dict[str, RepresentanteLegalModel]:
    rep_map: Dict[str, RepresentanteLegalModel] = {}

    for rdata in REPRESENTANTES_DATA:
        stmt = select(RepresentanteLegalModel).where(
            RepresentanteLegalModel.cpf == rdata["cpf"],
            RepresentanteLegalModel.is_deleted.is_(False),
        )
        res = await session.execute(stmt)
        rep = res.scalars().first()

        if rep is not None:
            counters.inc_skipped("representantes_legais")
            rep_map[rdata["cpf"]] = rep
            continue

        rep = RepresentanteLegalModel(
            nome_completo=rdata["nome_completo"],
            cpf=rdata["cpf"],
            rg_numero=rdata["rg_numero"],
            rg_orgao_emissor=rdata["rg_orgao_emissor"],
            telefone=rdata["telefone"],
            email=rdata["email"],
            endereco_residencial=rdata["endereco_residencial"],
            is_active=True,
            is_deleted=False,
        )
        session.add(rep)
        await session.flush()
        rep_map[rdata["cpf"]] = rep
        counters.inc_created("representantes_legais")
        logger.info(f"[CREATE] Representante Legal {rdata['nome_completo']} ({rdata['cpf']}) criado.")

    return rep_map


async def seed_responsaveis_tecnicos(
    session: AsyncSession, counters: SeedCounters
) -> ResponsavelTecnicoModel:
    cpf_rt = "987.654.321-99"
    stmt = select(ResponsavelTecnicoModel).where(
        ResponsavelTecnicoModel.cpf == cpf_rt,
        ResponsavelTecnicoModel.is_deleted.is_(False),
    )
    res = await session.execute(stmt)
    rt = res.scalars().first()

    if rt is not None:
        counters.inc_skipped("responsaveis_tecnicos")
        return rt

    rt = ResponsavelTecnicoModel(
        nome_completo="Dra. Camila Nogueira Guimarães",
        cpf=cpf_rt,
        conselho_classe="CRF",
        numero_registro_conselho="24890",
        uf_conselho="MG",
        telefone="(33) 98877-6655",
        email="camila.farmaceutica@crfmg.org.br",
        is_active=True,
        is_deleted=False,
    )
    session.add(rt)
    await session.flush()
    counters.inc_created("responsaveis_tecnicos")
    logger.info(f"[CREATE] Responsável Técnico CRF/MG {rt.numero_registro_conselho} criado.")
    return rt


# ==============================================================================
# 7. SEED: ESTABELECIMENTOS, VÍNCULOS DE CNAE, RT, FUNCIONÁRIOS E FORNECEDORES
# ==============================================================================
ESTABELECIMENTOS_SEED_DATA = [
    # 2 Risco III
    {
        "cnpj_cpf": "11.222.333/0001-44",
        "razao_social": "Drogaria Braúnas Popular Ltda",
        "nome_fantasia": "Drogaria Braúnas",
        "nivel_risco": "Risco III",
        "cnae_principal": "4771-7/01",
        "rep_cpf": "123.456.789-01",
        "logradouro": "Avenida Juscelino Kubitschek",
        "numero": "350",
        "bairro": "Centro",
        "telefone_celular": "(33) 98801-1122",
        "email": "drogaria@braunas.mg.gov.br",
        "com_rt": True,
        "funcionarios": [
            {"nome": "Beatriz Lima Castro", "cargo": "Balconista Farmacêutica", "eh_manipulador": False},
        ],
        "fornecedores": [
            {"razao_social": "Distribuidora Panarello Medicamentos", "cnpj": "02.555.888/0001-99", "tipo": "Medicamentos e Correlatos"},
        ],
    },
    {
        "cnpj_cpf": "22.333.444/0001-55",
        "razao_social": "Supermercado Central de Braúnas Ltda",
        "nome_fantasia": "Supermercado Central",
        "nivel_risco": "Risco III",
        "cnae_principal": "4711-3/02",
        "rep_cpf": "234.567.890-12",
        "logradouro": "Rua Minas Gerais",
        "numero": "500",
        "bairro": "Centro",
        "telefone_celular": "(33) 98802-2233",
        "email": "supermercado@braunas.mg.gov.br",
        "com_rt": False,
        "funcionarios": [
            {"nome": "Lucas Martins Silva", "cargo": "Açougueiro / Manipulador", "eh_manipulador": True},
            {"nome": "Renata Santos Dias", "cargo": "Operadora de Caixa", "eh_manipulador": False},
        ],
        "fornecedores": [
            {"razao_social": "Frigorífico Vale do Rio Doce S/A", "cnpj": "04.777.999/0001-12", "tipo": "Carnes e Frios"},
        ],
    },
    # 2 Risco II
    {
        "cnpj_cpf": "33.444.555/0001-66",
        "razao_social": "Padaria e Confeitaria Tradição de Minas Eireli",
        "nome_fantasia": "Padaria Tradição Mineira",
        "nivel_risco": "Risco II",
        "cnae_principal": "1091-1/02",
        "rep_cpf": "345.678.901-23",
        "logradouro": "Rua São Vicente",
        "numero": "112",
        "bairro": "Centro",
        "telefone_celular": "(33) 98803-3344",
        "email": "padaria@braunas.mg.gov.br",
        "com_rt": False,
        "funcionarios": [
            {"nome": "Geraldo Magela Costa", "cargo": "Padeiro Chefe", "eh_manipulador": True},
        ],
        "fornecedores": [
            {"razao_social": "Moinho Sete Irmãos Indústria de Farinhas", "cnpj": "17.111.222/0001-88", "tipo": "Farinhas e Matérias-Primas"},
        ],
    },
    {
        "cnpj_cpf": "44.555.666/0001-77",
        "razao_social": "Restaurante Sabor da Vila Braúnas Ltda",
        "nome_fantasia": "Restaurante e Lanchonete Sabor da Vila",
        "nivel_risco": "Risco II",
        "cnae_principal": "5611-2/01",
        "rep_cpf": "456.789.012-34",
        "logradouro": "Praça da Matriz",
        "numero": "45",
        "bairro": "Centro",
        "telefone_celular": "(33) 98804-4455",
        "email": "restaurante@braunas.mg.gov.br",
        "com_rt": False,
        "funcionarios": [
            {"nome": "Vera Lúcia Moreira", "cargo": "Cozinheira Geral", "eh_manipulador": True},
        ],
        "fornecedores": [
            {"razao_social": "Hortifruti Distribuidora Regional", "cnpj": "21.333.444/0001-05", "tipo": "Verduras, Legumes e Frutas"},
        ],
    },
    # 2 Risco I / Dispensado
    {
        "cnpj_cpf": "55.666.777/0001-88",
        "razao_social": "Juliana Cristina Ramos Salão de Beleza ME",
        "nome_fantasia": "Espaço Beleza e Estilo",
        "nivel_risco": "Risco I",
        "cnae_principal": "9602-5/01",
        "rep_cpf": "567.890.123-45",
        "logradouro": "Rua Getúlio Vargas",
        "numero": "80",
        "bairro": "Centro",
        "telefone_celular": "(33) 98805-5566",
        "email": "beleza@braunas.mg.gov.br",
        "com_rt": False,
        "funcionarios": [
            {"nome": "Patrícia Ribeiro", "cargo": "Manicure / Assistente", "eh_manipulador": False},
        ],
        "fornecedores": [
            {"razao_social": "Cosméticos Minas Distribuidora", "cnpj": "30.444.555/0001-19", "tipo": "Produtos Cosméticos e Higiene"},
        ],
    },
    {
        "cnpj_cpf": "66.777.888/0001-99",
        "razao_social": "Braúnas Utilidades e Variedades ME",
        "nome_fantasia": "Loja de Utilidades Braúnas",
        "nivel_risco": "Risco I",  # Dispensado / Baixo risco
        "cnae_principal": "4789-0/99",
        "rep_cpf": "678.901.234-56",
        "logradouro": "Rua Bahia",
        "numero": "25",
        "bairro": "Centro",
        "telefone_celular": "(33) 98806-6677",
        "email": "utilidades@braunas.mg.gov.br",
        "com_rt": False,
        "funcionarios": [
            {"nome": "Tiago Souza Mendes", "cargo": "Atendente de Balcão", "eh_manipulador": False},
        ],
        "fornecedores": [
            {"razao_social": "Atacadão dos Plásticos e Utilidades", "cnpj": "40.111.222/0001-33", "tipo": "Bazar e Utilidades Domésticas"},
        ],
    },
]


async def seed_estabelecimentos(
    session: AsyncSession,
    representantes_map: Dict[str, RepresentanteLegalModel],
    cnaes_map: Dict[str, CnaeModel],
    rt: ResponsavelTecnicoModel,
    cadastrado_por: UsuarioModel,
    counters: SeedCounters,
) -> Dict[str, EstabelecimentoModel]:
    estabs_map: Dict[str, EstabelecimentoModel] = {}

    for edata in ESTABELECIMENTOS_SEED_DATA:
        cnpj_cpf = edata["cnpj_cpf"]
        stmt = select(EstabelecimentoModel).where(
            EstabelecimentoModel.cnpj_cpf == cnpj_cpf,
            EstabelecimentoModel.is_deleted.is_(False),
        )
        res = await session.execute(stmt)
        estab = res.scalars().first()

        rep = representantes_map[edata["rep_cpf"]]
        cnae = cnaes_map[edata["cnae_principal"]]

        if estab is None:
            estab = EstabelecimentoModel(
                tipo_cadastro="PJ",
                cnpj_cpf=cnpj_cpf,
                inscricao_municipal="102030",
                razao_social=edata["razao_social"],
                nome_fantasia=edata["nome_fantasia"],
                natureza_juridica="Sociedade Empresária Limitada",
                cep="35.189-000",
                logradouro=edata["logradouro"],
                numero=edata["numero"],
                bairro=edata["bairro"],
                municipio="Braúnas",
                uf="MG",
                telefone_celular=edata["telefone_celular"],
                email=edata["email"],
                nivel_risco=edata["nivel_risco"],
                competencia_fiscalizacao="Municipal",
                situacao_estabelecimento="Ativo",
                representante_legal_id=rep.id,
                cadastrado_por=cadastrado_por.id,
                is_active=True,
                is_deleted=False,
            )
            session.add(estab)
            await session.flush()
            counters.inc_created("estabelecimentos")
            logger.info(f"[CREATE] Estabelecimento {edata['razao_social']} ({cnpj_cpf}) criado.")
        else:
            counters.inc_skipped("estabelecimentos")

        estabs_map[cnpj_cpf] = estab

        # Vínculo CNAE Principal
        stmt_cnae = select(EstabelecimentoCnaeModel).where(
            EstabelecimentoCnaeModel.estabelecimento_id == estab.id,
            EstabelecimentoCnaeModel.cnae_id == cnae.id,
            EstabelecimentoCnaeModel.is_deleted.is_(False),
        )
        res_cnae = await session.execute(stmt_cnae)
        estab_cnae = res_cnae.scalars().first()

        if estab_cnae is None:
            estab_cnae = EstabelecimentoCnaeModel(
                estabelecimento_id=estab.id,
                cnae_id=cnae.id,
                cnae_codigo=cnae.codigo,
                eh_principal=True,
                data_inicio_atividade=date(2020, 1, 15),
                is_active=True,
                is_deleted=False,
            )
            session.add(estab_cnae)
            await session.flush()
            counters.inc_created("estabelecimento_cnaes")
        else:
            counters.inc_skipped("estabelecimento_cnaes")

        # Vínculo Responsável Técnico (apenas para Drogaria se configurado)
        if edata.get("com_rt"):
            stmt_rt = select(EstabelecimentoResponsavelTecnicoModel).where(
                EstabelecimentoResponsavelTecnicoModel.estabelecimento_id == estab.id,
                EstabelecimentoResponsavelTecnicoModel.eh_substituto.is_(False),
                EstabelecimentoResponsavelTecnicoModel.is_active.is_(True),
                EstabelecimentoResponsavelTecnicoModel.is_deleted.is_(False),
            )
            res_rt = await session.execute(stmt_rt)
            estab_rt = res_rt.scalars().first()

            if estab_rt is None:
                estab_rt = EstabelecimentoResponsavelTecnicoModel(
                    estabelecimento_id=estab.id,
                    responsavel_tecnico_id=rt.id,
                    eh_substituto=False,
                    carga_horaria_semanal="40h Semanais",
                    horario_permanencia="Segunda a Sexta, 08:00 às 17:00",
                    numero_art_crt="CRT-MG/2026/00981",
                    data_inicio=date(2024, 1, 1),
                    is_active=True,
                    is_deleted=False,
                )
                session.add(estab_rt)
                await session.flush()
                counters.inc_created("estabelecimento_responsaveis_tecnicos")
            else:
                counters.inc_skipped("estabelecimento_responsaveis_tecnicos")

        # Funcionários
        for f in edata.get("funcionarios", []):
            stmt_func = select(EstabelecimentoFuncionarioModel).where(
                EstabelecimentoFuncionarioModel.estabelecimento_id == estab.id,
                EstabelecimentoFuncionarioModel.nome_completo == f["nome"],
                EstabelecimentoFuncionarioModel.is_deleted.is_(False),
            )
            res_func = await session.execute(stmt_func)
            if res_func.scalars().first() is None:
                func_m = EstabelecimentoFuncionarioModel(
                    estabelecimento_id=estab.id,
                    nome_completo=f["nome"],
                    funcao_cargo=f["cargo"],
                    eh_manipulador=f["eh_manipulador"],
                    is_active=True,
                    is_deleted=False,
                )
                session.add(func_m)
                await session.flush()
                counters.inc_created("estabelecimento_funcionarios")
            else:
                counters.inc_skipped("estabelecimento_funcionarios")

        # Fornecedores
        for forn in edata.get("fornecedores", []):
            stmt_forn = select(EstabelecimentoFornecedorModel).where(
                EstabelecimentoFornecedorModel.estabelecimento_id == estab.id,
                EstabelecimentoFornecedorModel.cnpj == forn["cnpj"],
                EstabelecimentoFornecedorModel.is_deleted.is_(False),
            )
            res_forn = await session.execute(stmt_forn)
            if res_forn.scalars().first() is None:
                forn_m = EstabelecimentoFornecedorModel(
                    estabelecimento_id=estab.id,
                    razao_social=forn["razao_social"],
                    cnpj=forn["cnpj"],
                    tipo_produto_fornecido=forn["tipo"],
                    municipio_uf="Braúnas/MG",
                    is_active=True,
                    is_deleted=False,
                )
                session.add(forn_m)
                await session.flush()
                counters.inc_created("estabelecimento_fornecedores")
            else:
                counters.inc_skipped("estabelecimento_fornecedores")

    return estabs_map


# ==============================================================================
# 8. SEED: CASOS OPERACIONAIS (INSPEÇÕES, ALVARÁ, REQUERIMENTO, DENÚNCIA)
# ==============================================================================
async def seed_casos_operacionais(
    session: AsyncSession,
    estabs_map: Dict[str, EstabelecimentoModel],
    usuarios_map: Dict[str, UsuarioModel],
    counters: SeedCounters,
) -> None:
    fiscal1 = usuarios_map["fiscal1.visa@braunas.mg.gov.br"]
    fiscal2 = usuarios_map["fiscal2.visa@braunas.mg.gov.br"]
    coordenador = usuarios_map["coordenador.visa@braunas.mg.gov.br"]

    drogaria = estabs_map["11.222.333/0001-44"]
    supermercado = estabs_map["22.333.444/0001-55"]
    padaria = estabs_map["33.444.555/0001-66"]

    # --- 1. Inspeção VAPT (Saúde do Trabalhador - Indicador 11) ---
    num_termo_vapt = "VAPT-2026/001"
    stmt_vapt = select(InspecaoModel).where(
        InspecaoModel.numero_termo == num_termo_vapt,
        InspecaoModel.is_deleted.is_(False),
    )
    res_vapt = await session.execute(stmt_vapt)
    if res_vapt.scalars().first() is None:
        inspecao_vapt = InspecaoModel(
            numero_termo=num_termo_vapt,
            motivo=TipoMotivoInspecao.VAPT_TRABALHADOR,
            status=StatusInspecao.CONCLUIDA,
            estabelecimento_id=supermercado.id,
            fiscal_responsavel_id=fiscal1.id,
            fiscais_acompanhantes="Rodrigo Silva Drumond",
            data_inicio=date(2026, 2, 10),
            data_fim=date(2026, 2, 10),
            hora_inspecao=time(14, 30),
            resultado=ResultadoInspecao.APROVADO_COM_EXIGENCIAS,
            nome_pessoa_acompanhou="Lucas Martins Silva",
            cpf_pessoa_acompanhou="222.333.444-55",
            relato_vistoria="Vistoria de vigilância em saúde do trabalhador no setor de açougue e depósito de cargas.",
            nome_local_trabalho="Setor de Açougue e Estoque de Mercadorias",
            principais_riscos_identificados="Risco ergonômico em carregamento de cargas e risco de corte com serras elétricas e facas.",
            recomendacoes_orientacoes="Uso obrigatório de luva de malha de aço e manutenção de pausas térmicas.",
            checklist_respostas={"epi_adequado": True, "pausa_termica": True, "iluminacao": True},
            relatorio_fotografico=[{"foto": "acougue1.jpg", "legenda": "Câmara fria com estrado plástico"}],
            is_active=True,
            is_deleted=False,
        )
        session.add(inspecao_vapt)
        await session.flush()
        counters.inc_created("inspecoes")
        logger.info(f"[CREATE] Inspeção VAPT {num_termo_vapt} criada.")
    else:
        counters.inc_skipped("inspecoes")

    # --- 2. Inspeção de Rotina notificada com prazo ---
    num_termo_rotina = "TERM-2026/002"
    stmt_rotina = select(InspecaoModel).where(
        InspecaoModel.numero_termo == num_termo_rotina,
        InspecaoModel.is_deleted.is_(False),
    )
    res_rotina = await session.execute(stmt_rotina)
    if res_rotina.scalars().first() is None:
        inspecao_rotina = InspecaoModel(
            numero_termo=num_termo_rotina,
            motivo=TipoMotivoInspecao.ROTINA_PROGRAMADA,
            status=StatusInspecao.CONCLUIDA,
            estabelecimento_id=padaria.id,
            fiscal_responsavel_id=fiscal2.id,
            data_inicio=date(2026, 2, 15),
            data_fim=date(2026, 2, 15),
            resultado=ResultadoInspecao.NOTIFICADO_COM_PRAZO,
            nome_pessoa_acompanhou="Geraldo Magela Costa",
            relato_vistoria="Identificada necessidade de instalação de telas milimétricas nas aberturas da área de cocção.",
            irregularidades_constatadas="Janelas da área de produção sem telas de proteção contra insetos.",
            exigencias_notificadas="Instalar telas milimétricas removíveis para fácil higienização.",
            prazo_adequacao_dias=30,
            data_limite_adequacao=date(2026, 3, 17),
            checklist_respostas={"higiene_pessoal": True, "telas_instaladas": False},
            is_active=True,
            is_deleted=False,
        )
        session.add(inspecao_rotina)
        await session.flush()
        counters.inc_created("inspecoes")
        logger.info(f"[CREATE] Inspeção Rotina Notificada {num_termo_rotina} criada.")
    else:
        counters.inc_skipped("inspecoes")

    # --- 3. Requerimento e Alvará Sanitário Ativo (Padrão XXXXXXXX-YYYY) ---
    protocolo_req = "REQ-2026-0001"
    stmt_req = select(RequerimentoAlvaraModel).where(
        RequerimentoAlvaraModel.numero_protocolo == protocolo_req,
        RequerimentoAlvaraModel.is_deleted.is_(False),
    )
    res_req = await session.execute(stmt_req)
    req = res_req.scalars().first()

    if req is None:
        req = RequerimentoAlvaraModel(
            numero_protocolo=protocolo_req,
            estabelecimento_id=drogaria.id,
            tipo_solicitacao="renovacao",
            status="deferido",
            data_submissao=datetime.now(timezone.utc),
            origem_solicitacao="Portal da VISA Braúnas",
            analisado_por=coordenador.id,
            parecer_fiscal="Documentação e RT rigorosamente em dia. Apto para expedição.",
            is_active=True,
            is_deleted=False,
        )
        session.add(req)
        await session.flush()

        req_dados = RequerimentoAlvaraDadosModel(
            requerimento_id=req.id,
            tipo_cadastro="PJ",
            cpf_cnpj=drogaria.cnpj_cpf,
            razao_social=drogaria.razao_social,
            nome_fantasia=drogaria.nome_fantasia,
            cnae_principal_selecionado="4771-7/01",
            rep_nome="José Carlos Ferreira",
            rep_cpf="123.456.789-01",
            exige_rt="Sim",
            rt_nome="Dra. Camila Nogueira Guimarães",
            rt_conselho_classe="CRF",
            rt_numero_conselho="24890",
            declaracao_veracidade_texto="Declaro a autenticidade das informações sob as penas da lei.",
            is_active=True,
            is_deleted=False,
        )
        session.add(req_dados)
        await session.flush()
        counters.inc_created("requerimentos_alvara")
        counters.inc_created("requerimentos_alvara_dados")
        logger.info(f"[CREATE] Requerimento {protocolo_req} criado.")
    else:
        counters.inc_skipped("requerimentos_alvara")
        counters.inc_skipped("requerimentos_alvara_dados")

    # Alvará Sanitário ativo
    stmt_alvara = select(AlvaraSanitarioModel).where(
        AlvaraSanitarioModel.numero_alvara == 1,
        AlvaraSanitarioModel.exercicio == 2026,
        AlvaraSanitarioModel.is_deleted.is_(False),
    )
    res_alvara = await session.execute(stmt_alvara)
    alvara = res_alvara.scalars().first()

    if alvara is None:
        alvara = AlvaraSanitarioModel(
            numero_alvara=1,
            exercicio=2026,
            numero_formatado="001/2026",
            estabelecimento_id=drogaria.id,
            requerimento_id=req.id,
            codigo_autenticidade="BRN2026A-2026",  # Padrão XXXXXXXX-YYYY
            data_emissao=date(2026, 1, 15),
            data_vencimento=date(2027, 1, 15),
            status="ativo",
            emitido_por=coordenador.id,
            condicionantes_restricoes="Manter livros de psicotrópicos escriturados no prazo regulamentar.",
            url_alvara_pdf="https://storage.braunas.mg.gov.br/alvaras/2026/001-2026.pdf",
            is_active=True,
            is_deleted=False,
        )
        session.add(alvara)
        await session.flush()

        # Sincroniza alvará no estabelecimento manualmente caso não esteja rodando sob trigger do PostgreSQL
        drogaria.numero_alvara = alvara.numero_formatado
        drogaria.data_validade_alvara = alvara.data_vencimento
        drogaria.situacao_alvara = "Válido"
        await session.flush()

        counters.inc_created("alvaras_sanitarios")
        logger.info(f"[CREATE] Alvará Sanitário {alvara.numero_formatado} ({alvara.codigo_autenticidade}) criado.")
    else:
        counters.inc_skipped("alvaras_sanitarios")

    # --- 4. Denúncia pendente de triagem ---
    protocolo_denuncia = "DEN-2026-0001"
    stmt_den = select(DenunciaModel).where(
        DenunciaModel.numero_protocolo == protocolo_denuncia,
        DenunciaModel.is_deleted.is_(False),
    )
    res_den = await session.execute(stmt_den)
    den = res_den.scalars().first()

    if den is None:
        den = DenunciaModel(
            numero_protocolo=protocolo_denuncia,
            origem="formulario_web",
            gravidade="media",
            status="recebida",
            estabelecimento_id=padaria.id,
            local_denunciado_identificacao="Padaria Tradição Mineira - Balcão de Frios",
            logradouro="Rua São Vicente",
            numero="112",
            bairro="Centro",
            denunciante_anonimo=True,
            relato_denuncia="Relato de comercialização de queijo minas frescal sem data de fracionamento visível.",
            url_anexos_evidencias=[],
            fiscal_designado_id=fiscal1.id,
            is_active=True,
            is_deleted=False,
        )
        session.add(den)
        await session.flush()
        counters.inc_created("denuncias")
        logger.info(f"[CREATE] Denúncia {protocolo_denuncia} criada na fila de triagem.")
    else:
        counters.inc_skipped("denuncias")


# ==============================================================================
# FUNÇÃO PRINCIPAL DE CARGA IDEMPOTENTE
# ==============================================================================
async def run_seeds(session: AsyncSession) -> SeedCounters:
    """
    Executa a carga completa e parametrizada dos seeds da Vigilância Sanitária de Braúnas/MG.
    Garante idempotência estrita através de verificação de chave única e soft delete.
    """
    counters = SeedCounters()
    logger.info("Iniciando rotina de sementes (Seeds) de Braúnas/MG...")

    # 1. Configuração Institucional
    await seed_configuracao_institucional(session, counters)

    # 2. Usuários
    usuarios_map = await seed_usuarios(session, counters)
    admin_user = usuarios_map["admin@braunas.mg.gov.br"]

    # 3. Metas do Exercício
    await seed_metas_exercicio(session, admin_user, counters)

    # 4. Tipos de Documentos
    await seed_tipos_documentos(session, counters)

    # 5. CNAEs
    cnaes_map = await seed_cnaes(session, counters)

    # 6. Representantes e RTs
    representantes_map = await seed_representantes_legais(session, counters)
    rt = await seed_responsaveis_tecnicos(session, counters)

    # 7. Estabelecimentos e Vínculos
    estabs_map = await seed_estabelecimentos(
        session,
        representantes_map=representantes_map,
        cnaes_map=cnaes_map,
        rt=rt,
        cadastrado_por=admin_user,
        counters=counters,
    )

    # 8. Casos Operacionais
    await seed_casos_operacionais(session, estabs_map, usuarios_map, counters)

    logger.info("Rotina de sementes finalizada com sucesso.")
    print(counters.summary())
    return counters


async def main() -> None:
    """Ponto de entrada do comando CLI: python -m app.infrastructure.seeds."""
    from sqlalchemy.ext.asyncio import async_sessionmaker

    session_maker = async_sessionmaker(async_engine, expire_on_commit=False)
    async with session_maker() as session:
        try:
            await run_seeds(session)
            await session.commit()
            logger.info("Transação confirmada (commit) com sucesso no banco de dados.")
        except Exception as e:
            await session.rollback()
            logger.error(f"Erro fatal durante execução das sementes: {e}", exc_info=True)
            raise


if __name__ == "__main__":
    asyncio.run(main())
