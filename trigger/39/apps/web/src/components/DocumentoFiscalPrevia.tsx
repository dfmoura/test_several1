import type { DocumentoFiscalSaida } from '../lib/api';
import {
  formatCnpjCpf,
  formatCurrency,
  formatDecimalBr,
  formatUnitPrice,
} from '../lib/format';
import { docFiscalStatusLabel, docFiscalTipoLabel } from '../lib/fiscalUi';
import { onAbrirFichaClick } from '../lib/fichaNav';
import { StatusPill } from './StatusPill';

type Props = {
  doc: DocumentoFiscalSaida;
  faturamentoId: number;
  compact?: boolean;
};

function linhaEndereco(doc: DocumentoFiscalSaida): string {
  const d = doc.previa?.destinatario;
  if (!d) return '—';
  const partes = [d.endereco, d.municipio, d.uf].filter((p) => p && String(p).trim() !== '');
  return partes.length > 0 ? partes.join(' · ') : '—';
}

/**
 * Prévia humana da NF-e/NFS-e planejada.
 * Não é DANFE nem XML autorizado — estudo 32: numeração só da SEFAZ via Focus.
 */
export function DocumentoFiscalPreviaCard({ doc, faturamentoId, compact = false }: Props) {
  const previa = doc.previa;
  const oficial = previa?.oficial === true || doc.status === 'AUTORIZADO';
  const itens = previa?.itens ?? [];
  const envio = doc.envio_hub ?? null;
  const nfse = doc.tipo === 'NFSE';

  return (
    <article className={`nf-previa${oficial ? '' : ' nf-previa--rascunho'}`}>
      <header className="nf-previa-head">
        <div>
          <p className="nf-previa-kicker">{oficial ? 'Documento fiscal' : 'Prévia da nota'}</p>
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
          <StatusPill status={docFiscalStatusLabel(doc.status)} />
        </div>
      </header>

      <p className={`nf-previa-banner${oficial ? ' is-ok' : ''}`}>
        {previa?.aviso ??
          'Prévia — aguardando hub Focus. Não é documento fiscal autorizado.'}
      </p>

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
            {oficial && doc.numero != null
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
