export interface GovErrorItem {
  Codigo?: string;
  codigo?: string;
  Descricao?: string;
  descricao?: string;
  Complemento?: string;
  complemento?: string;
}

export interface GovErrorResponse {
  erros?: GovErrorItem[];
  erro?: GovErrorItem[];
  Erros?: GovErrorItem[];
}

export function primeiroErroGov(body: GovErrorResponse): {
  codigo?: string;
  descricao?: string;
  complemento?: string;
} | null {
  const item = body.erros?.[0] ?? body.erro?.[0] ?? body.Erros?.[0];
  if (!item) return null;
  return {
    codigo: item.Codigo ?? item.codigo,
    descricao: item.Descricao ?? item.descricao,
    complemento: item.Complemento ?? item.complemento,
  };
}

export function formatarErroGov(body: GovErrorResponse, fallbackStatus: number, rawText = ''): string {
  const govErro = primeiroErroGov(body);
  if (govErro) {
    return [govErro.codigo && `[${govErro.codigo}]`, govErro.descricao, govErro.complemento]
      .filter(Boolean)
      .join(' ');
  }
  return rawText.trim() || `Erro SEFIN HTTP ${fallbackStatus}`;
}
