import type { ReactNode } from 'react';
import {
  aspectFromOrcDims,
  facaDesenhoFromSnapshot,
} from './OrcamentoFacaDesenho';
import { FacaShapeIcon, formatoKind, formatoLabel } from './FacaShapeIcon';
import { ModelosComposicaoTable } from './ModelosComposicaoTable';
import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import type { Orcamento, OrcamentoFaixaResult } from '../lib/api';
import { BRAND } from '../lib/brand';
import { formaPagamentoLabel } from '../lib/condicoesComerciais';
import { formatCurrency, formatDecimalBr } from '../lib/format';
import { displaySnap, statusOrcLabel } from '../lib/orcamentoForm';
import { formatValorFrete, modoEntregaLabel } from '../lib/orcamentoFrete';

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
): number {
  if (!facaNova) return Number(fx.valor_total) || 0;
  if (fx.valor_total_com_faca != null) return Number(fx.valor_total_com_faca) || 0;
  return (Number(fx.valor_total) || 0) + valorFacaNova;
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
  const input = orc.input_snapshot ?? {};
  const result = orc.result_snapshot;
  const faixas = result?.faixas ?? [];
  const facaNova = Boolean(input.faca_nova ?? result?.faca_nova);
  const valorFacaNova = Number(result?.valor_faca_nova ?? input.valor_faca_nova ?? 0);
  const prazoFaca =
    input.prazo_faca_dias != null && input.prazo_faca_dias !== ''
      ? displaySnap(input.prazo_faca_dias)
      : result?.prazo_faca_dias != null
        ? String(result.prazo_faca_dias)
        : null;

  const faca = facaDesenhoFromSnapshot(input);
  const aspect = aspectFromOrcDims(
    input.largura_cm as string | number,
    input.puxada_cm as string | number,
  );
  const formato =
    faca?.formato || (result?.formato_faca != null ? String(result.formato_faca) : '');
  const catalogSnap = result?.catalog_snapshot as Record<string, unknown> | undefined;

  const matrizLabel = result
    ? result.cobra_matriz
      ? money(result.valor_matriz)
      : 'Isenta'
    : orc.cobra_matriz
      ? money(orc.valor_matriz)
      : 'Isenta';

  const parceiroLabel = orc.parceiro
    ? `${orc.parceiro.codigo} — ${orc.parceiro.nome_fantasia || orc.parceiro.razao_social}`
    : orc.cliente_nome;

  const inputFaixas = Array.isArray(input.faixas)
    ? (input.faixas as Array<{ quantidade?: number; comissao_pct?: number }>)
    : [];

  const comissaoPctByQtd = new Map<number, number>();
  for (const fx of inputFaixas) {
    const q = Number(fx.quantidade);
    if (Number.isFinite(q)) comissaoPctByQtd.set(q, Number(fx.comissao_pct) || 0);
  }

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
          <h2 className="ficha-razao">{orc.cliente_nome}</h2>
          <p className="ficha-fantasia">{parceiroLabel}</p>
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip ${statusChipClass(orc.status)}`.trim()}>
            {statusOrcLabel(orc.status, orc.financeiro_status)}
          </span>
          <span className="ficha-chip ficha-chip-papel">v{orc.versao}</span>
          {orc.parceiro?.is_prospect ? (
            <span className="ficha-chip ficha-chip-muted">Prospect</span>
          ) : null}
          {facaNova ? <span className="ficha-chip ficha-chip-muted">Faca nova</span> : null}
          {result?.frete ? (
            <span className="ficha-chip ficha-chip-muted">
              {modoEntregaLabel(result.frete.modo)}
            </span>
          ) : null}
          <span className="ficha-chip ficha-chip-muted">Uso interno</span>
        </div>
      </div>

      <div className="ficha-kv-strip">
        <Kv label="Código" value={orc.codigo} />
        <Kv label="Matriz" value={`${matrizLabel}${matrizTarifa(catalogSnap)}`} />
        <Kv
          label="Prazo / validade"
          value={`${orc.prazo_entrega_dias} d.úteis · ${orc.validade_dias} dias · ±${dash(orc.tolerancia_qtd_pct)}%`}
        />
        <Kv
          label="Condição / forma"
          value={
            [dash(input.condicao_pagamento as string), formaPagamentoLabel(input.forma_pagamento as string)]
              .filter((v) => v && v !== '—')
              .join(' · ') || '—'
          }
        />
        <Kv label="Cadastrado por" value={orc.criado_por?.name ?? '—'} />
        <Kv label="Última edição" value={orc.atualizado_por?.name ?? '—'} />
      </div>

      <Section title="Descrição do serviço (snapshot)">
        <table className="ficha-table">
          <thead>
            <tr>
              <th>Medida</th>
              <th>Largura papel</th>
              <th>Puxada máquina</th>
              <th>Cores</th>
              <th>Papel</th>
              <th>Acabamento</th>
              <th>Modelos</th>
              <th>Colunas</th>
              <th>Etiq./rolo</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{snap(input, 'medida')}</td>
              <td>{cmBr(input.largura_cm as string | number)}</td>
              <td>{cmBr(input.puxada_cm as string | number, 4)}</td>
              <td>{snap(input, 'cores')}</td>
              <td>{snap(input, 'papel')}</td>
              <td>{snap(input, 'acabamento')}</td>
              <td>{snap(input, 'modelos')}</td>
              <td>{snap(input, 'colunas')}</td>
              <td>{snap(input, 'etiq_por_rolo')}</td>
            </tr>
          </tbody>
        </table>
        <table className="ficha-table" style={{ borderTop: 0 }}>
          <thead>
            <tr>
              <th>Tubete</th>
              <th>Z</th>
              <th>Formato / faca</th>
              <th>Máquina (G10)</th>
              <th>Imposto %</th>
              <th>Matriz</th>
              <th>Col. rebob.</th>
              <th>Troca produto</th>
              <th>RPM</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{snap(input, 'tubete')}</td>
              <td>{snap(input, 'z')}</td>
              <td>
                {formatoLabel(formato)}
                {facaNova ? ' · FACA NOVA' : ''}
              </td>
              <td>{snap(input, 'maquina')}</td>
              <td>{pctBr(input.imposto_pct as string | number)}</td>
              <td>{snap(input, 'matriz')}</td>
              <td>{snap(input, 'coluna_rebobinacao')}</td>
              <td>{snap(input, 'tipo_troca_produto')}</td>
              <td>{snap(input, 'rpm')}</td>
            </tr>
          </tbody>
        </table>
        {Array.isArray(input.modelos_composicao) &&
        (input.modelos_composicao as Array<{ nome?: string; percentual?: number }>).some(
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
              }>
            }
            faixas={faixas.map((fx, i) => ({
              key: i,
              quantidade: Number(fx.quantidade) || 0,
            }))}
          />
        ) : null}
      </Section>

      <Section title="Faca">
        {faca || formato ? (
          <div className="ficha-orc-faca">
            <div className="ficha-orc-faca-icon">
              <FacaShapeIcon
                formato={formato || 'RETA'}
                aspect={aspect}
                size={40}
                title={formatoLabel(formato)}
              />
            </div>
            <div className="ficha-orc-faca-meta">
              <Kv label="Tipo" value={facaNova ? 'FACA NOVA' : formatoKind(formato)} />
              {facaNova ? (
                <Kv
                  label="Valor / prazo"
                  value={`${money(valorFacaNova)}${prazoFaca ? ` · +${prazoFaca}d` : ''}`}
                />
              ) : null}
            </div>
          </div>
        ) : (
          <p className="ficha-empty">Sem faca no snapshot deste ORC.</p>
        )}
      </Section>

      {faixas.length > 0 ? (
        <>
          <Section title="Cálculo dos valores — métricas">
            <table className="ficha-table ficha-table-num">
              <thead>
                <tr>
                  <th>Qtdade</th>
                  <th>Troca produto</th>
                  <th className="ficha-th-num">Hora máq.</th>
                  <th className="ficha-th-num">Hora troca prod.</th>
                  <th className="ficha-th-num">Hora troca bobina</th>
                  <th className="ficha-th-num">Metragem (m)</th>
                  <th className="ficha-th-num">m²</th>
                  <th className="ficha-th-num">Perda acerto</th>
                  <th className="ficha-th-num">Perda acab.</th>
                  <th className="ficha-th-num">Perda troca pap.</th>
                  <th className="ficha-th-num">Perda bob. m²</th>
                  <th className="ficha-th-num">Rolos</th>
                  <th className="ficha-th-num">Caixas</th>
                </tr>
              </thead>
              <tbody>
                {faixas.map((fx, i) => (
                  <tr key={i}>
                    <td>{qtyBr(fx.quantidade)}</td>
                    <td>{snap(input, 'tipo_troca_produto')}</td>
                    <td className="ficha-td-num">{formatDecimalBr(fx.hora_maq, 3)}</td>
                    <td className="ficha-td-num">{formatDecimalBr(fx.hora_troca_prod, 3)}</td>
                    <td className="ficha-td-num">{formatDecimalBr(fx.hora_troca_bobina, 3)}</td>
                    <td className="ficha-td-num">{formatDecimalBr(fx.metragem, 1)}</td>
                    <td className="ficha-td-num">{formatDecimalBr(fx.m2, 2)}</td>
                    <td className="ficha-td-num">{formatDecimalBr(fx.perda_acerto, 2)}</td>
                    <td className="ficha-td-num">{formatDecimalBr(fx.perda_acabamento, 2)}</td>
                    <td className="ficha-td-num">
                      {formatDecimalBr(fx.perda_papel_troca_produto, 2)}
                    </td>
                    <td className="ficha-td-num">{formatDecimalBr(fx.perda_bobina_m2, 2)}</td>
                    <td className="ficha-td-num">{qtyBr(fx.rolos)}</td>
                    <td className="ficha-td-num">
                      {qtyBr(fx.qtde_caixas)}
                      {fx.caixa_medida ? ` (${fx.caixa_medida})` : ''}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Section>

          <Section title="Cálculo dos valores — custos">
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

          <Section title="Fechamento comercial por faixa">
            <table className="ficha-table ficha-table-num">
              <thead>
                <tr>
                  <th>Qtdade</th>
                  <th className="ficha-th-num">% comissão</th>
                  <th className="ficha-th-num">Comissão</th>
                  <th className="ficha-th-num">Imposto</th>
                  <th className="ficha-th-num">Etiquetas</th>
                  <th className="ficha-th-num">Unitário</th>
                  <th className="ficha-th-num">Valor rolo</th>
                  <th className="ficha-th-num">Matriz</th>
                  {facaNova ? <th className="ficha-th-num">Faca nova</th> : null}
                  {result?.frete ? <th className="ficha-th-num">Frete est.</th> : null}
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
                  const total = faixaTotal(fx, facaNova, valorFacaNova);
                  return (
                    <tr key={i}>
                      <td>{qtyBr(fx.quantidade)}</td>
                      <td className="ficha-td-num">
                        {comPct != null ? pctBr(comPct) : '—'}
                      </td>
                      <td className="ficha-td-num">{money(fx.comissao)}</td>
                      <td className="ficha-td-num">{money(fx.imposto)}</td>
                      <td className="ficha-td-num">{money(et)}</td>
                      <td className="ficha-td-num">{money(unit)}</td>
                      <td className="ficha-td-num">{money(valorRolo)}</td>
                      <td className="ficha-td-num">{money(fx.valor_matriz)}</td>
                      {facaNova ? (
                        <td className="ficha-td-num">
                          {money(fx.valor_faca_nova ?? valorFacaNova)}
                        </td>
                      ) : null}
                      {result?.frete ? (
                        <td className="ficha-td-num">
                          {formatValorFrete(fx.valor_frete, fx.frete_somavel)}
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
              {result?.chave_matriz ? ` · chave ${result.chave_matriz}` : ''}
              {facaNova && prazoFaca ? ` · faca nova +${prazoFaca} dias no prazo` : ''}.
              {result?.frete
                ? ` Frete ${modoEntregaLabel(result.frete.modo).toLowerCase()} — linha à parte, não no unitário.`
                : ''}
            </p>
          </Section>
        </>
      ) : (
        <Section title="Resultado">
          <p className="ficha-empty">Sem resultado calculado neste ORC.</p>
        </Section>
      )}

      {orc.observacao ? (
        <Section title="Observação interna">
          <p className="ficha-obs">{orc.observacao}</p>
        </Section>
      ) : null}

      <p className="ficha-note">
        <strong>Uso interno</strong> — espelho da aba ORÇAMENTO (cálculo completo). Não é a
        proposta CONSOLIDADO ao cliente (estudo 32 · GERACAO §1.5 / §6). Motor R1–R20 · G10.
      </p>

      <RegistroMetaStrip registro={orc} className="ficha-autoria" />

      <footer className="ficha-footer">
        <span>Uso interno · cálculo ORC · emitido por {emitidoPor}</span>
        <TriggerAttribution
          variant="print"
          className="ficha-powered"
          logoClassName="ficha-trigger"
        />
      </footer>
    </article>
  );
}
