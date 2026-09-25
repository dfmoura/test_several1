import { FacaPicker, type FacaRecord } from './FacaPicker';
import { FacaApresentacao } from './FacaApresentacao';
import { FacaSilhuetaReal } from './FacaSilhuetaReal';
import { formatoLabel } from './FacaShapeIcon';
import {
  facaPrincipal,
  renumerarFacas,
  somaValorFacas,
  type FacaComposicaoForm,
} from '../lib/orcamentoForm';
import { isFacaPosicao, type FacaPosicaoCodigo } from '../lib/facaPosicao';
import { formatColunasMapaLabel } from '../lib/facaSilhueta';
import { facaDimensoesExibicao } from '../lib/facasMapa';

type Props = {
  facas: FacaComposicaoForm[];
  maquinasCatalogo?: string[];
  canWrite: boolean;
  /** Obrigatório só com `canWrite`. */
  onChange?: (next: FacaComposicaoForm[]) => void;
  /** Etiqueta sob medida: uma faca; escolher outra substitui. */
  umaPorItem?: boolean;
};

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function facaRecordToItem(faca: FacaRecord, principal: boolean): FacaComposicaoForm {
  const isNova = faca.faca_nova === true;
  const formato = String(faca.formato || faca.faca || (isNova ? 'RETA' : ''));
  const puxada = faca.puxada != null ? Number(faca.puxada) : NaN;
  const z = faca.z != null ? Number(faca.z) : NaN;
  const largura = faca.largura_faca != null ? Number(faca.largura_faca) : NaN;
  const diametro = faca.diametro_cm != null ? Number(faca.diametro_cm) : NaN;
  const pos = String(faca.posicao ?? '');

  return {
    ordem: 1,
    principal,
    mapa_faca_id: typeof faca.id === 'number' ? faca.id : null,
    n_facas: faca.n_facas != null ? Number(faca.n_facas) : null,
    label: String(faca.label || faca.cliente_nota || (isNova ? 'Faca nova' : '') || ''),
    medida: String(faca.medida || ''),
    formato,
    puxada_cm: !Number.isNaN(puxada) ? puxada : '',
    largura_cm: !Number.isNaN(largura) && largura > 0 ? largura : '',
    z: !Number.isNaN(z) ? z : '',
    maquina: String(faca.maquina_catalogo || ''),
    colunas_mapa: isNova ? '' : String(faca.colunas_mapa ?? ''),
    posicao: !isNova && isFacaPosicao(pos) ? (pos as FacaPosicaoCodigo) : '',
    contorno_svg: isNova ? '' : String(faca.contorno_svg ?? ''),
    diametro_cm: !Number.isNaN(diametro) && diametro > 0 ? diametro : '',
    tamanho_raw: faca.tamanho_raw != null ? String(faca.tamanho_raw) : '',
    tamanho_tipo: isNova ? (faca.tamanho_tipo ? String(faca.tamanho_tipo) : '') : String(faca.tamanho_tipo ?? ''),
    faca_nova: isNova,
    valor_faca: 0,
    prazo_faca_dias: '',
  };
}

/** Título curto da linha: identidade `medida`, com fallback visual. */
function tituloCurto(f: FacaComposicaoForm): string {
  if (f.medida.trim()) return f.medida.trim();
  const dim = dimensoesDaFaca(f);
  if (dim.titulo && dim.titulo !== '—') return dim.titulo;
  if (f.formato.trim()) return formatoLabel(f.formato);
  return f.faca_nova ? 'Faca nova' : `Faca ${f.ordem}`;
}

function dimensoesDaFaca(f: FacaComposicaoForm) {
  return facaDimensoesExibicao({
    medida: f.medida,
    formato: f.formato,
    largura_faca: f.largura_cm === '' ? null : f.largura_cm,
    diametro_cm: f.diametro_cm === '' ? null : f.diametro_cm,
    tamanho_raw: f.tamanho_raw || null,
    tamanho_tipo: f.tamanho_tipo || null,
  });
}

function fmtChipNum(v: number | '', decimals = 2): string {
  if (v === '' || v == null) return '—';
  const n = Number(v);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', { maximumFractionDigits: decimals });
}

function MetaChip({
  label,
  value,
  warn,
}: {
  label: string;
  value: string;
  warn?: boolean;
}) {
  return (
    <div className={`orc-facas-meta-chip${warn ? ' warn' : ''}`}>
      <span>{label}</span>
      {value}
    </div>
  );
}

/**
 * Etiqueta sob medida: 0..1 faca (troca substitui).
 * Legado com extras: exibe, não empilha.
 */
