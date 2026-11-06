/**
 * Ficha Cadastral e Detalhamento Integral do Estabelecimento (EstabelecimentoDetailPage)
 * Apresenta dados cadastrais, atividades CNAE, representante legal, parâmetros de água e alvará.
 */

import React from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Building2,
  Calendar,
  CheckCircle2,
  ClipboardCheck,
  Droplets,
  Edit,
  FileCheck,
  Mail,
  MapPin,
  Phone,
  Shield,
  ShieldAlert,
  User,
  Users,
} from "lucide-react";
import RiscoBadge from "../../components/estabelecimentos/RiscoBadge";
import SituacaoAlvaraBadge from "../../components/estabelecimentos/SituacaoAlvaraBadge";
import { useEstabelecimentoDetalhe } from "../../hooks/useEstabelecimentos";

export const EstabelecimentoDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: estab, isLoading, error } = useEstabelecimentoDetalhe(id);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-xs text-slate-400 flex flex-col items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        Carregando ficha cadastral do estabelecimento...
      </div>
    );
  }

  if (error || !estab) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
          <Building2 className="w-6 h-6" />
        </div>
        <h2 className="text-base font-semibold text-slate-900 dark:text-white">
          Estabelecimento não encontrado
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Não foi possível localizar o estabelecimento solicitado no banco de dados da VISA Braúnas.
        </p>
        <button
          type="button"
          onClick={() => navigate("/estabelecimentos")}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 rounded-lg hover:bg-slate-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para a listagem</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Barra Superior de Navegação e Ações */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate("/estabelecimentos")}
              className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded"
              title="Voltar"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
            <h1 className="text-xl font-bold text-slate-900 dark:text-white">
              {estab.razao_social}
            </h1>
          </div>
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 dark:text-slate-400 ml-6">
            <span className="font-mono font-semibold text-slate-700 dark:text-slate-300">
              {estab.cnpj_cpf}
            </span>
            <span aria-hidden="true">·</span>
            <span>{estab.nome_fantasia || "Sem Nome Fantasia"}</span>
            <span aria-hidden="true">·</span>
            <RiscoBadge risco={estab.nivel_risco} />
            <span aria-hidden="true">·</span>
            <SituacaoAlvaraBadge situacao={estab.situacao_alvara} />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to={`/estabelecimentos/${estab.id}/editar`}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 rounded-lg transition-colors"
          >
            <Edit className="w-3.5 h-3.5" />
            <span>Editar</span>
          </Link>

          <Link
            to={`/inspecoes?estabelecimento_id=${estab.id}`}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-teal-600 hover:bg-teal-500 rounded-lg shadow-xs transition-colors"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>Ver Vistorias</span>
          </Link>
        </div>
      </div>

      {/* Grid de Informações em Seções */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna 1 & 2: Identificação e Atividades CNAE */}
        <div className="lg:col-span-2 space-y-6">
          {/* Card: Dados de Identificação & Localização */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Building2 className="w-4 h-4 text-teal-600" />
              Identificação & Localização
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Tipo de Cadastro</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {estab.tipo_cadastro === "PJ" ? "Pessoa Jurídica (PJ)" : "Pessoa Física (PF)"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Inscrição Municipal</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {estab.inscricao_municipal || "Não informada"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Natureza Jurídica</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {estab.natureza_juridica || "Não informada"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Competência de Fiscalização</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {estab.competencia_fiscalizacao}
                </span>
              </div>

              <div className="sm:col-span-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[11px]">Endereço Sanitário Completo</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 block mt-0.5">
                  {estab.logradouro}, {estab.numero}
                  {estab.complemento ? ` - ${estab.complemento}` : ""}
                </span>
                <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                  Bairro {estab.bairro} · CEP {estab.cep} · {estab.municipio}/{estab.uf}
                </span>
                {estab.ponto_referencia && (
                  <p className="text-[11px] text-slate-500 mt-1 italic">
                    Referência: {estab.ponto_referencia}
                  </p>
                )}
                {estab.acesso_compartilhado_residencia && (
                  <div className="mt-2 text-amber-700 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-2.5 py-1 rounded text-[11px]">
                    Atenção: Estabelecimento com acesso compartilhado com residência unifamiliar.
                  </div>
                )}
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Telefone Principal</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                  {estab.telefone_celular}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">E-mail de Contato</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {estab.email}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Atividades Econômicas (CNAEs) */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-4">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Shield className="w-4 h-4 text-teal-600" />
              Atividades Econômicas Reguladas (CNAEs)
            </h2>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {estab.cnaes.map((vinculo) => (
                <div key={vinculo.id || vinculo.cnae_codigo} className="py-3 first:pt-0 last:pb-0 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-900 dark:text-white">
                        {vinculo.cnae_codigo}
                      </span>
                      {vinculo.eh_principal && (
                        <span className="text-[10px] font-semibold bg-teal-100 dark:bg-teal-950 text-teal-800 dark:text-teal-300 px-1.5 py-0.5 rounded">
                          CNAE Principal
                        </span>
                      )}
                    </div>
                    {vinculo.cnae && (
                      <RiscoBadge risco={vinculo.cnae.grau_risco_padrao} size="sm" />
                    )}
                  </div>

                  <p className="text-slate-600 dark:text-slate-300 text-[11px]">
                    {vinculo.cnae?.descricao || "Descrição da atividade econômica"}
                  </p>

                  <div className="flex items-center gap-3 text-[10px] text-slate-400 pt-0.5">
                    {vinculo.cnae?.exige_rt && (
                      <span className="text-amber-600 font-medium">Exige RT</span>
                    )}
                    {vinculo.cnae?.exige_projeto_arquitetonico && (
                      <span className="text-blue-600 font-medium">Exige Projeto Arq.</span>
                    )}
                    {vinculo.data_inicio_atividade && (
                      <span>Início: {vinculo.data_inicio_atividade}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Coluna 3: Infraestrutura, Representante Legal e Alvará */}
        <div className="space-y-6">
          {/* Card: Alvará Sanitário Atual */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <FileCheck className="w-4 h-4 text-teal-600" />
              Licenciamento Sanitário
            </h2>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Situação:</span>
                <SituacaoAlvaraBadge situacao={estab.situacao_alvara} />
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Número do Alvará:</span>
                <span className="font-mono font-semibold text-slate-800 dark:text-slate-200">
                  {estab.numero_alvara || "Não emitido"}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-slate-400">Validade:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {estab.data_validade_alvara || "—"}
                </span>
              </div>
            </div>
          </div>

          {/* Card: Representante Legal */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <User className="w-4 h-4 text-teal-600" />
              Representante Legal
            </h2>

            {estab.representante_legal ? (
              <div className="space-y-2 text-xs">
                <div>
                  <span className="font-semibold text-slate-900 dark:text-white block">
                    {estab.representante_legal.nome_completo}
                  </span>
                  <span className="text-[11px] font-mono text-slate-400">
                    CPF: {estab.representante_legal.cpf}
                  </span>
                </div>

                <div className="text-[11px] text-slate-600 dark:text-slate-300 space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3 h-3 text-slate-400" />
                    <span>{estab.representante_legal.telefone}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Mail className="w-3 h-3 text-slate-400" />
                    <span>{estab.representante_legal.email}</span>
                  </div>
                  <div className="flex items-start gap-1.5 pt-1">
                    <MapPin className="w-3 h-3 text-slate-400 shrink-0 mt-0.5" />
                    <span className="text-[10px] leading-snug">
                      {estab.representante_legal.endereco_residencial}
                    </span>
                  </div>
                </div>
              </div>
            ) : (
              <p className="text-xs text-slate-400">
                Nenhum representante legal associado.
              </p>
            )}
          </div>

          {/* Card: Parâmetros de Saneamento & Água */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 shadow-xs space-y-3">
            <h2 className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
              <Droplets className="w-4 h-4 text-teal-600" />
              Saneamento & Infraestrutura
            </h2>

            <div className="space-y-2 text-xs">
              <div>
                <span className="text-slate-400 block text-[11px]">Fonte de Abastecimento</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {estab.fonte_abastecimento_agua || "Rede Pública"}
                </span>
              </div>

              <div>
                <span className="text-slate-400 block text-[11px]">Reservatório Próprio</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {estab.possui_reservatorio_proprio
                    ? `Sim (${estab.capacidade_reservatorio_litros} L)`
                    : "Não possui reservatório próprio"}
                </span>
              </div>

              {estab.horario_funcionamento && (
                <div>
                  <span className="text-slate-400 block text-[11px]">Horário de Funcionamento</span>
                  <span className="font-semibold text-slate-800 dark:text-slate-200">
                    {estab.horario_funcionamento}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EstabelecimentoDetailPage;
