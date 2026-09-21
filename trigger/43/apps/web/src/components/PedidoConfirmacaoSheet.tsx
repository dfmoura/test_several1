import { OrcPubEspecificacaoBloco } from './OrcPubEspecificacao';
import { OrcPubHeroEmitente, OrcPubParteComercial } from './OrcPubParteComercial';
import { TriggerAttribution } from './TriggerAttribution';
import type { Pedido, PedidoItem } from '../lib/api';
import { BRAND } from '../lib/brand';
import {
  disposicoesGeraisProposta,
  textoToleranciaQuantidade,
} from '../lib/orcamentoDisposicoesComerciais';
import {
  formatCurrency,
  formatDateTime,
  formatDecimalBr,
  formatUnitPrice,
} from '../lib/format';
import {
  descricaoFromPedidoSpec,
  rotuloPropostaItem,
} from '../lib/orcamentoPropostaItens';
import { tipoOperacaoFromSnap } from '../lib/operacoesSaida';
import {
  condicaoPagamentoDoPedido,
  formaPagamentoDoPedido,
  freteTextoDoPedido,
} from '../lib/pedidoConfirmacao';
import { prazoEntregaCompleto } from '../lib/prazoEntrega';
import { snapInput, specOperacional } from '../lib/producaoFicha';
import { pedStatusLabel } from '../lib/producaoUi';

/**
 * Confirmação comercial do PED — documento oficial ao cliente.
 * Gêmeo da ficha-cliente do ORC. Sem guia de chão, OP/OS, rastreio ou gordura.
 * Norma: docs/ADR_PED_CONFIRMACAO_CLIENTE.md · ADR_ORC_ITENS (N itens).
 */