export function FacasComposicaoEditor({
  facas,
  maquinasCatalogo = [],
  canWrite,
  onChange,
  umaPorItem = false,
}: Props) {
  const soma = somaValorFacas(facas);
  const principal = facaPrincipal(facas);
  const legadoExtras = umaPorItem && facas.length > 1;
  const podeEscolher = canWrite && (!umaPorItem || facas.length <= 1);

  const adicionar = (faca: FacaRecord | null) => {
    if (!canWrite || !onChange || !faca) return;
    const item = facaRecordToItem(faca, true);
    if (umaPorItem || facas.length === 0) {
      onChange([item]);
      return;
    }
    if (
      item.mapa_faca_id != null &&
      facas.some((f) => f.mapa_faca_id === item.mapa_faca_id)
    ) {
      return;
    }
    onChange(renumerarFacas([...facas, { ...item, principal: false }]));
  };

  const remover = (index: number) => {
    if (!canWrite || !onChange) return;
    const next = facas.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((f) => f.principal)) {
      next[0] = { ...next[0], principal: true };
    }
    onChange(renumerarFacas(next));
  };

  const marcarPrincipal = (index: number) => {
    if (!canWrite || !onChange) return;
    onChange(
      renumerarFacas(
        facas.map((f, i) => ({
          ...f,
          principal: i === index,
        })),
      ),
    );
  };

  return (
    <div className="orc-facas-composicao">
      {facas.length > 0 ? (
        <ul className="orc-facas-lista" aria-label="Facas do orçamento">
          {facas.map((f, i) => {
            const dim = dimensoesDaFaca(f);
            const cols = !f.faca_nova ? formatColunasMapaLabel(f.colunas_mapa) : null;
            const puxadaVazia = f.puxada_cm === '' || f.puxada_cm == null;
            return (
              <li
                key={`${f.mapa_faca_id ?? 'x'}-${f.ordem}-${i}`}
                className={`orc-facas-item${f.principal ? ' is-principal' : ''}`}
              >
                <div className="orc-facas-item-visual" title={formatoLabel(f.formato)}>
                  <FacaApresentacao posicao={f.posicao || ''} size="compact">
                    <FacaSilhuetaReal
                      formato={f.formato}
                      medida={f.medida}
                      larguraCm={f.largura_cm === '' ? null : f.largura_cm}
                      puxadaCm={f.puxada_cm === '' ? null : f.puxada_cm}
                      diametroCm={f.diametro_cm === '' ? null : f.diametro_cm}
                      tamanhoTipo={f.tamanho_tipo || null}
                      colunasMapa={f.colunas_mapa || null}
                      contornoSvg={f.contorno_svg || null}
                      size={28}
                      variant="compact"
                    />
                  </FacaApresentacao>
                </div>
                <div className="orc-facas-item-body">
                  <div className="orc-facas-item-head">
                    <strong>{tituloCurto(f)}</strong>
                    {facas.length > 1 ? (
                      f.principal ? (
                        <span className="orc-facas-badge">Principal</span>
                      ) : (
                        <span className="orc-facas-badge muted">Extra</span>
                      )
                    ) : null}
                    {f.faca_nova ? <span className="orc-facas-badge warn">Nova</span> : null}
                    {canWrite ? (
                      <span className="orc-facas-item-actions">
                        {!umaPorItem && !f.principal ? (
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            onClick={() => marcarPrincipal(i)}
                          >
                            Usar no cálculo
                          </button>
                        ) : null}
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm"
                          onClick={() => remover(i)}
                        >
                          Remover
                        </button>
                      </span>
                    ) : null}
                  </div>
                  <div className="orc-facas-meta" aria-label="Dados da faca">
                    <MetaChip label="Medida" value={f.medida.trim() || '—'} />
                    <MetaChip
                      label="Largura"
                      value={dim.largura === '—' ? '—' : `${dim.largura} cm`}
                    />
                    <MetaChip label="Formato" value={f.formato ? formatoLabel(f.formato) : '—'} />
                    <MetaChip
                      label="N FACA"
                      value={f.n_facas != null ? String(f.n_facas) : '—'}
                    />
                    {cols ? <MetaChip label="Cols. faca" value={cols} /> : null}
                    <MetaChip label="Máquina" value={f.maquina || '—'} />
                    <MetaChip label="Z" value={fmtChipNum(f.z, 0)} />
                    <MetaChip
                      label="Puxada"
                      value={puxadaVazia ? 'manual' : `${fmtChipNum(f.puxada_cm)} cm`}
                      warn={puxadaVazia}
                    />
                  </div>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}

      {soma > 0 ? (
        <p className="orc-facas-soma">
          Ferramental: <strong>{formatMoney(soma)}</strong>
          {principal ? ` · ${tituloCurto(principal)}` : null}
        </p>
      ) : null}

      {legadoExtras && canWrite ? (
        <p className="orc-facas-add-hint muted">
          Este item tem facas extras (legado). A geometria é a principal. Outra medida = outro
          item.
        </p>
      ) : null}

      {podeEscolher ? (
        <div className={`orc-facas-add${facas.length === 0 ? ' is-empty' : ''}`}>
          {facas.length === 0 ? (
            <p className="orc-facas-add-hint">Faca existente no mapa ou orçar faca nova</p>
          ) : (
            <p className="orc-facas-add-hint muted">Trocar faca deste item</p>
          )}
          <FacaPicker
            value={null}
            onChange={adicionar}
            maquinasCatalogo={maquinasCatalogo}
            disabled={!canWrite}
            permitirFacaNova
            variante="compacta"
          />
        </div>
      ) : null}
    </div>
  );
}
