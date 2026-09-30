import { formatoLabel } from '../components/FacaShapeIcon';
import { formatDecimalBr } from './format';
import { facaPosicaoLabel } from './facaPosicao';
import { descricaoFromPedidoSpec } from './orcamentoPropostaItens';
import { alocarQuantidadePorModelo } from './orcamentoForm';
import { modelosDoSnap } from './producaoFicha';
import { saidaEtiquetaLabelCurto } from './saidaEtiqueta';

/**
 * Leitura de chão da ficha da OP (flexo estreito).
 * Só o que já está no snapshot do PED. Sem preço, hora, rpm ou guia do ORC.
 */

function texto(value: unknown): string | null {
  if (value == null) return null;
  const s = String(value).trim();
  return s && s !== '—' ? s : null;
}

function numeroPositivo(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function cm(value: unknown): string | null {
  const n = numeroPositivo(value);
  if (n == null) return null;
  return `${formatDecimalBr(n, 2)} cm`;
}

function facaPrincipal(spec: Record<string, unknown>): Record<string, unknown> | null {
  const raw = spec.facas;
  if (!Array.isArray(raw)) return null;
  const rows = raw.filter(
    (row): row is Record<string, unknown> => row != null && typeof row === 'object',
  );
  return rows.find((row) => row.principal === true) ?? rows[0] ?? null;
}

export function textoMaquinaFlexo(spec: Record<string, unknown>): string | null {
  return texto(spec.maquina);
}

/** Largura × puxada · colunas · Z — a bobina que entra na máquina. */
export function textoBobinaFlexo(spec: Record<string, unknown>): string | null {
  const larg = cm(spec.largura_cm);
  const pux = cm(spec.puxada_cm);
  const dim =
    larg && pux ? `${larg} × ${pux}` : larg ?? (pux ? `puxada ${pux}` : null);
  const colunas = texto(spec.colunas);
  const zRaw = spec.z;
  const zNum = zRaw == null || zRaw === '' ? null : Number(zRaw);
  const zTxt = zNum != null && Number.isFinite(zNum) ? `Z ${formatDecimalBr(zNum, 0)}` : null;
  const partes = [dim, colunas ? `${colunas} col.` : null, zTxt].filter(
    (p): p is string => Boolean(p),
  );
  return partes.length > 0 ? partes.join(' · ') : null;
}

/** Formato, posição no cilindro, nova ou número do mapa. */
export function textoFacaFlexo(spec: Record<string, unknown>): string | null {
  const desc = descricaoFromPedidoSpec(spec);
  const formato = desc.formato_faca ? formatoLabel(desc.formato_faca) : null;
  const principal = facaPrincipal(spec);
  const pos = facaPosicaoLabel(texto(spec.faca_posicao) ?? texto(principal?.posicao));
  const nova = Boolean(spec.faca_nova) || Boolean(principal?.faca_nova);
  const nFacas = texto(principal?.n_facas);
  const noMapa = numeroPositivo(principal?.mapa_faca_id) != null;
  const origem = nova ? 'nova' : nFacas ? `nº ${nFacas}` : noMapa ? 'do mapa' : null;
  const partes = [formato, pos, origem].filter((p): p is string => Boolean(p));
  return partes.length > 0 ? partes.join(' · ') : null;
}

export function textoColunaRebobinacao(spec: Record<string, unknown>): string | null {
  const n = numeroPositivo(spec.coluna_rebobinacao);
  if (n == null) return null;
  return formatDecimalBr(n, 0);
}

export type CorridaFisica = {
  etiquetas: number | null;
  metros: number | null;
  m2: number | null;
  acertoM2: number | null;
  rolos: number | null;
  caixas: number | null;
};

/** Quantidades físicas da faixa travada. Ignora qualquer campo em R$. */
export function corridaFisica(
  faixa: Record<string, unknown> | null | undefined,
): CorridaFisica | null {
  if (!faixa) return null;
  const corrida: CorridaFisica = {
    etiquetas: numeroPositivo(faixa.quantidade),
    metros: numeroPositivo(faixa.metragem),
    m2: numeroPositivo(faixa.m2),
    acertoM2: numeroPositivo(faixa.perda_acerto),
    rolos: numeroPositivo(faixa.rolos),
    caixas: numeroPositivo(faixa.qtde_caixas),
  };
  if (!corrida.etiquetas && !corrida.metros && !corrida.m2 && !corrida.rolos && !corrida.caixas) {
    return null;
  }
  return corrida;
}

export type ArteOrdem = { nome: string; qtde: number | null };

export function artesDaOrdem(spec: Record<string, unknown>, qtdeBase: number): ArteOrdem[] {
  const modelos = modelosDoSnap(spec);
  if (modelos.length === 0) return [];
  const idx = Number(spec.faixa_index ?? 0);
  const matriz = spec.modelos_composicao_quantidades;
  if (Array.isArray(matriz) && Array.isArray(matriz[idx])) {
    const row = matriz[idx] as unknown[];
    return modelos.map((m, i) => {
      const q = Number(row[i]);
      return { nome: m.nome, qtde: Number.isFinite(q) ? q : null };
    });
  }
  if (qtdeBase > 0) {
    return alocarQuantidadePorModelo(qtdeBase, modelos).map((m) => ({
      nome: m.nome,
      qtde: m.quantidade,
    }));
  }
  return modelos.map((m) => ({ nome: m.nome, qtde: null }));
}

function textoCores(cores: string | null | undefined): string | null {
  const s = texto(cores);
  if (!s) return null;
  if (/cor/i.test(s)) return s;
  return `${s} cores`;
}

/** Uma linha para o cabeçalho da tela — a mesma leitura da ficha impressa. */
export function linhaImpressaoFlexo(spec: Record<string, unknown>): string {
  const desc = descricaoFromPedidoSpec(spec);
  const saida = saidaEtiquetaLabelCurto(
    texto(spec.saida_etiqueta) ?? texto(desc.saida_etiqueta),
  );
  return [
    textoMaquinaFlexo(spec),
    saida,
    textoBobinaFlexo(spec),
    desc.medida,
    desc.papel,
    textoFacaFlexo(spec),
    textoCores(desc.cores),
  ]
    .map((p) => (p != null ? String(p).trim() : ''))
    .filter((p) => p && p !== '—')
    .join(' · ');
}
