import { Fragment } from 'react';
import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import { FichaKv, FichaSection } from './ProducaoFichaBlocks';
import type { OrdemCompra } from '../lib/api';
import { BRAND } from '../lib/brand';
import { ocStatusLabel } from '../lib/comprasUi';
import {
  formatCnpjCpf,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatPhone,
} from '../lib/format';

function dash(v: string | number | null | undefined): string {
  if (v === null || v === undefined || v === '') return '—';
  return String(v);
}

function formatEndereco(p: {
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
}): string {
  const line1 = [p.logradouro, p.numero ? `nº ${p.numero}` : null, p.complemento]
    .filter(Boolean)
    .join(', ');
  const line2 = [p.bairro, [p.municipio, p.uf].filter(Boolean).join('/'), p.cep]
    .filter(Boolean)
    .join(' · ');
  return [line1, line2].filter(Boolean).join(' · ') || '—';
}

function crtLabel(crt: string | number | null | undefined): string {
  const c = String(crt ?? '');
  if (c === '1') return '1 — Simples Nacional';
  if (c === '2') return '2 — Simples (excesso sublimite)';
  if (c === '3') return '3 — Regime Normal';
  if (c === '4') return '4 — MEI';
  return dash(crt);
}

export type OrdemCompraFichaSheetProps = {
  oc: OrdemCompra;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

/**
 * Ficha imprimível da OC — documento comercial ao fornecedor.
 * Estimativa comercial; NF na entrada prevalece.
 */
export function OrdemCompraFichaSheet({
  oc,
  empresaNome,
  emitidoPor,
  emitidoEm,
}: OrdemCompraFichaSheetProps) {
  const emp = oc.empresa;
  const forn = oc.fornecedor;
  const op = oc.operacao;
  const fornecedorLinha =
    [forn?.codigo, forn?.nome_fantasia || forn?.razao_social].filter(Boolean).join(' — ') ||
    'Fornecedor';

  return (
    <article
      className="ficha-sheet ficha-sheet-oc"
      aria-label={`Ordem de compra ${oc.codigo}`}
    >
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Compras · documento ao fornecedor</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{oc.codigo}</span>
          <span className="ficha-doc-when">{formatDateTime(emitidoEm.toISOString())}</span>
        </div>
      </header>

      <div className="ficha-oc-banner">
        <div className="ficha-oc-banner-tipo">
          <strong>Ordem de compra</strong>
          <span>OC · pedido formal de compra</span>
        </div>
        <div className="ficha-oc-banner-meta">
          <span className="ficha-chip ficha-chip-papel">OC</span>
          <span className="ficha-chip">{ocStatusLabel(oc.status)}</span>
          {oc.urgente ? <span className="ficha-chip ficha-chip-urgente">Urgente</span> : null}
          {op?.id_dest_label ? (
            <span className="ficha-chip ficha-chip-muted">{op.id_dest_label}</span>
          ) : null}
        </div>
      </div>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{forn?.razao_social ?? '—'}</h2>
          <p className="ficha-fantasia">
            Fornecedor · {fornecedorLinha}
            {oc.origem ? ` · origem ${oc.origem}` : ''}
          </p>
        </div>
        <div className="ficha-title-meta">
          <span className="ficha-oc-numero-label">Nº da OC</span>
          <span className="ficha-oc-numero">{oc.codigo}</span>
        </div>
      </div>

      <div className="ficha-kv-strip ficha-oc-totais">
        <FichaKv label="Mercadoria" value={formatCurrency(oc.valor_total)} />
        <FichaKv label="IPI" value={formatCurrency(oc.valor_ipi ?? '0')} />
        <FichaKv label="ICMS (destaque)" value={formatCurrency(oc.valor_icms ?? '0')} />
        <FichaKv label="Frete" value={oc.mod_frete_label ?? '—'} />
        <FichaKv
          label="Total previsto"
          value={formatCurrency(oc.valor_previsto ?? oc.valor_total)}
        />
      </div>

      <div className="ficha-columns">
        <FichaSection title="Comprador">
          <div className="ficha-kv-grid cols-2">
            <FichaKv
              label="Razão social"
              value={emp?.razao_social ?? empresaNome}
              wide
            />
            <FichaKv label="CNPJ" value={formatCnpjCpf(emp?.cnpj) || '—'} />
            <FichaKv label="IE" value={dash(emp?.ie)} />
            <FichaKv label="CRT" value={crtLabel(emp?.crt)} />
            <FichaKv label="Regime" value={dash(emp?.regime)} />
            <FichaKv label="UF" value={dash(emp?.uf ?? op?.empresa_uf)} />
            <FichaKv label="Município" value={dash(emp?.municipio)} />
            <FichaKv
              label="Endereço"
              value={emp ? formatEndereco(emp) : '—'}
              wide
            />
            <FichaKv
              label="Contato"
              value={
                [formatPhone(emp?.telefone) || emp?.telefone, emp?.email]
                  .filter(Boolean)
                  .join(' · ') || '—'
              }
              wide
            />
          </div>
        </FichaSection>

        <FichaSection title="Fornecedor">
          <div className="ficha-kv-grid cols-2">
            <FichaKv
              label="Razão social"
              value={forn?.razao_social ?? '—'}
              wide
            />
            <FichaKv label="Código" value={dash(forn?.codigo)} />
            <FichaKv label="CNPJ/CPF" value={formatCnpjCpf(forn?.cnpj_cpf) || '—'} />
            <FichaKv label="IE" value={dash(forn?.ie)} />
            <FichaKv label="Ind. IE dest." value={dash(forn?.ind_ie_dest)} />
            <FichaKv label="Regime" value={dash(forn?.regime)} />
            <FichaKv label="UF" value={dash(forn?.uf ?? op?.fornecedor_uf)} />
            <FichaKv label="Município" value={dash(forn?.municipio)} />
            <FichaKv label="Finalidade" value={dash(forn?.finalidade)} />
            <FichaKv label="CFOP entrada pad." value={dash(forn?.cfop_entrada_padrao)} />
            <FichaKv
              label="Endereço"
              value={forn ? formatEndereco(forn) : '—'}
              wide
            />
            <FichaKv
              label="Contato"
              value={
                [formatPhone(forn?.telefone) || forn?.telefone, forn?.email]
                  .filter(Boolean)
                  .join(' · ') || '—'
              }
              wide
            />
          </div>
        </FichaSection>
      </div>

      <FichaSection title="Condições da ordem">
        <div className="ficha-kv-grid cols-3">
          <FichaKv label="Condição de pagamento" value={dash(oc.condicao_pagamento)} />
          <FichaKv
            label="Previsão de entrega"
            value={oc.previsao_entrega ? formatDate(oc.previsao_entrega) : '—'}
          />
          <FichaKv label="Frete" value={oc.mod_frete_label ?? '—'} />
          <FichaKv label="Operação" value={op?.id_dest_label ?? '—'} />
          <FichaKv
            label="Enviada em"
            value={oc.enviado_em ? formatDateTime(oc.enviado_em) : '—'}
          />
          <FichaKv label="Urgente" value={oc.urgente ? 'Sim' : 'Não'} />
          <FichaKv label="Origem" value={dash(oc.origem)} />
        </div>
      </FichaSection>

      {oc.transportador ? (
        <FichaSection title="Transportador">
          <div className="ficha-kv-grid cols-2">
            <FichaKv
              label="Razão social"
              value={oc.transportador.razao_social ?? '—'}
              wide
            />
            <FichaKv label="Código" value={dash(oc.transportador.codigo)} />
            <FichaKv
              label="CNPJ/CPF"
              value={formatCnpjCpf(oc.transportador.cnpj_cpf) || '—'}
            />
            <FichaKv label="IE" value={dash(oc.transportador.ie)} />
            <FichaKv label="UF" value={dash(oc.transportador.uf)} />
            <FichaKv label="Município" value={dash(oc.transportador.municipio)} />
            <FichaKv
              label="Endereço"
              value={formatEndereco(oc.transportador)}
              wide
            />
          </div>
        </FichaSection>
      ) : null}

      {oc.observacao ? (
        <FichaSection title="Observações">
          <p className="ficha-obs">{oc.observacao}</p>
        </FichaSection>
      ) : null}

      <FichaSection title="Itens da ordem de compra">
        {(oc.itens ?? []).length === 0 ? (
          <p className="ficha-empty">Nenhum item nesta ordem de compra.</p>
        ) : (
          <table className="ficha-table ficha-table-num ficha-oc-itens">
            <colgroup>
              <col className="ficha-oc-col-ord" />
              <col className="ficha-oc-col-prod" />
              <col className="ficha-oc-col-ncm" />
              <col className="ficha-oc-col-orig" />
              <col className="ficha-oc-col-qtd" />
              <col className="ficha-oc-col-un" />
              <col className="ficha-oc-col-val" />
              <col className="ficha-oc-col-val" />
              <col className="ficha-oc-col-aliq" />
              <col className="ficha-oc-col-val" />
              <col className="ficha-oc-col-aliq" />
              <col className="ficha-oc-col-val" />
            </colgroup>
            <thead>
              <tr>
                <th>#</th>
                <th>Produto</th>
                <th>NCM</th>
                <th>Orig.</th>
                <th className="ficha-th-num">Qtde</th>
                <th>Un.</th>
                <th className="ficha-th-num">Unit.</th>
                <th className="ficha-th-num">Mercadoria</th>
                <th className="ficha-th-num">IPI %</th>
                <th className="ficha-th-num">IPI R$</th>
                <th className="ficha-th-num">ICMS %</th>
                <th className="ficha-th-num">ICMS R$</th>
              </tr>
            </thead>
            <tbody>
              {(oc.itens ?? []).map((item, idx) => (
                <Fragment key={item.id}>
                  <tr>
                    <td>{item.ordem ?? idx + 1}</td>
                    <td>
                      <strong>{item.produto?.codigo}</strong>
                      <div className="ficha-oc-item-desc">
                        {item.produto?.descricao_comercial || item.produto?.descricao_fiscal}
                      </div>
                    </td>
                    <td>{dash(item.produto?.ncm)}</td>
                    <td>{dash(item.produto?.origem)}</td>
                    <td className="ficha-td-num">{item.qtde_pedida}</td>
                    <td>{item.unidade}</td>
                    <td className="ficha-td-num">{formatCurrency(item.valor_unitario)}</td>
                    <td className="ficha-td-num">{formatCurrency(item.valor_total)}</td>
                    <td className="ficha-td-num">
                      {item.aliq_ipi != null ? `${item.aliq_ipi}%` : '—'}
                    </td>
                    <td className="ficha-td-num">{formatCurrency(item.valor_ipi ?? '0')}</td>
                    <td className="ficha-td-num">
                      {item.aliq_icms != null ? `${item.aliq_icms}%` : '—'}
                    </td>
                    <td className="ficha-td-num">{formatCurrency(item.valor_icms ?? '0')}</td>
                  </tr>
                  {(item.composicao ?? []).length > 0 ? (
                    <tr className="ficha-oc-composicao-row">
                      <td />
                      <td colSpan={11}>
                        <div className="ficha-oc-composicao">
                          <strong>Detalhe físico (faixas)</strong>
                          <ul>
                            {(item.composicao ?? []).map((f, fi) => (
                              <li key={f.id ?? fi}>
                                {f.largura_mm} mm × {f.quantidade} vol. × {f.comprimento_m} m ={' '}
                                {f.area_m2} m²
                              </li>
                            ))}
                          </ul>
                          <p className="muted" style={{ margin: '0.35rem 0 0' }}>
                            Pedido comercial: {item.qtde_pedida} {item.unidade}
                          </p>
                        </div>
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <td colSpan={7} className="ficha-oc-totais-label">
                  Totais da ordem
                </td>
                <td className="ficha-td-num">
                  <strong>{formatCurrency(oc.valor_total)}</strong>
                </td>
                <td />
                <td className="ficha-td-num">
                  <strong>{formatCurrency(oc.valor_ipi ?? '0')}</strong>
                </td>
                <td />
                <td className="ficha-td-num">
                  <strong>{formatCurrency(oc.valor_icms ?? '0')}</strong>
                </td>
              </tr>
            </tfoot>
          </table>
        )}
        <div className="ficha-kv-grid cols-3 ficha-oc-resumo">
          <FichaKv label="Modalidade frete" value={oc.mod_frete_label ?? '—'} />
          <FichaKv
            label="Total previsto (merc. + IPI)"
            value={formatCurrency(oc.valor_previsto ?? oc.valor_total)}
          />
          <FichaKv
            label="ICMS"
            value={`${formatCurrency(oc.valor_icms ?? '0')} (destaque · não soma)`}
          />
        </div>
      </FichaSection>

      <p className="ficha-note">
        IPI/ICMS calculados automaticamente (histórico de NF do fornecedor/SKU ou tabela UF×UF).
        Estimativa comercial — a NF na entrada prevalece no fiscal e no financeiro. Custo de
        estoque usa apenas a mercadoria.
      </p>

      <div className="ficha-oc-assinaturas">
        <div className="ficha-oc-assinatura">
          <span className="ficha-oc-assinatura-linha" aria-hidden />
          <strong>Comprador</strong>
          <span>Nome / data</span>
        </div>
        <div className="ficha-oc-assinatura">
          <span className="ficha-oc-assinatura-linha" aria-hidden />
          <strong>Fornecedor — ciência / aceite</strong>
          <span>Nome / data</span>
        </div>
      </div>

      <RegistroMetaStrip
        registro={{
          criado_por: oc.criado_por,
          atualizado_por: oc.atualizado_por,
          created_at: oc.created_at,
          updated_at: oc.updated_at,
        }}
        className="ficha-autoria"
      />
      <footer className="ficha-footer">
        <span>
          Ordem de compra {oc.codigo} · emitida por {emitidoPor} ·{' '}
          {formatDateTime(emitidoEm.toISOString())}
        </span>
        <TriggerAttribution
          variant="print"
          className="ficha-powered"
          logoClassName="ficha-trigger"
        />
      </footer>
    </article>
  );
}
