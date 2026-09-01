/**
 * Apresentação do desenho da faca no orçamento, ficha e proposta.
 * Vocabulário (FacaShapeIcon) + silhueta real (FacaSilhuetaReal) — mesmo padrão do mapa.
 */
import {
  FacaShapeIcon,
  formatoKind,
  formatoLabel,
} from './FacaShapeIcon';
import { FacaSilhuetaReal } from './FacaSilhuetaReal';
import { FacaPosicaoBadge } from './FacaPosicaoBadge';
import { isFacaPosicao } from '../lib/facaPosicao';

export type OrcamentoFacaDesenhoAudience = 'interno' | 'cliente';

export type OrcamentoFacaDesenhoProps = {
  formato?: string | null;
  medida?: string | null;
  larguraCm?: number | string | null;
  puxadaCm?: number | string | null;
  diametroCm?: number | string | null;
  tamanhoTipo?: string | null;
  /** Colunas no mapa (1×, 2×, 3×…) — distinto de colunas de rebobinação do ORC */
  colunasMapa?: string | null;
  /** Posição no cilindro: CIMA | BAIXO | ESQUERDA | DIREITA */
  posicao?: string | null;
  contornoSvg?: string | null;
  z?: number | string | null;
  maquina?: string | null;
  facaNova?: boolean;
  /** featured = detalhe; inline = resultado; compact = lista; documento = fichas */
  variant?: 'featured' | 'inline' | 'compact' | 'documento';
  /** cliente = CONSOLIDADO (sem Z/máquina); interno = cálculo/ficha operacional */
  audience?: OrcamentoFacaDesenhoAudience;
  className?: string;
};

function Chip({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className={`orc-faca-desenho-chip${warn ? ' warn' : ''}`}>
      <span>{label}</span>
      {value}
    </div>
  );
}

function numOrUndef(v: number | string | null | undefined): number | undefined {
  if (v == null || v === '') return undefined;
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? n : undefined;
}

export function aspectFromOrcDims(
  larguraCm?: number | string | null,
  puxadaCm?: number | string | null,
): number | undefined {
  const larg = numOrUndef(larguraCm);
  const pux = numOrUndef(puxadaCm);
  if (larg && pux) return larg / pux;
  return undefined;
}

function chipVal(v: number | string | null | undefined, suffix = ''): string {
  const n = numOrUndef(v);
  if (n == null) return '—';
  const s = Number.isInteger(n) ? String(n) : n.toLocaleString('pt-BR', { maximumFractionDigits: 2 });
  return suffix ? `${s} ${suffix}` : s;
}

function badgeSize(variant: OrcamentoFacaDesenhoProps['variant']): 'sm' | 'md' | 'lg' {
  switch (variant) {
    case 'compact':
      return 'sm';
    case 'documento':
      return 'lg';
    default:
      return 'md';
  }
}

function silhuetaSize(variant: OrcamentoFacaDesenhoProps['variant']): number {
  switch (variant) {
    case 'compact':
      return 28;
    case 'inline':
      return 44;
    case 'documento':
      return 88;
    default:
      return 64;
  }
}

function FacaDesenhoVisual({
  props,
  variant,
  tipo,
  label,
}: {
  props: OrcamentoFacaDesenhoProps;
  variant: NonNullable<OrcamentoFacaDesenhoProps['variant']>;
  tipo: string;
  label: string;
}) {
  const fmt = (props.formato || '').trim() || 'RETA';
  const aspect = aspectFromOrcDims(props.larguraCm, props.puxadaCm);
  const silSize = silhuetaSize(variant);
  const vocabSize = variant === 'compact' ? 18 : variant === 'documento' ? 24 : 22;

  return (
    <div className={`orc-faca-desenho-visual orc-faca-desenho-visual--${variant}`} title={label}>
      <FacaSilhuetaReal
        formato={fmt}
        medida={props.medida}
        larguraCm={props.larguraCm}
        puxadaCm={props.puxadaCm}
        diametroCm={props.diametroCm}
        tamanhoTipo={props.tamanhoTipo}
        colunasMapa={props.colunasMapa}
        contornoSvg={props.contornoSvg}
        size={silSize}
        variant={variant === 'compact' ? 'compact' : 'featured'}
      />
      <div className="orc-faca-desenho-vocab">
        <FacaShapeIcon formato={fmt} aspect={aspect} size={vocabSize} />
        {variant !== 'compact' ? (
          <span className="orc-faca-desenho-caption">{tipo}</span>
        ) : null}
      </div>
    </div>
  );
}

