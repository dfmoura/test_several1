import { Fragment } from 'react';
import { TriggerAttribution } from './TriggerAttribution';
import { FichaKv, FichaSection } from './ProducaoFichaBlocks';
import type { OrdemCompra, OrdemCompraParceiro } from '../lib/api';
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
  return [line1, line2].filter(Boolean).join(' · ') || '';
}

function partyMeta(parts: Array<string | null | undefined>): string {
  return parts.map((p) => (p ?? '').trim()).filter(Boolean).join(' · ') || '—';
}

function contatoLinha(
  telefone?: string | null,
  email?: string | null,
): string | null {
  const tel = formatPhone(telefone) || telefone || null;
  return [tel, email].filter(Boolean).join(' · ') || null;
}

function PartyBlock({
  title,
  lead,
  meta,
}: {
  title: string;
  lead: string;
  meta: string;
}) {
  return (
    <section className="ficha-party">
      <h3>{title}</h3>
      <p className="ficha-party-lead">{lead}</p>
      <p className="ficha-party-meta">{meta}</p>
    </section>
  );
}

function transportadorMeta(t: OrdemCompraParceiro): string {
  return partyMeta([
    t.cnpj_cpf ? `CNPJ/CPF ${formatCnpjCpf(t.cnpj_cpf)}` : null,
    t.ie ? `IE ${t.ie}` : null,
    formatEndereco(t) || null,
  ]);
}

export type OrdemCompraFichaSheetProps = {
  oc: OrdemCompra;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

/**
 * Pedido de compra imprimível — documento comercial ao fornecedor.
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
  const transp = oc.transportador;
  const dataDoc = oc.enviado_em ?? oc.created_at ?? emitidoEm.toISOString();

  const compradorLead = emp?.razao_social ?? empresaNome;
  const compradorMeta = partyMeta([
    emp?.cnpj ? `CNPJ ${formatCnpjCpf(emp.cnpj)}` : null,
    emp?.ie ? `IE ${emp.ie}` : null,
    emp ? formatEndereco(emp) || null : null,
    contatoLinha(emp?.telefone, emp?.email),
  ]);

  const fornecedorLead = forn?.razao_social ?? '—';
  const fornecedorMeta = partyMeta([
    forn?.cnpj_cpf ? `CNPJ/CPF ${formatCnpjCpf(forn.cnpj_cpf)}` : null,
    forn?.ie ? `IE ${forn.ie}` : null,
    forn ? formatEndereco(forn) || null : null,
    contatoLinha(forn?.telefone, forn?.email),
  ]);

  return (
    <article
      className="ficha-sheet ficha-sheet-oc"
      aria-label={`Pedido de compra ${oc.codigo}`}
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
          <span className="ficha-doc-when">{formatDateTime(dataDoc)}</span>
        </div>
      </header>

      <div className="ficha-oc-banner">
        <div className="ficha-oc-banner-tipo">
          <strong>Pedido de compra</strong>
          <span>Documento formal de aquisição · OC {oc.codigo}</span>
        </div>
        <div className="ficha-oc-banner-meta">
          <span className="ficha-chip">{ocStatusLabel(oc.status)}</span>
          {oc.urgente ? <span className="ficha-chip ficha-chip-urgente">Urgente</span> : null}
          {op?.id_dest_label ? (
            <span className="ficha-chip ficha-chip-muted">{op.id_dest_label}</span>
          ) : null}
        </div>
      </div>

      <div className="ficha-parties">
        <PartyBlock title="Comprador" lead={compradorLead} meta={compradorMeta} />
        <PartyBlock title="Fornecedor" lead={fornecedorLead} meta={fornecedorMeta} />
      </div>

      <FichaSection title="Condições">
        <div className="ficha-kv-grid cols-3">
          <FichaKv label="Condição de pagamento" value={dash(oc.condicao_pagamento)} />
          <FichaKv
            label="Previsão de entrega"
            value={oc.previsao_entrega ? formatDate(oc.previsao_entrega) : '—'}
          />
          <FichaKv label="Frete" value={oc.mod_frete_label ?? '—'} />
        </div>
      </FichaSection>

      {transp ? (
        <FichaSection title="Transportador">
          <p className="ficha-party-lead ficha-party-lead--inline">
            {transp.razao_social ?? '—'}
          </p>
          <p className="ficha-party-meta">{transportadorMeta(transp)}</p>
        </FichaSection>
      ) : null}

      {oc.observacao ? (
        <FichaSection title="Observações">
          <p className="ficha-obs">{oc.observacao}</p>
        </FichaSection>
      ) : null}

      <FichaSection title="Itens">
        {(oc.itens ?? []).length === 0 ? (
          <p className="ficha-empty">Nenhum item neste pedido de compra.</p>
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
                  Totais
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

        <div className="ficha-oc-totais-doc">
          <div className="ficha-oc-totais-doc-row">
            <span>Mercadoria</span>
            <strong>{formatCurrency(oc.valor_total)}</strong>
          </div>
          <div className="ficha-oc-totais-doc-row">
            <span>IPI</span>
            <strong>{formatCurrency(oc.valor_ipi ?? '0')}</strong>
          </div>
          <div className="ficha-oc-totais-doc-row">
            <span>ICMS (destaque · não soma)</span>
            <strong>{formatCurrency(oc.valor_icms ?? '0')}</strong>
          </div>
          <div className="ficha-oc-totais-doc-row ficha-oc-totais-doc-row--destaque">
            <span>Total previsto (mercadoria + IPI)</span>
            <strong>{formatCurrency(oc.valor_previsto ?? oc.valor_total)}</strong>
          </div>
        </div>
      </FichaSection>

      <p className="ficha-note">
        IPI e ICMS são estimativa comercial. A NF-e na entrada prevalece no fiscal e no
        financeiro. Custo de estoque considera apenas a mercadoria.
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

      <footer className="ficha-footer">
        <span>
          Pedido de compra {oc.codigo} · emitido por {emitidoPor} ·{' '}
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
