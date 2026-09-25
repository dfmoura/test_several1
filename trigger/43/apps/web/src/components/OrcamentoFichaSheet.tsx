import type { ReactNode } from 'react';
import { facaDesenhoFromSnapshot, OrcamentoFacaDesenho } from './OrcamentoFacaDesenho';
import { ModelosComposicaoTable } from './ModelosComposicaoTable';
import { FacasComposicaoTable } from './FacasComposicaoTable';
import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import type { Orcamento, OrcamentoFaixaResult, OrcamentoResult } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formaPagamentoLabel } from '../lib/condicoesComerciais';
import { formatCurrency, formatDecimalBr } from '../lib/format';
import { prazoEntregaCompleto } from '../lib/prazoEntrega';
import {
  calculoComItensDoOrcamento,
  displaySnap,
  facasFromSnapshot,
  isRevendaSnap,
  labelFerramentalAddOn,
  somaValorFacas,
  statusOrcLabel,
} from '../lib/orcamentoForm';
import { entregaComercialTexto, formatValorFrete, modoComFrete, modoEntregaLabel, totalPropostaFaixa } from '../lib/orcamentoFrete';
import { resumoTotaisItem, rotuloItemOrc } from '../lib/orcamentoResultadoItens';
import { SaidaEtiquetaBadge } from './SaidaEtiquetaBadge';
import { isSaidaEtiqueta } from '../lib/saidaEtiqueta';
import { Fragment } from 'react';

/**
 * Ficha operacional do ORC — uso interno (não é proposta ao cliente).
 *
 * Domínio (estudo 32): aba ORÇAMENTO do Excel oficial = cálculo completo · A4 paisagem.
 * CONSOLIDADO (retrato / cliente) fica fora deste documento (GERACAO §1.5 / UC-COM-001).
 *
 * Shell visual: mesmo padrão das fichas 39 (masthead / seções / tabelas / TRIGGER).
 */

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const s = String(value).trim();
  return s === '' ? '—' : s;
}

function formatDateTimeBr(d: Date): string {
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function qtyBr(value: number | string | null | undefined, digits = 0): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  return n.toLocaleString('pt-BR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits > 0 ? Math.min(digits, 1) : 0,
  });
}

function pctBr(value: number | string | null | undefined): string {
  if (value == null || value === '') return '—';
  return `${formatDecimalBr(value, 2)}%`;
}

function money(value: number | string | null | undefined): string {
  return formatCurrency(value);
}

function cmBr(value: number | string | null | undefined, digits = 2): string {
  if (value == null || value === '') return '—';
  return `${formatDecimalBr(value, digits)} cm`;
}

function statusChipClass(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'aprovado' || s === 'calculado') return 'situacao-ativo';
  if (s === 'enviado') return 'situacao-em_manutencao';
  if (s === 'rascunho') return 'situacao-cedido';
  if (s === 'reprovado' || s === 'vencido' || s === 'cancelado') return 'situacao-baixado';
  return '';
}

function snap(input: Record<string, unknown>, key: string): string {
  return displaySnap(input[key]);
}

type KvProps = { label: string; value: ReactNode; wide?: boolean };

function Kv({ label, value, wide }: KvProps) {
  return (
    <div className={`ficha-kv${wide ? ' ficha-kv-wide' : ''}`}>
      <span className="ficha-kv-label">{label}</span>
      <span className="ficha-kv-value">{value}</span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="ficha-section">
      <h3>{title}</h3>
      <div className="ficha-section-body">{children}</div>
    </section>
  );
}

function matrizTarifa(snapCat: Record<string, unknown> | undefined): string {
  if (!snapCat) return '';
  const raw = snapCat.matriz_cm2;
  const tarifa =
    typeof raw === 'number'
      ? raw
      : typeof raw === 'string' && raw !== ''
        ? Number(raw)
        : null;
  if (tarifa == null || !Number.isFinite(tarifa)) return '';
  return ` · ${Number(tarifa).toLocaleString('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 6,
  })}/cm²`;
}

