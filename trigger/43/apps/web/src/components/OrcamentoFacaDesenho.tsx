/**
 * Apresentação do desenho da faca no orçamento.
 * Reusa FacaShapeIcon (mesmo vocabulário do FacaPicker / mapa oficial).
 * Silhueta por formato — não é CAD anexado (GERACAO §3 / UC-CAD-004).
 */
import {
  FacaShapeIcon,
  formatoKind,
  formatoLabel,
} from './FacaShapeIcon';

export type OrcamentoFacaDesenhoAudience = 'interno' | 'cliente';

export type OrcamentoFacaDesenhoProps = {
  formato?: string | null;
  medida?: string | null;
  larguraCm?: number | string | null;
  puxadaCm?: number | string | null;
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

export function OrcamentoFacaDesenho({
  formato,
  medida,
  larguraCm,
  puxadaCm,
  z,
  maquina,
  facaNova = false,
  variant = 'featured',
  audience = 'interno',
  className,
}: OrcamentoFacaDesenhoProps) {
  const fmt = (formato || '').trim();
  if (!fmt && !medida) return null;

  const tipo = facaNova ? 'FACA NOVA' : formatoKind(fmt);
  const aspect = aspectFromOrcDims(larguraCm, puxadaCm);
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
        <FacaShapeIcon formato={fmt || 'RETA'} aspect={aspect} size={28} />
        <div className="orc-faca-desenho-compact-text">
          <strong>{medida?.trim() || label}</strong>
          <span>{tipo}</span>
        </div>
      </div>
    );
  }

  const size = variant === 'inline' ? 44 : variant === 'documento' ? 88 : 64;

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
      <div className="orc-faca-desenho-visual" title={label}>
        <FacaShapeIcon formato={fmt || 'RETA'} aspect={aspect} size={size} />
        <span className="orc-faca-desenho-caption">{tipo}</span>
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
              ? 'Silhueta do formato da etiqueta — referência visual, não substitui a arte final.'
              : 'Silhueta pelo formato do mapa oficial — referência visual da faca escolhida.'}
          </p>
        ) : null}
      </div>
    </div>
  );
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
    z: input.z as number | string | null | undefined,
    maquina: input.maquina != null ? String(input.maquina) : null,
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
    facaNova: Boolean(desc.faca_nova),
    audience: 'cliente',
  };
}
