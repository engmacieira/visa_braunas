/**
 * Gráfico de Barras: Comparativo de Inspeções Realizadas no Exercício (Rotina vs VAPT)
 * Utiliza Recharts (BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer).
 */

import React, { useMemo } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { BarChart3 } from "lucide-react";
import { EvolucaoMensalInspecao } from "../../types/indicadores";

interface GraficoEvolucaoInspecoesProps {
  ano?: number;
  dadosMensais?: EvolucaoMensalInspecao[];
  totalVapt?: number;
  totalGeral?: number;
}

const MESES_PADRAO = [
  { mesAbreviado: "Jan", mes: "Janeiro", rotina: 4, vapt: 1, total: 5 },
  { mesAbreviado: "Fev", mes: "Fevereiro", rotina: 6, vapt: 2, total: 8 },
  { mesAbreviado: "Mar", mes: "Março", rotina: 8, vapt: 2, total: 10 },
  { mesAbreviado: "Abr", mes: "Abril", rotina: 7, vapt: 3, total: 10 },
  { mesAbreviado: "Mai", mes: "Maio", rotina: 9, vapt: 2, total: 11 },
  { mesAbreviado: "Jun", mes: "Junho", rotina: 5, vapt: 1, total: 6 },
  { mesAbreviado: "Jul", mes: "Julho", rotina: 8, vapt: 3, total: 11 },
  { mesAbreviado: "Ago", mes: "Agosto", rotina: 11, vapt: 4, total: 15 },
  { mesAbreviado: "Set", mes: "Setembro", rotina: 9, vapt: 2, total: 11 },
  { mesAbreviado: "Out", mes: "Outubro", rotina: 10, vapt: 3, total: 13 },
  { mesAbreviado: "Nov", mes: "Novembro", rotina: 7, vapt: 2, total: 9 },
  { mesAbreviado: "Dez", mes: "Dezembro", rotina: 5, vapt: 1, total: 6 },
];

export const GraficoEvolucaoInspecoes: React.FC<GraficoEvolucaoInspecoesProps> = ({
  ano = 2026,
  dadosMensais,
  totalVapt,
  totalGeral,
}) => {
  const dados = useMemo(() => {
    if (dadosMensais && dadosMensais.length > 0) {
      return dadosMensais;
    }
    return MESES_PADRAO;
  }, [dadosMensais]);

  const totais = useMemo(() => {
    const calcVapt = totalVapt ?? dados.reduce((acc, curr) => acc + curr.vapt, 0);
    const calcRotina = dados.reduce((acc, curr) => acc + curr.rotina, 0);
    const calcGeral = totalGeral ?? calcVapt + calcRotina;
    return {
      vapt: calcVapt,
      rotina: calcRotina,
      geral: calcGeral,
    };
  }, [dados, totalVapt, totalGeral]);

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-6 shadow-xs flex flex-col justify-between">
      <div>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-100 dark:border-slate-800 mb-4">
          <div>
            <h2 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-teal-600" />
              Evolução Temporal de Vistorias Sanitárias ({ano})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Comparativo de ações de rotina/licenciamento versus fiscalizações VAPT (Saúde do Trabalhador)
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-teal-50 dark:bg-teal-950/40 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800">
              VAPT: {totais.vapt}
            </span>
            <span className="text-xs font-semibold px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
              Total: {totais.geral}
            </span>
          </div>
        </div>

        {/* Container do Gráfico de Barras */}
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={dados}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="#e2e8f0"
                className="dark:stroke-slate-800"
              />
              <XAxis
                dataKey="mesAbreviado"
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fontSize: 11, fill: "#64748b" }}
                allowDecimals={false}
              />
              <Tooltip
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    const rotinaVal = Number(payload.find((p) => p.dataKey === "rotina")?.value || 0);
                    const vaptVal = Number(payload.find((p) => p.dataKey === "vapt")?.value || 0);
                    const soma = rotinaVal + vaptVal;
                    return (
                      <div className="bg-white dark:bg-slate-800 p-3 rounded-lg shadow-lg border border-slate-200 dark:border-slate-700 text-xs">
                        <div className="font-bold text-slate-900 dark:text-white mb-1.5 border-b border-slate-100 dark:border-slate-700 pb-1">
                          Mês: {label}
                        </div>
                        <div className="flex items-center justify-between gap-4 text-slate-600 dark:text-slate-300 mb-0.5">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-slate-400 inline-block" />
                            Rotina & Alvará:
                          </span>
                          <strong className="text-slate-900 dark:text-white tabular-nums">{rotinaVal}</strong>
                        </div>
                        <div className="flex items-center justify-between gap-4 text-teal-600 dark:text-teal-400 font-semibold mb-1">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2.5 h-2.5 rounded-xs bg-teal-600 inline-block" />
                            VAPT (Indicador 11):
                          </span>
                          <strong className="tabular-nums">{vaptVal}</strong>
                        </div>
                        <div className="pt-1 border-t border-slate-100 dark:border-slate-700 text-slate-500 text-[11px] flex justify-between">
                          <span>Total do Mês:</span>
                          <span className="font-bold text-slate-800 dark:text-slate-200">{soma}</span>
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="bottom"
                height={32}
                formatter={(value) => {
                  return (
                    <span className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                      {value === "rotina" ? "Rotina & Licenciamento" : "VAPT (Saúde do Trabalhador)"}
                    </span>
                  );
                }}
              />
              <Bar
                dataKey="rotina"
                name="rotina"
                fill="#94a3b8"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
              <Bar
                dataKey="vapt"
                name="vapt"
                fill="#0d9488"
                radius={[4, 4, 0, 0]}
                maxBarSize={28}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Destaque das Metas */}
      <div className="p-3 bg-teal-50/60 dark:bg-teal-950/30 border border-teal-100 dark:border-teal-900/40 rounded-lg flex items-center justify-between mt-3 text-xs">
        <span className="text-teal-900 dark:text-teal-200">
          <strong>Ações VAPT acumuladas:</strong> {totais.vapt} inspeções focadas em ambientes e processos de trabalho.
        </span>
        <span className="font-mono font-bold text-teal-700 dark:text-teal-300">
          {((totais.vapt / (totais.geral || 1)) * 100).toFixed(1)}% do total
        </span>
      </div>
    </div>
  );
};

export default GraficoEvolucaoInspecoes;
