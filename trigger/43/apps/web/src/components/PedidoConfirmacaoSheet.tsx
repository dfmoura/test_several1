import {
  facaDesenhoFromSnapshot,
  OrcamentoFacaDesenho,
} from './OrcamentoFacaDesenho';
import { ModelosComposicaoTable } from './ModelosComposicaoTable';
import { FacasComposicaoTable } from './FacasComposicaoTable';
import { TriggerAttribution } from './TriggerAttribution';
import type { Pedido } from '../lib/api';
import { BRAND } from '../lib/brand';
import {
  disposicoesGeraisProposta,
  textoToleranciaQuantidade,
} from '../lib/orcamentoDisposicoesComerciais';
import {
  formatCnpj,
  formatCnpjCpf,
  formatCurrency,
  formatDateTime,
  formatDecimalBr,
  formatPhone,
  formatUnitPrice,
} from '../lib/format';
import { tipoOperacaoFromSnap, tipoServicoLabel } from '../lib/operacoesSaida';
import { SaidaEtiquetaBadge } from './SaidaEtiquetaBadge';
import { isSaidaEtiqueta } from '../lib/saidaEtiqueta';
import { facasFromSnapshot } from '../lib/orcamentoForm';
import {
  condicaoPagamentoDoPedido,
  formaPagamentoDoPedido,
  formatEnderecoParceiro,
  freteTextoDoPedido,
  strSnap,
  urlArteDoPedido,
} from '../lib/pedidoConfirmacao';
import { prazoEntregaCompleto } from '../lib/prazoEntrega';
import { modelosDoSnap, snapInput, specOperacional } from '../lib/producaoFicha';
import { isSafeExternalUrl, urlArteHostLabel } from '../lib/urlArte';
import { pedStatusLabel } from '../lib/producaoUi';

/**
 * Confirmação comercial do PED — documento oficial ao cliente.
 * Gêmeo da ficha-cliente do ORC. Sem guia de chão, OP/OS, rastreio ou gordura.
 * Norma: docs/ADR_PED_CONFIRMACAO_CLIENTE.md
 */
