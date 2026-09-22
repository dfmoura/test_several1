import { formatCnpj, formatCnpjCpf, formatPhone } from '../lib/format';
import { formatEnderecoParceiro } from '../lib/pedidoConfirmacao';

export type OrcPubParteComercialData = {
  razao_social?: string | null;
  nome_fantasia?: string | null;
  codigo?: string | null;
  /** CNPJ da EMP (só dígitos / formatado). */
  cnpj?: string | null;
  /** CNPJ/CPF do PAR. */
  cnpj_cpf?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  logradouro?: string | null;
  numero?: string | null;
  complemento?: string | null;
  bairro?: string | null;
  municipio?: string | null;
  uf?: string | null;
  cep?: string | null;
};

type Props = {
  title: string;
  /** Fallback se fantasia/razão vierem vazios. */
  leadFallback?: string;
  parte: OrcPubParteComercialData | null | undefined;
  /** Exibe código interno (PAR-/EMP-) — útil em confirmação PED. */
  showCodigo?: boolean;
};

function normNome(value: string | null | undefined): string {
  return (value ?? '').trim().replace(/\s+/g, ' ');
}

/**
 * Uma face comercial só (fantasia → razão → fallback).
 * Não devolve razão em paralelo: CNPJ já identifica o jurídico no meta —
 * evitar nome duas vezes na proposta / ficha-cliente.
 */
export function identidadeParteComercial(
  parte: OrcPubParteComercialData | null | undefined,
  leadFallback = '—',
): { display: string; legal: string | null } {
  const fantasia = normNome(parte?.nome_fantasia);
  const razao = normNome(parte?.razao_social) || normNome(leadFallback);
  const display = fantasia || razao || '—';
  return { display, legal: null };
}

/** @deprecated Preferir `identidadeParteComercial(...).display`. */
export function razaoParteComercial(
  parte: OrcPubParteComercialData | null | undefined,
  leadFallback = '—',
): string {
  return identidadeParteComercial(parte, leadFallback).display;
}

/** Linhas compactas de identidade (CNPJ · tel · e-mail · WhatsApp · código). */
export function metaLinhasParteComercial(
  parte: OrcPubParteComercialData | null | undefined,
  opts?: { showCodigo?: boolean; showDocumento?: boolean },
): string[] {
  if (!parte) return [];
  const lines: string[] = [];
  if (opts?.showCodigo && parte.codigo) lines.push(parte.codigo);
  const showDocumento = opts?.showDocumento !== false;
  if (showDocumento) {
    if (parte.cnpj) lines.push(`CNPJ ${formatCnpj(parte.cnpj)}`);
    else if (parte.cnpj_cpf) lines.push(`CNPJ/CPF ${formatCnpjCpf(parte.cnpj_cpf)}`);
  }
  if (parte.telefone) lines.push(formatPhone(parte.telefone));
  const waRaw = (parte.whatsapp || '').trim();
  const telDigits = (parte.telefone || '').replace(/\D/g, '');
  const waDigits = waRaw.replace(/\D/g, '');
  if (waRaw && waDigits && waDigits !== telDigits) {
    lines.push(`WhatsApp ${formatPhone(waRaw)}`);
  }
  if (parte.email) lines.push(parte.email);
  return lines;
}

type HeroEmitenteProps = {
  kicker: string;
  /** Fallback se a EMP não trouxer fantasia/razão. */
  titulo: string;
  empresa: OrcPubParteComercialData | null | undefined;
  /** Âncora do documento (ex.: ORC-2026-00001) — destaque tipográfico calmo. */
  documentoId: string;
  /** Eco quieto (versão · validade · origem). */
  documentoMeta?: string | null;
  logoSrc: string;
  logoAlt: string;
};

/**
 * Letterhead comercial (EMP herói · selo FLEXOERP · ORC/PED à direita).
 * Mesma linguagem tipográfica das fichas operacionais (`ficha-masthead`),
 * sem barra chapada — norma: docs/IDENTIDADE_TRIGGER.md.
 */
export function OrcPubHeroEmitente({
  kicker,
  titulo,
  empresa,
  documentoId,
  documentoMeta,
  logoSrc,
  logoAlt,
}: HeroEmitenteProps) {
  const { display } = identidadeParteComercial(empresa, titulo);
  const meta = metaLinhasParteComercial(empresa);
  const endereco = formatEnderecoParceiro(empresa);
  const id = documentoId.trim();
  const metaDoc = (documentoMeta ?? '').trim();

  return (
    <header className="orc-pub-hero">
      <div className="orc-pub-letterhead">
        <div className="orc-pub-letterhead-brand">
          <img src={logoSrc} alt={logoAlt} className="orc-pub-logo" />
          <div className="orc-pub-hero-body">
            <h1>{display}</h1>
            {meta.length > 0 ? (
              <p className="orc-pub-hero-meta">{meta.join(' · ')}</p>
            ) : null}
            {endereco ? <p className="orc-pub-hero-endereco">{endereco}</p> : null}
          </div>
        </div>
        {id ? (
          <div className="orc-pub-letterhead-id">
            <p className="orc-pub-doc-id">{id}</p>
            {metaDoc ? <p className="orc-pub-doc-meta">{metaDoc}</p> : null}
          </div>
        ) : null}
      </div>
      <div className="orc-pub-title-block">
        <p className="orc-pub-kicker">{kicker}</p>
      </div>
    </header>
  );
}

/**
 * Bloco tipográfico de parte comercial (Cliente). Mesma regra de nome do letterhead.
 */
export function OrcPubParteComercial({
  title,
  leadFallback = '—',
  parte,
  showCodigo = false,
}: Props) {
  const { display } = identidadeParteComercial(parte, leadFallback);
  const meta = metaLinhasParteComercial(parte, { showCodigo });
  const endereco = formatEnderecoParceiro(parte);

  return (
    <section className="orc-pub-card">
      <h2>{title}</h2>
      <p className="orc-pub-lead">{display}</p>
      <div className="orc-pub-meta">
        {meta.map((line) => (
          <span key={line}>{line}</span>
        ))}
        {endereco ? <span className="orc-pub-meta-endereco">{endereco}</span> : null}
      </div>
    </section>
  );
}