function faixaTotal(
  fx: OrcamentoFaixaResult,
  facaNova: boolean,
  valorFacaNova: number,
  valorArtes = 0,
): number {
  return totalPropostaFaixa(fx, facaNova, valorFacaNova, valorArtes);
}

type FichaItemJob = {
  ordem: number;
  rotulo: string | null;
  input: Record<string, unknown>;
  result: OrcamentoResult | null;
};

function itensFichaOrc(orc: Orcamento): FichaItemJob[] {
  if (orc.itens && orc.itens.length > 0) {
    return orc.itens.map((it) => ({
      ordem: it.ordem,
      rotulo: it.rotulo ?? null,
      input: it.input_snapshot ?? {},
      result: it.result_snapshot,
    }));
  }
  return [
    {
      ordem: 1,
      rotulo: null,
      input: orc.input_snapshot ?? {},
      result: orc.result_snapshot,
    },
  ];
}

function FichaItemBody({
  item,
  multi,
  freteDoc,
}: {
  item: FichaItemJob;
  multi: boolean;
  freteDoc: OrcamentoResult['frete'] | null | undefined;
}) {
  const input = item.input;
  const result = item.result;
  const faixas = result?.faixas ?? [];
  const facaNova = Boolean(input.faca_nova ?? result?.faca_nova);
  const valorFacaNova = Number(result?.valor_faca_nova ?? input.valor_faca_nova ?? 0);
  const facasComp = facasFromSnapshot(input);
  const valorFerramental = somaValorFacas(facasComp) || valorFacaNova;
  const labelFerramental = labelFerramentalAddOn({
    facaNova,
    valor: valorFerramental,
    count: facasComp.length,
  });
  const mostrarFerramental = facaNova || valorFerramental > 0;
  const valorArtes = Number(result?.valor_artes ?? 0);
  const valorGordura = Number(result?.valor_gordura ?? input.valor_gordura ?? 0);
  const temGordura = valorGordura > 0;
  const prazoFaca =
    input.prazo_faca_dias != null && input.prazo_faca_dias !== ''
      ? displaySnap(input.prazo_faca_dias)
      : result?.prazo_faca_dias != null
        ? String(result.prazo_faca_dias)
        : null;
  const faca = facaDesenhoFromSnapshot(input);
  const formato =
    faca?.formato || (result?.formato_faca != null ? String(result.formato_faca) : '');
  const mostrarFrete = !multi && Boolean(freteDoc);

  const inputFaixas = Array.isArray(input.faixas)
    ? (input.faixas as Array<{ quantidade?: number; comissao_pct?: number }>)
    : [];
  const comissaoPctByQtd = new Map<number, number>();
  for (const fx of inputFaixas) {
    const q = Number(fx.quantidade);
    if (Number.isFinite(q)) comissaoPctByQtd.set(q, Number(fx.comissao_pct) || 0);
  }

  const isRevenda = isRevendaSnap(input);
  const descTitle = isRevenda
    ? 'Produto de revenda (snapshot)'
    : multi
      ? 'Descrição (snapshot)'
      : 'Descrição do serviço (snapshot)';
  const temFacaVisual = !isRevenda && Boolean(faca || formato || facasComp.length > 0);

  type DescCell = { label: string; value: ReactNode };
  const descCells: DescCell[] = [];
  const pushDesc = (label: string, value: ReactNode, empty = false) => {
    if (empty) return;
    descCells.push({ label, value });
  };

  if (isRevenda) {
    pushDesc('SKU', snap(input, 'produto_codigo'), snap(input, 'produto_codigo') === '—');
    pushDesc(
      'Produto',
      snap(input, 'produto_descricao'),
      snap(input, 'produto_descricao') === '—',
    );
    pushDesc('Unidade', snap(input, 'unidade'), snap(input, 'unidade') === '—');
    if (temGordura) pushDesc('Gordura', money(valorGordura));
  } else {
    pushDesc('Medida', snap(input, 'medida'), snap(input, 'medida') === '—');
    pushDesc(
      'Larg. papel',
      cmBr(input.largura_cm as string | number),
      cmBr(input.largura_cm as string | number) === '—',
    );
    pushDesc(
      'Puxada',
      cmBr(input.puxada_cm as string | number, 4),
      cmBr(input.puxada_cm as string | number, 4) === '—',
    );
    pushDesc('Cores', snap(input, 'cores'), snap(input, 'cores') === '—');
    pushDesc('Papel', snap(input, 'papel'), snap(input, 'papel') === '—');
    pushDesc('Acab.', snap(input, 'acabamento'), snap(input, 'acabamento') === '—');
    pushDesc('Modelos', snap(input, 'modelos'), snap(input, 'modelos') === '—');
    pushDesc('Colunas', snap(input, 'colunas'), snap(input, 'colunas') === '—');
    pushDesc('Etiq/rolo', snap(input, 'etiq_por_rolo'), snap(input, 'etiq_por_rolo') === '—');
    pushDesc('Tubete', snap(input, 'tubete'), snap(input, 'tubete') === '—');
    pushDesc('Z', snap(input, 'z'), snap(input, 'z') === '—');
    pushDesc('Máq.', snap(input, 'maquina'), snap(input, 'maquina') === '—');
    pushDesc(
      'Imposto',
      pctBr(input.imposto_pct as string | number),
      pctBr(input.imposto_pct as string | number) === '—',
    );
    if (temGordura) pushDesc('Gordura', money(valorGordura));
    pushDesc('Matriz', snap(input, 'matriz'), snap(input, 'matriz') === '—');
    pushDesc(
      'Col.reb',
      snap(input, 'coluna_rebobinacao'),
      snap(input, 'coluna_rebobinacao') === '—',
    );
    if (isSaidaEtiqueta(String(input.saida_etiqueta ?? ''))) {
      pushDesc(
        'Saída',
        <SaidaEtiquetaBadge code={String(input.saida_etiqueta)} variant="dense" />,
      );
    }
    pushDesc(
      'Troca',
      snap(input, 'tipo_troca_produto'),
      snap(input, 'tipo_troca_produto') === '—',
    );
    pushDesc('RPM', snap(input, 'rpm'), snap(input, 'rpm') === '—');
  }

  return (
    <>
      <Section title={descTitle}>
        <div
          className={`ficha-desc-layout${temFacaVisual ? ' ficha-desc-layout--com-faca' : ''}`}
        >
          {temFacaVisual ? (
            <aside className="ficha-desc-faca">
              <OrcamentoFacaDesenho
                {...(faca ?? { formato, facaNova })}
                formato={faca?.formato || formato}
                facaNova={facaNova || Boolean(faca?.facaNova)}
                variant="compact"
                audience="interno"
              />
              {mostrarFerramental ? (
                <span className="ficha-orc-faca-valor">
                  {labelFerramental} {money(valorFerramental)}
                  {prazoFaca ? ` · +${prazoFaca}d` : ''}
                </span>
              ) : null}
            </aside>
          ) : null}
          <div className="ficha-desc-grid">
            {descCells.map((c) => (
              <div key={c.label} className="ficha-desc-cell">
                <span>{c.label}</span>
                <strong>{c.value}</strong>
              </div>
            ))}
          </div>
        </div>
        {!isRevenda &&
        Array.isArray(input.modelos_composicao) &&
        (input.modelos_composicao as Array<{ nome?: string }>).some(
          (m) => String(m?.nome ?? '').trim() !== '',
        ) ? (
          <ModelosComposicaoTable
            variant="ficha"
            title={null}
            hint={null}
            className="orc-modelos-ficha"
            modelos={
              input.modelos_composicao as Array<{
                ordem?: number;
                nome?: string;
                percentual?: number;
                valor_arte?: number;
                arte_url?: string | null;
              }>
            }
            faixas={faixas.map((fx, i) => ({
              key: i,
              quantidade: Number(fx.quantidade) || 0,
            }))}
          />
        ) : null}
        {facasComp.length > 1 ? (
          <FacasComposicaoTable
            variant="ficha"
            title={null}
            hint={null}
            showValor
            facas={facasComp}
          />
        ) : null}
      </Section>

      {faixas.length > 0 ? (
        <>
          <Section title={multi ? 'Cálculo — métricas' : 'Cálculo dos valores — métricas'}>
            <table className="ficha-table ficha-table-num ficha-table-metricas">
              <thead>
                <tr>
                  <th className="ficha-col-qtd">Qtd</th>
                  <th>Troca produto</th>
                  <th className="ficha-th-num ficha-col-hora">H. máq.</th>
                  <th className="ficha-th-num ficha-col-hora">H. troca prod.</th>
                  <th className="ficha-th-num ficha-col-hora">H. troca bob.</th>
                  <th className="ficha-th-num">Metragem (m)</th>
                  <th className="ficha-th-num">m²</th>
                  <th className="ficha-th-num">Perda acerto</th>
                  <th className="ficha-th-num">Perda acab.</th>
                  <th className="ficha-th-num">Perda troca pap.</th>
                  <th className="ficha-th-num">Perda bob. m²</th>
                  <th className="ficha-th-num ficha-col-rolos">Rolos</th>
                  <th className="ficha-th-num">Caixas</th>
                </tr>
              </thead>
              <tbody>
                {faixas.map((fx, i) => (
                  <tr key={i}>
                    <td className="ficha-col-qtd">{qtyBr(fx.quantidade)}</td>
                    <td>{snap(input, 'tipo_troca_produto')}</td>
                    <td className="ficha-td-num ficha-col-hora">
                      {formatDecimalBr(fx.hora_maq, 3)}
                    </td>
                    <td className="ficha-td-num ficha-col-hora">
                      {formatDecimalBr(fx.hora_troca_prod, 3)}
                    </td>
                    <td className="ficha-td-num ficha-col-hora">
                      {formatDecimalBr(fx.hora_troca_bobina, 3)}
                    </td>
                    <td className="ficha-td-num">{formatDecimalBr(fx.metragem, 1)}</td>
                    <td className="ficha-td-num">{formatDecimalBr(fx.m2, 2)}</td>
                    <td className="ficha-td-num">{formatDecimalBr(fx.perda_acerto, 2)}</td>
                    <td className="ficha-td-num">{formatDecimalBr(fx.perda_acabamento, 2)}</td>
                    <td className="ficha-td-num">
                      {formatDecimalBr(fx.perda_papel_troca_produto, 2)}
                    </td>
                    <td className="ficha-td-num">{formatDecimalBr(fx.perda_bobina_m2, 2)}</td>
                    <td className="ficha-td-num ficha-col-rolos">{qtyBr(fx.rolos)}</td>
                    <td className="ficha-td-num">
                      {qtyBr(fx.qtde_caixas)}
                      {fx.caixa_medida ? ` (${fx.caixa_medida})` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title={multi ? 'Cálculo — custos' : 'Cálculo dos valores — custos'}>
            <table className="ficha-table ficha-table-num">
              <thead>
                <tr>
                  <th>Qtdade</th>
                  <th className="ficha-th-num">Papel</th>
                  <th className="ficha-th-num">Máquina</th>
                  <th className="ficha-th-num">Troca prod.</th>
                  <th className="ficha-th-num">Troca bobina</th>
                  <th className="ficha-th-num">Papel troca</th>
                  <th className="ficha-th-num">Tinta</th>
                  <th className="ficha-th-num">Acabamento</th>
                  <th className="ficha-th-num">Rebob.</th>
                  <th className="ficha-th-num">Tubete</th>
                  <th className="ficha-th-num">Caixa</th>
                  <th className="ficha-th-num">Serviço</th>
                </tr>
              </thead>
              <tbody>
                {faixas.map((fx, i) => (
                  <tr key={i}>
                    <td>{qtyBr(fx.quantidade)}</td>
                    <td className="ficha-td-num">{money(fx.valor_papel)}</td>
                    <td className="ficha-td-num">{money(fx.valor_maquina)}</td>
                    <td className="ficha-td-num">{money(fx.valor_troca_produto)}</td>
                    <td className="ficha-td-num">{money(fx.valor_troca_bobina)}</td>
                    <td className="ficha-td-num">{money(fx.valor_papel_troca_produto)}</td>
                    <td className="ficha-td-num">{money(fx.valor_tinta)}</td>
                    <td className="ficha-td-num">{money(fx.valor_acabamento)}</td>
                    <td className="ficha-td-num">{money(fx.valor_rebobinacao)}</td>
                    <td className="ficha-td-num">{money(fx.valor_tubete)}</td>
                    <td className="ficha-td-num">{money(fx.valor_caixa)}</td>
                    <td className="ficha-td-num">{money(fx.valor_servico)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title={multi ? 'Fechamento comercial' : 'Fechamento comercial por faixa'}>
            <table className="ficha-table ficha-table-num">
              <thead>
                <tr>
                  <th>Qtdade</th>
                  <th className="ficha-th-num">% comissão</th>
                  <th className="ficha-th-num">Comissão</th>
                  <th className="ficha-th-num">Imposto</th>
                  {temGordura ? (
                    <>
                      <th className="ficha-th-num">Base etiq.</th>
                      <th className="ficha-th-num">Gordura</th>
                    </>
                  ) : null}
                  <th className="ficha-th-num">Etiquetas</th>
                  <th className="ficha-th-num">Unitário</th>
                  <th className="ficha-th-num">Valor rolo</th>
                  <th className="ficha-th-num">Matriz</th>
                  {mostrarFerramental ? <th className="ficha-th-num">{labelFerramental}</th> : null}
                  {valorArtes > 0 ? <th className="ficha-th-num">Vlr. Arte</th> : null}
                  {mostrarFrete ? <th className="ficha-th-num">Frete</th> : null}
                  <th className="ficha-th-num">Total</th>
                </tr>
              </thead>
              <tbody>
                {faixas.map((fx, i) => {
                  const q = Number(fx.quantidade) || 1;
                  const et = Number(fx.valor_etiqueta) || 0;
                  const rolos = Number(fx.rolos) || 0;
                  const unit = et / q;
                  const valorRolo = rolos > 0 ? et / rolos : 0;
                  const comPct = comissaoPctByQtd.get(Number(fx.quantidade));
                  const total = faixaTotal(fx, facaNova, valorFacaNova, valorArtes);
                  return (
                    <tr key={i}>
                      <td>{qtyBr(fx.quantidade)}</td>
                      <td className="ficha-td-num">
                        {comPct != null ? pctBr(comPct) : '—'}
                      </td>
                      <td className="ficha-td-num">{money(fx.comissao)}</td>
                      <td className="ficha-td-num">{money(fx.imposto)}</td>
                      {temGordura ? (
                        <>
                          <td className="ficha-td-num">
                            {money(fx.valor_etiqueta_base ?? et)}
                          </td>
                          <td className="ficha-td-num">{money(fx.valor_gordura ?? 0)}</td>
                        </>
                      ) : null}
                      <td className="ficha-td-num">{money(et)}</td>
                      <td className="ficha-td-num">{money(unit)}</td>
                      <td className="ficha-td-num">{money(valorRolo)}</td>
                      <td className="ficha-td-num">{money(fx.valor_matriz)}</td>
                      {mostrarFerramental ? (
                        <td className="ficha-td-num">
                          {money(fx.valor_faca_nova ?? valorFerramental)}
                        </td>
                      ) : null}
                      {valorArtes > 0 ? (
                        <td className="ficha-td-num">
                          {money(fx.valor_artes ?? valorArtes)}
                        </td>
                      ) : null}
                      {mostrarFrete ? (
                        <td className="ficha-td-num">
                          {formatValorFrete(fx.valor_frete, {
                            aDefinir: modoComFrete(freteDoc?.modo),
                          })}
                        </td>
                      ) : null}
                      <td className="ficha-td-num">
                        <strong>{money(total)}</strong>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <p className="ficha-empty" style={{ borderTop: 0 }}>
              Matriz — somente no 1º pedido
              {result?.cobra_matriz
                ? ` · matriz ${formatCurrency(result.valor_matriz)}`
                : ' · matriz isenta'}
              {facaNova && prazoFaca ? ` · faca nova +${prazoFaca} dias no prazo` : ''}.
              {temGordura
                ? ` Gordura ${money(valorGordura)} — uso interno; não aparece na proposta ao cliente.`
                : ''}
              {!multi && freteDoc
                ? ` Frete (${modoEntregaLabel(freteDoc.modo).toLowerCase()}) — informativo, fora do total e do unitário; vazio = a definir.`
                : ''}
            </p>
          </Section>
        </>
      ) : (
        <Section title="Resultado">
          <p className="ficha-empty">Sem resultado calculado neste item.</p>
        </Section>
      )}
    </>
  );
}

export type OrcamentoFichaSheetProps = {
  orcamento: Orcamento;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

export function OrcamentoFichaSheet({
  orcamento: orc,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: OrcamentoFichaSheetProps) {
  const inputDoc = orc.input_snapshot ?? {};
  const resultDoc =
    calculoComItensDoOrcamento(orc.result_snapshot, orc.itens) ?? orc.result_snapshot;
  const itens = itensFichaOrc(orc);
  const multi = itens.length > 1;
  const item0 = itens[0];
  const facasChip = facasFromSnapshot(item0?.input ?? inputDoc);
  const facaNovaChip = Boolean(
    (item0?.input.faca_nova ?? item0?.result?.faca_nova) ||
      (multi && itens.some((it) => it.input.faca_nova || it.result?.faca_nova)),
  );
  const catalogSnap = resultDoc?.catalog_snapshot as Record<string, unknown> | undefined;

  const matrizLabel = resultDoc
    ? resultDoc.cobra_matriz
      ? money(resultDoc.valor_matriz)
      : multi
        ? 'Ver itens'
        : 'Isenta'
    : orc.cobra_matriz
      ? money(orc.valor_matriz)
      : 'Isenta';

  const tituloParceiro = orc.parceiro?.codigo
    ? `${orc.parceiro.codigo} — ${orc.cliente_nome}`
    : orc.cliente_nome;

  return (
    <article
      className="ficha-sheet ficha-sheet-orc"
      aria-label={`Ficha operacional do orçamento ${orc.codigo}`}
    >
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Cálculo orçamento · Uso interno (ORC)</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{orc.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{tituloParceiro}</h2>
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip ${statusChipClass(orc.status)}`.trim()}>
            {statusOrcLabel(orc.status, orc.financeiro_status)}
          </span>
          <span className="ficha-chip ficha-chip-papel">v{orc.versao}</span>
          {multi ? (
            <span className="ficha-chip ficha-chip-muted">{itens.length} itens</span>
          ) : null}
          {orc.parceiro?.is_prospect ? (
            <span className="ficha-chip ficha-chip-muted">Prospect</span>
          ) : null}
          {!multi && (facaNovaChip || facasChip.length > 1) ? (
            <span className="ficha-chip ficha-chip-muted">
              {facasChip.length > 1
                ? `${facasChip.length} facas`
                : labelFerramentalAddOn({
                    facaNova: facaNovaChip,
                    valor: somaValorFacas(facasChip),
                    count: facasChip.length,
                  })}
            </span>
          ) : null}
          {resultDoc?.frete ? (
            <span className="ficha-chip ficha-chip-muted">
              {entregaComercialTexto({
                modo: resultDoc.frete.modo,
                valorFrete: resultDoc.frete.valor_informado,
                modFrete: resultDoc.frete.mod_frete,
                transportadorNome: resultDoc.frete.transportador_nome,
              })}
            </span>
          ) : null}
          <span className="ficha-chip ficha-chip-muted">Uso interno</span>
        </div>
      </div>

      <div className="ficha-kv-strip">
        <Kv
          label="Matriz"
          value={
            multi
              ? `${itens.length} itens · ver fechamento de cada item`
              : `${matrizLabel}${matrizTarifa(catalogSnap)}`
          }
        />
        <Kv
          label="Prazo / validade"
          value={`${prazoEntregaCompleto(orc)} · ${orc.validade_dias} dias · ±${dash(orc.tolerancia_qtd_pct)}%`}
        />
        <Kv
          label="Condição / forma"
          value={
            [
              dash(inputDoc.condicao_pagamento as string),
              formaPagamentoLabel(inputDoc.forma_pagamento as string),
            ]
              .filter((v) => v && v !== '—')
              .join(' · ') || '—'
          }
        />
        <Kv
          label="Vendedor"
          value={
            orc.vendedor
              ? `${orc.vendedor.codigo} — ${orc.vendedor.razao_social}`
              : 'Venda direta'
          }
        />
      </div>

      {multi && resultDoc?.totais ? (
        <Section title="Totais do orçamento">
          <table className="ficha-table ficha-table-num">
            <thead>
              <tr>
                <th>Item</th>
                <th className="ficha-th-num">Facas</th>
                <th className="ficha-th-num">Artes</th>
                <th className="ficha-th-num">Total (1ª qtd.)</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((it) => {
                const r = it.result
                  ? resumoTotaisItem(it.result)
                  : { valorFacas: 0, valorArtes: 0, total: 0 };
                return (
                  <tr key={it.ordem}>
                    <td>{rotuloItemOrc(it.ordem, it.rotulo)}</td>
                    <td className="ficha-td-num">{money(r.valorFacas)}</td>
                    <td className="ficha-td-num">{money(r.valorArtes)}</td>
                    <td className="ficha-td-num">
                      <strong>{money(r.total)}</strong>
                    </td>
                  </tr>
                );
              })}
              <tr>
                <td>
                  <strong>Documento</strong>
                </td>
                <td className="ficha-td-num" colSpan={2}>
                  {itens.length} itens · 1ª quantidade de cada
                </td>
                <td className="ficha-td-num">
                  <strong>{money(resultDoc.totais.soma_primeira_faixa_proposta)}</strong>
                </td>
              </tr>
            </tbody>
          </table>
          {resultDoc.frete ? (
            <p className="ficha-empty" style={{ borderTop: 0 }}>
              {entregaComercialTexto({
                modo: resultDoc.frete.modo,
                valorFrete: resultDoc.frete.valor_informado,
                modFrete: resultDoc.frete.mod_frete,
                transportadorNome: resultDoc.frete.transportador_nome,
              })}{' '}
              — do orçamento (não se repete por item); informativo, fora do total.
            </p>
          ) : null}
        </Section>
      ) : null}

      {itens.map((it) => (
        <Fragment key={it.ordem}>
          {multi ? (
            <h3 className="ficha-item-heading">{rotuloItemOrc(it.ordem, it.rotulo)}</h3>
          ) : null}
          <FichaItemBody item={it} multi={multi} freteDoc={resultDoc?.frete} />
        </Fragment>
      ))}

      {orc.observacao ? (
        <Section title="Observação interna">
          <p className="ficha-obs">{orc.observacao}</p>
        </Section>
      ) : null}

      <p className="ficha-note">
        <strong>Uso interno</strong> — cálculo completo deste orçamento. Não é a proposta enviada
        ao cliente.
      </p>

      <RegistroMetaStrip registro={orc} className="ficha-autoria" />

      <footer className="ficha-footer">
        <span>Uso interno · orçamento · emitido por {emitidoPor}</span>
        <TriggerAttribution
          variant="print"
          className="ficha-powered"
          logoClassName="ficha-trigger"
        />
      </footer>
    </article>
  );
}

