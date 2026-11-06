/**
 * Componente de Checklist Sanitário Dinâmico (JSONB)
 * Permite avaliação por blocos: C (Conforme), NC (Não Conforme) e NA (Não se Aplica),
 * com campo retrátil de observação para cada item.
 */

import React, { useState } from "react";
import { Check, ChevronDown, ChevronUp, FileText, Minus, X } from "lucide-react";
import { ChecklistRespostas, StatusItemChecklist } from "../../types/fiscalizacao";

interface ChecklistItemDef {
  id: string;
  enunciado: string;
}

interface ChecklistSecaoDef {
  titulo: string;
  itens: ChecklistItemDef[];
}

const CHECKLIST_SECOES: ChecklistSecaoDef[] = [
  {
    titulo: "1. Estrutura Física & Saneamento",
    itens: [
      {
        id: "est_01_pisos_paredes",
        enunciado: "Pisos, paredes e tetos íntegros, laváveis e sem umidade ou rachaduras.",
      },
      {
        id: "est_02_agua_potavel",
        enunciado: "Abastecimento contínuo de água tratada e canalizada em todas as áreas.",
      },
      {
        id: "est_03_reservatorio",
        enunciado: "Reservatório de água vedado e com higienização comprovada nos últimos 6 meses.",
      },
      {
        id: "est_04_telas_protecao",
        enunciado: "Janelas e aberturas da área de produção providas de telas milimétricas removíveis.",
      },
      {
        id: "est_05_sanitarios",
        enunciado: "Instalações sanitárias separadas por sexo, higienizadas e sem comunicação direta com a manipulação.",
      },
    ],
  },
  {
    titulo: "2. Higiene Pessoal & Boas Práticas",
    itens: [
      {
        id: "hig_01_uniformes_epi",
        enunciado: "Manipuladores com uniformes claros, cabelos protegidos e sem adornos pessoais.",
      },
      {
        id: "hig_02_aso_vigente",
        enunciado: "Atestados de Saúde Ocupacional (ASO) dos funcionários válidos e arquivados no local.",
      },
      {
        id: "hig_03_capacitacao",
        enunciado: "Comprovantes de treinamento em Boas Práticas de Manipulação de Alimentos/Serviços.",
      },
      {
        id: "hig_04_lavagem_maos",
        enunciado: "Lavatórios exclusivos para higienização das mãos com sabonete bactericida e papel toalha.",
      },
    ],
  },
  {
    titulo: "3. Equipamentos, Refrigeração & Segurança",
    itens: [
      {
        id: "eqp_01_temperatura",
        enunciado: "Equipamentos de refrigeração e congelamento em temperatura adequada e aferida.",
      },
      {
        id: "eqp_02_manutencao",
        enunciado: "Equipamentos e bancadas de inox limpos, sem acúmulo de sujidades ou pontos de oxidação.",
      },
      {
        id: "eqp_03_pragas_vetores",
        enunciado: "Certificado de desinsetização e desratização emitido por empresa especializada licenciada.",
      },
      {
        id: "eqp_04_vapt_seguranca",
        enunciado: "Maquinários com proteção mecânica (NR-12), ventilação e iluminação adequadas ao trabalhador.",
      },
    ],
  },
  {
    titulo: "4. Documentação Regulamentar & Licenciamento",
    itens: [
      {
        id: "doc_01_alvara_anterior",
        enunciado: "Alvará Sanitário anterior ou protocolo afixado em local visível ao público.",
      },
      {
        id: "doc_02_responsavel_tecnico",
        enunciado: "Certificado de Regularidade Técnica (CRT/ART) do Responsável Técnico (quando exigido).",
      },
      {
        id: "doc_03_pops_manuais",
        enunciado: "Manual de Boas Práticas e Procedimentos Operacionais Padronizados (POPs) disponíveis.",
      },
    ],
  },
];

interface ChecklistDinamicoProps {
  value: ChecklistRespostas;
  onChange: (respostas: ChecklistRespostas) => void;
  readOnly?: boolean;
}