export function OrcamentoFacaDesenho({
  formato,
  medida,
  larguraCm,
  puxadaCm,
  diametroCm,
  tamanhoTipo,
  colunasMapa,
  posicao,
  contornoSvg,
  z,
  maquina,
  facaNova = false,
  variant = 'featured',
  audience = 'interno',
  className,
}: OrcamentoFacaDesenhoProps) {
  const props: OrcamentoFacaDesenhoProps = {
    formato,
    medida,
    larguraCm,
    puxadaCm,
    diametroCm,
    tamanhoTipo,
    colunasMapa,
    posicao,
    contornoSvg,
    z,
    maquina,
    facaNova,
    variant,
    audience,
    className,
  };

  const fmt = (formato || '').trim();
  if (!fmt && !medida) return null;

  const tipo = facaNova ? 'FACA NOVA' : formatoKind(fmt);
  const label = formatoLabel(fmt);
  const title = medida?.trim() || label || tipo;
  const cliente = audience === 'cliente';
  const rootClass = [
    'orc-faca-desenho',
    `orc-faca-desenho--${variant}`,
    cliente ? 'orc-faca-desenho--cliente' : 'orc-faca-desenho--interno',
    facaNova ? 'is-nova' : '',
    className ?? '',
  ]
    .filter(Boolean)
    .join(' ');

  if (variant === 'compact') {
    return (
      <div className={rootClass} title={`${label}${medida ? ` · ${medida}` : ''}`}>
        <div className="orc-faca-desenho-leading">
          <FacaDesenhoVisual props={props} variant="compact" tipo={tipo} label={label} />
          {isFacaPosicao(posicao) ? (
            <FacaPosicaoBadge codigo={posicao} variant="symbol" size="sm" />
          ) : null}
        </div>
        <div className="orc-faca-desenho-compact-text">
          <strong>{medida?.trim() || label}</strong>
          <span>{tipo}</span>
        </div>
      </div>
    );
  }

  const largura = chipVal(larguraCm, 'cm');
  const puxada = chipVal(puxadaCm, 'cm');
  const zVal = chipVal(z);

  const chips = (
    <div className="orc-faca-desenho-chips" aria-label="Tipo e parâmetros da faca">
      <Chip label="Tipo" value={tipo} warn={facaNova} />
      {medida?.trim() ? <Chip label="Medida" value={medida.trim()} /> : null}
      {label && label !== '—' && label !== title ? <Chip label="Formato" value={label} /> : null}
      {largura !== '—' ? <Chip label="Largura" value={largura} /> : null}
      {puxada !== '—' ? <Chip label="Puxada" value={puxada} /> : null}
      {!cliente && zVal !== '—' ? <Chip label="Z" value={zVal} /> : null}
      {!cliente && maquina ? <Chip label="Máq." value={String(maquina)} /> : null}
    </div>
  );

  const metaLine = [
    label && label !== title ? label : null,
    !cliente && maquina ? String(maquina) : null,
    facaNova && !cliente ? 'não cadastrada no mapa' : null,
    facaNova && cliente ? 'Faca a desenvolver para este modelo' : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className={rootClass} role="group" aria-label={`Desenho da faca: ${tipo} · ${title}`}>
      <div className="orc-faca-desenho-leading">
        <FacaDesenhoVisual props={props} variant={variant} tipo={tipo} label={label} />
        {isFacaPosicao(posicao) ? (
          <FacaPosicaoBadge codigo={posicao} size={badgeSize(variant)} />
        ) : null}
      </div>

      <div className="orc-faca-desenho-body">
        {variant === 'documento' ? (
          <span className="orc-faca-desenho-tipo-label">Tipo da faca</span>
        ) : variant === 'featured' ? (
          <span className="orc-faca-desenho-kicker">
            {facaNova ? 'Faca nova (simulada)' : 'Desenho da faca'}
          </span>
        ) : null}

        {variant === 'documento' ? <div className="orc-faca-desenho-tipo">{tipo}</div> : null}

        <div className="orc-faca-desenho-title">{title}</div>

        {metaLine ? <div className="orc-faca-desenho-meta">{metaLine}</div> : null}

        {variant === 'featured' || variant === 'documento' ? chips : null}

        {variant === 'featured' || variant === 'documento' ? (
          <p className="orc-faca-desenho-hint">
            {cliente
              ? 'Silhueta real da etiqueta — referência visual, não substitui a arte final.'
              : 'Silhueta real pelas medidas do mapa (e colunas quando cadastradas). Referência visual da faca escolhida.'}
          </p>
        ) : null}
      </div>
    </div>
  );
}

