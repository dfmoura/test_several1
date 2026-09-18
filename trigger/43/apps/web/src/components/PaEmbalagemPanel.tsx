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
};

type Props = {
  op: OrdemProducao;
  canWrite: boolean;
  onChanged: () => void;
};

/**
 * Embalagem física do PA (bobina → caixa) — ADR_PA_EMBALAGEM_BOBINA_CAIXA.
 * Só na OP concluída; não altera estoque.
 */
export function PaEmbalagemPanel({ op, canWrite, onChanged }: Props) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [plano, setPlano] = useState<Plano | null>(null);

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

  const confirmar = async () => {
    setBusy(true);
    setErr(null);
    setMsg(null);
    try {
      await api.post(`/ordens-producao/${op.id}/embalar`, {});
      setPlano(null);
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
            Etiquetas → bobinas (tubete) → caixas. Quantidade comercial permanece em etiquetas;
            faturamento e NF usam as caixas como volumes de transporte.
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
                <span>Bobinas</span>
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
                className="btn btn-primary"
              >
                Imprimir etiquetas BOB/CX
              </Link>
              {canWrite ? (
                <button
                  type="button"
                  className="btn btn-secondary"
                  disabled={busy}
                  onClick={() => void carregarSugestao()}
                >
                  Ver nova sugestão
                </button>
              ) : null}
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
              </div>
            ) : (
              <p className="muted">Carregando sugestão de bobinas e caixas…</p>
            )}
          </>
        )}

        {plano && emb ? (
          <p className="muted" style={{ marginTop: '1rem' }}>
            Nova sugestão: <strong>{plano.resumo}</strong> — confirmar substitui a embalagem
            atual (somente se a NF ainda não estiver autorizada).
          </p>
        ) : null}

        {canWrite ? (
          <div className="btn-row" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || (!emb && !plano)}
              onClick={() => void confirmar()}
            >
              {emb ? 'Substituir pela sugestão' : 'Confirmar embalagem'}
            </button>
            {!plano ? (
              <button
                type="button"
                className="btn btn-secondary"
                disabled={busy}
                onClick={() => void carregarSugestao()}
              >
                Atualizar sugestão
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
