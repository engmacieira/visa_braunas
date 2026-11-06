/**
 * Layout Oficial do Alvará Sanitário para Visualização e Impressão em Folha A4
 * Renderização vetorial com QRCodeSVG (qrcode.react), cabeçalho institucional oficial,
 * tabela de CNAEs autorizados, condicionantes e regras CSS para window.print().
 */

import React from "react";
import { QRCodeSVG } from "qrcode.react";
import { Award, Building2, Calendar, CheckCircle2, Shield } from "lucide-react";
import { APP_CONFIG } from "../../config/app.config";
import { AlvaraSanitarioDetalhe } from "../../types/licenciamento";

interface AlvaraImpressaoViewProps {
  alvara: AlvaraSanitarioDetalhe;
}

export const AlvaraImpressaoView: React.FC<AlvaraImpressaoViewProps> = ({ alvara }) => {
  const estab = alvara.estabelecimento;

  // Monta a URL de validação pública completa
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const urlValidacaoPublica = `${baseUrl}/validar-alvara/${alvara.codigo_autenticidade}`;

  const dataEmissaoFormatada = new Date(alvara.data_emissao).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });
  const dataVencimentoFormatada = new Date(alvara.data_vencimento).toLocaleDateString("pt-BR", {
    timeZone: "UTC",
  });

  const rtTitular = estab?.responsaveis_tecnicos?.find((r) => !r.eh_substituto)?.responsavel_tecnico;

  return (
    <div className="alvara-container bg-slate-100 dark:bg-slate-950 p-2 sm:p-6 flex justify-center">
      {/* Estilos dedicados para impressão limpa em folha A4 */}
      <style>{`
        @media print {
          body {
            background-color: #ffffff !important;
            color: #0f172a !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .alvara-container {
            padding: 0 !important;
            background: transparent !important;
          }
          .alvara-sheet {
            box-shadow: none !important;
            border: 2px solid #0f172a !important;
            margin: 0 auto !important;
            width: 100% !important;
            max-width: 210mm !important;
            min-height: 297mm !important;
            page-break-after: avoid !important;
            page-break-inside: avoid !important;
            padding: 16mm !important;
          }
        }
      `}</style>

      {/* Folha A4 com borda oficial de fé pública */}
      <div className="alvara-sheet bg-white text-slate-900 border-2 border-slate-900 rounded-none w-full max-w-[210mm] min-h-[285mm] p-6 sm:p-10 shadow-xl flex flex-col justify-between relative overflow-hidden font-sans">
        {/* Marca d'água sutil institucional */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none">
          <Shield className="w-[450px] h-[450px] text-slate-900" />
        </div>

        {/* Topo: Cabeçalho Institucional */}
        <div className="space-y-4 relative z-10">
          <div className="text-center border-b-2 border-slate-900 pb-4 space-y-1">
            <div className="flex items-center justify-center gap-2 mb-1">
              <div className="w-10 h-10 rounded-full border border-slate-800 flex items-center justify-center bg-slate-50">
                <Shield className="w-6 h-6 text-slate-900" />
              </div>
            </div>
            <p className="text-[11px] font-bold tracking-widest uppercase text-slate-700">
              República Federativa do Brasil • Estado de Minas Gerais
            </p>
            <h1 className="text-base sm:text-lg font-black uppercase tracking-wider text-slate-950">
              Prefeitura Municipal de {APP_CONFIG.municipio}
            </h1>
            <p className="text-xs font-semibold text-slate-800 uppercase tracking-wide">
              {APP_CONFIG.secretaria} • {APP_CONFIG.orgao}
            </p>
          </div>

          {/* Título Oficial do Documento */}
          <div className="text-center py-2 bg-slate-50 border border-slate-300 rounded">
            <h2 className="text-lg sm:text-xl font-black text-slate-950 tracking-widest uppercase">
              Alvará de Autorização Sanitária
            </h2>
            <div className="flex items-center justify-center gap-4 text-xs font-bold text-slate-800 mt-1">
              <span>NÚMERO OFICIAL: {alvara.numero_formatado || `${alvara.numero_alvara}/${alvara.exercicio}`}</span>
              <span>•</span>
              <span className="font-mono text-teal-900">AUTENTICIDADE: {alvara.codigo_autenticidade}</span>
            </div>
          </div>

          {/* Texto de Fé Pública */}
          <p className="text-[11px] text-justify leading-relaxed text-slate-800 px-1">
            A <strong>Coordenação Municipal de Vigilância Sanitária</strong>, no uso das atribuições legais conferidas pela Lei Orgânica Municipal, Código de Saúde do Estado de Minas Gerais e legislação federal correlata, <strong>CERTIFICA</strong> que o estabelecimento abaixo qualificado cumpriu as normas higiênico-sanitárias vigentes e está autorizado a exercer suas atividades regulamentadas:
          </p>

          {/* Bloco 1: Identificação do Estabelecimento */}
          <div className="border border-slate-300 rounded p-3 bg-slate-50/50 space-y-2 text-xs">
            <div className="border-b border-slate-200 pb-1.5 flex items-center justify-between">
              <span className="font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 text-[11px]">
                <Building2 className="w-3.5 h-3.5 text-slate-700" />
                Dados do Estabelecimento Regulamentado
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                Grau de Risco: {estab?.nivel_risco || "Risco Avaliado"}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Razão Social</span>
                <span className="font-bold text-slate-900">{estab?.razao_social || "Nome do Estabelecimento"}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Nome Fantasia</span>
                <span className="font-medium text-slate-800">{estab?.nome_fantasia || "Não informado"}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">CNPJ / CPF</span>
                <span className="font-mono font-bold text-slate-900">{estab?.cnpj_cpf || "---"}</span>
              </div>

              <div>
                <span className="text-[10px] text-slate-500 uppercase font-semibold block">Inscrição Municipal</span>
                <span className="font-mono text-slate-800">{estab?.inscricao_municipal || "Isento / Não Consta"}</span>
              </div>
            </div>

            <div className="pt-1 text-[11px] text-slate-700">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Endereço de Funcionamento</span>
              <span>
                {estab?.logradouro || "Logradouro"}, {estab?.numero || "S/N"}{" "}
                {estab?.complemento && `(${estab.complemento})`} - Bairro: {estab?.bairro || "Centro"}, {estab?.municipio || APP_CONFIG.municipio}/{estab?.uf || APP_CONFIG.uf} - CEP: {estab?.cep || "35169-000"}
              </span>
            </div>
          </div>

          {/* Bloco 2: Atividades CNAEs Autorizadas */}
          <div className="border border-slate-300 rounded p-3 bg-slate-50/50 space-y-2 text-xs">
            <span className="font-bold uppercase tracking-wider text-slate-900 flex items-center gap-1.5 text-[11px] border-b border-slate-200 pb-1.5">
              <Award className="w-3.5 h-3.5 text-slate-700" />
              Atividades Econômicas Autorizadas (CNAE)
            </span>

            {estab?.cnaes && estab.cnaes.length > 0 ? (
              <div className="divide-y divide-slate-200 text-[11px]">
                {estab.cnaes.map((item, idx) => (
                  <div key={idx} className="py-1 flex items-start justify-between gap-2">
                    <div>
                      <span className="font-mono font-bold text-slate-900 mr-2">
                        {item.cnae_codigo}
                      </span>
                      <span className="text-slate-800">
                        {item.cnae?.descricao || "Atividade Econômica Registrada"}
                      </span>
                    </div>
                    <span className="text-[10px] font-semibold text-slate-600 bg-white px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                      {item.eh_principal ? "Principal" : "Secundária"}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-slate-600 italic">
                Atividade principal autorizada conforme processo de requerimento e vistoria de campo sanitária.
              </p>
            )}
          </div>

          {/* Bloco 3: Responsáveis Legais e Técnicos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="border border-slate-300 rounded p-2.5 bg-slate-50/50">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Responsável Legal</span>
              <p className="font-bold text-slate-900 mt-0.5">
                {estab?.representante_legal?.nome_completo || "Representante Declarado"}
              </p>
              {estab?.representante_legal?.cpf && (
                <p className="text-[10px] text-slate-600 font-mono">
                  CPF: {estab.representante_legal.cpf}
                </p>
              )}
            </div>

            <div className="border border-slate-300 rounded p-2.5 bg-slate-50/50">
              <span className="text-[10px] text-slate-500 uppercase font-semibold block">Responsável Técnico (RT)</span>
              <p className="font-bold text-slate-900 mt-0.5">
                {rtTitular?.nome_completo || "Não Exigido ou Conforme Legislação"}
              </p>
              {rtTitular?.conselho_classe && (
                <p className="text-[10px] text-slate-600 font-mono">
                  {rtTitular.conselho_classe}: {rtTitular.numero_registro_conselho}/{rtTitular.uf_conselho}
                </p>
              )}
            </div>
          </div>

          {/* Condicionantes e Restrições */}
          {alvara.condicionantes_restricoes && (
            <div className="border border-amber-300 bg-amber-50/50 rounded p-2.5 text-xs text-amber-950">
              <span className="text-[10px] uppercase font-bold text-amber-800 block">
                Condicionantes Sanitárias & Restrições de Operação:
              </span>
              <p className="text-[11px] mt-0.5 leading-relaxed font-medium">
                {alvara.condicionantes_restricoes}
              </p>
            </div>
          )}
        </div>

        {/* Rodapé: Validade, QR Code de Autenticidade e Assinatura */}
        <div className="pt-4 border-t-2 border-slate-900 space-y-4 relative z-10 mt-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {/* Bloco de Validade e Datas */}
            <div className="space-y-1.5 text-xs">
              <div className="p-2 border border-slate-300 rounded bg-slate-50">
                <span className="text-[10px] text-slate-500 uppercase font-bold block">Data de Expedição</span>
                <span className="font-bold text-slate-950 text-sm">{dataEmissaoFormatada}</span>
              </div>
              <div className="p-2 border-2 border-emerald-700 rounded bg-emerald-50">
                <span className="text-[10px] text-emerald-800 uppercase font-bold block">Válido Até</span>
                <span className="font-black text-emerald-950 text-sm">{dataVencimentoFormatada}</span>
              </div>
            </div>

            {/* Bloco Central: QR Code de Autenticidade */}
            <div className="flex flex-col items-center text-center p-2 border border-slate-200 rounded bg-white">
              <div className="p-1.5 bg-white border border-slate-300 rounded shadow-2xs">
                <QRCodeSVG
                  value={urlValidacaoPublica}
                  size={96}
                  level="H"
                  includeMargin={false}
                />
              </div>
              <span className="text-[9px] font-bold text-slate-700 uppercase mt-1">
                Autenticidade por QR Code
              </span>
              <span className="text-[8px] text-slate-500 leading-tight max-w-[140px]">
                Aponte a câmera do celular para verificar a validade jurídica
              </span>
            </div>

            {/* Bloco da Assinatura Oficial */}
            <div className="text-center flex flex-col justify-end pt-4">
              <div className="border-t border-slate-800 pt-1.5 mx-auto w-48">
                <p className="text-xs font-bold text-slate-950">Autoridade Sanitária</p>
                <p className="text-[10px] text-slate-600">Coordenação de Vigilância Sanitária</p>
                <p className="text-[9px] text-slate-500 font-mono">Município de {APP_CONFIG.municipio} / MG</p>
              </div>
            </div>
          </div>

          {/* Rodapé Legal */}
          <div className="text-[9px] text-center text-slate-500 pt-2 border-t border-slate-200">
            Este documento possui fé pública e validade jurídica em todo o território municipal de {APP_CONFIG.municipio}/MG. A fixação deste alvará em local visível e de fácil acesso ao público é obrigatória, nos termos do Código Sanitário Municipal.
          </div>
        </div>
      </div>
    </div>
  );
};

export default AlvaraImpressaoView;
