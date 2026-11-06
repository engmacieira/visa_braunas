/**
 * Utilitários Universais de Formatação e Sanitização de Dados (DRY)
 * Padroniza a formatação de documentos (CPF/CNPJ), CEP, telefones, moeda e datas.
 */

/**
 * Remove qualquer caractere não numérico
 */
export function stripFormatacao(valor?: string | null): string {
  if (!valor) return "";
  return valor.replace(/\D/g, "");
}

/**
 * Formata número de CNPJ: 00.000.000/0000-00
 */
export function formatCnpj(cnpj?: string | null): string {
  const limpo = stripFormatacao(cnpj);
  if (!limpo) return "";
  if (limpo.length !== 14) return cnpj || "";

  return limpo.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5");
}

/**
 * Formata número de CPF: 000.000.000-00
 */
export function formatCpf(cpf?: string | null): string {
  const limpo = stripFormatacao(cpf);
  if (!limpo) return "";
  if (limpo.length !== 11) return cpf || "";

  return limpo.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, "$1.$2.$3-$4");
}

/**
 * Formata documento universal (CPF ou CNPJ automaticamente com base no tamanho)
 */
export function formatCpfCnpj(doc?: string | null): string {
  const limpo = stripFormatacao(doc);
  if (!limpo) return "";
  if (limpo.length === 11) return formatCpf(limpo);
  if (limpo.length === 14) return formatCnpj(limpo);
  return doc || "";
}

/**
 * Formata CEP: 00000-000
 */
export function formatCep(cep?: string | null): string {
  const limpo = stripFormatacao(cep);
  if (!limpo) return "";
  if (limpo.length !== 8) return cep || "";

  return limpo.replace(/^(\d{5})(\d{3})$/, "$1-$2");
}

/**
 * Formata telefone com DDD: (00) 0000-0000 ou (00) 00000-0000
 */
export function formatTelefone(tel?: string | null): string {
  const limpo = stripFormatacao(tel);
  if (!limpo) return "";

  if (limpo.length === 10) {
    return limpo.replace(/^(\d{2})(\d{4})(\d{4})$/, "($1) $2-$3");
  }
  if (limpo.length === 11) {
    return limpo.replace(/^(\d{2})(\d{5})(\d{4})$/, "($1) $2-$3");
  }

  return tel || "";
}

/**
 * Formata valores monetários em Real Brasileiro: R$ 1.250,00
 */
export function formatMoeda(valor?: number | null): string {
  if (typeof valor !== "number" || isNaN(valor)) return "R$ 0,00";

  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(valor);
}

/**
 * Formata percentual padrão: 82,5%
 */
export function formatPorcentagem(valor?: number | null, decimais: number = 1): string {
  if (typeof valor !== "number" || isNaN(valor)) return "0%";

  return `${valor.toLocaleString("pt-BR", {
    minimumFractionDigits: decimais,
    maximumFractionDigits: decimais,
  })}%`;
}

/**
 * Formata data no padrão brasileiro: DD/MM/AAAA
 */
export function formatData(data?: string | Date | null): string {
  if (!data) return "-";

  try {
    const d = typeof data === "string" ? new Date(data) : data;
    if (isNaN(d.getTime())) return String(data);

    // Se veio string no formato YYYY-MM-DD pura, evitar deslocamento de fuso UTC
    if (typeof data === "string" && /^\d{4}-\d{2}-\d{2}$/.test(data)) {
      const [ano, mes, dia] = data.split("-");
      return `${dia}/${mes}/${ano}`;
    }

    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return String(data);
  }
}

/**
 * Formata data e hora no padrão brasileiro: DD/MM/AAAA às HH:mm
 */
export function formatDataHora(data?: string | Date | null): string {
  if (!data) return "-";

  try {
    const d = typeof data === "string" ? new Date(data) : data;
    if (isNaN(d.getTime())) return String(data);

    const dataParte = d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const horaParte = d.toLocaleTimeString("pt-BR", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return `${dataParte} às ${horaParte}`;
  } catch {
    return String(data);
  }
}

/**
 * Formata data por extenso: 06 de novembro de 2026
 */
export function formatDataExtenso(data?: string | Date | null): string {
  if (!data) return "-";

  try {
    const d = typeof data === "string" ? new Date(data) : data;
    if (isNaN(d.getTime())) return String(data);

    return d.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });
  } catch {
    return String(data);
  }
}

/**
 * Sanitiza e padroniza números de protocolo oficial
 */
export function formatNumeroProtocolo(prot?: string | null): string {
  if (!prot) return "";
  return prot.trim().toUpperCase();
}
