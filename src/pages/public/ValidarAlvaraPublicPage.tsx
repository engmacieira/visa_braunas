/**
 * Página Pública de Validação e Consulta de Autenticidade de Alvará Sanitário
 * Rota: /validar-alvara/:codigo
 * Acessada por cidadãos e fiscais ao escanear o QR Code impresso no documento oficial.
 * Não exige autenticação JWT.
 */

import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin,
  QrCode,
  Search,
  Shield,
  ShieldAlert,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { APP_CONFIG } from "../../config/app.config";
import { ROUTES } from "../../config/routes.config";
import { useValidarAlvaraPublico } from "../../hooks/useLicenciamento";
import { RiscoBadge } from "../../components/estabelecimentos/RiscoBadge";

export const ValidarAlvaraPublicPage: React.FC = () => {
  const { codigo } = useParams<{ codigo: string }>();
  const navigate = useNavigate();

  const [inputCodigo, setInputCodigo] = useState(codigo || "");

  const {
    data: alvara,
    isLoading,
    isError,
    error,
    refetch,
  } = useValidarAlvaraPublico(codigo);

  const handleBuscarNovoCodigo = (e: React.FormEvent) => {
    e.preventDefault();
    if (inputCodigo.trim()) {
      navigate(ROUTES.PUBLIC.VALIDAR_ALVARA(encodeURIComponent(inputCodigo.trim().toUpperCase())));
    }
  };

  const estab = alvara?.estabelecimento;

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col justify-between antialiased selection:bg-teal-500 selection:text-white">
      {/* Topo Institucional de Fé Pública */}
      <header className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shadow-2xs">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-teal-600 text-white flex items-center justify-center font-bold shadow-xs">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                Validação Oficial de Documentos
              </span>
              <h1 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">
                Vigilância Sanitária • {APP_CONFIG.municipio} / {APP_CONFIG.uf}
              </h1>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
            <QrCode className="w-3.5 h-3.5 text-teal-600" />
            <span>Consulta Pública QR Code</span>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <main className="max-w-2xl w-full mx-auto px-4 py-8 space-y-6">
        {/* Barra de Consulta Manual de Código */}
        <form
          onSubmit={handleBuscarNovoCodigo}
          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-2.5 shadow-2xs flex items-center gap-2"
        >
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Digite o código de autenticidade (ex: A8B2C4D1-2026)..."
              value={inputCodigo}
              onChange={(e) => setInputCodigo(e.target.value.toUpperCase())}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-transparent border-0 text-slate-900 dark:text-white placeholder-slate-400 font-mono focus:outline-none focus:ring-0 uppercase"
            />
          </div>
          <button
            type="submit"
            className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-xl shadow-xs transition-colors shrink-0"
          >
            Consultar
          </button>
        </form>

        {/* Estado: Carregando */}
        {isLoading && (
          <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs">
            <div className="w-8 h-8 border-3 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Validando autenticidade no banco de dados sanitário...
            </span>
            <span className="text-[11px] text-slate-400 mt-1">
              Código verificado: {codigo}
            </span>
          </div>
        )}

        {/* Estado: Documento Inválido ou Não Localizado (404) */}
        {!isLoading && (isError || !alvara) && (
          <div className="bg-white dark:bg-slate-900 border-2 border-rose-300 dark:border-rose-900/60 rounded-2xl p-6 sm:p-8 shadow-sm space-y-5 text-center">
            <div className="w-16 h-16 rounded-full bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-800 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10" />
            </div>

            <div className="space-y-1.5">
              <span className="inline-block px-3 py-1 text-[11px] font-bold rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-200 uppercase tracking-wider">
                Documento Não Autêntico / Inválido
              </span>
              <h2 className="text-lg font-black text-slate-900 dark:text-white">
                Alvará Sanitário Não Localizado
              </h2>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                O código de autenticidade informado (<strong>{codigo || "---"}</strong>) não consta nos registros oficiais da Vigilância Sanitária de {APP_CONFIG.municipio}/MG ou foi cancelado.
              </p>
            </div>

            <div className="p-4 bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/80 rounded-xl text-left text-xs text-rose-900 dark:text-rose-200 space-y-1">
              <p className="font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Atenção ao Cidadão e ao Consumidor:
              </p>
              <p className="text-[11px] leading-relaxed text-rose-800 dark:text-rose-300">
                Documentos impressos que não puderem ser validados neste portal oficial podem configurar falsificação ou exercício irregular de atividade econômica. Em caso de dúvidas, denuncie à Ouvidoria da Vigilância Sanitária.
              </p>
            </div>
          </div>
        )}

        {/* Estado: Documento Válido ou Vencido Encontrado */}
        {!isLoading && alvara && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            {/* Banner de Status Jurídico */}
            {alvara.valido ? (
              <div className="p-6 bg-emerald-600 text-white text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2 backdrop-blur-xs">
                  <CheckCircle2 className="w-8 h-8 text-white" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest bg-white/20 px-3 py-0.5 rounded-full inline-block">
                  Documento Autêntico e Regular
                </span>
                <h2 className="text-xl font-black tracking-wide">
                  ALVARÁ SANITÁRIO VÁLIDO
                </h2>
                <p className="text-xs text-emerald-100">
                  Emitido pela {APP_CONFIG.prefeitura} / {APP_CONFIG.uf}
                </p>
              </div>
            ) : (
              <div className="p-6 bg-rose-600 text-white text-center space-y-1">
                <div className="w-12 h-12 rounded-full bg-white/20 flex items-center justify-center mx-auto mb-2 backdrop-blur-xs">
                  <ShieldAlert className="w-8 h-8 text-white" />
                </div>
                <span className="text-[11px] font-bold uppercase tracking-widest bg-white/20 px-3 py-0.5 rounded-full inline-block">
                  Situação Irregular
                </span>
                <h2 className="text-xl font-black tracking-wide">
                  ALVARÁ SANITÁRIO VENCIDO / SUSPENSO
                </h2>
                <p className="text-xs text-rose-100">
                  {alvara.motivo_status || "Validade expirada ou documento revogado"}
                </p>
              </div>
            )}

            {/* Dados Centrais do Alvará */}
            <div className="p-6 space-y-6">
              {/* Identificação Oficial */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Número do Alvará
                  </span>
                  <span className="text-base font-black text-slate-900 dark:text-white">
                    {alvara.numero_formatado || `${alvara.numero_alvara}/${alvara.exercicio}`}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Código de Autenticidade
                  </span>
                  <span className="text-base font-mono font-bold text-teal-700 dark:text-teal-400">
                    {alvara.codigo_autenticidade}
                  </span>
                </div>
              </div>

              {/* Empresa / Beneficiário */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    Estabelecimento Licenciado
                  </span>
                  {estab?.nivel_risco && <RiscoBadge risco={estab.nivel_risco} />}
                </div>

                <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl space-y-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Razão Social</span>
                    <p className="text-sm font-bold text-slate-900 dark:text-white">
                      {estab?.razao_social || "Estabelecimento Regular"}
                    </p>
                  </div>

                  {estab?.nome_fantasia && (
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Nome Fantasia</span>
                      <p className="font-medium text-slate-800 dark:text-slate-200">
                        {estab.nome_fantasia}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-slate-200/60 dark:border-slate-700/60">
                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">CNPJ / CPF</span>
                      <p className="font-mono font-medium text-slate-800 dark:text-slate-200">
                        {estab?.cnpj_cpf || "---"}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] text-slate-400 uppercase font-semibold block">Inscrição Municipal</span>
                      <p className="font-mono text-slate-700 dark:text-slate-300">
                        {estab?.inscricao_municipal || "Isento / Não Consta"}
                      </p>
                    </div>
                  </div>

                  <div className="pt-1">
                    <span className="text-[10px] text-slate-400 uppercase font-semibold block">Endereço Autorizado</span>
                    <p className="text-slate-700 dark:text-slate-300 leading-snug">
                      {estab?.logradouro || "Logradouro"}, {estab?.numero || "S/N"}{" "}
                      {estab?.complemento && `(${estab.complemento})`} -{" "}
                      {estab?.bairro || "Centro"}, {estab?.municipio || APP_CONFIG.municipio}/{estab?.uf || APP_CONFIG.uf}
                    </p>
                  </div>
                </div>
              </div>

              {/* Prazos de Validade */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 rounded-xl text-xs space-y-1">
                  <span className="text-slate-400 text-[10px] uppercase font-bold block flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-teal-600" />
                    Data de Emissão
                  </span>
                  <p className="text-sm font-bold text-slate-900 dark:text-white">
                    {new Date(alvara.data_emissao).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </p>
                </div>

                <div
                  className={`p-3 border rounded-xl text-xs space-y-1 ${
                    alvara.valido
                      ? "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-800 text-emerald-950 dark:text-emerald-200"
                      : "bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-800 text-rose-950 dark:text-rose-200"
                  }`}
                >
                  <span className="text-[10px] uppercase font-bold block flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5" />
                    Data Limite de Validade
                  </span>
                  <p className="text-sm font-black">
                    {new Date(alvara.data_vencimento).toLocaleDateString("pt-BR", { timeZone: "UTC" })}
                  </p>
                  {alvara.dias_restantes_validade !== undefined && (
                    <span className="text-[10px] font-semibold block">
                      {alvara.dias_restantes_validade >= 0
                        ? `Vigente por mais ${alvara.dias_restantes_validade} dia(s)`
                        : `Vencido há ${Math.abs(alvara.dias_restantes_validade)} dia(s)`}
                    </span>
                  )}
                </div>
              </div>

              {/* Condicionantes (se houver) */}
              {alvara.condicionantes_restricoes && (
                <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl text-xs text-amber-900 dark:text-amber-200 space-y-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 dark:text-amber-300 block">
                    Condicionantes / Restrições Especiais:
                  </span>
                  <p className="text-[11px] leading-relaxed">
                    {alvara.condicionantes_restricoes}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Rodapé Institucional */}
      <footer className="bg-white dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 py-6 text-center text-xs text-slate-500">
        <div className="max-w-2xl mx-auto px-4 space-y-1">
          <p className="font-semibold text-slate-700 dark:text-slate-300">
            {APP_CONFIG.prefeitura} • {APP_CONFIG.secretaria}
          </p>
          <p className="text-[11px] text-slate-400">
            {APP_CONFIG.orgao} • Sistema {APP_CONFIG.nome}
          </p>
          <p className="text-[10px] text-slate-400 pt-2">
            Consulta pública em conformidade com o princípio da publicidade administrativa e Código Sanitário do {APP_CONFIG.estadoExtenso}.
          </p>
        </div>
      </footer>
    </div>
  );
};

export default ValidarAlvaraPublicPage;
