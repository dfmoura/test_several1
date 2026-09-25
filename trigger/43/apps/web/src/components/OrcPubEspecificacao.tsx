import type { ReactNode } from 'react';
import { ModelosComposicaoTable } from './ModelosComposicaoTable';
import { SaidaEtiquetaBadge } from './SaidaEtiquetaBadge';
import { formatCurrency, formatDecimalBr } from '../lib/format';
import {
  isPropostaMultiItem,
  rotuloPropostaItem,
  totalPrimeiraFaixaItem,
  type OrcPropostaDescricao,
  type OrcPropostaFaixa,
  type OrcPropostaItem,
} from '../lib/orcamentoPropostaItens';
import { formatValorFrete, modoComFrete } from '../lib/orcamentoFrete';
import { tipoServicoLabel } from '../lib/operacoesSaida';
import { isSaidaEtiqueta, saidaEtiquetaLabel } from '../lib/saidaEtiqueta';
import type { OrcamentoPropostaPublica } from '../lib/api';

type SpecProps = {
  tipoOperacao?: string | null;
  desc?: OrcPropostaDescricao | null;
  faixas?: OrcPropostaFaixa[] | null;
  faixaHighlight?: number;
  title?: string | null;
  className?: string;
};

type SpecCell = {
  key: string;
  label: string;
  value: ReactNode;
  /** wide = Material/Acab.; narrow = Tubete/Cores/Modelos. */
  size?: 'wide' | 'narrow';
};

function SpecDense({ cells }: { cells: SpecCell[] }) {
  const visible = cells.filter((c) => c.value != null && c.value !== '');
  if (visible.length === 0) return null;
  return (
    <ul className="orc-pub-spec-dense" role="list">
      {visible.map((c) => (
        <li
          key={c.key}
          className={
            c.size === 'wide'
              ? 'orc-pub-spec-dense--wide'
              : c.size === 'narrow'
                ? 'orc-pub-spec-dense--narrow'
                : undefined
          }
        >
          <span className="orc-pub-spec-dense-k">{c.label}</span>
          <span className="orc-pub-spec-dense-v">{c.value}</span>
        </li>
      ))}
    </ul>
  );
}

/** Eco do item no overlay da arte — vocabulário comercial (Material / Saída). */
function arteOverlayCaption(desc?: OrcPropostaDescricao | null): string | undefined {
  const material = (desc?.papel ?? '').trim();
  const saida = saidaEtiquetaLabel(desc?.saida_etiqueta);
  const parts: string[] = [];
  if (material) parts.push(`Material · ${material}`);
  if (saida) parts.push(saida);
  return parts.length > 0 ? parts.join('  ·  ') : undefined;
}

function SpecPaDense({ desc }: { desc?: OrcPropostaDescricao | null }) {
  const modelos =
    desc?.modelos != null
      ? Number(desc.modelos).toLocaleString('pt-BR')
      : desc?.modelos_composicao?.length
        ? String(desc.modelos_composicao.length)
        : null;

  const cells: SpecCell[] = [
    { key: 'papel', label: 'Material', value: desc?.papel || '—', size: 'wide' },
    { key: 'medida', label: 'Medida', value: desc?.medida || '—' },
    { key: 'acab', label: 'Acab.', value: desc?.acabamento || '—', size: 'wide' },
    { key: 'tubete', label: 'Tubete', value: desc?.tubete || '—', size: 'narrow' },
    { key: 'cores', label: 'Cores', value: desc?.cores || '—', size: 'narrow' },
    { key: 'modelos', label: 'Modelos', value: modelos || '—', size: 'narrow' },
    {
      key: 'etiq',
      label: 'Etiq/rolo',
      value: desc?.etiq_por_rolo != null ? desc.etiq_por_rolo.toLocaleString('pt-BR') : '—',
    },
    {
      key: 'puxada',
      label: 'Puxada',
      value:
        desc?.puxada_cm != null && Number.isFinite(Number(desc.puxada_cm))
          ? `${formatDecimalBr(Number(desc.puxada_cm), 2)} cm`
          : '—',
    },
  ];
  if (isSaidaEtiqueta(desc?.saida_etiqueta)) {
    cells.push({
      key: 'saida',
      label: 'Saída',
      value: (
        <SaidaEtiquetaBadge code={desc!.saida_etiqueta!} variant="dense" previewable />
      ),
    });
  }
  return <SpecDense cells={cells} />;
}

