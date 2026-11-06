/**
 * Componente de Busca Assíncrona e Gestão de CNAEs com Debounce
 * Permite selecionar atividades do catálogo oficial, definir estritamente 1 CNAE principal
 * e sinaliza alertas regulatórios (Exigência de RT e Projeto Arquitetônico).
 */

import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Building,
  Check,
  CheckCircle2,
  FileCheck2,
  Plus,
  Search,
  Trash2,
  UserCheck,
} from "lucide-react";
import { useCNAEAutocomplete } from "../../hooks/useEstabelecimentos";
import { CNAEItem, NivelRisco } from "../../types/estabelecimento";
import RiscoBadge from "./RiscoBadge";

export interface SelectedCNAE {
  cnae_codigo: string;
  descricao?: string;
  grau_risco_padrao?: NivelRisco;
  exige_rt?: boolean;
  exige_projeto_arquitetonico?: boolean;
  eh_principal: boolean;
  data_inicio_atividade?: string;
}

interface CnaeSelectAsyncProps {
  selectedCnaes: SelectedCNAE[];
  onChange: (cnaes: SelectedCNAE[]) => void;
  error?: string;
}

export const CnaeSelectAsync: React.FC<CnaeSelectAsyncProps> = ({
  selectedCnaes,
  onChange,
  error,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounce de 350ms para evitar sobrecarga de consultas
  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 350);
    return () => clearTimeout(handler);
  }, [searchTerm]);

  const { data: cnaesCatalogo = [], isLoading } = useCNAEAutocomplete(
    debouncedSearch
  );

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Alerta de exigência de Responsável Técnico (RT)
  const cnaesComExigenciaRT = useMemo(() => {
    return selectedCnaes.filter((c) => c.exige_rt);
  }, [selectedCnaes]);

  // Cálculo visual do Risco Sanitário Preponderante
  const riscoPreponderante = useMemo<NivelRisco>(() => {
    if (selectedCnaes.length === 0) return "Dispensado";
    const riscos = selectedCnaes.map((c) => c.grau_risco_padrao);
    if (riscos.includes("Risco III")) return "Risco III";
    if (riscos.includes("Risco II")) return "Risco II";
    if (riscos.includes("Risco I")) return "Risco I";
    return "Dispensado";
  }, [selectedCnaes]);

  const handleAddCnae = (cnae: CNAEItem) => {
    if (selectedCnaes.some((item) => item.cnae_codigo === cnae.codigo)) {
      setDropdownOpen(false);
      return;
    }

    const ehPrimeiro = selectedCnaes.length === 0;
    const novoItem: SelectedCNAE = {
      cnae_codigo: cnae.codigo,
      descricao: cnae.descricao,
      grau_risco_padrao: cnae.grau_risco_padrao,
      exige_rt: cnae.exige_rt,
      exige_projeto_arquitetonico: cnae.exige_projeto_arquitetonico,
      eh_principal: ehPrimeiro,
      data_inicio_atividade: new Date().toISOString().split("T")[0],
    };

    onChange([...selectedCnaes, novoItem]);
    setSearchTerm("");
    setDropdownOpen(false);
  };

  const handleSetPrincipal = (codigo: string) => {
    const atualizados = selectedCnaes.map((item) => ({
      ...item,
      eh_principal: item.cnae_codigo === codigo,
    }));
    onChange(atualizados);
  };

  const handleRemove = (codigo: string) => {
    const filtrados = selectedCnaes.filter((item) => item.cnae_codigo !== codigo);
    // Se removeu o que era principal, define o primeiro restante como principal
    if (filtrados.length > 0 && !filtrados.some((i) => i.eh_principal)) {
      filtrados[0].eh_principal = true;
    }
    onChange(filtrados);
  };

  return (
    <div className="space-y-4">
      {/* Cabeçalho da Seção com Badge de Risco Preponderante */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
        <div>
          <span className="text-xs font-semibold text-slate-900 dark:text-white uppercase tracking-wider">
            Atividades Econômicas Vinculadas (CNAEs)
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            É obrigatório vincular pelo menos 1 atividade econômica, definindo estritamente uma como principal.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] text-slate-500 font-medium">
            Risco Calculado:
          </span>
          <RiscoBadge risco={riscoPreponderante} size="sm" />
        </div>
      </div>

      {/* Alerta Visual de Exigência de RT */}
      {cnaesComExigenciaRT.length > 0 && (
        <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-lg text-xs text-amber-900 dark:text-amber-200 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold block">
              Exigência Regulatória de Responsável Técnico (RT):
            </span>
            <p className="text-[11px] leading-relaxed">
              As atividades{" "}
              <strong>
                {cnaesComExigenciaRT.map((c) => c.cnae_codigo).join(", ")}
              </strong>{" "}
              exigem a indicação obrigatória de um Responsável Técnico com registro ativo no Conselho de Classe (ex: CRF, CRM, CRBio).
            </p>
          </div>
        </div>
      )}

      {/* Campo de Pesquisa Autocomplete com Dropdown */}
      <div className="relative" ref={dropdownRef}>
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setDropdownOpen(true);
            }}
            onFocus={() => setDropdownOpen(true)}
            placeholder="Digite o código (ex: 4771-7/01) ou descrição da atividade..."
            className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        {/* Dropdown de Resultados */}
        {dropdownOpen && (
          <div className="absolute z-30 mt-1 w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-lg max-h-60 overflow-y-auto">
            {isLoading ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Pesquisando catálogo de CNAEs...
              </div>
            ) : cnaesCatalogo.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                Nenhum CNAE encontrado para "{debouncedSearch}".
              </div>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {cnaesCatalogo.map((cnae) => {
                  const jaSelecionado = selectedCnaes.some(
                    (i) => i.cnae_codigo === cnae.codigo
                  );
                  return (
                    <li
                      key={cnae.id}
                      onClick={() => !jaSelecionado && handleAddCnae(cnae)}
                      className={`p-3 flex items-start justify-between gap-3 transition-colors ${
                        jaSelecionado
                          ? "bg-slate-50 dark:bg-slate-800/40 opacity-60 cursor-not-allowed"
                          : "hover:bg-teal-50/60 dark:hover:bg-slate-800/80 cursor-pointer"
                      }`}
                    >
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-semibold text-slate-900 dark:text-white">
                            {cnae.codigo}
                          </span>
                          <RiscoBadge risco={cnae.grau_risco_padrao} size="sm" />
                          {cnae.exige_rt && (
                            <span className="text-[10px] font-medium text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-1.5 py-0.2 rounded">
                              Exige RT
                            </span>
                          )}
                          {cnae.exige_projeto_arquitetonico && (
                            <span className="text-[10px] font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-1.5 py-0.2 rounded">
                              Projeto Arquitetônico
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 leading-snug">
                          {cnae.descricao}
                        </p>
                      </div>

                      <button
                        type="button"
                        disabled={jaSelecionado}
                        className="p-1 rounded text-teal-600 hover:bg-teal-100 dark:hover:bg-teal-950/60 transition-colors shrink-0"
                      >
                        {jaSelecionado ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-xs text-rose-600 font-medium">{error}</p>}

      {/* Tabela de CNAEs Selecionados */}
      {selectedCnaes.length === 0 ? (
        <div className="p-6 border border-dashed border-slate-300 dark:border-slate-700 rounded-xl text-center text-xs text-slate-500">
          Nenhuma atividade CNAE adicionada. Utilize a busca acima para vincular o CNAE principal.
        </div>
      ) : (
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 text-center w-20">Principal</th>
                <th className="py-2.5 px-3">Código & Descrição</th>
                <th className="py-2.5 px-3">Risco Sanitário</th>
                <th className="py-2.5 px-3">Exigências</th>
                <th className="py-2.5 px-3 text-center w-16">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {selectedCnaes.map((item) => (
                <tr
                  key={item.cnae_codigo}
                  className={`hover:bg-slate-50/50 dark:hover:bg-slate-800/40 ${
                    item.eh_principal
                      ? "bg-teal-50/30 dark:bg-teal-950/20 font-medium"
                      : ""
                  }`}
                >
                  <td className="py-2.5 px-3 text-center">
                    <input
                      type="radio"
                      name="cnae_principal_radio"
                      checked={item.eh_principal}
                      onChange={() => handleSetPrincipal(item.cnae_codigo)}
                      className="text-teal-600 focus:ring-teal-500 h-3.5 w-3.5 cursor-pointer"
                      title="Definir como CNAE principal"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <span className="font-mono font-semibold text-slate-900 dark:text-white block">
                      {item.cnae_codigo}
                    </span>
                    <span className="text-[11px] text-slate-600 dark:text-slate-400">
                      {item.descricao || "Atividade Econômica"}
                    </span>
                  </td>
                  <td className="py-2.5 px-3">
                    <RiscoBadge
                      risco={item.grau_risco_padrao || "Risco II"}
                      size="sm"
                    />
                  </td>
                  <td className="py-2.5 px-3">
                    <div className="flex flex-wrap gap-1">
                      {item.exige_rt && (
                        <span className="text-[10px] text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-1 rounded">
                          Exige RT
                        </span>
                      )}
                      {item.exige_projeto_arquitetonico && (
                        <span className="text-[10px] text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 px-1 rounded">
                          Projeto Arq.
                        </span>
                      )}
                      {!item.exige_rt && !item.exige_projeto_arquitetonico && (
                        <span className="text-[10px] text-slate-400">Nenhuma</span>
                      )}
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center">
                    <button
                      type="button"
                      onClick={() => handleRemove(item.cnae_codigo)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                      title="Remover CNAE"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default CnaeSelectAsync;
