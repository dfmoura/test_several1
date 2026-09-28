import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { formatoLabel } from './FacaShapeIcon';
import { OpEscolhaOverlay } from './OpEscolhaOverlay';
import type { OrdemProducao, Pedido } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { descricaoFromPedidoSpec } from '../lib/orcamentoPropostaItens';
import { formatNecessidadeOp, opKitLinhasOrdenadas } from '../lib/producaoPick';
import { specOperacional } from '../lib/producaoFicha';
import {
  hrefApontamentoProducao,
  hrefFichaEstoque,
  opComponenteLabel,
  opKitEstado,
  opKitEstadoLabel,
  opKitNome,
  opPassoAtual,
} from '../lib/producaoUi';

type Props = {
  op: OrdemProducao;
  pedido: Pedido | null;
  porta?: 'op' | 'chao';
  podeEstoque?: boolean;
  podeProducao: boolean;
  canWrite: boolean;
  /** Abre o overlay deste material (ex.: veio da OP). */
  materialInicialId?: number;
  onOp: (data: OrdemProducao) => void;
};

/**
 * Ficha da etiqueta + azulejos do kit. Clique abre o overlay daquele material.
 */
export function OpKitPainel({
  op,
  pedido,
  porta = 'op',
  podeEstoque = false,
  podeProducao,
  canWrite,
  materialInicialId,
  onOp,
}: Props) {
  const item =
    pedido?.itens.find((i) => i.id === op.pedido_item?.id) ?? pedido?.itens[0] ?? null;
  const spec = pedido && item ? specOperacional(pedido, item) : {};
  const desc = descricaoFromPedidoSpec(spec);
  const titulo =
    (op.pedido_item?.descricao ?? item?.descricao ?? '').trim() || 'Etiqueta sob medida';
  const qtde = formatDecimalBr(Number(op.qtde_planejada), 0);
  const faca = desc.formato_faca
    ? `${formatoLabel(desc.formato_faca)}${desc.faca_nova ? ' · nova' : ''}`
    : null;
  const specLinha = [desc.medida, desc.papel, faca, desc.cores]
    .filter((s): s is string => Boolean(s && String(s).trim()))
    .join(' · ');

  const linhas = opKitLinhasOrdenadas(op.materiais ?? []);
  const [abertoId, setAbertoId] = useState<number | null>(materialInicialId ?? null);
  const aberto = linhas.find((m) => m.id === abertoId) ?? null;
  const atual = opPassoAtual(op);
  const falta = linhas.some((m) => opKitEstado(m) === 'falta_pegar');
  const soSem = linhas.some((m) => opKitEstado(m) === 'sem_estoque') && !falta;

  useEffect(() => {
    if (materialInicialId) setAbertoId(materialInicialId);
  }, [materialInicialId]);

  const cta = (() => {
    if (op.status === 'CANCELADA' && op.pedido) {
      return { to: `/pedidos/${op.pedido.id}`, label: `Voltar ao pedido ${op.pedido.codigo}` };
    }
    if (op.status === 'CONCLUIDA' && op.pedido) {
      return { to: `/pedidos/${op.pedido.id}`, label: `Continuar no pedido ${op.pedido.codigo}` };
    }
    if (soSem) return { to: '/compras/reposicao', label: 'Falta no estoque — ir a Compras' };
    if (porta === 'chao') return null;
    if (porta === 'op' && falta && podeEstoque) {
      return { to: hrefFichaEstoque(op.id), label: 'Estoque busca isto' };
    }
    if (atual === 'entregar' && podeProducao) {
      return { to: hrefApontamentoProducao(op.id), label: 'Produção recebe na máquina' };
    }
    if ((atual === 'produzir' || atual === 'devolver') && podeProducao) {
      return { to: hrefApontamentoProducao(op.id), label: 'Abrir a máquina' };
    }
    return null;
  })();

  return (
    <section className="pick op-kit" aria-label="Ordem e kit">
      <header className="pick__job">
        <p className="pick__job-qtde">{qtde} etiquetas</p>
        <h2 className="pick__job-nome">{titulo}</h2>
        <p className="pick__job-meta">
          {op.parceiro?.razao_social ?? '—'}
          {specLinha ? ` · ${specLinha}` : ''}
        </p>
      </header>

      {linhas.length === 0 ? (
        <p className="op-kit__hint">Ainda sem kit nesta ordem.</p>
      ) : (
        <>
          <p className="op-kit__hint">
            {porta === 'chao'
              ? 'Toque no material, marque o que saiu da prateleira e confirme. Quem recebe é a produção.'
              : 'Toque no material para ver a cesta. Quem tira da prateleira confirma no estoque.'}
          </p>
          <div className="op-kit__tiles">
            {linhas.map((m) => {
              const estado = opKitEstado(m);
              const tipo = opComponenteLabel(m.componente);
              return (
                <button
                  key={m.id}
                  type="button"
                  className={`op-kit-tile op-kit-tile--${estado}`}
                  onClick={() => setAbertoId(m.id)}
                >
                  <span className="op-kit-tile__tipo">{tipo}</span>
                  <span className="op-kit-tile__nome">{opKitNome(m)}</span>
                  <span className="op-kit-tile__qtde">
                    <span className="op-kit-tile__qtde-kicker">Precisa</span>
                    {formatNecessidadeOp(m, op)}
                  </span>
                  <span className="op-kit-tile__st">{opKitEstadoLabel(estado)}</span>
                </button>
              );
            })}
          </div>
        </>
      )}

      {cta ? (
        <div className="op-kit__cta">
          <Link to={cta.to} className="btn btn-primary">
            {cta.label}
          </Link>
        </div>
      ) : null}

      {aberto ? (
        <OpEscolhaOverlay
          op={op}
          material={aberto}
          porta={porta}
          canWrite={canWrite}
          onClose={() => setAbertoId(null)}
          onOp={onOp}
        />
      ) : null}
    </section>
  );
}
