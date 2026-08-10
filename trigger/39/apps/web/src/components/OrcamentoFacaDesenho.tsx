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

export type OrcamentoFacaDesenhoProps = {
  formato?: string | null;
  medida?: string | null;
  larguraCm?: number | string | null;
  puxadaCm?: number | string | null;
  z?: number | string | null;
  maquina?: string | null;
  facaNova?: boolean;
  /** featured = detalhe; inline = proposta; compact = lista */
  variant?: 'featured' | 'inline' | 'compact';
  className?: string;
};

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
  className,
}: OrcamentoFacaDesenhoProps) {
  const fmt = (formato || '').trim();
  if (!fmt && !medida) return null;

  const kind = facaNova ? 'NOVA' : formatoKind(fmt);
  const aspect = aspectFromOrcDims(larguraCm, puxadaCm);
  const label = formatoLabel(fmt);
  const title = medida?.trim() || label || kind;
  const rootClass = [
    'orc-faca-desenho',
    `orc-faca-desenho--${variant}`,
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
          <span>{kind}</span>
        </div>
      </div>
    );
  }

  const size = variant === 'inline' ? 44 : 64;

  return (
    <div className={rootClass} role="group" aria-label={`Desenho da faca: ${title}`}>
      <div className="orc-faca-desenho-visual" title={label}>
        <FacaShapeIcon formato={fmt || 'RETA'} aspect={aspect} size={size} />
        <span className="orc-faca-desenho-caption">{kind}</span>
      </div>

      <div className="orc-faca-desenho-body">
        {variant === 'featured' ? (
          <span className="orc-faca-desenho-kicker">
            {facaNova ? 'Faca nova (simulada)' : 'Desenho da faca'}
          </span>
        ) : null}

        <div className="orc-faca-desenho-title">{title}</div>

        <div className="orc-faca-desenho-meta">
          {[
            label !== title ? label : null,
            maquina ? String(maquina) : null,
            facaNova ? 'não cadastrada no mapa' : null,
          ]
            .filter(Boolean)
            .join(' · ')}
        </div>

        {variant === 'featured' ? (
          <div className="orc-faca-desenho-chips" aria-label="Parâmetros da faca">
            <div className="orc-faca-desenho-chip">
              <span>Z</span>
              {chipVal(z)}
            </div>
            <div className="orc-faca-desenho-chip">
              <span>Puxada</span>
              {chipVal(puxadaCm, 'cm')}
            </div>
            <div className="orc-faca-desenho-chip">
              <span>Largura</span>
              {chipVal(larguraCm, 'cm')}
            </div>
            {maquina ? (
              <div className="orc-faca-desenho-chip">
                <span>Máq.</span>
                {String(maquina)}
              </div>
            ) : null}
            {facaNova ? (
              <div className="orc-faca-desenho-chip warn">
                <span>Tipo</span>
                FACA NOVA
              </div>
            ) : null}
          </div>
        ) : null}

        {variant === 'featured' ? (
          <p className="orc-faca-desenho-hint">
            Silhueta pelo formato do mapa oficial — referência visual da faca escolhida.
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
