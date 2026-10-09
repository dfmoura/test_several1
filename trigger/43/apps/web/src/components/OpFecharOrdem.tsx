import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type OrdemProducao } from '../lib/api';
import { parseQtdeDigitada } from '../lib/producaoUi';

type Props = {
  op: OrdemProducao;
  canWrite: boolean;
  onOp: (op: OrdemProducao) => void;
};

/**
 * Fecho da ordem na própria ficha.
 * O que ainda está fora da prateleira entra como usado (retorno e perda zerados).
 * Sobra volta em Estoque → A buscar, antes deste passo.
 */
export function OpFecharOrdem({ op, canWrite, onOp }: Props) {
  const aberta = ['ABERTA', 'EM_ANDAMENTO'].includes(op.status);
  const materiaisFora = (op.materiais ?? []).filter((m) => !m.pendente);
  const [qtdeBoa, setQtdeBoa] = useState(op.qtde_boa ?? op.qtde_planejada ?? '');
  const [qtdeRefugo, setQtdeRefugo] = useState(op.qtde_refugo || '0');
  const [aceitarFora, setAceitarFora] = useState(false);
  const [motivoFora, setMotivoFora] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setQtdeBoa(op.qtde_boa ?? op.qtde_planejada ?? '');
    setQtdeRefugo(op.qtde_refugo || '0');
  }, [op.id, op.qtde_planejada, op.qtde_boa, op.qtde_refugo]);

  if (!aberta || materiaisFora.length === 0) {
    return null;
  }

  const tol = op.pedido?.tolerancia_qtd_pct ?? '20';
  const qtdeBoaValida = parseQtdeDigitada(qtdeBoa) > 0;

  const concluir = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await api.post<{ data: OrdemProducao }>(`/ordens-producao/${op.id}/concluir`, {
        qtde_boa: String(parseQtdeDigitada(qtdeBoa)),
        qtde_refugo: String(parseQtdeDigitada(qtdeRefugo || '0')),
        aceitar_fora_tolerancia: aceitarFora,
        motivo_fora_tolerancia: motivoFora.trim() || null,
        materiais: materiaisFora.map((m) => ({
          material_id: Number(m.id),
          produto_id: m.produto?.id ? Number(m.produto.id) : undefined,
          qtde_retorno: '0',
          qtde_perda: '0',
        })),
      });
      onOp(res.data);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'Falha ao fechar a ordem.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="card" style={{ marginBottom: '1rem' }}>
      <div className="card-body">
        <div className="form-section">
          <h3>Fechar a ordem</h3>
          <p className="muted" style={{ marginTop: 0 }}>
            Total real depois da rebobinação. O que ainda está fora da prateleira entra como usado.
            Sobra volta em Estoque, antes de fechar.
          </p>
        </div>

        {err ? (
          <div className="alert alert-error" role="alert">
            {err}
          </div>
        ) : null}

        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          <div className="form-group">
            <label htmlFor="op-qtde-boa">Etiquetas boas</label>
            <input
              id="op-qtde-boa"
              value={qtdeBoa}
              onChange={(e) => setQtdeBoa(e.target.value)}
              disabled={!canWrite || busy}
              inputMode="decimal"
            />
          </div>
          <div className="form-group">
            <label htmlFor="op-qtde-refugo">Refugo</label>
            <input
              id="op-qtde-refugo"
              value={qtdeRefugo}
              onChange={(e) => setQtdeRefugo(e.target.value)}
              disabled={!canWrite || busy}
              inputMode="decimal"
            />
          </div>
        </div>

        <label style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginTop: '0.75rem' }}>
          <input
            type="checkbox"
            checked={aceitarFora}
            onChange={(e) => setAceitarFora(e.target.checked)}
            disabled={!canWrite || busy}
          />
          Aceitar fora da tolerância ±{tol}%
        </label>
        {aceitarFora ? (
          <div className="form-group" style={{ marginTop: '0.5rem', maxWidth: 420 }}>
            <label htmlFor="op-motivo-tol">Motivo</label>
            <input
              id="op-motivo-tol"
              value={motivoFora}
              onChange={(e) => setMotivoFora(e.target.value)}
              disabled={!canWrite || busy}
            />
          </div>
        ) : null}

        {canWrite ? (
          <div className="btn-row" style={{ marginTop: '1rem' }}>
            <button
              type="button"
              className="btn btn-primary"
              disabled={busy || !qtdeBoaValida}
              onClick={() => void concluir()}
            >
              Fechar a ordem
            </button>
            {op.pedido ? (
              <Link to={`/pedidos/${op.pedido.id}`} className="btn btn-secondary">
                {op.pedido.codigo}
              </Link>
            ) : null}
          </div>
        ) : (
          <p className="muted" style={{ margin: '1rem 0 0' }}>
            Quem fecha a ordem precisa de permissão para gravar a produção.
          </p>
        )}
      </div>
    </div>
  );
}
