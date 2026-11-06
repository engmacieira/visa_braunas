/**
 * Visualização e Impressão de Alvará Sanitário Expedido
 * Rota: /licenciamento/alvaras/:id
 * Incorpora AlvaraImpressaoView e disponibiliza atalhos de impressão direta e link do QR Code.
 */

import React, { useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Copy,
  ExternalLink,
  Printer,
  QrCode,
  ShieldCheck,
} from "lucide-react";
import { ROUTES } from "../../config/routes.config";
import { useAlvaraDetalhe } from "../../hooks/useLicenciamento";
import { AlvaraImpressaoView } from "../../components/licenciamento/AlvaraImpressaoView";

export const AlvaraViewPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { data: alvara, isLoading, isError } = useAlvaraDetalhe(id);
  const [copiado, setCopiado] = useState(false);

  if (isLoading) {
    return (
      <div className="p-16 text-center text-slate-400 text-xs flex flex-col items-center justify-center">
        <div className="w-6 h-6 border-2 border-teal-500 border-t-transparent rounded-full animate-spin mb-3" />
        <span>Carregando documento oficial do Alvará Sanitário...</span>
      </div>
    );
  }

  if (isError || !alvara) {
    return (
      <div className="p-8 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl text-center space-y-4 max-w-xl mx-auto mt-8">
        <AlertTriangle className="w-10 h-10 text-rose-500 mx-auto" />
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Alvará Sanitário não localizado
        </h2>
        <p className="text-xs text-slate-500">
          Não foi possível carregar os registros deste documento de autorização sanitária.
        </p>
        <Link
          to={ROUTES.LICENCIAMENTO.LIST}
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-teal-700 bg-teal-50 rounded-xl border border-teal-200 hover:bg-teal-100"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Voltar para Licenciamento</span>
        </Link>
      </div>
    );
  }

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  const urlValidacaoPublica = `${baseUrl}${ROUTES.PUBLIC.VALIDAR_ALVARA(alvara.codigo_autenticidade)}`;

  const handleCopiarLink = async () => {
    try {
      await navigator.clipboard.writeText(urlValidacaoPublica);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 2500);
    } catch {
      // Fallback
    }
  };

  const handleImprimir = () => {
    window.print();
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Barra de Ações Superior (Ocultada na Impressão via classe no-print) */}
      <div className="no-print bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link
            to={ROUTES.LICENCIAMENTO.LIST}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Voltar para a Fila"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Alvará Nº {alvara.numero_formatado || `${alvara.numero_alvara}/${alvara.exercicio}`}</span>
            </h1>
            <p className="text-[11px] text-slate-500 font-mono">
              Código de Autenticidade: {alvara.codigo_autenticidade}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopiarLink}
            className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 shadow-2xs inline-flex items-center gap-1.5 transition-colors"
          >
            {copiado ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                <span className="text-emerald-700 dark:text-emerald-400">Link Copiado!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>Copiar Link QR Code</span>
              </>
            )}
          </button>

          <Link
            to={ROUTES.PUBLIC.VALIDAR_ALVARA(alvara.codigo_autenticidade)}
            target="_blank"
            className="px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800 rounded-lg hover:bg-teal-100/60 shadow-2xs inline-flex items-center gap-1.5 transition-colors"
          >
            <QrCode className="w-3.5 h-3.5" />
            <span>Validação Pública</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </Link>

          <button
            type="button"
            onClick={handleImprimir}
            className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-colors"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimir Alvará (A4)</span>
          </button>
        </div>
      </div>

      {/* Visualização de Impressão Oficial */}
      <AlvaraImpressaoView alvara={alvara} />
    </div>
  );
};

export default AlvaraViewPage;
