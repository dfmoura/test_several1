import { Link } from 'react-router-dom';
import { formatoLabel } from './FacaShapeIcon';
import type { OrdemProducao, Pedido } from '../lib/api';
import { formatDecimalBr } from '../lib/format';
import { descricaoFromPedidoSpec } from '../lib/orcamentoPropostaItens';
import {
  formatNecessidadeOp,
  modoRetirada,
  modoRetiradaLabel,
  opKitLinhasOrdenadas,
  proximaLinhaPick,
} from '../lib/producaoPick';
import { specOperacional } from '../lib/producaoFicha';
import {
  hrefApontamentoProducao,
  hrefFichaEstoque,
  opKitEstado,
  opKitEstadoLabel,
  opKitNome,
  opKitOnde,
  opPassoAtual,
} from '../lib/producaoUi';

type Props = {
  op: OrdemProducao;
  pedido: Pedido | null;
  podeEstoque: boolean;
  podeProducao: boolean;
  /** chao = já está no estoque; não repetir o botão de ir buscar. */
  porta?: 'op' | 'chao';
};

/**
 * Pick ticket de fábrica (WMS / IFS / Oracle):
 * local grande → quantidade → o que é. Um próximo. O resto é a caminhada.
 */
export function OpPickTicket({
  op,
  pedido,
  podeEstoque,
  podeProducao,
  porta = 'op',
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
  const proxima = proximaLinhaPick(op);
  const resto = linhas.filter((m) => m.id !== proxima?.id);
  const atual = opPassoAtual(op);
  const soSemEstoque = linhas.some((m) => opKitEstado(m) === 'sem_estoque') && !proxima;

  const cta = (() => {
    if (porta === 'chao') return null;
    if (op.status === 'CANCELADA' && op.pedido) {
      return { to: `/pedidos/${op.pedido.id}`, label: `Voltar ao pedido ${op.pedido.codigo}` };
    }
    if (op.status === 'CONCLUIDA' && op.pedido) {
      return { to: `/pedidos/${op.pedido.id}`, label: `Continuar no pedido ${op.pedido.codigo}` };
    }
    if (atual === 'pegar' && podeEstoque) {
      return { to: hrefFichaEstoque(op.id), label: 'Pegar agora no estoque' };
    }
    if (atual === 'entregar' && podeProducao) {
      return { to: hrefApontamentoProducao(op.id), label: 'Abrir a ordem' };
    }
    if ((atual === 'produzir' || atual === 'devolver') && podeProducao) {
      return { to: hrefApontamentoProducao(op.id), label: 'Abrir a ordem' };
    }
    return null;
  })();

  return (
    <section className="pick" aria-label="Lista para pegar no estoque">
      <header className="pick__job">
        <p className="pick__job-qtde">{qtde} etiquetas</p>
        <h2 className="pick__job-nome">{titulo}</h2>
        <p className="pick__job-meta">
          {op.parceiro?.razao_social ?? '—'}
          {specLinha ? ` · ${specLinha}` : ''}
        </p>
      </header>

      {proxima ? (
        <div className="pick__next">
          <p className="pick__next-kicker">1º — vá neste local</p>
          <p className="pick__bin">{opKitOnde(proxima) === '—' ? 'Sem local' : opKitOnde(proxima)}</p>
          <p className="pick__qty">A ordem pede: {formatNecessidadeOp(proxima, op)}</p>
          <p className="pick__modo">{modoRetiradaLabel(modoRetirada(proxima))}</p>
          <p className="pick__item">{opKitNome(proxima)}</p>
          {cta ? (
            <Link to={cta.to} className="btn btn-primary pick__cta">
              {cta.label}
            </Link>
          ) : porta === 'chao' ? (
            <p className="pick__hint">
              {modoRetirada(proxima) === 'volume'
                ? 'Embaixo: marque os volumes que vai levar.'
                : 'Embaixo: informe as unidades que vai levar.'}
            </p>
          ) : null}
        </div>
      ) : linhas.length === 0 ? (
        <div className="pick__next">
          <p className="pick__item">Ainda sem lista nesta ordem.</p>
        </div>
      ) : soSemEstoque ? (
        <div className="pick__next pick__next--alerta">
          <p className="pick__next-kicker">Sem saldo</p>
          <p className="pick__item">
            Este código não tem saldo. Abra o material e escolha no estoque — os parecidos vêm
            primeiro.
          </p>
          {cta ? (
            <Link to={cta.to} className="btn btn-primary pick__cta">
              {cta.label}
            </Link>
          ) : null}
        </div>
      ) : (
        <div className="pick__next pick__next--ok">
          <p className="pick__next-kicker">Lista completa</p>
          <p className="pick__item">Tudo desta lista já saiu do estoque.</p>
          {cta ? (
            <Link to={cta.to} className="btn btn-primary pick__cta">
              {cta.label}
            </Link>
          ) : null}
        </div>
      )}

      {porta !== 'chao' && resto.length > 0 ? (
        <ol className="pick__walk">
          {resto.map((m, i) => {
            const estado = opKitEstado(m);
            const onde = opKitOnde(m);
            return (
              <li key={m.id} className={`pick__walk-item pick__walk-item--${estado}`}>
                <span className="pick__walk-n">{proxima ? i + 2 : i + 1}</span>
                <span className="pick__walk-bin">{onde === '—' ? 'Sem local' : onde}</span>
                <span className="pick__walk-qty">A ordem pede: {formatNecessidadeOp(m, op)}</span>
                <span className="pick__walk-nome">{opKitNome(m)}</span>
                <span className="pick__walk-st">{opKitEstadoLabel(estado)}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
    </section>
  );
}