export type PedidoConfirmacaoSheetProps = {
  pedido: Pedido;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

function PedItemSpecDetalhe({
  item,
  tipoOp,
}: {
  item: PedidoItem;
  tipoOp: string | null;
}) {
  const isServico = tipoOp === 'SERVICO' || item.necessidade === 'SERVICO';
  const spec = (item.especificacao ?? {}) as Record<string, unknown>;
  const desc = descricaoFromPedidoSpec(spec);
  const total = item.valor_total != null ? Number(item.valor_total) : 0;
  const resumo = [desc.medida, desc.papel].filter(Boolean).join(' · ');

  return (
    <article className="orc-pub-item-detalhe">
      <header className="orc-pub-item-detalhe-summary">
        <span className="orc-pub-item-detalhe-lead">
          <strong>{rotuloPropostaItem(item.ordem, item.descricao)}</strong>
          {resumo ? <span className="orc-pub-item-detalhe-resumo">{resumo}</span> : null}
        </span>
        <span className="orc-pub-item-detalhe-total">
          {formatDecimalBr(Number(item.qtde_pedida), 0)} {item.unidade}
          {total > 0 ? ` · ${formatCurrency(total)}` : ''}
        </span>
      </header>
      <div className="orc-pub-item-detalhe-body">
        <OrcPubEspecificacaoBloco
          tipoOperacao={isServico ? 'SERVICO' : tipoOp}
          desc={
            isServico
              ? {
                  ...desc,
                  descricao_servico: item.descricao || desc.descricao_servico,
                  unidade: item.unidade || desc.unidade,
                }
              : desc
          }
          faixas={[]}
          title={null}
        />
      </div>
    </article>
  );
}

export function PedidoConfirmacaoSheet({
  pedido: p,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: PedidoConfirmacaoSheetProps) {
  const item0 = p.itens[0];
  const input = snapInput(p);
  const tipoOp = tipoOperacaoFromSnap(input);
  const isServico = tipoOp === 'SERVICO' || item0?.necessidade === 'SERVICO';
  const multi = !isServico && p.itens.length > 1;
  const emp = p.empresa;
  const cli = p.parceiro;
  const freteTexto = freteTextoDoPedido(p);
  const condicao = condicaoPagamentoDoPedido(p);
  const forma = formaPagamentoDoPedido(p);
  const totalItens = p.itens.reduce((acc, it) => acc + (Number(it.valor_total) || 0), 0);
  const documentoSub = [
    p.codigo,
    p.orcamento?.codigo ? `origem ${p.orcamento.codigo}` : null,
    formatDateTime(emitidoEm.toISOString()),
  ]
    .filter(Boolean)
    .join(' · ');

  const spec0 = specOperacional(p, item0);
  const desc0 = descricaoFromPedidoSpec(spec0);

  return (
    <div className="orc-pub ped-conf">
      <div className="orc-pub-shell">
        <OrcPubHeroEmitente
          kicker="Confirmação de pedido"
          titulo={empresaNome}
          empresa={emp}
          documentoSub={documentoSub}
          logoSrc={BRAND.licensee.logo}
          logoAlt={BRAND.licensee.logoAlt}
        />

        <OrcPubParteComercial
          title="Cliente"
          parte={cli}
          leadFallback="—"
          showCodigo
        />

        {multi ? (
          <section className="orc-pub-card orc-pub-itens-doc">
            <header className="orc-pub-itens-doc-head">
              <div>
                <h2>Itens · {p.itens.length}</h2>
                <p className="orc-pub-hint orc-pub-hint--tight">Especificação por posição</p>
              </div>
              <p className="orc-pub-itens-doc-total">{formatCurrency(totalItens)}</p>
            </header>
            <div className="orc-pub-itens-acordeao">
              {p.itens.map((it) => (
                <PedItemSpecDetalhe
                  key={it.id}
                  item={it}
                  tipoOp={tipoOp}
                />
              ))}
            </div>
          </section>
        ) : (
          <OrcPubEspecificacaoBloco
            tipoOperacao={isServico ? 'SERVICO' : tipoOp}
            desc={
              isServico
                ? {
                    ...desc0,
                    descricao_servico:
                      item0?.descricao || desc0.descricao_servico || 'Prestação de serviço',
                    unidade: item0?.unidade || desc0.unidade,
                  }
                : desc0
            }
            faixas={[]}
            title={isServico ? 'Serviço' : 'Especificação'}
          />
        )}

        <section className="orc-pub-card">
          <h2>Pedido confirmado</h2>
          <p className="orc-pub-hint">
            Quantidade e preços travados a partir do orçamento aprovado
            {p.orcamento?.codigo ? ` (${p.orcamento.codigo})` : ''}. Status operacional:{' '}
            <strong>{pedStatusLabel(p.status)}</strong>.
          </p>
          {p.itens.length === 0 ? (
            <p className="orc-pub-note">Nenhum item neste pedido.</p>
          ) : (
            <table className="ped-conf-itens">
              <thead>
                <tr>
                  <th>Descrição</th>
                  <th className="ped-conf-num">Qtde</th>
                  <th>Un.</th>
                  <th className="ped-conf-num">Unitário</th>
                  <th className="ped-conf-num">Total</th>
                </tr>
              </thead>
              <tbody>
                {p.itens.map((it) => (
                  <tr key={it.id}>
                    <td>{it.descricao}</td>
                    <td className="ped-conf-num">{formatDecimalBr(Number(it.qtde_pedida), 0)}</td>
                    <td>{it.unidade}</td>
                    <td className="ped-conf-num">
                      {it.preco_unitario != null ? formatUnitPrice(it.preco_unitario) : '—'}
                    </td>
                    <td className="ped-conf-num">
                      {it.valor_total != null ? formatCurrency(it.valor_total) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td colSpan={4}>Total do pedido</td>
                  <td className="ped-conf-num">
                    <strong>{formatCurrency(totalItens)}</strong>
                  </td>
                </tr>
              </tfoot>
            </table>
          )}
          {p.vendedor ? (
            <p className="orc-pub-note">
              Vendedor: {p.vendedor.codigo} — {p.vendedor.razao_social}
            </p>
          ) : null}
        </section>

        <section className="orc-pub-card">
          <h2>Condições</h2>
          <ul className="orc-pub-conds">
            <li>
              Prazo de entrega:{' '}
              <strong>
                {p.prazo_entrega_dias != null ? prazoEntregaCompleto(p) : '—'}
              </strong>
            </li>
            <li>
              Tolerância de quantidade: <strong>±{p.tolerancia_qtd_pct}%</strong>
              <span className="orc-pub-cond-extra"> — {textoToleranciaQuantidade()}</span>
            </li>
            {condicao ? (
              <li>
                Condição de pagamento: <strong>{condicao}</strong>
              </li>
            ) : null}
            {forma ? (
              <li>
                Forma de pagamento: <strong>{forma}</strong>
              </li>
            ) : null}
            {freteTexto ? (
              <li>
                Frete deste pedido: <strong>{freteTexto}</strong>
              </li>
            ) : null}
          </ul>
          <div className="orc-pub-disposicoes">
            <h3>Disposições gerais</h3>
            <ul className="orc-pub-conds orc-pub-conds--disposicoes">
              {disposicoesGeraisProposta(emp ?? { municipio: null, uf: null }).map((texto) => (
                <li key={texto}>{texto}</li>
              ))}
            </ul>
          </div>
        </section>

        {p.observacao ? (
          <section className="orc-pub-card">
            <h2>Observações</h2>
            <p className="orc-pub-note">{p.observacao}</p>
          </section>
        ) : null}

        <div className="ficha-oc-assinaturas ped-conf-assinaturas">
          <div className="ficha-oc-assinatura">
            <span className="ficha-oc-assinatura-linha" aria-hidden />
            <strong>Emitente</strong>
            <span>Nome / data</span>
          </div>
          <div className="ficha-oc-assinatura">
            <span className="ficha-oc-assinatura-linha" aria-hidden />
            <strong>Cliente — ciência / aceite</strong>
            <span>Nome / data</span>
          </div>
        </div>

        <footer className="orc-pub-foot ped-conf-foot">
          <span className="ped-conf-emitido">
            Confirmação {p.codigo} · emitida por {emitidoPor} ·{' '}
            {formatDateTime(emitidoEm.toISOString())}
          </span>
          <TriggerAttribution variant="print" />
        </footer>
      </div>
    </div>
  );
}
