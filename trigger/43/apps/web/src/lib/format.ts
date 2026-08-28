export function formatCnpj(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length !== 14) return value ?? '';
  return digits.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5');
}

export function formatCpf(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length !== 11) return value ?? '';
  return digits.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
}

export function formatCnpjCpf(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length === 14) return formatCnpj(digits);
  if (digits.length === 11) return formatCpf(digits);
  return value ?? '';
}

export function formatCep(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '');
  if (digits.length !== 8) return value ?? '';
  return digits.replace(/^(\d{5})(\d{3})$/, '$1-$2');
}

/** Máscara de digitação CEP (#####-###). Armazena só dígitos. */
export function formatCepInput(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 8);
  if (digits.length <= 5) return digits;
  return `${digits.slice(0, 5)}-${digits.slice(5)}`;
}

/** Formata CNAE 7 dígitos como 0000-0/00 */
export function formatCnae(value: string | number | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '');
  if (digits.length !== 7) return value != null && value !== '' ? String(value) : '';
  return `${digits.slice(0, 4)}-${digits.slice(4, 5)}/${digits.slice(5)}`;
}

export function formatPhone(value: string | null | undefined): string {
  let digits = (value ?? '').replace(/\D/g, '');
  // ViaZap / wa.me devolvem E.164 (55 + DDD). Exibir como telefone BR local.
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) {
    digits = digits.slice(2);
  }
  if (digits.length === 10) {
    return digits.replace(/^(\d{2})(\d{4})(\d{4})$/, '($1) $2-$3');
  }
  if (digits.length === 11) {
    return digits.replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3');
  }
  return value ?? '';
}

/** Máscara de digitação WhatsApp (celular 11 dígitos). Armazena só dígitos. */
export function formatWhatsAppInput(value: string | null | undefined): string {
  const digits = (value ?? '').replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

/** Escalas oficiais — PADRAO_DECIMAL_CALCULOS §2 (DOC-13). */
export const DECIMAL_SCALE = {
  money: 2,
  unitPrice: 6,
  nfUnit: 10,
  qty: 4,
  percent: 4,
  factor: 10,
  dim: 2,
  gramatura: 2,
  weight: 3,
  thickness: 4,
  distance: 3,
} as const;

/**
 * Exibição BR a partir de string canônica (sem float).
 * Formatação é só apresentação (§9) — nunca regrava o valor exibido.
 */
export function formatDecimalBr(
  value: string | number | null | undefined,
  scale: number,
  options?: { stripTrailingZeros?: boolean },
): string {
  if (value === null || value === undefined || value === '') return '—';
  const raw = String(value).trim().replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(raw)) return '—';

  const neg = raw.startsWith('-');
  const abs = neg ? raw.slice(1) : raw;
  const [intRaw, fracRaw = ''] = abs.split('.');
  const intPart = intRaw.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  let frac = fracRaw.padEnd(scale, '0').slice(0, scale);
  if (options?.stripTrailingZeros) {
    frac = frac.replace(/0+$/, '');
  }
  const body = frac.length ? `${intPart},${frac}` : intPart;
  return neg ? `-${body}` : body;
}

/** Valor monetário final (2 casas) — totais, limite, impostos. */
export function formatCurrency(value: string | number | null | undefined): string {
  const formatted = formatDecimalBr(value, DECIMAL_SCALE.money);
  if (formatted === '—') return '—';
  return `R$ ${formatted}`;
}

/** Preço/custo unitário (6 casas) — §9.3 mostra casas completas. */
export function formatUnitPrice(value: string | number | null | undefined): string {
  const formatted = formatDecimalBr(value, DECIMAL_SCALE.unitPrice);
  if (formatted === '—') return '—';
  return `R$ ${formatted}`;
}

/** Quantidade estoque (4 casas). */
export function formatQty(value: string | number | null | undefined): string {
  return formatDecimalBr(value, DECIMAL_SCALE.qty);
}