/**
 * Spec comercial (PA ou SVC) — sem silhueta/tabela de facas.
 */
export function OrcPubEspecificacaoBloco({
  tipoOperacao,
  desc,
  faixas = [],
  faixaHighlight = -1,
  title = null,
  className,
}: SpecProps) {
  const isServico = tipoOperacao === 'SERVICO';
  const isRevenda = desc?.necessidade === 'REVENDA';
  const body = isServico ? (
    <SpecDense
      cells={[
        {
          key: 'desc',
          label: 'Descrição',
          value: desc?.descricao_servico || 'Prestação de serviço',
        },
        {
          key: 'tipo',
          label: 'Tipo',
          value: tipoServicoLabel(desc?.tipo_servico) || 'Serviço',
        },
        ...(desc?.unidade
          ? [{ key: 'un', label: 'Unidade', value: desc.unidade } satisfies SpecCell]
          : []),
        ...(desc?.material_cliente
          ? [{ key: 'mat', label: 'Material', value: 'Do cliente' } satisfies SpecCell]
          : []),
      ]}
    />
  ) : isRevenda ? (
    <SpecDense
      cells={[
        {
          key: 'sku',
          label: 'SKU',
          value: desc?.produto_codigo || '—',
        },
        {
          key: 'desc',
          label: 'Produto',
          value: desc?.produto_descricao || 'Revenda',
        },
        ...(desc?.unidade
          ? [{ key: 'un', label: 'Unidade', value: desc.unidade } satisfies SpecCell]
          : []),
      ]}
    />
  ) : (
    <>
      <SpecPaDense desc={desc} />
      {desc?.modelos_composicao && desc.modelos_composicao.length > 0 ? (
        <ModelosComposicaoTable
          variant="pub"
          title="Modelos"
          hint={null}
          showValorArte
          arteCaption={arteOverlayCaption(desc)}
          modelos={desc.modelos_composicao}
          faixas={(faixas ?? []).map((fx) => ({
            key: fx.index,
            quantidade: fx.quantidade,
            highlighted: faixaHighlight === fx.index,
          }))}
          quantidadesPorFaixa={
            Array.isArray(
              (desc as Record<string, unknown>).modelos_composicao_quantidades,
            )
              ? ((desc as Record<string, unknown>)
                  .modelos_composicao_quantidades as number[][])
              : undefined
          }
        />
      ) : null}
    </>
  );

  if (title == null) {
    return className ? <div className={className}>{body}</div> : <>{body}</>;
  }

  return (
    <section className={`orc-pub-card${className ? ` ${className}` : ''}`}>
      <h2>{title}</h2>
      {body}
    </section>
  );
}

type FaixasProps = {
  faixas: OrcPropostaFaixa[];
  tipoOperacao?: string | null;
  unidadeServico?: string | null;
  descricao?: OrcPropostaDescricao | null;
  frete?: OrcamentoPropostaPublica['frete'];
  somenteLeitura: boolean;
  faixaIndex: number;
  onFaixaChange?: (index: number) => void;
  somenteExibicao?: boolean;
  cobraMatriz?: boolean;
  valorMatriz?: number;
  matrizNota?: string | null;
  title?: string | null;
  hint?: string | null;
  asCard?: boolean;
};