export const ChecklistDinamico: React.FC<ChecklistDinamicoProps> = ({
  value = {},
  onChange,
  readOnly = false,
}) => {
  const [observacoesExpandidas, setObservacoesExpandidas] = useState<Record<string, boolean>>({});

  const handleStatusChange = (itemId: string, status: StatusItemChecklist) => {
    if (readOnly) return;
    const atual = value[itemId] || { status: "NA" };
    const atualizado: ChecklistRespostas = {
      ...value,
      [itemId]: {
        ...atual,
        status,
      },
    };

    // Abre o campo de observação automaticamente se marcar Não Conforme (NC)
    if (status === "NC") {
      setObservacoesExpandidas((prev) => ({ ...prev, [itemId]: true }));
    }

    onChange(atualizado);
  };

  const handleObservacaoChange = (itemId: string, observacao: string) => {
    if (readOnly) return;
    const atual = value[itemId] || { status: "NA" };
    onChange({
      ...value,
      [itemId]: {
        ...atual,
        observacao,
      },
    });
  };

  const toggleObservacao = (itemId: string) => {
    setObservacoesExpandidas((prev) => ({ ...prev, [itemId]: !prev[itemId] }));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
            Checklist de Avaliação Sanitária de Campo
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Assinale os itens avaliados: <strong>C</strong> (Conforme), <strong>NC</strong> (Não Conforme) ou <strong>NA</strong> (Não se Aplica).
          </p>
        </div>

        <div className="flex items-center gap-2 text-[10px] font-semibold">
          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
            C: Conforme
          </span>
          <span className="px-2 py-0.5 rounded bg-rose-50 text-rose-700 border border-rose-200">
            NC: Não Conforme
          </span>
          <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
            NA: Não se Aplica
          </span>
        </div>
      </div>

      <div className="space-y-6">
        {CHECKLIST_SECOES.map((secao) => (
          <div
            key={secao.titulo}
            className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-2xs"
          >
            <div className="bg-slate-50 dark:bg-slate-800/80 px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-800 dark:text-slate-200">
              {secao.titulo}
            </div>

            <div className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
              {secao.itens.map((item) => {
                const itemResposta = value[item.id] || { status: "NA" };
                const isObsOpen = Boolean(
                  observacoesExpandidas[item.id] || itemResposta.observacao
                );

                return (
                  <div key={item.id} className="p-3.5 space-y-2 hover:bg-slate-50/40 dark:hover:bg-slate-800/20">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <span className="text-slate-700 dark:text-slate-300 font-medium leading-snug">
                        {item.enunciado}
                      </span>

                      {/* Botões C / NC / NA */}
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleStatusChange(item.id, "C")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md border transition-colors flex items-center gap-1 ${
                            itemResposta.status === "C"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-emerald-500"
                          }`}
                        >
                          <Check className="w-3 h-3" />
                          <span>C</span>
                        </button>

                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleStatusChange(item.id, "NC")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md border transition-colors flex items-center gap-1 ${
                            itemResposta.status === "NC"
                              ? "bg-rose-600 text-white border-rose-600 shadow-xs"
                              : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-rose-500"
                          }`}
                        >
                          <X className="w-3 h-3" />
                          <span>NC</span>
                        </button>

                        <button
                          type="button"
                          disabled={readOnly}
                          onClick={() => handleStatusChange(item.id, "NA")}
                          className={`px-2.5 py-1 text-xs font-bold rounded-md border transition-colors flex items-center gap-1 ${
                            itemResposta.status === "NA"
                              ? "bg-slate-600 text-white border-slate-600 shadow-xs"
                              : "bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 border-slate-300 dark:border-slate-700 hover:border-slate-500"
                          }`}
                        >
                          <Minus className="w-3 h-3" />
                          <span>NA</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => toggleObservacao(item.id)}
                          className="p-1 text-slate-400 hover:text-slate-600 ml-1 rounded"
                          title="Adicionar ou visualizar irregularidade/observação"
                        >
                          {isObsOpen ? (
                            <ChevronUp className="w-4 h-4" />
                          ) : (
                            <ChevronDown className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Campo de observação retrátil */}
                    {isObsOpen && (
                      <div className="pt-2">
                        <textarea
                          rows={2}
                          disabled={readOnly}
                          value={itemResposta.observacao || ""}
                          onChange={(e) =>
                            handleObservacaoChange(item.id, e.target.value)
                          }
                          placeholder="Descreva a irregularidade constatada ou exigência específica para este item..."
                          className="w-full p-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ChecklistDinamico;
