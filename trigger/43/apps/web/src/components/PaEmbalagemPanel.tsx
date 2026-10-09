import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type OrdemProducao, type PaEmbalagemResumo } from '../lib/api';
import { formatDecimalBr } from '../lib/format';

type Plano = {
  resumo: string;
  qtde_bobinas: number;
  qtde_caixas: number;
  etiq_por_rolo: number;
  rolos_por_caixa: number;
  tubete?: string | null;
  caixa_medida?: string | null;
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
  }, [op.id]);

  useEffect(() => {
    if (tocado) return;
    if (plano) {
      setRolos(String(plano.qtde_bobinas));
      setCaixas(String(plano.qtde_caixas));
      return;
    }
    if (emb) {
      setRolos(String(emb.qtde_bobinas));
      setCaixas(String(emb.qtde_caixas));
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
    setCaixas(String(plano.qtde_caixas));
  };

  const confirmar = async () => {
    if (!contagemValida) {
      setErr('Informe os rolos reais e as caixas. Cada caixa leva ao menos um rolo.');
      return;
    }
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await api.post(`/ordens-producao/${op.id}/embalar`, {
        qtde_bobinas: nRolos,
        qtde_caixas: nCaixas,
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
            Rolos reais depois da rebobinação e caixas em que eles foram alocados. A soma dos rolos
            fica igual às etiquetas boas. A nota usa as caixas como volumes.
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
                  <strong>Sugestão do ORC:</strong> {plano.resumo}
                </p>
                <p className="muted" style={{ marginTop: 0 }}>
                  {plano.etiq_por_rolo} etiq./rolo · {plano.rolos_por_caixa} rolos/caixa
                  {plano.tubete ? ` · tubete ${plano.tubete}` : ''}
                  {plano.caixa_medida ? ` · ${plano.caixa_medida}` : ''}
                </p>
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
              <p className="muted">Carregando sugestão de bobinas e caixas…</p>
            )}
          </>
        )}

        {canWrite ? (
          <div style={{ marginTop: '1rem' }}>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
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
                Sugestão do orçamento: {plano.qtde_bobinas}{' '}
                {plano.qtde_bobinas === 1 ? 'rolo' : 'rolos'} · {plano.qtde_caixas}{' '}
                {plano.qtde_caixas === 1 ? 'caixa' : 'caixas'}.
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
                disabled={busy || !contagemValida}
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
