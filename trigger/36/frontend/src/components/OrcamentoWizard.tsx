import { FormEvent, useEffect, useMemo, useState } from 'react';
import { FacaPicker, type FacaRecord } from './FacaPicker';
import { OrcamentoResultado } from './OrcamentoResultado';
import { getErrorMessage, orcamentosApi } from '../lib/api';
import {
  CORES_OPCOES,
  defaultOrcForm,
  payloadFromForm,
  type OrcForm,
} from '../lib/orcamentoForm';
import type { ApiRow } from '../types';

function pickFromFaca(f: FacaRecord) {
  const medida = String(f.medida ?? '');
  const puxada = f.puxada != null ? Number(f.puxada) : null;
  const z = f.z != null ? Number(f.z) : null;
  const largura = f.largura_faca != null ? Number(f.largura_faca) : null;
  const repeticao = f.repeticao != null ? Number(f.repeticao) : null;
  const formato = String(f.formato || f.faca || '');
  const maq = String(f.maquina_catalogo || '');
  return {
    medida,
    puxada: puxada != null && !Number.isNaN(puxada) ? puxada : null,
    z: z != null && !Number.isNaN(z) ? z : null,
    largura: largura != null && !Number.isNaN(largura) ? largura : null,
    repeticao: repeticao != null && !Number.isNaN(repeticao) ? repeticao : null,
    formato,
    maq,
    completa: f.completa !== false,
  };
}

interface Props {
  title: string;
  subtitle?: string;
  catalog: ApiRow | null;
  parceiros: ApiRow[];
  initialForm: OrcForm;
  /** Se definido, salva via PUT; senão POST create */
  orcamentoId?: number;
  onClose: () => void;
  onSaved: (orc: ApiRow) => void;
}

