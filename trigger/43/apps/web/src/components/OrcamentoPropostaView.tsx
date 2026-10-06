import type { ReactNode } from 'react';
import {
  OrcPubEspecificacaoBloco,
  OrcPubFaixasBloco,
  OrcPubItensAcordeao,
} from './OrcPubEspecificacao';
import { OrcPubHeroEmitente, OrcPubParteComercial } from './OrcPubParteComercial';
import { TriggerAttribution } from './TriggerAttribution';
import type { OrcamentoPropostaPublica } from '../lib/api';
import type { AcaoModeloCliente } from '../lib/modeloDecisao';
import { BRAND } from '../lib/brand';
import {
  disposicoesGeraisProposta,
  textoToleranciaQuantidade,
} from '../lib/orcamentoDisposicoesComerciais';
import { formatDateTime } from '../lib/format';
import { isPropostaMultiItem, propostaSomenteRevenda } from '../lib/orcamentoPropostaItens';
import { prazoUtilLabel } from '../lib/prazoEntrega';

type Props = {
  proposta: OrcamentoPropostaPublica;
  empresaNome: string;
  /** Prévia interna ou link vencido/indisponível — sem decidir. */
  somenteLeitura: boolean;
  faixaIndex: number;
  onFaixaChange?: (index: number) => void;
  /** N>1 no link: índice escolhido por `ordem` do item. */
  faixasItens?: Record<number, number>;
  onFaixaItemChange?: (ordem: number, index: number) => void;
  banner?: ReactNode;
  erro?: string | null;
  /** Slot da decisão do cliente (só no link público). */
  acoes?: ReactNode;
  kicker?: string;
  /** Só no link ativo: aprovar ou reprovar cada modelo no modal da arte. */
  onDecidirModelo?: (itemOrdem: number, modeloOrdem: number, acao: AcaoModeloCliente) => Promise<void>;
  modeloDecidindo?: { itemOrdem: number; modeloOrdem: number } | null;
};

const STATUS_MODELO_VISIVEL = new Set(['ENVIADO', 'VISUALIZADO', 'APROVADO', 'REPROVADO']);

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
  faixasItens,
  onFaixaItemChange,
  banner,
  erro,
  acoes,
  kicker = 'Proposta comercial',
  onDecidirModelo,
  modeloDecidindo = null,
}: Props) {
  const decisaoModo = onDecidirModelo
    ? 'decidir'
    : STATUS_MODELO_VISIVEL.has(proposta.status)
      ? 'selo'
      : 'auto';
  const desc = proposta.descricao;
  const faixas = proposta.faixas ?? [];
  const multi = isPropostaMultiItem(proposta);
  const somenteRevenda = propostaSomenteRevenda(proposta);
  const documentoMeta = [
    `v${proposta.versao}`,
    proposta.expira_em ? `válida até ${formatDateTime(proposta.expira_em)}` : null,
  ]
    .filter(Boolean)
    .join(' · ');
  const contatoNome = (proposta.destinatario?.nome ?? '').trim();
  const aosCuidados = contatoNome
    ? { nome: contatoNome, funcao: proposta.destinatario?.funcao }
    : null;

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
          aosCuidados={aosCuidados}
        />

        {multi ? (
          <OrcPubItensAcordeao
            proposta={proposta}
            faixaHighlight={faixaIndex}
            faixasItens={faixasItens}
            onFaixaItemChange={onFaixaItemChange}
            somenteLeitura={somenteLeitura}
            decisaoModo={decisaoModo}
            onDecidirModelo={onDecidirModelo}
            modeloDecidindo={modeloDecidindo}
          />
        ) : (
          <OrcPubEspecificacaoBloco
            tipoOperacao={proposta.tipo_operacao}
            desc={desc}
            faixas={faixas}
            faixaHighlight={faixaIndex}
            decisaoModo={decisaoModo}
            onDecidirModelo={
              onDecidirModelo
                ? (modeloOrdem, acao) => onDecidirModelo(1, modeloOrdem, acao)
                : undefined
            }
            modeloDecidindoOrdem={
              modeloDecidindo?.itemOrdem === 1 ? modeloDecidindo.modeloOrdem : null
            }
            title={
              proposta.tipo_operacao === 'SERVICO'
                ? 'Serviço'
                : desc?.necessidade === 'REVENDA'
                  ? 'Produto'
                  : 'Especificação'
            }
          />
        )}

        {!multi ? (
          <OrcPubFaixasBloco
            faixas={faixas}
            tipoOperacao={proposta.tipo_operacao}
            unidadeServico={desc?.unidade}
            descricao={desc}
            frete={proposta.frete}
            somenteLeitura={somenteLeitura}
            faixaIndex={faixaIndex}
            onFaixaChange={onFaixaChange}
            cobraMatriz={Boolean(proposta.cobra_matriz) && !somenteRevenda}
            valorMatriz={proposta.valor_matriz ?? 0}
            matrizNota={proposta.matriz_nota}
          />
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
            {somenteRevenda ? null : (
              <li>
                Tolerância de quantidade: <strong>±{proposta.tolerancia_qtd_pct}%</strong>
                <span className="orc-pub-cond-extra">
                  {' '}
                  — {textoToleranciaQuantidade()}
                </span>
              </li>
            )}
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
