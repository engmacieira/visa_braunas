"""
Módulo de Domínio: Interface Abstrata de Repositório de Leitura (CQRS Read Model)
"""
from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional


class IIndicadoresReadRepository(ABC):
    @abstractmethod
    async def obter_metas_exercicio(self, ano: int) -> Optional[Dict[str, Any]]:
        """
        Retorna as metas regulatórias pactuadas para o exercício anual especificado.
        """
        pass

    @abstractmethod
    async def obter_resumo_indicador_11_vapt(self, ano: int) -> Dict[str, Any]:
        """
        Consulta a view 'vw_indicador_11_vapt_consolidado' e calcula o progresso VAPT.
        """
        pass

    @abstractmethod
    async def obter_cobertura_risco_consolidada(self, ano: int) -> Dict[str, Any]:
        """
        Consulta a view 'vw_estabelecimentos_risco_consolidado' e cruza com as inspeções
        concluídas e alvarás válidos do exercício para apuração dos Indicadores 12, 13 e 14.
        """
        pass

    @abstractmethod
    async def listar_estabelecimentos_cobertura_detalhada(
        self,
        ano: int,
        grau_risco: str,
        apenas_nao_fiscalizados: bool = False,
    ) -> List[Dict[str, Any]]:
        """
        Lista detalhada de estabelecimentos classificados pelo risco sanitário preponderante,
        informando se foram fiscalizados no exercício civil para prestação de contas.
        """
        pass

    @abstractmethod
    async def obter_painel_alertas_vencimento(self, limite_dias: int = 30) -> Dict[str, Any]:
        """
        Consulta combinada das views 'vw_inspecoes_notificacoes_a_vencer' e
        'vw_documentos_proximos_vencimento'.
        """
        pass

    @abstractmethod
    async def gerar_dados_relatorio_oficial(self, ano: int) -> Dict[str, Any]:
        """
        Consolidação geral de dados de metas, ações fiscais, alvarás e autos para
        emissão do Relatório Anual de Gestão da VISA de Braúnas/MG.
        """
        pass