function etiqPorRoloDaFaixa(
  fx: OrcPropostaFaixa,
  etiqDoc: number | null | undefined,
): number | null {
  const fromDoc = Number(etiqDoc);
  if (Number.isFinite(fromDoc) && fromDoc > 0) return fromDoc;
  const q = Number(fx.quantidade) || 0;
  const rolos = Number(fx.rolos) || 0;
  if (rolos > 0 && q > 0) return Math.round(q / rolos);
  return null;
}

function OrcPubFaixasTabela({
  faixas,
  tipoOperacao,
  descricao,
  frete,
  somenteLeitura,
  somenteExibicao,
  faixaIndex,
  onFaixaChange,
}: {
  faixas: OrcPropostaFaixa[];
  tipoOperacao?: string | null;
  descricao?: OrcPropostaDescricao | null;
  frete?: OrcamentoPropostaPublica['frete'];
  somenteLeitura: boolean;
  somenteExibicao: boolean;
  faixaIndex: number;
  onFaixaChange?: (index: number) => void;
}) {
  const isServico = tipoOperacao === 'SERVICO';
  const mostrarFrete = Boolean(frete && modoComFrete(frete.modo));
  const selecionavel = !somenteExibicao && !somenteLeitura && Boolean(onFaixaChange);

  if (isServico) {
    return (
      <div className="table-wrap orc-pub-faixas-wrap">
        <table className="orc-pub-faixas-table">
          <thead>
            <tr>
              {selecionavel ? <th className="orc-pub-faixas-sel" aria-label="Seleção" /> : null}
              <th className="orc-pub-num">Qtd</th>
              <th className="orc-pub-num">Arte</th>
              <th className="orc-pub-num">Frete</th>
              <th className="orc-pub-num">Total</th>
              <th className="orc-pub-num">Unit</th>
            </tr>
          </thead>
          <tbody>
            {faixas.map((fx) => {
              const q = Number(fx.quantidade) || 0;
              const total = Number(fx.valor_total) || 0;
              const unit =
                fx.valor_unitario != null
                  ? Number(fx.valor_unitario)
                  : q > 0
                    ? total / q
                    : null;
              const selected = faixaIndex === fx.index;
              return (
                <tr
                  key={fx.index}
                  className={selected ? 'is-selected' : undefined}
                  onClick={selecionavel ? () => onFaixaChange?.(fx.index) : undefined}
                >
                  {selecionavel ? (
                    <td className="orc-pub-faixas-sel">
                      <input
                        type="radio"
                        name="faixa"
                        checked={selected}
                        onChange={() => onFaixaChange?.(fx.index)}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </td>
                  ) : null}
                  <td className="orc-pub-num">{q.toLocaleString('pt-BR')}</td>
                  <td className="orc-pub-num">
                    {(fx.valor_artes ?? 0) > 0 ? formatCurrency(fx.valor_artes) : '—'}
                  </td>
                  <td className="orc-pub-num">
                    {mostrarFrete
                      ? formatValorFrete(fx.valor_frete, { aDefinir: true })
                      : '—'}
                  </td>
                  <td className="orc-pub-num">
                    <strong>{formatCurrency(total)}</strong>
                  </td>
                  <td className="orc-pub-num">
                    {unit != null ? formatCurrency(unit) : '—'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    );
  }

  return (
    <div className="table-wrap orc-pub-faixas-wrap">
      <table className="orc-pub-faixas-table">
        <thead>
          <tr>
            {selecionavel ? <th className="orc-pub-faixas-sel" aria-label="Seleção" /> : null}
            <th className="orc-pub-num" title="Etiquetas por rolo">
              Qtd
              <span className="orc-pub-faixas-th-sub">etiq./rolo</span>
            </th>
            <th className="orc-pub-num">Rolos</th>
            <th className="orc-pub-num">Etiquetas</th>
            <th className="orc-pub-num">Matriz</th>
            <th className="orc-pub-num">Arte</th>
            <th className="orc-pub-num">Frete</th>
            <th className="orc-pub-num">Total</th>
            <th className="orc-pub-num">Unit</th>
            <th className="orc-pub-num">Valor rolo</th>
          </tr>
        </thead>
        <tbody>
          {faixas.map((fx) => {
            const q = Number(fx.quantidade) || 0;
            const et = Number(fx.valor_etiqueta) || 0;
            const rolos = Number(fx.rolos) || 0;
            const etiqRolo = etiqPorRoloDaFaixa(fx, descricao?.etiq_por_rolo);
            const valorRolo =
              fx.valor_rolo != null && Number(fx.valor_rolo) > 0
                ? Number(fx.valor_rolo)
                : rolos > 0 && et > 0
                  ? et / rolos
                  : null;
            const unit =
              fx.valor_unitario != null
                ? Number(fx.valor_unitario)
                : q > 0
                  ? et / q
                  : null;
            const selected = faixaIndex === fx.index;
            return (
              <tr
                key={fx.index}
                className={selected ? 'is-selected' : undefined}
                onClick={selecionavel ? () => onFaixaChange?.(fx.index) : undefined}
              >
                {selecionavel ? (
                  <td className="orc-pub-faixas-sel">
                    <input
                      type="radio"
                      name="faixa"
                      checked={selected}
                      onChange={() => onFaixaChange?.(fx.index)}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </td>
                ) : null}
                <td className="orc-pub-num">
                  {etiqRolo != null ? etiqRolo.toLocaleString('pt-BR') : '—'}
                </td>
                <td className="orc-pub-num">
                  {rolos > 0 ? Math.round(rolos).toLocaleString('pt-BR') : '—'}
                </td>
                <td className="orc-pub-num">{q.toLocaleString('pt-BR')}</td>
                <td className="orc-pub-num">
                  {(fx.valor_matriz ?? 0) > 0 ? formatCurrency(fx.valor_matriz) : '—'}
                </td>
                <td className="orc-pub-num">
                  {(fx.valor_artes ?? 0) > 0 ? formatCurrency(fx.valor_artes) : '—'}
                </td>
                <td className="orc-pub-num">
                  {mostrarFrete
                    ? formatValorFrete(fx.valor_frete, { aDefinir: true })
                    : '—'}
                </td>
                <td className="orc-pub-num">
                  <strong>{formatCurrency(fx.valor_total)}</strong>
                </td>
                <td className="orc-pub-num">
                  {unit != null ? formatCurrency(unit) : '—'}
                </td>
                <td className="orc-pub-num">
                  {valorRolo != null ? formatCurrency(valorRolo) : '—'}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function OrcPubFaixasBloco({
  faixas,
  tipoOperacao,
  descricao,
  frete,
  somenteLeitura,
  faixaIndex,
  onFaixaChange,
  somenteExibicao = false,
  cobraMatriz = false,
  valorMatriz = 0,
  matrizNota = null,
  title = 'Faixas de quantidade',
  hint = null,
  asCard = true,
}: FaixasProps) {
  const defaultHint = somenteExibicao
    ? null
    : somenteLeitura
      ? 'Opções de quantidade desta proposta.'
      : 'Selecione a quantidade que deseja aprovar.';

  const tabela = (
    <OrcPubFaixasTabela
      faixas={faixas}
      tipoOperacao={tipoOperacao}
      descricao={descricao}
      frete={frete}
      somenteLeitura={somenteLeitura}
      somenteExibicao={somenteExibicao}
      faixaIndex={faixaIndex}
      onFaixaChange={onFaixaChange}
    />
  );

  const notaMatriz =
    cobraMatriz && asCard ? (
      <p className="orc-pub-note">
        Matriz {formatCurrency(valorMatriz)}
        {matrizNota ? ` — ${matrizNota}` : ''}
      </p>
    ) : null;

  if (!asCard) {
    return (
      <div className="orc-pub-faixas-embed">
        {title ? <h3 className="orc-pub-item-sub">{title}</h3> : null}
        {tabela}
      </div>
    );
  }

  return (
    <section className="orc-pub-card">
      {title ? <h2>{title}</h2> : null}
      {(hint ?? defaultHint) ? (
        <p className="orc-pub-hint">{hint ?? defaultHint}</p>
      ) : null}
      {tabela}
      {notaMatriz}
    </section>
  );
}

function resumoLinhaItem(item: OrcPropostaItem): string {
  const d = item.descricao;
  const fx0 = item.faixas?.[0];
  const bits = [
    d?.medida || null,
    d?.papel || null,
    fx0 ? `${fx0.quantidade.toLocaleString('pt-BR')} un.` : null,
  ].filter(Boolean);
  return bits.join(' · ');
}

function OrcPubItemDetalhe({
  item,
  tipoOperacao,
  faixaHighlight = -1,
}: {
  item: OrcPropostaItem;
  tipoOperacao?: string | null;
  faixaHighlight?: number;
}) {
  const faixas = item.faixas ?? [];
  const total = totalPrimeiraFaixaItem(item);
  const resumo = resumoLinhaItem(item);

  return (
    <article className="orc-pub-item-detalhe">
      <header className="orc-pub-item-detalhe-summary">
        <span className="orc-pub-item-detalhe-lead">
          <strong>{rotuloPropostaItem(item.ordem, item.rotulo)}</strong>
          {resumo ? <span className="orc-pub-item-detalhe-resumo">{resumo}</span> : null}
        </span>
        <span className="orc-pub-item-detalhe-total">{formatCurrency(total)}</span>
      </header>
      <div className="orc-pub-item-detalhe-body">
        <OrcPubEspecificacaoBloco
          tipoOperacao={tipoOperacao}
          desc={item.descricao}
          faixas={faixas}
          faixaHighlight={faixaHighlight}
          title={null}
        />
        {faixas.length > 0 ? (
          <OrcPubFaixasBloco
            faixas={faixas}
            tipoOperacao={tipoOperacao}
            unidadeServico={item.descricao?.unidade}
            descricao={item.descricao}
            somenteLeitura
            somenteExibicao
            faixaIndex={faixaHighlight}
            title="Faixas"
            asCard={false}
          />
        ) : null}
      </div>
    </article>
  );
}

type MultiProps = {
  proposta: OrcamentoPropostaPublica;
  faixaHighlight?: number;
};

/**
 * N>1: um card só — total + itens sempre expandidos.
 * Frete/condições ficam no documento (não se repetem).
 */
export function OrcPubItensAcordeao({ proposta, faixaHighlight = -1 }: MultiProps) {
  if (!isPropostaMultiItem(proposta)) return null;
  const itens = proposta.itens ?? [];
  const totalDoc =
    proposta.valor_total_documento_primeira_faixa != null
      ? Number(proposta.valor_total_documento_primeira_faixa)
      : itens.reduce((acc, it) => acc + totalPrimeiraFaixaItem(it), 0);

  return (
    <section className="orc-pub-card orc-pub-itens-doc">
      <header className="orc-pub-itens-doc-head">
        <div>
          <h2>Itens · {itens.length}</h2>
          <p className="orc-pub-hint orc-pub-hint--tight">
            Totais na 1ª quantidade de cada posição
          </p>
        </div>
        <p className="orc-pub-itens-doc-total">{formatCurrency(totalDoc)}</p>
      </header>
      {proposta.cobra_matriz ? (
        <p className="orc-pub-note orc-pub-note--tight">
          Matriz {formatCurrency(proposta.valor_matriz ?? 0)}
          {proposta.matriz_nota ? ` — ${proposta.matriz_nota}` : ''}
        </p>
      ) : null}
      <div className="orc-pub-itens-acordeao">
        {itens.map((it) => (
          <OrcPubItemDetalhe
            key={it.ordem}
            item={it}
            tipoOperacao={proposta.tipo_operacao}
            faixaHighlight={faixaHighlight}
          />
        ))}
      </div>
    </section>
  );
}