export function OrcamentoWizard({
  title,
  subtitle = 'Motor R1–R20 · catálogo oficial · mapa de facas · snapshot auditável',
  catalog,
  parceiros,
  initialForm,
  orcamentoId,
  onClose,
  onSaved,
}: Props) {
  const [form, setForm] = useState<OrcForm>(initialForm);
  const [calculo, setCalculo] = useState<ApiRow | null>(null);
  const [facaSel, setFacaSel] = useState<FacaRecord | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    setForm(initialForm);
    setCalculo(null);
    setFacaSel(null);
  }, [initialForm]);

  const papeis = (catalog?.papeis as string[]) ?? [];
  const acabamentos = (catalog?.acabamentos as string[]) ?? [];
  const tubetes = (catalog?.tubetes as string[]) ?? ['1"', '3"'];
  const maquinas = (catalog?.maquinas as string[]) ?? [];
  const maquinasRoda = (catalog?.maquinas_roda_servico as string[]) ?? maquinas;
  const tiposTroca = (catalog?.tipos_troca_produto as string[]) ?? ['SEM PARADA'];
  /** Sem faca recém-selecionada (ex.: edição a partir do snapshot) → permite ajuste manual */
  const puxadaManual = form.faca_incompleta || (!facaSel && Boolean(orcamentoId));
  const medidaManual = !facaSel && Boolean(orcamentoId);

  function aplicarFaca(f: FacaRecord | null) {
    setFacaSel(f);
    if (!f) return;
    const picked = pickFromFaca(f);
    setForm((prev) => ({
      ...prev,
      medida: picked.medida || prev.medida,
      puxada_cm: picked.puxada ?? prev.puxada_cm,
      z: picked.z ?? prev.z,
      largura_cm: picked.largura && picked.largura > 0 ? picked.largura : prev.largura_cm,
      faca_formato: picked.formato,
      repeticao: picked.repeticao ?? prev.repeticao,
      faca_incompleta: !picked.completa || picked.puxada == null,
      maquina: picked.maq && maquinas.includes(picked.maq) ? picked.maq : prev.maquina,
      maquina_roda_servico:
        picked.maq && maquinasRoda.includes(picked.maq) ? picked.maq : prev.maquina_roda_servico,
    }));
    setCalculo(null);
  }

  async function calcular() {
    if (!form.medida) {
      setErro('Selecione uma faca no mapa (medida obrigatória).');
      return;
    }
    if (!form.puxada_cm || form.puxada_cm <= 0) {
      setErro('Puxada (cm) obrigatória — preencha se a faca estiver incompleta no mapa.');
      return;
    }
    setPending(true);
    setErro(null);
    try {
      const res = await orcamentosApi.calcular(payloadFromForm(form));
      setCalculo(res as ApiRow);
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    if (!calculo) {
      setErro('Calcule o orçamento antes de salvar (snapshot auditável).');
      return;
    }
    setPending(true);
    setErro(null);
    try {
      const payload = payloadFromForm(form);
      const saved = orcamentoId
        ? await orcamentosApi.update(orcamentoId, payload)
        : await orcamentosApi.create(payload);
      onSaved(saved as ApiRow);
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div
        className="modal modal-orcamento"
        onClick={(e) => e.stopPropagation()}
        style={{ width: 'min(980px, 100%)' }}
      >
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            <p className="muted" style={{ margin: '0.25rem 0 0', fontSize: '0.85rem' }}>
              {subtitle}
            </p>
          </div>
          <button type="button" className="btn ghost sm" onClick={onClose}>
            Fechar
          </button>
        </div>

        {erro ? <p className="error">{erro}</p> : null}

        <form onSubmit={salvar}>
          <section className="orc-section">
            <h3 className="panel-title">1. Cliente</h3>
            <div className="form-grid">
              <label>
                Cliente *
                <input
                  required
                  value={form.cliente}
                  onChange={(e) => setForm({ ...form, cliente: e.target.value })}
                  placeholder="Prospect ou razão social"
                />
              </label>
              <label>
                Parceiro cadastrado
                <select
                  value={form.parceiro_id === '' ? '' : String(form.parceiro_id)}
                  onChange={(e) => {
                    const v = e.target.value;
                    const pid = v ? parseInt(v, 10) : '';
                    const par = parceiros.find((p) => p.id === pid);
                    setForm({
                      ...form,
                      parceiro_id: pid,
                      cliente: par ? String(par.razao_social) : form.cliente,
                    });
                  }}
                >
                  <option value="">— prospect sem cadastro —</option>
                  {parceiros.map((p) => (
                    <option key={String(p.id)} value={String(p.id)}>
                      {String(p.codigo)} — {String(p.razao_social)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="orc-section">
            <h3 className="panel-title">2. Faca (mapa oficial)</h3>
            <FacaPicker value={facaSel} onChange={aplicarFaca} maquinasCatalogo={maquinas} />
            <div className="form-grid faca-auto-fields">
              <label className={medidaManual ? 'manual-field' : 'auto'}>
                Medida
                <input
                  value={form.medida}
                  readOnly={!medidaManual}
                  required
                  onChange={(e) => setForm({ ...form, medida: e.target.value })}
                />
              </label>
              <label className="auto">
                Formato
                <input value={form.faca_formato} readOnly />
              </label>
              <label className={puxadaManual ? 'manual-field' : 'auto'}>
                Puxada (cm) *
                <input
                  type="number"
                  step="0.01"
                  required
                  readOnly={!puxadaManual}
                  value={form.puxada_cm || ''}
                  onChange={(e) => setForm({ ...form, puxada_cm: parseFloat(e.target.value) || 0 })}
                />
                <small className="field-note">
                  {medidaManual
                    ? 'Edição do snapshot — reescolha faca no mapa ou ajuste manual'
                    : puxadaManual
                      ? 'Incompleto no mapa — preencha manualmente'
                      : 'Automático do mapa · só leitura'}
                </small>
              </label>
              <label className={puxadaManual ? 'manual-field' : 'auto'}>
                Z
                <input
                  type="number"
                  step="0.01"
                  readOnly={!puxadaManual}
                  value={form.z}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      z: e.target.value === '' ? '' : parseFloat(e.target.value),
                    })
                  }
                />
              </label>
              <label className="auto">
                REP
                <input value={form.repeticao === '' ? '' : form.repeticao} readOnly />
              </label>
              <label>
                Largura papel (cm) *
                <input
                  type="number"
                  step="0.01"
                  required
                  value={form.largura_cm || ''}
                  onChange={(e) => setForm({ ...form, largura_cm: parseFloat(e.target.value) || 0 })}
                />
                <small className="field-note">Sugestão da faca; ajuste à bobina</small>
              </label>
            </div>
          </section>

          <section className="orc-section">
            <h3 className="panel-title">3. Especificação técnica</h3>
            <div className="form-grid">
              <label>
                Cores *
                <select value={form.cores} onChange={(e) => setForm({ ...form, cores: e.target.value })}>
                  {CORES_OPCOES.map((c) => (
                    <option key={c} value={c}>
                      {c === '4V' ? '4V (4 cores + verniz)' : c === '0' ? '0 (lisa)' : c}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Papel / filme *
                <select value={form.papel} onChange={(e) => setForm({ ...form, papel: e.target.value })}>
                  {papeis.map((p) => (
                    <option key={p} value={p}>
                      {p}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Acabamento *
                <select
                  value={form.acabamento}
                  onChange={(e) => setForm({ ...form, acabamento: e.target.value })}
                >
                  {acabamentos.map((a) => (
                    <option key={a} value={a}>
                      {a}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Modelos
                <input
                  type="number"
                  min={1}
                  value={form.modelos}
                  onChange={(e) => setForm({ ...form, modelos: parseInt(e.target.value, 10) || 1 })}
                />
              </label>
              <label>
                Colunas
                <input
                  type="number"
                  min={1}
                  value={form.colunas}
                  onChange={(e) => setForm({ ...form, colunas: parseInt(e.target.value, 10) || 1 })}
                />
              </label>
              <label>
                Etiq. por rolo
                <input
                  type="number"
                  min={1}
                  value={form.etiq_por_rolo}
                  onChange={(e) =>
                    setForm({ ...form, etiq_por_rolo: parseInt(e.target.value, 10) || 0 })
                  }
                />
              </label>
              <label>
                Tubete
                <select value={form.tubete} onChange={(e) => setForm({ ...form, tubete: e.target.value })}>
                  {tubetes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Col. rebobinação
                <input
                  type="number"
                  min={1}
                  value={form.coluna_rebobinacao}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      coluna_rebobinacao: parseInt(e.target.value, 10) || 1,
                    })
                  }
                />
              </label>
            </div>
          </section>

          <section className="orc-section">
            <h3 className="panel-title">4. Produção / ferramental</h3>
            <div className="form-grid">
              <label>
                Máquina (custo G10) *
                <select value={form.maquina} onChange={(e) => setForm({ ...form, maquina: e.target.value })}>
                  {maquinas.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <small className="field-note">Define R$/h no cálculo</small>
              </label>
              <label>
                Máq. roda serviço (F10)
                <select
                  value={form.maquina_roda_servico}
                  onChange={(e) => setForm({ ...form, maquina_roda_servico: e.target.value })}
                >
                  {maquinasRoda.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
                <small className="field-note">Operacional — não entra no preço</small>
              </label>
              <label>
                Matriz (clichê)
                <select
                  value={form.matriz}
                  onChange={(e) => setForm({ ...form, matriz: e.target.value as 'SIM' | 'NAO' })}
                >
                  <option value="SIM">SIM (1º pedido)</option>
                  <option value="NAO">NÃO (já cobrada / recompra)</option>
                </select>
              </label>
              <label>
                Imposto %
                <input
                  type="number"
                  step="0.01"
                  value={form.imposto_pct}
                  onChange={(e) => setForm({ ...form, imposto_pct: parseFloat(e.target.value) || 0 })}
                />
              </label>
              <label>
                Troca entre modelos
                <select
                  value={form.tipo_troca_produto}
                  onChange={(e) => setForm({ ...form, tipo_troca_produto: e.target.value })}
                >
                  {tiposTroca.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                RPM
                <input
                  type="number"
                  value={form.rpm}
                  onChange={(e) => setForm({ ...form, rpm: parseFloat(e.target.value) || 0 })}
                />
              </label>
              <label>
                Prazo (dias úteis)
                <input
                  type="number"
                  value={form.prazo_entrega_dias}
                  onChange={(e) =>
                    setForm({ ...form, prazo_entrega_dias: parseInt(e.target.value, 10) || 12 })
                  }
                />
              </label>
              <label>
                Validade (dias)
                <input
                  type="number"
                  value={form.validade_dias}
                  onChange={(e) =>
                    setForm({ ...form, validade_dias: parseInt(e.target.value, 10) || 7 })
                  }
                />
              </label>
              <label>
                Tolerância qtd %
                <input
                  type="number"
                  step="0.1"
                  value={form.tolerancia_qtd_pct}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      tolerancia_qtd_pct: parseFloat(e.target.value) || 20,
                    })
                  }
                />
              </label>
            </div>
          </section>

          <section className="orc-section">
            <h3 className="panel-title">5. Faixas de quantidade (escada)</h3>
            {form.faixas.map((fx, i) => (
              <div key={i} className="form-grid faixa-row">
                <label>
                  Qtd.
                  <input
                    type="number"
                    min={1}
                    value={fx.quantidade}
                    onChange={(e) => {
                      const faixas = [...form.faixas];
                      faixas[i] = { ...fx, quantidade: parseInt(e.target.value, 10) || 0 };
                      setForm({ ...form, faixas });
                    }}
                  />
                </label>
                <label>
                  Comissão %
                  <input
                    type="number"
                    step="0.01"
                    value={fx.comissao_pct}
                    onChange={(e) => {
                      const faixas = [...form.faixas];
                      faixas[i] = { ...fx, comissao_pct: parseFloat(e.target.value) || 0 };
                      setForm({ ...form, faixas });
                    }}
                  />
                </label>
                {form.faixas.length > 1 ? (
                  <div className="faixa-remove">
                    <button
                      type="button"
                      className="btn sm ghost"
                      onClick={() =>
                        setForm({ ...form, faixas: form.faixas.filter((_, j) => j !== i) })
                      }
                    >
                      Remover
                    </button>
                  </div>
                ) : null}
              </div>
            ))}
            <button
              type="button"
              className="btn sm"
              onClick={() =>
                setForm({
                  ...form,
                  faixas: [...form.faixas, { quantidade: 30000, comissao_pct: 1.5 }],
                })
              }
            >
              + faixa
            </button>
          </section>

          <label style={{ marginTop: '0.75rem' }}>
            Observação interna
            <textarea
              rows={2}
              value={form.observacao}
              onChange={(e) => setForm({ ...form, observacao: e.target.value })}
            />
          </label>

          <div className="btn-row" style={{ marginTop: '1rem' }}>
            <button type="button" className="btn" onClick={calcular} disabled={pending}>
              Calcular
            </button>
            <button type="submit" className="btn primary" disabled={pending || !calculo}>
              {orcamentoId ? 'Salvar alterações' : 'Salvar orçamento'}
            </button>
          </div>

          {calculo ? (
            <div style={{ marginTop: '1rem' }}>
              <OrcamentoResultado
                calculo={calculo}
                prazoEntregaDias={form.prazo_entrega_dias}
                validadeDias={form.validade_dias}
                toleranciaQtdPct={form.tolerancia_qtd_pct}
              />
            </div>
          ) : null}
        </form>
      </div>
    </div>
  );
}

/** Hook helper: form inicial novo quando catalog muda */
export function useNovoOrcForm(catalog: ApiRow | null): OrcForm {
  return useMemo(() => defaultOrcForm(catalog), [catalog]);
}