/** Fator de conversão (10 casas) — §9.3. */
export function formatFactor(value: string | number | null | undefined): string {
  return formatDecimalBr(value, DECIMAL_SCALE.factor);
}

/** Percentual / alíquota (4 casas). */
export function formatPercent(value: string | number | null | undefined): string {
  const formatted = formatDecimalBr(value, DECIMAL_SCALE.percent);
  if (formatted === '—') return '—';
  return `${formatted}%`;
}

/** step HTML alinhado à escala oficial. */
export function decimalStep(scale: number): string {
  if (scale <= 0) return '1';
  return `0.${'0'.repeat(scale - 1)}1`;
}

/** WGS84 — notação canônica com ponto (GIS). Vazio se faltar um dos eixos. */
export function formatLatLng(
  lat: string | number | null | undefined,
  lng: string | number | null | undefined,
): string {
  if (lat === null || lat === undefined || lat === '' || lng === null || lng === undefined || lng === '') {
    return '';
  }
  const a = String(lat).trim();
  const b = String(lng).trim();
  if (!/^-?\d+(\.\d+)?$/.test(a) || !/^-?\d+(\.\d+)?$/.test(b)) {
    return '';
  }
  const trim = (v: string) => v.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');
  return `${trim(a)}, ${trim(b)}`;
}

/** Distância de carro (1 casa na UI). Zero sem rota real não se exibe — não é 0,0 km. */
export function kmCarroEhZero(km: string | number | null | undefined): boolean {
  if (km == null || km === '') return false;
  const n = Number(String(km).trim().replace(',', '.'));
  return Number.isFinite(n) && n === 0;
}

export function formatKmCarro(
  km: string | number | null | undefined,
  fonte?: string | null,
): string {
  if (fonte === 'mesmo_ponto' || kmCarroEhZero(km)) {
    return '';
  }
  const formatted = formatDecimalBr(km, 1);
  if (formatted === '—' || /^0,0+$/.test(formatted)) return '';
  return `${formatted} km de carro (OpenStreetMap)`;
}

/** Km é EMP×destino. Vazio se o valor for de outra empresa. */
export function formatKmCarroDaEmpresa(
  km: string | number | null | undefined,
  fonte: string | null | undefined,
  distanciaEmpresaId: number | null | undefined,
  empresaAtualId: number | null | undefined,
): string {
  if (
    distanciaEmpresaId != null &&
    empresaAtualId != null &&
    Number(distanciaEmpresaId) !== Number(empresaAtualId)
  ) {
    return '';
  }
  return formatKmCarro(km, fonte);
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return '—';
  // Datas ISO só com dia evitam shift de fuso (new Date('YYYY-MM-DD') = UTC).
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [y, m, d] = value.split('-');
    return `${d}/${m}/${y}`;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString('pt-BR');
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function onlyDigits(value: string): string {
  return value.replace(/\D/g, '');
}

export function papelLabel(key: string): string {
  const labels: Record<string, string> = {
    cliente: 'Cliente',
    fornecedor: 'Fornecedor',
    colaborador: 'Colaborador',
    transportadora: 'Transportadora',
    banco: 'Banco',
    entidade: 'Entidade',
    vendedor: 'Vendedor',
    contador: 'Contador',
  };
  return labels[key] ?? key;
}

export function familiaLabel(familia: string): string {
  const labels: Record<string, string> = {
    MP: 'Matéria-prima',
    EMB: 'Embalagem',
    REV: 'Revenda',
    PA: 'Produto acabado',
    SVC: 'Serviço',
    FAC: 'Ferramental',
  };
  return labels[familia] ?? familia;
}

export function naturezaGrupoLabel(natureza: string): string {
  const labels: Record<string, string> = {
    COMPRA: 'Compra / estoque',
    VENDA: 'Venda / faturamento',
    AMBOS: 'Compra e venda',
  };
  return labels[natureza] ?? natureza;
}
