import type { ReactNode } from 'react';
import {
  OrcPubEspecificacaoBloco,
  OrcPubFaixasBloco,
  OrcPubItensAcordeao,
} from './OrcPubEspecificacao';
import { OrcPubHeroEmitente, OrcPubParteComercial } from './OrcPubParteComercial';
import { TriggerAttribution } from './TriggerAttribution';
import type { OrcamentoPropostaPublica } from '../lib/api';
import { BRAND } from '../lib/brand';
import {
  disposicoesGeraisProposta,
  textoToleranciaQuantidade,
} from '../lib/orcamentoDisposicoesComerciais';
import { formatDateTime } from '../lib/format';
import { isPropostaMultiItem } from '../lib/orcamentoPropostaItens';
import { prazoUtilLabel } from '../lib/prazoEntrega';

type Props = {
  proposta: OrcamentoPropostaPublica;
  empresaNome: string;
  /** Prévia interna ou link vencido/indisponível — sem decidir. */
  somenteLeitura: boolean;
  faixaIndex: number;
  onFaixaChange?: (index: number) => void;
  banner?: ReactNode;
  erro?: string | null;
  /** Slot da decisão do cliente (só no link público). */
  acoes?: ReactNode;
  kicker?: string;
};

/**
 * Casca comercial da proposta (estudo 32 · CONSOLIDADO · ADR_ORC_ITENS).
 * N=1 / SERVICO: layout clássico. N>1: total do documento + acordeão por item.
 * Mesma visão no link do cliente e na prévia / ficha-cliente.
 */
export function OrcamentoPropostaView({
  proposta,
  empresaNome,
  somenteLeitura,
  faixaIndex,
  onFaixaChange,
  banner,
  erro,
  acoes,
  kicker = 'Proposta comercial',
}: Props) {
  const desc = proposta.descricao;
  const faixas = proposta.faixas ?? [];
  const multi = isPropostaMultiItem(proposta);
  const documentoMeta = [
    `v${proposta.versao}`,
    proposta.expira_em ? `válida até ${formatDateTime(proposta.expira_em)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <div className="orc-pub">
      <div className="orc-pub-shell">
        <OrcPubHeroEmitente
          kicker={kicker}
          titulo={empresaNome}
          empresa={proposta.empresa}
          documentoId={proposta.codigo}
          documentoMeta={documentoMeta}
          logoSrc={BRAND.licensee.logo}
          logoAlt={BRAND.licensee.logoAlt}
        />

        {banner}

        {proposta.vencido && !somenteLeitura ? (
          <div className="orc-pub-banner orc-pub-banner--warn">
            Proposta vencida — solicite uma atualização ao vendedor. Não é possível aprovar este
            link.
          </div>
        ) : null}

        {erro ? <p className="form-error">{erro}</p> : null}

        <OrcPubParteComercial
          title="Cliente"
          parte={
            proposta.cliente ?? {
              razao_social: proposta.cliente_nome,
            }
          }
          leadFallback={proposta.cliente_nome}
        />

        {multi ? (
          <OrcPubItensAcordeao proposta={proposta} />
        ) : (
          <>
            <OrcPubEspecificacaoBloco
              tipoOperacao={proposta.tipo_operacao}
              desc={desc}
              faixas={faixas}
              faixaHighlight={faixaIndex}
              title={proposta.tipo_operacao === 'SERVICO' ? 'Serviço' : 'Especificação'}
            />
            <OrcPubFaixasBloco
              faixas={faixas}
              tipoOperacao={proposta.tipo_operacao}
              unidadeServico={desc?.unidade}
              descricao={desc}
              frete={proposta.frete}
              somenteLeitura={somenteLeitura}
              faixaIndex={faixaIndex}
              onFaixaChange={onFaixaChange}
              cobraMatriz={Boolean(proposta.cobra_matriz)}
              valorMatriz={proposta.valor_matriz ?? 0}
              matrizNota={proposta.matriz_nota}
            />
          </>
        )}

        {!somenteLeitura && multi ? (
          <p className="orc-pub-hint orc-pub-hint--approve">
            A aprovação confirma o orçamento completo ({proposta.itens!.length} posições).
          </p>
        ) : null}

        <section className="orc-pub-card">
          <h2>Condições</h2>
          <ul className="orc-pub-conds">
            <li>
              Prazo de entrega:{' '}
              <strong>
                {prazoUtilLabel(
                  proposta.prazo_efetivo_dias ?? proposta.prazo_entrega_dias,
                  proposta.data_entrega_prevista,
                )}
              </strong>
            </li>
            <li>
              Validade da proposta: <strong>{proposta.validade_dias} dias</strong>
            </li>
            <li>
              Tolerância de quantidade: <strong>±{proposta.tolerancia_qtd_pct}%</strong>
              <span className="orc-pub-cond-extra">
                {' '}
                — {textoToleranciaQuantidade()}
              </span>
            </li>
            {proposta.condicao_pagamento ? (
              <li>
                Condição de pagamento: <strong>{proposta.condicao_pagamento}</strong>
              </li>
            ) : null}
            {proposta.forma_pagamento ? (
              <li>
                Forma de pagamento: <strong>{proposta.forma_pagamento}</strong>
              </li>
            ) : null}
            {proposta.frete ? (
              <li>
                Frete desta proposta: <strong>{proposta.frete.texto}</strong>
              </li>
            ) : null}
          </ul>
          <div className="orc-pub-disposicoes">
            <h3>Disposições gerais</h3>
            <ul className="orc-pub-conds orc-pub-conds--disposicoes">
              {disposicoesGeraisProposta(proposta.empresa).map((texto) => (
                <li key={texto}>{texto}</li>
              ))}
            </ul>
          </div>
        </section>

        {acoes}

        <footer className="orc-pub-foot">
          <TriggerAttribution variant="print" />
        </footer>
      </div>
    </div>
  );
}
