import type { ReactNode } from 'react';
import { ModelosComposicaoTable } from './ModelosComposicaoTable';
import { TriggerAttribution } from './TriggerAttribution';
import type { OrcamentoPropostaPublica } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formatCnpj, formatCurrency, formatDateTime, formatPhone } from '../lib/format';

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
 * Casca comercial da proposta (estudo 32 · CONSOLIDADO).
 * Mesma visão no link do cliente e na prévia interna do staff.
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

  return (
    <div className="orc-pub">
      <div className="orc-pub-shell">
        <header className="orc-pub-hero">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="orc-pub-logo" />
          <div>
            <p className="orc-pub-kicker">{kicker}</p>
            <h1>{empresaNome}</h1>
            <p className="orc-pub-sub">
              {proposta.codigo} · v{proposta.versao}
              {proposta.expira_em ? ` · válida até ${formatDateTime(proposta.expira_em)}` : ''}
            </p>
          </div>
        </header>

        {banner}

        {proposta.vencido && !somenteLeitura ? (
          <div className="orc-pub-banner orc-pub-banner--warn">
            Proposta vencida — solicite uma atualização ao vendedor. Não é possível aprovar este
            link.
          </div>
        ) : null}

        {erro ? <p className="form-error">{erro}</p> : null}

        <section className="orc-pub-card">
          <h2>Cliente</h2>
          <p className="orc-pub-lead">{proposta.cliente_nome}</p>
          <div className="orc-pub-meta">
            {proposta.empresa.cnpj ? <span>CNPJ {formatCnpj(proposta.empresa.cnpj)}</span> : null}
            {proposta.empresa.telefone ? (
              <span>{formatPhone(proposta.empresa.telefone)}</span>
            ) : null}
            {proposta.empresa.email ? <span>{proposta.empresa.email}</span> : null}
            {proposta.empresa.municipio ? (
              <span>
                {proposta.empresa.municipio}
                {proposta.empresa.uf ? `/${proposta.empresa.uf}` : ''}
              </span>
            ) : null}
          </div>
        </section>

        <section className="orc-pub-card">
          <h2>Especificação</h2>
          <dl className="orc-pub-spec">
            <div>
              <dt>Material</dt>
              <dd>{desc?.papel || '—'}</dd>
            </div>
            <div>
              <dt>Medida</dt>
              <dd>{desc?.medida || '—'}</dd>
            </div>
            <div>
              <dt>Acabamento</dt>
              <dd>{desc?.acabamento || '—'}</dd>
            </div>
            <div>
              <dt>Cores</dt>
              <dd>{desc?.cores || '—'}</dd>
            </div>
            <div>
              <dt>Modelos</dt>
              <dd>
                {desc?.modelos != null
                  ? Number(desc.modelos).toLocaleString('pt-BR')
                  : desc?.modelos_composicao?.length
                    ? String(desc.modelos_composicao.length)
                    : '—'}
              </dd>
            </div>
            <div>
              <dt>Etiq./rolo</dt>
              <dd>{desc?.etiq_por_rolo?.toLocaleString('pt-BR') ?? '—'}</dd>
            </div>
            {desc?.faca_nova ? (
              <div>
                <dt>Faca</dt>
                <dd>Nova{desc?.formato_faca ? ` · ${desc.formato_faca}` : ''}</dd>
              </div>
            ) : null}
          </dl>
          {desc?.modelos_composicao && desc.modelos_composicao.length > 0 ? (
            <ModelosComposicaoTable
              variant="pub"
              modelos={desc.modelos_composicao}
              faixas={faixas.map((fx) => ({
                key: fx.index,
                quantidade: fx.quantidade,
                highlighted: faixaIndex === fx.index,
              }))}
            />
          ) : null}
        </section>

        <section className="orc-pub-card">
          <h2>Faixas de quantidade</h2>
          <p className="orc-pub-hint">
            {somenteLeitura
              ? 'Opções de quantidade desta proposta (o cliente escolhe no link dele).'
              : 'Selecione a quantidade que deseja aprovar.'}
          </p>
          <div className="orc-pub-faixas" role="radiogroup" aria-label="Faixas">
            {faixas.map((fx) => {
              const selected = faixaIndex === fx.index;
              return (
                <label
                  key={fx.index}
                  className={`orc-pub-faixa${selected ? ' is-selected' : ''}${
                    somenteLeitura ? ' is-disabled' : ''
                  }`}
                >
                  <input
                    type="radio"
                    name="faixa"
                    checked={selected}
                    disabled={somenteLeitura || !onFaixaChange}
                    onChange={() => onFaixaChange?.(fx.index)}
                  />
                  <div>
                    <strong>{fx.quantidade.toLocaleString('pt-BR')} etiquetas</strong>
                    <span>
                      Total {formatCurrency(fx.valor_total)}
                      {fx.valor_unitario != null
                        ? ` · unit. ${formatCurrency(fx.valor_unitario)}`
                        : ''}
                      {fx.valor_rolo != null ? ` · rolo ${formatCurrency(fx.valor_rolo)}` : ''}
                    </span>
                  </div>
                </label>
              );
            })}
          </div>
          {proposta.cobra_matriz ? (
            <p className="orc-pub-note">
              Matriz {formatCurrency(proposta.valor_matriz)}
              {proposta.matriz_nota ? ` — ${proposta.matriz_nota}` : ''}
            </p>
          ) : null}
        </section>

        <section className="orc-pub-card">
          <h2>Condições</h2>
          <ul className="orc-pub-conds">
            <li>
              Prazo de entrega: <strong>{proposta.prazo_entrega_dias} dias úteis</strong>
            </li>
            <li>
              Validade da proposta: <strong>{proposta.validade_dias} dias</strong>
            </li>
            <li>
              Tolerância de quantidade: <strong>±{proposta.tolerancia_qtd_pct}%</strong>
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
          </ul>
        </section>

        {acoes}

        <footer className="orc-pub-foot">
          <TriggerAttribution variant="print" />
        </footer>
      </div>
    </div>
  );
}