function snapStr(input: Record<string, unknown>, ...keys: string[]): string {
  for (const key of keys) {
    const v = input[key];
    if (v != null && String(v).trim() !== '') return String(v);
  }
  return '';
}

function snapNum(input: Record<string, unknown>, ...keys: string[]): number | string | null {
  for (const key of keys) {
    const v = input[key];
    if (v != null && v !== '') return v as number | string;
  }
  return null;
}

/** Extrai props de desenho a partir do input_snapshot do ORC. */
export function facaDesenhoFromSnapshot(
  input: Record<string, unknown> | null | undefined,
): OrcamentoFacaDesenhoProps | null {
  if (!input) return null;
  const formato = input.formato_faca != null ? String(input.formato_faca) : '';
  const medida = input.medida != null ? String(input.medida) : '';
  if (!formato && !medida) return null;
  return {
    formato: formato || null,
    medida: medida || null,
    larguraCm: input.largura_cm as number | string | null | undefined,
    puxadaCm: input.puxada_cm as number | string | null | undefined,
    diametroCm: snapNum(input, 'faca_diametro_cm', 'diametro_cm'),
    tamanhoTipo: snapStr(input, 'faca_tamanho_tipo', 'tamanho_tipo') || null,
    colunasMapa: snapStr(input, 'faca_colunas_mapa') || null,
    posicao: snapStr(input, 'faca_posicao') || null,
    contornoSvg: snapStr(input, 'faca_contorno_svg') || null,
    z: input.z as number | string | null | undefined,
    maquina: input.maquina != null ? String(input.maquina) : null,
    facaNova: Boolean(input.faca_nova),
  };
}

/** Monta props a partir do form / faca selecionada (rascunho do ORC). */
export function facaDesenhoFromForm(input: {
  formato_faca?: string;
  medida?: string;
  largura_cm?: number;
  puxada_cm?: number;
  z?: number | '';
  maquina?: string;
  faca_nova?: boolean;
  faca_colunas_mapa?: string;
  faca_posicao?: string;
  faca_contorno_svg?: string;
  faca_diametro_cm?: number | '';
  faca_tamanho_tipo?: string;
}): OrcamentoFacaDesenhoProps | null {
  const formato = input.formato_faca?.trim() ?? '';
  const medida = input.medida?.trim() ?? '';
  if (!formato && !medida) return null;
  return {
    formato: formato || null,
    medida: medida || null,
    larguraCm: input.largura_cm,
    puxadaCm: input.puxada_cm,
    diametroCm: input.faca_diametro_cm === '' ? null : input.faca_diametro_cm,
    tamanhoTipo: input.faca_tamanho_tipo || null,
    colunasMapa: input.faca_colunas_mapa?.trim() || null,
    posicao: input.faca_posicao?.trim() || null,
    contornoSvg: input.faca_contorno_svg?.trim() || null,
    z: input.z === '' ? null : input.z,
    maquina: input.maquina || null,
    facaNova: Boolean(input.faca_nova),
  };
}

/** Extrai props comerciais a partir do DTO da proposta (sem Z/máquina). */
export function facaDesenhoFromPropostaDescricao(
  desc:
    | {
        formato_faca?: string | null;
        medida?: string | null;
        largura_cm?: number | string | null;
        puxada_cm?: number | string | null;
        faca_nova?: boolean | null;
        faca_colunas_mapa?: string | null;
        faca_contorno_svg?: string | null;
        faca_diametro_cm?: number | string | null;
        faca_posicao?: string | null;
      }
    | null
    | undefined,
): OrcamentoFacaDesenhoProps | null {
  if (!desc) return null;
  const formato = desc.formato_faca != null ? String(desc.formato_faca) : '';
  const medida = desc.medida != null ? String(desc.medida) : '';
  if (!formato && !medida) return null;
  return {
    formato: formato || null,
    medida: medida || null,
    larguraCm: desc.largura_cm,
    puxadaCm: desc.puxada_cm,
    diametroCm: desc.faca_diametro_cm,
    colunasMapa: desc.faca_colunas_mapa,
    contornoSvg: desc.faca_contorno_svg,
    posicao: desc.faca_posicao,
    facaNova: Boolean(desc.faca_nova),
    audience: 'cliente',
  };
}
