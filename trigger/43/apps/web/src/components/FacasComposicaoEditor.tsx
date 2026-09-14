import { FacaPicker, type FacaRecord } from './FacaPicker';
import { OrcamentoFacaDesenho } from './OrcamentoFacaDesenho';
import {
  facaPrincipal,
  renumerarFacas,
  somaValorFacas,
  type FacaComposicaoForm,
} from '../lib/orcamentoForm';
import { isFacaPosicao, type FacaPosicaoCodigo } from '../lib/facaPosicao';

type Props = {
  facas: FacaComposicaoForm[];
  maquinasCatalogo?: string[];
  canWrite: boolean;
  onChange: (next: FacaComposicaoForm[]) => void;
};

function formatMoney(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function facaRecordToItem(faca: FacaRecord, principal: boolean): FacaComposicaoForm {
  const isNova = faca.faca_nova === true;
  const formato = String(faca.formato || faca.faca || '');
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
    tamanho_tipo: isNova ? '' : String(faca.tamanho_tipo ?? ''),
    faca_nova: isNova,
    valor_faca: 0,
    prazo_faca_dias: '',
  };
}

function tituloLinha(f: FacaComposicaoForm): string {
  const parts: string[] = [];
  if (f.n_facas != null) parts.push(`N ${f.n_facas}`);
  if (f.formato) parts.push(f.formato);
  if (f.medida) parts.push(f.medida);
  if (f.label && !parts.includes(f.label)) parts.push(f.label);
  if (parts.length) return parts.join(' · ');
  return f.faca_nova ? 'Faca nova' : `Faca ${f.ordem}`;
}

/**
 * Lista 0..N facas no ORC — uma principal (geometria) + extras (referência/cobrança).
 */
export function FacasComposicaoEditor({
  facas,
  maquinasCatalogo = [],
  canWrite,
  onChange,
}: Props) {
  const soma = somaValorFacas(facas);
  const principal = facaPrincipal(facas);

  const adicionar = (faca: FacaRecord | null) => {
    if (!faca) return;
    const asPrincipal = facas.length === 0;
    const item = facaRecordToItem(faca, asPrincipal);
    if (asPrincipal) {
      onChange([item]);
      return;
    }
    // Evita duplicar o mesmo mapa_faca_id.
    if (
      item.mapa_faca_id != null &&
      facas.some((f) => f.mapa_faca_id === item.mapa_faca_id)
    ) {
      return;
    }
    onChange(renumerarFacas([...facas, { ...item, principal: false }]));
  };

  const remover = (index: number) => {
    const next = facas.filter((_, i) => i !== index);
    if (next.length > 0 && !next.some((f) => f.principal)) {
      next[0] = { ...next[0], principal: true };
    }
    onChange(renumerarFacas(next));
  };

  const marcarPrincipal = (index: number) => {
    onChange(
      renumerarFacas(
        facas.map((f, i) => ({
          ...f,
          principal: i === index,
        })),
      ),
    );
  };

  const patch = (index: number, patchRow: Partial<FacaComposicaoForm>) => {
    onChange(
      renumerarFacas(
        facas.map((f, i) => (i === index ? { ...f, ...patchRow } : f)),
      ),
    );
  };

  return (
    <div className="orc-facas-composicao">
      {facas.length === 0 ? (
        <p className="form-hint" style={{ marginBottom: '0.75rem' }}>
          Selecione uma ou mais facas do mapa. A principal define a geometria do cálculo
          (puxada, Z, largura); as demais entram como ferramental do mesmo job.
        </p>
      ) : null}

      {facas.length > 0 ? (
        <ul className="orc-facas-lista" aria-label="Facas do orçamento">
          {facas.map((f, i) => (
            <li
              key={`${f.mapa_faca_id ?? 'x'}-${f.ordem}-${i}`}
              className={`orc-facas-item${f.principal ? ' is-principal' : ''}`}
            >
              <div className="orc-facas-item-visual">
                <OrcamentoFacaDesenho
                  formato={f.formato}
                  medida={f.medida}
                  larguraCm={f.largura_cm === '' ? null : f.largura_cm}
                  puxadaCm={f.puxada_cm === '' ? null : f.puxada_cm}
                  diametroCm={f.diametro_cm === '' ? null : f.diametro_cm}
                  tamanhoTipo={f.tamanho_tipo || null}
                  colunasMapa={f.colunas_mapa || null}
                  posicao={f.posicao || null}
                  contornoSvg={f.contorno_svg || null}
                  z={f.z === '' ? null : f.z}
                  maquina={f.maquina || null}
                  facaNova={f.faca_nova}
                  variant="compact"
                  audience="interno"
                />
              </div>
              <div className="orc-facas-item-body">
                <div className="orc-facas-item-head">
                  <strong>{tituloLinha(f)}</strong>
                  {f.principal ? (
                    <span className="orc-facas-badge">Principal · geometria</span>
                  ) : (
                    <span className="orc-facas-badge muted">Extra</span>
                  )}
                  {f.faca_nova ? <span className="orc-facas-badge warn">Nova</span> : null}
                </div>
                <div className="orc-facas-item-fields form-grid">
                  <div className="form-group">
                    <label>Valor ferramental (R$)</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      value={f.valor_faca || ''}
                      onChange={(e) =>
                        patch(i, { valor_faca: Math.max(0, Number(e.target.value) || 0) })
                      }
                      disabled={!canWrite}
                    />
                  </div>
                  <div className="form-group">
                    <label>Prazo faca (dias)</label>
                    <input
                      type="number"
                      min={0}
                      max={365}
                      value={f.prazo_faca_dias === '' ? '' : f.prazo_faca_dias}
                      onChange={(e) =>
                        patch(i, {
                          prazo_faca_dias:
                            e.target.value === '' ? '' : Number(e.target.value) || 0,
                        })
                      }
                      disabled={!canWrite}
                    />
                  </div>
                </div>
                {canWrite ? (
                  <div className="orc-facas-item-actions">
                    {!f.principal ? (
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
                  </div>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      ) : null}

      {soma > 0 ? (
        <p className="form-hint" style={{ marginTop: '0.5rem' }}>
          Ferramental cotado: <strong>{formatMoney(soma)}</strong>
          {principal ? ` · geometria: ${tituloLinha(principal)}` : null}
        </p>
      ) : null}

      {canWrite ? (
        <div className="orc-facas-add">
          <p className="orc-section-label" style={{ marginBottom: '0.35rem' }}>
            {facas.length === 0 ? 'Escolher no mapa' : 'Adicionar outra faca'}
          </p>
          <FacaPicker
            value={null}
            onChange={adicionar}
            maquinasCatalogo={maquinasCatalogo}
            disabled={!canWrite}
          />
        </div>
      ) : null}
    </div>
  );
}
