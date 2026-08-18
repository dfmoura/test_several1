import { TriggerAttribution } from './TriggerAttribution';
import type { DocumentoFiscalSaida, Faturamento } from '../lib/api';
import { BRAND } from '../lib/brand';
import {
  formatCep,
  formatCnpjCpf,
  formatDate,
  formatDecimalBr,
} from '../lib/format';

type Props = {
  fat: Faturamento;
  doc: DocumentoFiscalSaida;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

function Cell({
  label,
  value,
  className,
  bold,
}: {
  label: string;
  value?: string | null;
  className?: string;
  bold?: boolean;
}) {
  return (
    <div className={`danfe-cell${className ? ` ${className}` : ''}`}>
      <span className="danfe-lbl">{label}</span>
      <span className={`danfe-val${bold ? ' is-bold' : ''}`}>{value && String(value).trim() !== '' ? value : ' '}</span>
    </div>
  );
}

function money(v: string | number | null | undefined): string {
  const n = formatDecimalBr(v, 2);
  return n === '—' ? '0,00' : n;
}

function chaveGrupos(chave: string | null | undefined): string {
  const d = (chave ?? '').replace(/\D/g, '');
  if (d.length !== 44) return '';
  return d.replace(/(\d{4})(?=\d)/g, '$1 ').trim();
}

function nfeNumero(n: number | null | undefined): string {
  if (n == null) return '—';
  const digits = String(n).replace(/\D/g, '').padStart(9, '0').slice(-9);
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
}

function serieFmt(s: number | null | undefined): string {
  if (s == null) return '—';
  return String(s).replace(/\D/g, '').padStart(3, '0') || '—';
}

/**
 * Documento auxiliar da nota (DANFE / DANFSe) — layout do 28 + exemplo 32/nfe_venda.
 * Sem hub: imprime a nota com marca de prévia. Não inventa chave/número/protocolo.
 */
export function DocumentoFiscalFichaSheet({ fat, doc, empresaNome, emitidoPor, emitidoEm }: Props) {
  const p = doc.previa;
  const oficial = p?.oficial === true;
  const simulada = p?.simulada === true;
  const nfse = doc.tipo === 'NFSE';

  return nfse ? (
    <DanfseLayout
      fat={fat}
      doc={doc}
      empresaNome={empresaNome}
      emitidoPor={emitidoPor}
      emitidoEm={emitidoEm}
      oficial={oficial}
      simulada={simulada}
    />
  ) : (
    <DanfeLayout
      fat={fat}
      doc={doc}
      empresaNome={empresaNome}
      emitidoPor={emitidoPor}
      emitidoEm={emitidoEm}
      oficial={oficial}
      simulada={simulada}
    />
  );
}

function homologacao(doc: DocumentoFiscalSaida): boolean {
  return (doc.ambiente ?? '').toLowerCase() === 'homologacao';
}

function seloFiscal({
  oficial,
  simulada,
  homolog,
}: {
  oficial: boolean;
  simulada: boolean;
  homolog: boolean;
}): string | null {
  if (simulada) return 'SIMULADA — SEM VALOR FISCAL (SEM CERTIFICADO A1)';
  if (!oficial) return 'PRÉVIA — SEM VALOR FISCAL';
  if (homolog) return 'AMBIENTE DE HOMOLOGAÇÃO — SEM VALOR FISCAL';
  return null;
}

function DanfeLayout({
  fat,
  doc,
  emitidoPor,
  emitidoEm,
  oficial,
  simulada,
}: Props & { oficial: boolean; simulada: boolean }) {
  const p = doc.previa;
  const emit = p?.emitente;
  const dest = p?.destinatario;
  const itens = p?.itens ?? [];
  const dups = p?.duplicatas ?? [];
  const total = p?.valor_total ?? doc.valor;
  const comNumeracao = oficial || simulada;
  const chave = comNumeracao ? doc.chave ?? p?.chave : null;
  const numero = comNumeracao ? nfeNumero(doc.numero) : '—';
  const serie = comNumeracao ? serieFmt(doc.serie) : '—';
  const selo = seloFiscal({ oficial, simulada, homolog: homologacao(doc) });
  const emitLinha = [
    [emit?.logradouro, emit?.numero].filter(Boolean).join(', '),
    [emit?.bairro, emit?.cep ? formatCep(emit.cep) : ''].filter(Boolean).join(' — '),
    [emit?.municipio && emit?.uf ? `${emit.municipio} — ${emit.uf}` : emit?.municipio, emit?.telefone ? `Fone ${emit.telefone}` : '']
      .filter(Boolean)
      .join(' '),
  ]
    .filter((l) => l && String(l).trim())
    .join('\n');

  return (
    <article
      className={`ficha-sheet danfe-sheet${oficial ? '' : ' danfe-sheet-rascunho'}`}
      aria-label="DANFE — Documento Auxiliar da NF-e"
    >
      {!oficial ? (
        <div className="danfe-watermark" aria-hidden>
          {simulada ? 'SIMULADA SEM VALOR FISCAL' : 'PRÉVIA SEM VALOR FISCAL'}
        </div>
      ) : null}

      <div className="danfe-canhoto">
        <div className="danfe-canhoto-main">
          <p className="danfe-canhoto-txt">
            RECEBEMOS DE {(emit?.nome ?? '').toUpperCase()} OS PRODUTOS E/OU SERVIÇOS CONSTANTES DA
            NOTA FISCAL ELETRÔNICA INDICADA AO LADO.
          </p>
          <p className="danfe-canhoto-meta">
            EMISSÃO: {comNumeracao ? formatDate(p?.data_emissao) : '—'} · VALOR TOTAL: {money(total)} ·
            DESTINATÁRIO: {dest?.nome ?? '—'}
          </p>
          <div className="danfe-canhoto-sign">
            <span>DATA DE RECEBIMENTO</span>
            <span>IDENTIFICAÇÃO E ASSINATURA DO RECEBEDOR</span>
          </div>
        </div>
        <div className="danfe-canhoto-nf">
          <strong>NF-e</strong>
          <span>Nº {numero}</span>
          <span>Série {serie}</span>
        </div>
      </div>
      <div className="danfe-cut">· · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · · ·</div>

      <div className="danfe-head">
        <div className="danfe-emit">
          <span className="danfe-lbl">Identificação do emitente</span>
          <img src={BRAND.licensee.logo} alt="" className="danfe-logo" />
          <strong>{emit?.nome}</strong>
          <pre className="danfe-addr">{emitLinha || emit?.endereco}</pre>
        </div>
        <div className="danfe-title">
          <strong>DANFE</strong>
          <span>Documento Auxiliar da Nota Fiscal Eletrônica</span>
          <span className="danfe-io">0 — ENTRADA</span>
          <span className="danfe-io is-out">1 — SAÍDA · 1</span>
          <span>Nº {numero}</span>
          <span>Série {serie}</span>
        </div>
        <div className="danfe-chave">
          <span className="danfe-lbl">Chave de acesso</span>
          {chave && chave.replace(/\D/g, '').length === 44 ? (
            <code className="danfe-chave-num">{chaveGrupos(chave)}</code>
          ) : (
            <p className="danfe-chave-empty">Chave indisponível — aguardando autorização no hub Focus</p>
          )}
          <p className="danfe-consulta">
            Consulta de autenticidade no portal nacional da NF-e. Sem chave não há consulta.
          </p>
          {selo ? <p className="danfe-homolog">{selo}</p> : null}
        </div>
      </div>

      <div className="danfe-row">
        <Cell label="Natureza da operação" value={p?.natureza} className="w-58" />
        <Cell
          label="Protocolo de autorização de uso"
          value={comNumeracao && (doc.protocolo || p?.protocolo) ? String(doc.protocolo ?? p?.protocolo) : '—'}
          className="w-42"
        />
      </div>
      <div className="danfe-row">
        <Cell label="Inscrição estadual" value={emit?.ie || 'ISENTO'} className="w-34" />
        <Cell label="Inscr. est. do subst. tributário" value=" " className="w-33" />
        <Cell label="CNPJ" value={emit?.cnpj ? formatCnpjCpf(emit.cnpj) : ' '} className="w-33" />
      </div>

      <h3 className="danfe-sec">Destinatário / remetente</h3>
      <div className="danfe-row">
        <Cell label="Nome / razão social" value={dest?.nome} className="w-58" />
        <Cell label="CNPJ / CPF" value={dest?.documento ? formatCnpjCpf(dest.documento) : ' '} className="w-24" />
        <Cell label="Data da emissão" value={comNumeracao ? formatDate(p?.data_emissao) : '—'} className="w-18" />
      </div>
      <div className="danfe-row">
        <Cell label="Endereço" value={dest?.endereco} className="w-48" />
        <Cell label="Bairro / distrito" value={dest?.bairro} className="w-22" />
        <Cell label="CEP" value={dest?.cep ? formatCep(dest.cep) : ' '} className="w-14" />
        <Cell label="Data da saída" value=" " className="w-16" />
      </div>
      <div className="danfe-row">
        <Cell label="Município" value={dest?.municipio} className="w-38" />
        <Cell label="UF" value={dest?.uf} className="w-08" />
        <Cell label="Fone / fax" value=" " className="w-18" />
        <Cell label="Inscrição estadual" value={dest?.ie} className="w-20" />
        <Cell label="Hora da saída" value=" " className="w-16" />
      </div>

      <h3 className="danfe-sec">Fatura / duplicata</h3>
      <div className="danfe-dups">
        {dups.length === 0 ? (
          <Cell label="Duplicata" value="—" />
        ) : (
          dups.slice(0, 4).map((d) => (
            <div key={d.numero} className="danfe-dup">
              <span>Num. {d.numero}</span>
              <span>Venc. {formatDate(d.vencimento)}</span>
              <strong>Valor {money(d.valor)}</strong>
            </div>
          ))
        )}
      </div>

      <h3 className="danfe-sec">Cálculo do imposto</h3>
      <div className="danfe-row danfe-tax">
        <Cell label="Base cálc. ICMS" value="0,00" />
        <Cell label="Valor do ICMS" value="0,00" />
        <Cell label="Base ICMS S.T." value="0,00" />
        <Cell label="Valor ICMS subst." value="0,00" />
        <Cell label="V. total produtos" value={money(total)} bold />
      </div>
      <div className="danfe-row danfe-tax">
        <Cell label="Valor do frete" value="0,00" />
        <Cell label="Valor do seguro" value="0,00" />
        <Cell label="Desconto" value="0,00" />
        <Cell label="Outras despesas" value="0,00" />
        <Cell label="V. total da nota" value={money(total)} bold />
      </div>

      <h3 className="danfe-sec">Transportador / volumes</h3>
      <div className="danfe-row">
        <Cell label="Nome / razão social" value=" " className="w-40" />
        <Cell label="Frete" value="9 — Sem transporte" className="w-16" />
        <Cell label="Código ANTT" value=" " className="w-12" />
        <Cell label="Placa" value=" " className="w-12" />
        <Cell label="UF" value=" " className="w-06" />
        <Cell label="CNPJ / CPF" value=" " className="w-14" />
      </div>

      <h3 className="danfe-sec">Dados dos produtos / serviços</h3>
      <table className="danfe-items">
        <thead>
          <tr>
            <th>Cód.</th>
            <th>Descrição do produto / serviço</th>
            <th>NCM/SH</th>
            <th>O/CSOSN</th>
            <th>CFOP</th>
            <th>Un</th>
            <th>Quant.</th>
            <th>V. unit.</th>
            <th>V. total</th>
          </tr>
        </thead>
        <tbody>
          {itens.map((it) => (
            <tr key={`${doc.id}-${it.numero}`}>
              <td>{it.codigo || ' '}</td>
              <td>{it.descricao}</td>
              <td>{it.ncm}</td>
              <td>0/{it.csosn || '102'}</td>
              <td>{it.cfop}</td>
              <td>{it.unidade}</td>
              <td className="num">{formatDecimalBr(it.quantidade, 4)}</td>
              <td className="num">{formatDecimalBr(it.valor_unitario, 4)}</td>
              <td className="num">{money(it.valor)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <h3 className="danfe-sec">Dados adicionais</h3>
      <div className="danfe-adic">
        <div>
          <span className="danfe-lbl">Informações complementares</span>
          <p>
            Inf. contribuinte: {p?.informacoes_adicionais || `Pedido ${p?.pedido ?? fat.pedido?.codigo ?? '—'} · Fatura ${p?.faturamento ?? fat.codigo}`}
          </p>
        </div>
        <div>
          <span className="danfe-lbl">Reservado ao fisco</span>
          <p>
            {oficial
              ? ' '
              : simulada
                ? 'Autorização de teste — sem certificado A1. Sem valor fiscal. Não consultar no portal da NF-e.'
                : 'Prévia operacional — hub Focus ainda não autorizou. Sem valor fiscal. Numeração só da SEFAZ.'}
          </p>
        </div>
      </div>

      <footer className="danfe-foot">
        <span>
          {oficial ? 'DANFE' : simulada ? 'DANFE de teste' : 'Prévia DANFE'} · {fat.codigo} · {emitidoPor} ·{' '}
          {emitidoEm.toLocaleString('pt-BR')}
        </span>
        <TriggerAttribution variant="print" className="ficha-powered" logoClassName="ficha-trigger" />
      </footer>
    </article>
  );
}

function DanfseLayout({
  fat,
  doc,
  emitidoPor,
  emitidoEm,
  oficial,
  simulada,
}: Props & { oficial: boolean; simulada: boolean }) {
  const p = doc.previa;
  const emit = p?.emitente;
  const dest = p?.destinatario;
  const item = p?.itens?.[0];
  const total = p?.valor_total ?? doc.valor;
  const comNumeracao = oficial || simulada;
  const numero = comNumeracao && doc.numero != null ? String(doc.numero) : '—';
  const serie = comNumeracao && doc.serie != null ? String(doc.serie) : '—';
  const selo = seloFiscal({ oficial, simulada, homolog: homologacao(doc) });

  return (
    <article
      className={`ficha-sheet danfe-sheet danfse-sheet${oficial ? '' : ' danfe-sheet-rascunho'}`}
      aria-label="DANFSe — Documento Auxiliar da NFS-e"
    >
      {!oficial ? (
        <div className="danfe-watermark" aria-hidden>
          {simulada ? 'SIMULADA SEM VALOR FISCAL' : 'PRÉVIA SEM VALOR FISCAL'}
        </div>
      ) : null}

      <div className="danfse-band">
        <img src={BRAND.licensee.logo} alt="" className="danfe-logo" />
        <div className="danfse-band-title">
          <strong>NFS-e</strong>
          <span>Documento Auxiliar da Nota Fiscal de Serviços Eletrônica Nacional</span>
        </div>
        <div className="danfse-band-num">
          <span className="danfe-lbl">Número / série</span>
          <strong>
            {numero} / {serie}
          </strong>
          {selo ? <span className="danfe-homolog">{selo}</span> : null}
        </div>
      </div>

      <h3 className="danfe-sec">Prestador de serviços</h3>
      <div className="danfe-row">
        <Cell label="Razão social" value={emit?.nome} className="w-58" />
        <Cell label="CNPJ" value={emit?.cnpj ? formatCnpjCpf(emit.cnpj) : ' '} className="w-24" />
        <Cell label="IM" value={emit?.im || '—'} className="w-18" />
      </div>
      <div className="danfe-row">
        <Cell label="Endereço" value={emit?.endereco} className="w-58" />
        <Cell
          label="Município / UF"
          value={[emit?.municipio, emit?.uf].filter(Boolean).join(' / ')}
          className="w-24"
        />
        <Cell label="CEP" value={emit?.cep ? formatCep(emit.cep) : ' '} className="w-18" />
      </div>

      <h3 className="danfe-sec">Tomador de serviços</h3>
      <div className="danfe-row">
        <Cell label="Nome / razão social" value={dest?.nome} className="w-58" />
        <Cell label="CNPJ / CPF" value={dest?.documento ? formatCnpjCpf(dest.documento) : ' '} className="w-24" />
        <Cell label="E-mail" value={dest?.email} className="w-18" />
      </div>
      <div className="danfe-row">
        <Cell label="Endereço" value={dest?.endereco} className="w-58" />
        <Cell
          label="Município / UF"
          value={[dest?.municipio, dest?.uf].filter(Boolean).join(' / ')}
          className="w-24"
        />
        <Cell label="CEP" value={dest?.cep ? formatCep(dest.cep) : ' '} className="w-18" />
      </div>

      <h3 className="danfe-sec">Discriminação dos serviços</h3>
      <div className="danfse-disc">{item?.descricao || p?.informacoes_adicionais || '—'}</div>
      <div className="danfe-row">
        <Cell label="Código tributação nacional ISS" value={item?.cfop} className="w-34" />
        <Cell label="NBS" value={item?.ncm} className="w-33" />
        <Cell label="Competência" value={oficial ? p?.competencia : '—'} className="w-33" />
      </div>
      <div className="danfe-row">
        <Cell label="Valor do serviço" value={money(total)} className="w-34" bold />
        <Cell label="Chave de acesso" value={oficial && doc.chave ? doc.chave : 'Aguardando autorização'} className="w-66" />
      </div>

      <div className="danfe-adic">
        <div>
          <span className="danfe-lbl">Informações complementares</span>
          <p>
            {p?.informacoes_adicionais || `Pedido ${p?.pedido ?? fat.pedido?.codigo ?? '—'} · Fatura ${p?.faturamento ?? fat.codigo}`}
          </p>
        </div>
        <div>
          <span className="danfe-lbl">Reservado ao fisco</span>
          <p>
            {oficial
              ? ' '
              : 'Prévia operacional — hub Focus ainda não autorizou. Sem valor fiscal. Número da NFS-e só na autorização.'}
          </p>
        </div>
      </div>

      <footer className="danfe-foot">
        <span>
          {oficial ? 'DANFSe' : simulada ? 'DANFSe de teste' : 'Prévia DANFSe'} · {fat.codigo} · {emitidoPor} ·{' '}
          {emitidoEm.toLocaleString('pt-BR')}
        </span>
        <TriggerAttribution variant="print" className="ficha-powered" logoClassName="ficha-trigger" />
      </footer>
    </article>
  );
}