export type PedidoConfirmacaoSheetProps = {
  pedido: Pedido;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

export function PedidoConfirmacaoSheet({
  pedido: p,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: PedidoConfirmacaoSheetProps) {
  const item = p.itens[0];
  const input = snapInput(p);
  const spec = specOperacional(p, item);
  const modelos = modelosDoSnap(spec);
  const tipoOp = tipoOperacaoFromSnap(input);
  const isServico = tipoOp === 'SERVICO' || item?.necessidade === 'SERVICO';
  const emp = p.empresa;
  const cli = p.parceiro;
  const facaDesenho = !isServico ? facaDesenhoFromSnapshot(spec) : null;
  const facasComp = !isServico ? facasFromSnapshot(spec) : [];
  const freteTexto = freteTextoDoPedido(p);
  const condicao = condicaoPagamentoDoPedido(p);
  const forma = formaPagamentoDoPedido(p);
  const urlArte = urlArteDoPedido(p);
  const arteHref = urlArte && isSafeExternalUrl(urlArte) ? urlArte : null;
  const enderecoCli = formatEnderecoParceiro(cli);
  const totalItens = p.itens.reduce((acc, it) => acc + (Number(it.valor_total) || 0), 0);

  return (
    <div className="orc-pub ped-conf">
      <div className="orc-pub-shell">
        <header className="orc-pub-hero">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="orc-pub-logo" />
          <div>
            <p className="orc-pub-kicker">Confirmação de pedido</p>
            <h1>{empresaNome}</h1>
            <p className="orc-pub-sub">
              {p.codigo}
              {p.orcamento?.codigo ? ` · origem ${p.orcamento.codigo}` : ''}
              {` · ${formatDateTime(emitidoEm.toISOString())}`}
            </p>
          </div>
        </header>

        <section className="orc-pub-card">
          <h2>Emitente</h2>
          <p className="orc-pub-lead">{emp?.razao_social ?? empresaNome}</p>
          <div className="orc-pub-meta">
            {emp?.cnpj ? <span>CNPJ {formatCnpj(emp.cnpj)}</span> : null}
            {emp?.telefone ? <span>{formatPhone(emp.telefone)}</span> : null}
            {emp?.email ? <span>{emp.email}</span> : null}
            {emp?.municipio ? (
              <span>
                {emp.municipio}
                {emp.uf ? `/${emp.uf}` : ''}
              </span>
            ) : null}
          </div>
        </section>

        <section className="orc-pub-card">
          <h2>Cliente</h2>
          <p className="orc-pub-lead">{cli?.razao_social ?? '—'}</p>
          <div className="orc-pub-meta">
            {cli?.codigo ? <span>{cli.codigo}</span> : null}
            {cli?.cnpj_cpf ? <span>CNPJ/CPF {formatCnpjCpf(cli.cnpj_cpf)}</span> : null}
            {cli?.telefone || cli?.whatsapp ? (
              <span>{formatPhone(cli.telefone || cli.whatsapp)}</span>
            ) : null}
            {cli?.email ? <span>{cli.email}</span> : null}
            {enderecoCli ? <span>{enderecoCli}</span> : null}
          </div>
        </section>

        <section className="orc-pub-card">
          <h2>{isServico ? 'Serviço' : 'Especificação'}</h2>
          {isServico ? (
            <dl className="orc-pub-spec">
              <div>
                <dt>Descrição</dt>
                <dd>{item?.descricao || strSnap(spec, 'descricao_servico') || 'Prestação de serviço'}</dd>
              </div>
              <div>
                <dt>Tipo</dt>
                <dd>{tipoServicoLabel(strSnap(spec, 'tipo_servico')) || 'Serviço'}</dd>
              </div>
              {item?.unidade ? (
                <div>
                  <dt>Unidade</dt>
                  <dd>{item.unidade}</dd>
                </div>
              ) : null}
            </dl>
          ) : (
            <>
              <dl className="orc-pub-spec">
                <div>
                  <dt>Material</dt>
                  <dd>{strSnap(spec, 'papel') || '—'}</dd>
                </div>
                <div>
                  <dt>Medida</dt>
                  <dd>{strSnap(spec, 'medida') || '—'}</dd>
                </div>
                <div>
                  <dt>Acabamento</dt>
                  <dd>{strSnap(spec, 'acabamento') || '—'}</dd>
                </div>
                <div>
                  <dt>Cores</dt>
                  <dd>{strSnap(spec, 'cores') || '—'}</dd>
                </div>
                <div>
                  <dt>Modelos</dt>
                  <dd>
                    {modelos.length > 0
                      ? String(modelos.length)
                      : strSnap(spec, 'modelos') || '—'}
                  </dd>
                </div>
                <div>
                  <dt>Etiq./rolo</dt>
                  <dd>
                    {spec.etiq_por_rolo != null
                      ? Number(spec.etiq_por_rolo).toLocaleString('pt-BR')
                      : '—'}
                  </dd>
                </div>
                {isSaidaEtiqueta(strSnap(spec, 'saida_etiqueta')) ? (
                  <div className="orc-pub-saida-etiqueta">
                    <dt>Saída da etiqueta</dt>
                    <dd>
                      <SaidaEtiquetaBadge
                        code={strSnap(spec, 'saida_etiqueta')}
                        variant="thumb"
                      />
                    </dd>
                  </div>
                ) : null}
              </dl>
              {facaDesenho ? (
                <div className="orc-spec-faca orc-pub-faca">
                  <OrcamentoFacaDesenho {...facaDesenho} variant="documento" audience="cliente" />
                </div>
              ) : null}
              {facasComp.length > 0 ? (
                <FacasComposicaoTable variant="pub" showValor facas={facasComp} />
              ) : null}
              {modelos.length > 0 ? (
                <ModelosComposicaoTable
                  variant="pub"
                  showValorArte
                  modelos={modelos}
                  faixas={[
                    {
                      key: p.faixa_index,
                      quantidade: Number(item?.qtde_pedida) || 0,
                      highlighted: true,
                    },
                  ]}
                />
              ) : null}
            </>
          )}
        </section>

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

        {arteHref ? (
          <section className="orc-pub-card orc-url-arte">
            <h2>Arte de referência</h2>
            <p className="orc-pub-hint">
              Prova de arte vinculada a este pedido (PDF, imagem ou arquivo compartilhado).
            </p>
            <a className="orc-url-arte-cta" href={arteHref} target="_blank" rel="noopener noreferrer">
              Abrir arte
            </a>
            <p className="orc-url-arte-meta">{urlArteHostLabel(arteHref)}</p>
            <p className="orc-url-arte-url print-only">{arteHref}</p>
          </section>
        ) : null}

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
