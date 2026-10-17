import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type OrdemProducao, type PaEmbalagemResumo } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { InsumoSkuCombobox, type InsumoSkuOpcao } from './InsumoSkuCombobox';

type Plano = {
  resumo: string;
  qtde_bobinas: number;
  qtde_caixas: number;
  etiq_por_rolo: number;
  rolos_por_caixa: number;
  tubete?: string | null;
  caixa_medida?: string | null;
  caixa_planejada_no_orcamento?: boolean;
  encaixe?: {
    status: string;
    texto: string | null;
  } | null;
};

type Props = {
  op: OrdemProducao;
  canWrite: boolean;
  onChanged: () => void;
};

/**
 * Embalagem física do PA (rolo → caixa) — ADR_PA_EMBALAGEM_BOBINA_CAIXA.
 * Só na OP concluída; não altera estoque. A sugestão do orçamento vem preenchida.
 */
export function PaEmbalagemPanel({ op, canWrite, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [plano, setPlano] = useState<Plano | null>(null);
  const [rolos, setRolos] = useState('');
  const [caixas, setCaixas] = useState('');
  const [caixaSku, setCaixaSku] = useState<InsumoSkuOpcao | null>(null);
  const [tocado, setTocado] = useState(false);

  const emb = op.embalagem as PaEmbalagemResumo | null | undefined;

  useEffect(() => {
    if (op.status !== 'CONCLUIDA' || emb) {
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await api.get<{ data: { plano: Plano } }>(
          `/ordens-producao/${op.id}/embalagem-sugerir`,
        );
        if (!cancelled) {
          setPlano(res.data.plano);
        }
      } catch {
        /* sugestão opcional no mount */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [op.id, op.status, emb?.id]);

  useEffect(() => {
    setTocado(false);
    setRolos('');
    setCaixas('');
    setCaixaSku(null);
  }, [op.id]);

  useEffect(() => {
    if (tocado) return;
    if (plano) {
      setRolos(String(plano.qtde_bobinas));
      setCaixas(
        plano.caixa_planejada_no_orcamento && plano.qtde_caixas > 0
          ? String(plano.qtde_caixas)
          : '',
      );
      return;
    }
    if (emb) {
      setRolos(String(emb.qtde_bobinas));
      setCaixas(String(emb.qtde_caixas));
      if (emb.caixa_produto_id) {
        setCaixaSku({
          id: emb.caixa_produto_id,
          codigo: emb.caixa_produto_codigo ?? '',
          descricao: emb.caixa_produto_descricao ?? emb.caixa_medida ?? '',
          unidade: 'UN',
          saldo: '',
          grupo: 'EMB-CX',
          tarifa: emb.caixa_medida ?? null,
        });
      }
    }
  }, [plano, emb, tocado]);

  if (op.status !== 'CONCLUIDA') {
    return null;
  }

  const carregarSugestao = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      const res = await api.get<{ data: { plano: Plano } }>(
        `/ordens-producao/${op.id}/embalagem-sugerir`,
      );
      setPlano(res.data.plano);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao sugerir embalagem.');
    } finally {
      setBusy(false);
    }
  };

  const nRolos = Number.parseInt(rolos, 10);
  const nCaixas = Number.parseInt(caixas, 10);
  const contagemValida =
    Number.isInteger(nRolos) &&
    nRolos >= 1 &&
    Number.isInteger(nCaixas) &&
    nCaixas >= 1 &&
    nCaixas <= nRolos;

  const usarSugestao = () => {
    if (!plano) return;
    setTocado(false);
    setRolos(String(plano.qtde_bobinas));
    setCaixas(
      plano.caixa_planejada_no_orcamento && plano.qtde_caixas > 0
        ? String(plano.qtde_caixas)
        : '',
    );
  };

  const confirmar = async () => {
    if (!contagemValida || !caixaSku || caixaSku.id < 1) {
      setErr('Escolha a caixa do estoque e informe os rolos reais e quantas caixas saíram.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await api.post(`/ordens-producao/${op.id}/embalar`, {
        qtde_bobinas: nRolos,
        qtde_caixas: nCaixas,
        caixa_produto_id: caixaSku.id,
      });
      setPlano(null);
      setTocado(false);
      setMsg('Embalagem confirmada.');
      onChanged();
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao confirmar embalagem.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginTop: '1rem' }}>
      <div className="card-body">
        <div className="form-section">
          <h3>Embalagem PA</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Rolos reais depois da rebobinação. A caixa é escolhida aqui, antes de faturar, com a
            quantidade que saiu. A soma dos rolos fica igual às etiquetas boas. A nota usa as
            caixas como volumes e mantém o preço do pedido. Esta confirmação não baixa o estoque:
            a caixa sai quando a NF-e fica oficial, pelo custo médio.
          </p>
        </div>

        {err ? (
          <p className="form-error" role="alert">
            {err}
          </p>
        ) : null}
        {msg ? <p className="alert-success">{msg}</p> : null}

        {emb ? (
          <>
            <div className="detail-meta" style={{ marginBottom: '1rem' }}>
              <div>
                <span>Documento</span>
                <strong>{emb.codigo}</strong>
              </div>
              <div>
                <span>Etiquetas</span>
                <strong>{formatDecimalBr(Number(emb.qtde_etiquetas), 0)}</strong>
              </div>
              <div>
                <span>Rolos</span>
                <strong>{emb.qtde_bobinas}</strong>
              </div>
              <div>
                <span>Caixas</span>
                <strong>{emb.qtde_caixas}</strong>
              </div>
              {emb.tubete ? (
                <div>
                  <span>Tubete</span>
                  <strong>{emb.tubete}</strong>
                </div>
              ) : null}
              {emb.caixa_produto_codigo ? (
                <div>
                  <span>Caixa</span>
                  <strong>
                    {emb.caixa_produto_codigo}
                    {emb.caixa_medida ? ` · ${emb.caixa_medida}` : ''}
                  </strong>
                </div>
              ) : null}
            </div>
            <p className="muted" style={{ marginTop: 0 }}>
              {emb.resumo}
            </p>
            <div className="btn-row">
              <Link
                to={`/ordens-producao/${op.id}/embalagem/etiquetas`}
                className="btn btn-secondary"
              >
                Imprimir etiquetas BOB/CX
              </Link>
            </div>
          </>
        ) : (
          <>
            {plano ? (
              <div style={{ marginBottom: '1rem' }}>
                <p style={{ marginBottom: '0.35rem' }}>
                  <strong>Rolos a partir das etiquetas:</strong> {plano.qtde_bobinas}{' '}
                  {plano.qtde_bobinas === 1 ? 'rolo' : 'rolos'} · {plano.etiq_por_rolo} etiq./rolo
                  {plano.tubete ? ` · tubete ${plano.tubete}` : ''}
                </p>
                {plano.caixa_planejada_no_orcamento && plano.qtde_caixas > 0 ? (
                  <p className="muted" style={{ marginTop: 0 }}>
                    Este pedido ainda traz a estimativa antiga: {plano.qtde_caixas}{' '}
                    {plano.qtde_caixas === 1 ? 'caixa' : 'caixas'}
                    {plano.caixa_medida ? ` · ${plano.caixa_medida}` : ''}. A caixa usada é a que
                    você escolher abaixo.
                  </p>
                ) : null}
                {plano.encaixe?.texto ? (
                  <p
                    className="muted"
                    style={{
                      marginTop: 0,
                      color: plano.encaixe.status === 'nao_cabe' ? '#9b2c2c' : undefined,
                    }}
                  >
                    {plano.encaixe.texto}
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="muted">Carregando a quantidade de rolos…</p>
            )}
          </>
        )}

        {canWrite ? (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', alignItems: 'flex-end' }}>
              <div className="form-group" style={{ minWidth: 280, flex: '1 1 280px' }}>
                <InsumoSkuCombobox
                  slot="caixa"
                  label="Caixa *"
                  disabled={busy}
                  hint="Caixa do estoque (EMB-CX) com saldo."
                  value={caixaSku}
                  onChange={setCaixaSku}
                />
              </div>
              <div className="form-group">
                <label htmlFor="emb-rolos">Rolos reais</label>
                <input
                  id="emb-rolos"
                  inputMode="numeric"
                  value={rolos}
                  disabled={busy}
                  onChange={(e) => {
                    setTocado(true);
                    setRolos(e.target.value.replace(/[^\d]/g, ''));
                  }}
                />
              </div>
              <div className="form-group">
                <label htmlFor="emb-caixas">Caixas</label>
                <input
                  id="emb-caixas"
                  inputMode="numeric"
                  value={caixas}
                  disabled={busy}
                  onChange={(e) => {
                    setTocado(true);
                    setCaixas(e.target.value.replace(/[^\d]/g, ''));
                  }}
                />
              </div>
            </div>
            {plano ? (
              <p className="muted" style={{ marginTop: 0 }}>
                {plano.qtde_bobinas} {plano.qtde_bobinas === 1 ? 'rolo' : 'rolos'} a partir das
                etiquetas boas. A quantidade de caixas é a que saiu nesta ordem.
              </p>
            ) : null}
            {plano && emb ? (
              <p className="muted" style={{ marginTop: 0 }}>
                Confirmar substitui a embalagem atual, enquanto a NF não estiver autorizada.
              </p>
            ) : null}
            <div className="btn-row">
              <button
                type="button"
                className="btn btn-primary"
                disabled={busy || !contagemValida || !caixaSku || caixaSku.id < 1}
                onClick={() => void confirmar()}
              >
                {emb ? 'Substituir embalagem' : 'Confirmar embalagem'}
              </button>
              {plano ? (
                <button type="button" className="btn btn-secondary" disabled={busy} onClick={usarSugestao}>
                  Usar sugestão
                </button>
              ) : (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => void carregarSugestao()}
                >
                  Atualizar sugestão
                </button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
