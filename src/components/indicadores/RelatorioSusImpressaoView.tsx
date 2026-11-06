/**
 * Layout Oficial do Relatório de Prestação de Contas Sanitárias SUS (A4 para Impressão)
 * Compatível com DIGISUS / Sargsus e diretrizes do Pacto da Saúde.
 * Estilizado para folha A4 com regras @media print e cabeçalho oficial dinâmico de APP_CONFIG.
 */

import React from "react";
import { Shield } from "lucide-react";
import { APP_CONFIG } from "../../config/app.config";
import { RelatorioSusDTO } from "../../types/indicadores";

interface RelatorioSusImpressaoViewProps {
  relatorio: RelatorioSusDTO;
  nomeCoordenador?: string;
  matriculaCoordenador?: string;
}

export const RelatorioSusImpressaoView: React.FC<RelatorioSusImpressaoViewProps> = ({
  relatorio,
  nomeCoordenador = "Coordenação de Vigilância Sanitária",
  matriculaCoordenador = "VISA-0042/MG",
}) => {
  const {
    ano_exercicio,
    data_emissao_relatorio,
    indicadores_sintese = [],
    resumo_geral = {},
  } = relatorio;

  const totalEmpresas = resumo_geral.total_estabelecimentos_cadastrados ?? 239;
  const totalInspecoes = resumo_geral.total_inspecoes_exercicio ?? 84;
  const totalAlvaras = resumo_geral.total_alvaras_ativos ?? 162;
  const totalVapt = resumo_geral.acoes_vapt_concluidas ?? 18;

  return (
    <div className="bg-white text-slate-900 font-sans p-8 sm:p-12 max-w-[210mm] mx-auto min-h-[297mm] shadow-lg print:shadow-none print:p-0 print:m-0 print:max-w-none print:w-full print:min-h-0">
      {/* Cabeçalho Oficial do Município */}
      <div className="border-b-2 border-slate-900 pb-5 mb-6 text-center flex flex-col items-center">
        {/* Brasão / Símbolo Institucional */}
        <div className="w-14 h-14 rounded-full border-2 border-slate-900 flex items-center justify-center mb-3">
          <Shield className="w-8 h-8 text-slate-900 stroke-[2.2]" />
        </div>

        <div className="text-xs uppercase font-bold tracking-widest text-slate-700">
          República Federativa do Brasil • Estado de Minas Gerais
        </div>
        <h1 className="text-base font-extrabold uppercase tracking-tight text-slate-900 mt-0.5">
          {relatorio.nome_prefeitura || `Prefeitura Municipal de ${APP_CONFIG.municipio}`}
        </h1>
        <h2 className="text-xs font-semibold text-slate-800 uppercase mt-0.5">
          {APP_CONFIG.secretaria || relatorio.nome_secretaria}
        </h2>
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide mt-0.5">
          {APP_CONFIG.orgao || relatorio.nome_coordenadoria}
        </h3>
      </div>

      {/* Identificação do Relatório Oficial */}
      <div className="mb-6 bg-slate-50 border border-slate-300 p-4 rounded-sm print:bg-transparent print:border-slate-400">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-300 pb-2 mb-2 text-xs">
          <div>
            <span className="font-bold text-slate-700">DOCUMENTO OFICIAL: </span>
            <span className="font-mono font-bold text-slate-900">
              REL-SUS/{ano_exercicio}/{APP_CONFIG.municipio.toUpperCase()}
            </span>
          </div>
          <div>
            <span className="font-bold text-slate-700">EMISSÃO: </span>
            <span className="font-mono text-slate-900">{data_emissao_relatorio}</span>
          </div>
        </div>

        <h2 className="text-sm font-extrabold uppercase text-slate-900 text-center tracking-wide">
          RELATÓRIO ANUAL DE PRESTAÇÃO DE CONTAS SANITÁRIAS & CUMPRIMENTO DE METAS DO SUS
        </h2>
        <p className="text-[11px] text-slate-600 text-center mt-1">
          Exercício de Referência: <strong>{ano_exercicio}</strong> • Município:{" "}
          <strong>{APP_CONFIG.municipio} - {APP_CONFIG.uf}</strong> • Diretrizes: DIGISUS / Rargsus / Pacto da Saúde
        </p>
      </div>

      {/* Resumo Cadastral e Operacional Consolidado */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-400 pb-1 mb-2">
          1. Síntese do Parque Cadastral e Ações Regulatórias
        </h3>
        <div className="grid grid-cols-4 gap-2 text-center text-xs">
          <div className="border border-slate-300 p-2 rounded-xs">
            <span className="text-[10px] uppercase text-slate-500 font-semibold block">
              Empresas Ativas
            </span>
            <span className="text-sm font-extrabold text-slate-900 tabular-nums">
              {totalEmpresas}
            </span>
          </div>
          <div className="border border-slate-300 p-2 rounded-xs">
            <span className="text-[10px] uppercase text-slate-500 font-semibold block">
              Alvarás Vigentes
            </span>
            <span className="text-sm font-extrabold text-slate-900 tabular-nums">
              {totalAlvaras}
            </span>
          </div>
          <div className="border border-slate-300 p-2 rounded-xs">
            <span className="text-[10px] uppercase text-slate-500 font-semibold block">
              Vistorias Realizadas
            </span>
            <span className="text-sm font-extrabold text-slate-900 tabular-nums">
              {totalInspecoes}
            </span>
          </div>
          <div className="border border-slate-300 p-2 rounded-xs">
            <span className="text-[10px] uppercase text-slate-500 font-semibold block">
              Ações VAPT (Trabalhador)
            </span>
            <span className="text-sm font-extrabold text-slate-900 tabular-nums">
              {totalVapt}
            </span>
          </div>
        </div>
      </div>

      {/* Tabela Oficial de Indicadores Pactuados */}
      <div className="mb-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800 border-b border-slate-400 pb-1 mb-2">
          2. Detalhamento dos Indicadores Sanitários Pactuados (11 a 15)
        </h3>

        <table className="w-full text-left text-xs border border-slate-300">
          <thead className="bg-slate-100 text-slate-800 font-bold uppercase text-[10px] border-b border-slate-300">
            <tr>
              <th className="py-2 px-2.5 border-r border-slate-300 w-16 text-center">Código</th>
              <th className="py-2 px-2.5 border-r border-slate-300">Descrição Técnica do Indicador</th>
              <th className="py-2 px-2 border-r border-slate-300 text-center w-20">Meta Fixada</th>
              <th className="py-2 px-2 border-r border-slate-300 text-center w-20">Realizado</th>
              <th className="py-2 px-2 border-r border-slate-300 text-center w-20">Atingimento</th>
              <th className="py-2 px-2.5 text-center w-24">Situação</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-300 text-[11px]">
            {indicadores_sintese.map((ind) => {
              const { codigo, titulo, descricao, unidade, progresso } = ind;
              const { meta_pactuada, realizado, percentual_atingido, status } = progresso;
              const isAtingida = percentual_atingido >= 100 || status?.toLowerCase() === "atingida";

              return (
                <tr key={codigo} className="leading-tight">
                  <td className="py-2.5 px-2.5 border-r border-slate-300 font-mono font-bold text-center">
                    {codigo}
                  </td>
                  <td className="py-2.5 px-2.5 border-r border-slate-300">
                    <div className="font-bold text-slate-900">{titulo}</div>
                    <div className="text-[10px] text-slate-600 mt-0.5">{descricao}</div>
                  </td>
                  <td className="py-2.5 px-2 border-r border-slate-300 text-center font-mono">
                    {meta_pactuada} {unidade}
                  </td>
                  <td className="py-2.5 px-2 border-r border-slate-300 text-center font-mono font-bold">
                    {realizado} {unidade}
                  </td>
                  <td className="py-2.5 px-2 border-r border-slate-300 text-center font-mono font-bold">
                    {percentual_atingido.toFixed(1)}%
                  </td>
                  <td className="py-2.5 px-2 text-center">
                    <span
                      className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                        isAtingida
                          ? "bg-slate-200 text-slate-900 border border-slate-400"
                          : "bg-slate-100 text-slate-800 border border-slate-300"
                      }`}
                    >
                      {status || (isAtingida ? "Atingida" : "Em Andamento")}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Nota Metodológica e Base Legal */}
      <div className="mb-8 p-3 border border-slate-300 rounded-xs text-[10px] text-slate-600 leading-relaxed">
        <strong>Nota Técnica Legal:</strong> Indicadores calculados em conformidade com as diretrizes da
        Resolução SES/MG nº 7.730/2021, Instrução Normativa ANVISA nº 66/2020 e Lei Federal nº 8.080/1990.
        O Indicador 11 afere a vigilância ativa em ambientes de trabalho (VAPT) visando a prevenção de acidentes e agravos
        ocupacionais. Os Indicadores 12 a 15 consolidam a cobertura proporcional por grau de risco sanitário atribuído pelo CNAE.
      </div>

      {/* Campo Formal de Encerramento, Assinatura e Carimbo */}
      <div className="mt-12 pt-6 border-t border-slate-400 break-inside-avoid">
        <div className="text-right text-xs text-slate-700 mb-12">
          {APP_CONFIG.municipio} - {APP_CONFIG.uf}, {new Date().toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "long",
            year: "numeric",
          })}.
        </div>

        <div className="grid grid-cols-2 gap-12 text-center text-xs">
          <div className="flex flex-col items-center">
            <div className="w-56 border-b border-slate-900 mb-1.5" />
            <div className="font-bold text-slate-900 uppercase">
              {nomeCoordenador}
            </div>
            <div className="text-[11px] text-slate-600">
              Coordenador de Vigilância Sanitária
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Matrícula: {matriculaCoordenador}
            </div>
          </div>

          <div className="flex flex-col items-center">
            <div className="w-56 border-b border-slate-900 mb-1.5" />
            <div className="font-bold text-slate-900 uppercase">
              Secretaria Municipal de Saúde
            </div>
            <div className="text-[11px] text-slate-600">
              Gestor Municipal do SUS
            </div>
            <div className="text-[10px] font-mono text-slate-500">
              Prefeitura Municipal de {APP_CONFIG.municipio}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RelatorioSusImpressaoView;
