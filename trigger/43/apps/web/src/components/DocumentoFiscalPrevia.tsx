import type { DocumentoFiscalSaida } from '../lib/api';
import {
  formatCnpjCpf,
  formatCurrency,
  formatDecimalBr,
  formatUnitPrice,
} from '../lib/format';
import { docFiscalStatusLabel, docFiscalTipoLabel, nfePodeEventoSefaz } from '../lib/fiscalUi';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { StatusPill } from './StatusPill';

type Props = {
  doc: DocumentoFiscalSaida;
  faturamentoId: number;
  compact?: boolean;
  /** Ficha de cobrança do TIT em aberto (irmã da DANFE). */
  cobrancaHref?: string | null;
  /** Abre o card de cancelamento SEFAZ no faturamento (só NF-e autorizada oficial). */
  onAbrirCancelamentoSefaz?: () => void;
};

function linhaEndereco(doc: DocumentoFiscalSaida): string {
  const d = doc.previa?.destinatario;
  if (!d) return '—';
  const partes = [d.endereco, d.municipio, d.uf].filter((p) => p && String(p).trim() !== '');
  return partes.length > 0 ? partes.join(' · ') : '—';
}

/**
 * Prévia / espelho humano da NF-e/NFS-e (planejada ou autorizada).
 * DANFE oficial: ficha em rota dedicada após autorização SEFAZ+A1.
 */
