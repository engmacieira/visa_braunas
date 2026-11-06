/**
 * Componente de Gestão e Upload de Evidências Fotográficas da Fiscalização
 * Permite capturar ou anexar fotos da vistoria em campo, adicionar legendas
 * e montar o relatório fotográfico para o laudo pericial.
 */

import React, { useState, useRef } from "react";
import { Camera, Image as ImageIcon, Plus, Trash2, X } from "lucide-react";
import { FotoEvidencia } from "../../types/fiscalizacao";

interface UploadEvidenciasProps {
  value: FotoEvidencia[];
  onChange: (fotos: FotoEvidencia[]) => void;
  readOnly?: boolean;
}

export const UploadEvidencias: React.FC<UploadEvidenciasProps> = ({
  value = [],
  onChange,
  readOnly = false,
}) => {
  const [modalAberta, setModalAberta] = useState(false);
  const [novaUrl, setNovaUrl] = useState("");
  const [novaLegenda, setNovaLegenda] = useState("");
  const [visualizandoFoto, setVisualizandoFoto] = useState<FotoEvidencia | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRemoverFoto = (id: string) => {
    if (readOnly) return;
    onChange(value.filter((foto) => foto.id !== id));
  };

  const handleAtualizarLegenda = (id: string, legenda: string) => {
    if (readOnly) return;
    onChange(
      value.map((foto) => (foto.id === id ? { ...foto, legenda } : foto))
    );
  };

  const handleAdicionarPorUrl = (e: React.FormEvent) => {
    e.preventDefault();
    if (!novaUrl.trim()) return;

    const novaFoto: FotoEvidencia = {
      id: `foto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      url: novaUrl.trim(),
      legenda: novaLegenda.trim() || "Registro fotográfico da vistoria",
      data_registro: new Date().toISOString(),
    };

    onChange([...value, novaFoto]);
    setNovaUrl("");
    setNovaLegenda("");
    setModalAberta(false);
  };

  const handleArquivoSelecionado = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Converte arquivo para Data URL (Base64) para visualização imediata offline
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const novaFoto: FotoEvidencia = {
          id: `foto_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
          url: dataUrl,
          legenda: file.name.replace(/\.[^/.]+$/, ""),
          data_registro: new Date().toISOString(),
        };
        onChange([...value, novaFoto]);
      }
    };
    reader.readAsDataURL(file);

    // Reseta o input para permitir selecionar o mesmo arquivo novamente
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider block">
            Relatório Fotográfico de Evidências
          </span>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Anexe registros visuais de irregularidades, equipamentos, instalações ou adequações sanitárias.
          </p>
        </div>

        {!readOnly && (
          <div className="flex items-center gap-2">
            <input
              type="file"
              ref={fileInputRef}
              accept="image/*"
              className="hidden"
              onChange={handleArquivoSelecionado}
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/60 shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Camera className="w-3.5 h-3.5 text-teal-600 dark:text-teal-400" />
              <span>Anexar Imagem</span>
            </button>

            <button
              type="button"
              onClick={() => setModalAberta(true)}
              className="px-3 py-1.5 text-xs font-semibold text-teal-700 dark:text-teal-300 bg-teal-50 dark:bg-teal-950/40 border border-teal-200 dark:border-teal-800/80 rounded-lg hover:bg-teal-100/60 shadow-2xs flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Adicionar por URL</span>
            </button>
          </div>
        )}
      </div>

      {/* Grid de Fotos */}
      {value.length === 0 ? (
        <div className="border border-dashed border-slate-300 dark:border-slate-800 rounded-xl p-8 text-center bg-slate-50/50 dark:bg-slate-900/30">
          <ImageIcon className="w-8 h-8 text-slate-400 mx-auto mb-2" />
          <p className="text-xs font-medium text-slate-600 dark:text-slate-400">
            Nenhuma evidência fotográfica anexada a este laudo sanitário.
          </p>
          {!readOnly && (
            <p className="text-[11px] text-slate-400 mt-1">
              Clique em "Anexar Imagem" ou "Adicionar por URL" para registrar comprovações visuais.
            </p>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {value.map((foto, index) => (
            <div
              key={foto.id || index}
              className="group border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden bg-white dark:bg-slate-900 shadow-2xs hover:shadow-xs transition-shadow flex flex-col"
            >
              <div
                className="relative aspect-video bg-slate-100 dark:bg-slate-800 cursor-pointer overflow-hidden"
                onClick={() => setVisualizandoFoto(foto)}
              >
                <img
                  src={foto.url}
                  alt={foto.legenda}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  onError={(e) => {
                    // Fallback para URL quebrada
                    (e.target as HTMLImageElement).src =
                      "https://images.unsplash.com/photo-1584727638096-042c45049ebe?w=600&auto=format&fit=crop&q=60";
                  }}
                />
                {!readOnly && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleRemoverFoto(foto.id);
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-rose-600/90 text-white rounded-md hover:bg-rose-700 transition-colors shadow-xs"
                    title="Remover foto"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <span className="absolute bottom-1 left-2 text-[10px] font-medium text-white/90 bg-black/50 px-1.5 py-0.5 rounded backdrop-blur-xs">
                  Foto {index + 1}
                </span>
              </div>

              <div className="p-2.5 flex-1 flex flex-col justify-between gap-1.5 bg-slate-50/50 dark:bg-slate-800/30">
                {readOnly ? (
                  <p className="text-xs text-slate-700 dark:text-slate-300 font-medium line-clamp-2">
                    {foto.legenda || "Sem legenda"}
                  </p>
                ) : (
                  <input
                    type="text"
                    value={foto.legenda}
                    onChange={(e) => handleAtualizarLegenda(foto.id, e.target.value)}
                    placeholder="Legenda da irregularidade / item..."
                    className="w-full px-2 py-1 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-teal-500"
                  />
                )}
                <span className="text-[10px] text-slate-400">
                  {new Date(foto.data_registro).toLocaleDateString("pt-BR", {
                    day: "2-digit",
                    month: "2-digit",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal para Adicionar por URL */}
      {modalAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 w-full max-w-md shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-900 dark:text-white">
                Adicionar Evidência Fotográfica por URL
              </h3>
              <button
                type="button"
                onClick={() => setModalAberta(false)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAdicionarPorUrl} className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  URL da Imagem <span className="text-rose-500">*</span>
                </label>
                <input
                  type="url"
                  required
                  placeholder="https://exemplo.com/fotos/evidencia-01.jpg"
                  value={novaUrl}
                  onChange={(e) => setNovaUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Legenda / Descrição da Irregularidade
                </label>
                <input
                  type="text"
                  placeholder="Ex: Ausência de telas milimétricas na manipulação de alimentos"
                  value={novaLegenda}
                  onChange={(e) => setNovaLegenda(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setModalAberta(false)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-bold text-white bg-teal-600 hover:bg-teal-700 rounded-lg shadow-xs"
                >
                  Confirmar Adição
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Zoom de Imagem */}
      {visualizandoFoto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs cursor-pointer"
          onClick={() => setVisualizandoFoto(null)}
        >
          <div
            className="relative max-w-3xl max-h-[90vh] bg-slate-900 rounded-xl overflow-hidden shadow-2xl p-2"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVisualizandoFoto(null)}
              className="absolute top-4 right-4 z-10 p-2 bg-black/60 hover:bg-black text-white rounded-full transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
            <img
              src={visualizandoFoto.url}
              alt={visualizandoFoto.legenda}
              className="max-h-[80vh] w-auto mx-auto object-contain rounded-lg"
            />
            <div className="p-3 text-center">
              <p className="text-xs font-semibold text-white">
                {visualizandoFoto.legenda || "Evidência Fotográfica"}
              </p>
              <span className="text-[10px] text-slate-400">
                {new Date(visualizandoFoto.data_registro).toLocaleString("pt-BR")}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UploadEvidencias;