export function DocumentoFiscalPreviaCard({
  doc,
  faturamentoId,
  compact = false,
  cobrancaHref,
  onAbrirCancelamentoSefaz,
}: Props) {
  const previa = doc.previa;
  const oficial = previa?.oficial === true;
  const simulada = previa?.simulada === true;
  const cancelada = previa?.cancelada === true || doc.status === 'CANCELADO';
  const comNumeracao = oficial || simulada || cancelada;
  const itens = previa?.itens ?? [];
  const envio = doc.envio_hub ?? null;
  const nfse = doc.tipo === 'NFSE';
  const podeCancelar = Boolean(onAbrirCancelamentoSefaz) && nfePodeEventoSefaz(doc);

  return (
    <article className={`nf-previa${oficial || cancelada ? '' : ' nf-previa--rascunho'}${cancelada ? ' nf-previa--cancelada' : ''}`}>
      <header className="nf-previa-head">
        <div>
          <p className="nf-previa-kicker">
            {cancelada
              ? 'NF-e cancelada'
              : oficial
                ? 'Documento fiscal'
                : simulada
                  ? 'Autorização de teste'
                  : 'Prévia da nota'}
          </p>
          <h4>
            {previa?.rotulo ?? docFiscalTipoLabel(doc.tipo)} · <code>{doc.codigo}</code>
          </h4>
        </div>
        <div className="btn-row">
          <a
            href={`/financeiro/faturamentos/${faturamentoId}/nf/${doc.id}/ficha`}
            className="btn btn-secondary"
            onClick={(e) =>
              onAbrirFichaClick(
                e,
                `/financeiro/faturamentos/${faturamentoId}/nf/${doc.id}/ficha`,
              )
            }
          >
            Imprimir nota
          </a>
          {cobrancaHref ? (
            <a
              href={cobrancaHref}
              className="btn btn-secondary"
              onClick={(e) => onAbrirFichaClick(e, cobrancaHref)}
            >
              Imprimir cobrança
            </a>
          ) : null}
          {podeCancelar ? (
            <button type="button" className="btn btn-secondary" onClick={onAbrirCancelamentoSefaz}>
              Cancelar NF-e
            </button>
          ) : null}
          <StatusPill status={docFiscalStatusLabel(doc.status, simulada)} />
        </div>
      </header>

      <p className={`nf-previa-banner${oficial && !cancelada ? ' is-ok' : ''}${cancelada ? ' is-cancelada' : ''}`}>
        {previa?.aviso ??
          (cancelada
            ? 'NF-e cancelada na SEFAZ. Chave e protocolo permanecem para consulta.'
            : 'Prévia — aguardando SEFAZ. Não é documento fiscal autorizado.')}
      </p>

      {doc.saida_estoque ? (
        <p className="form-hint">
          Estoque baixado na autorização: <code>{doc.saida_estoque.codigo}</code>
          {doc.saida_estoque.itens?.length
            ? ` · ${doc.saida_estoque.itens
                .map(
                  (i) =>
                    `${i.produto_codigo ?? 'SKU'} ${formatDecimalBr(i.qtde, 4)} ${i.unidade}`,
                )
                .join(' · ')}`
            : ''}
        </p>
      ) : null}

      <div className="detail-meta nf-previa-meta">
        <div>
          <span>{nfse ? 'Prestador' : 'Emitente'}</span>
          <strong>
            {previa?.emitente?.nome ?? '—'}
            {previa?.emitente?.cnpj ? ` · ${formatCnpjCpf(previa.emitente.cnpj)}` : ''}
          </strong>
        </div>
        <div>
          <span>{nfse ? 'Tomador' : 'Destinatário'}</span>
          <strong>
            {previa?.destinatario?.nome ?? '—'}
            {previa?.destinatario?.documento
              ? ` · ${formatCnpjCpf(previa.destinatario.documento)}`
              : ''}
          </strong>
        </div>
        <div>
          <span>Natureza</span>
          <strong>{previa?.natureza || '—'}</strong>
        </div>
        <div>
          <span>Valor</span>
          <strong>{formatCurrency(previa?.valor_total ?? doc.valor)}</strong>
        </div>
        <div>
          <span>Número / chave</span>
          <strong>
            {comNumeracao && doc.numero != null
              ? `${doc.serie ?? '—'} / ${doc.numero}`
              : '— (só na autorização)'}
          </strong>
        </div>
        <div>
          <span>Ref. de envio</span>
          <strong>
            <code>{doc.ref}</code>
          </strong>
        </div>
      </div>

      <p className="form-hint" style={{ marginTop: 0 }}>
        {linhaEndereco(doc)}
        {previa?.destinatario?.email ? ` · XML: ${previa.destinatario.email}` : ''}
      </p>

      {itens.length > 0 ? (
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Descrição</th>
                <th>{nfse ? 'NBS / ISS' : 'NCM'}</th>
                {!nfse ? <th>CFOP</th> : null}
                <th>Qtde</th>
                <th>Valor</th>
              </tr>
            </thead>
            <tbody>
              {itens.map((it) => (
                <tr key={`${doc.id}-${it.numero}`}>
                  <td>{it.numero}</td>
                  <td>
                    {it.codigo ? <code>{it.codigo}</code> : null}
                    {it.codigo ? ' · ' : ''}
                    {it.descricao}
                  </td>
                  <td>
                    <code>{it.ncm || '—'}</code>
                    {nfse && it.cfop ? (
                      <>
                        {' '}
                        / <code>{it.cfop}</code>
                      </>
                    ) : null}
                  </td>
                  {!nfse ? (
                    <td>
                      <code>{it.cfop || '—'}</code>
                    </td>
                  ) : null}
                  <td>
                    {formatDecimalBr(it.quantidade, 4)} {it.unidade}
                  </td>
                  <td>
                    {it.valor_unitario
                      ? `${formatUnitPrice(it.valor_unitario)} · `
                      : ''}
                    {formatCurrency(it.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {previa?.informacoes_adicionais ? (
        <p className="form-hint">{previa.informacoes_adicionais}</p>
      ) : null}

      {doc.mensagem && !oficial ? <p className="form-hint">{doc.mensagem}</p> : null}

      {!compact && envio ? (
        <details className="nf-previa-envio">
          <summary>Conteúdo do envio ao hub (JSON Focus)</summary>
          <p className="form-hint">
            Este é o contrato do hub — não é o XML autorizado da SEFAZ. Quando o hub for
            cadastrado e testado, o mesmo documento ({doc.codigo}) é enviado com esta
            referência. O XML/DANFE oficiais só existem depois da autorização.
          </p>
          <pre className="nf-previa-json">
            <code>{JSON.stringify(envio, null, 2)}</code>
          </pre>
        </details>
      ) : null}
    </article>
  );
}
