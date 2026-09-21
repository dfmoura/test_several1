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

function nomesIguais(a: string, b: string): boolean {
  return a.toLocaleLowerCase('pt-BR') === b.toLocaleLowerCase('pt-BR');
}

/**
 * Uma face comercial + razão legal só quando agrega (não duplica o lead).
 * Preferência: fantasia → razão → fallback.
 */
export function identidadeParteComercial(
  parte: OrcPubParteComercialData | null | undefined,
  leadFallback = '—',
): { display: string; legal: string | null } {
  const fantasia = normNome(parte?.nome_fantasia);
  const razao = normNome(parte?.razao_social) || normNome(leadFallback);
  const display = fantasia || razao || '—';
  const legal = razao && !nomesIguais(razao, display) ? razao : null;
  return { display, legal };
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
  opts?: { showCodigo?: boolean },
): string[] {
  if (!parte) return [];
  const lines: string[] = [];
  if (opts?.showCodigo && parte.codigo) lines.push(parte.codigo);
  if (parte.cnpj) lines.push(`CNPJ ${formatCnpj(parte.cnpj)}`);
  else if (parte.cnpj_cpf) lines.push(`CNPJ/CPF ${formatCnpjCpf(parte.cnpj_cpf)}`);
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
 * Cabeçalho da proposta: marca + emitente compacto (sem card).
 * Um nome no H1; razão legal só no meta se for distinta.
 * Código do documento em linha própria — citável sem competir com a EMP.
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
  const { display, legal } = identidadeParteComercial(empresa, titulo);
  const meta = metaLinhasParteComercial(empresa);
  const endereco = formatEnderecoParceiro(empresa);
  const metaComLegal = legal ? [legal, ...meta] : meta;
  const id = documentoId.trim();
  const metaDoc = (documentoMeta ?? '').trim();

  return (
    <header className="orc-pub-hero">
      <img src={logoSrc} alt={logoAlt} className="orc-pub-logo" />
      <div className="orc-pub-hero-body">
        <p className="orc-pub-kicker">{kicker}</p>
        <h1>{display}</h1>
        {metaComLegal.length > 0 ? (
          <p className="orc-pub-hero-meta">{metaComLegal.join(' · ')}</p>
        ) : null}
        {endereco ? <p className="orc-pub-hero-endereco">{endereco}</p> : null}
        {id ? (
          <div className="orc-pub-doc">
            <p className="orc-pub-doc-id">{id}</p>
            {metaDoc ? <p className="orc-pub-doc-meta">{metaDoc}</p> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

/**
 * Card de parte comercial (Cliente). Mesma regra de nome do hero.
 */
export function OrcPubParteComercial({
  title,
  leadFallback = '—',
  parte,
  showCodigo = false,
}: Props) {
  const { display, legal } = identidadeParteComercial(parte, leadFallback);
  const meta = metaLinhasParteComercial(parte, { showCodigo });
  const endereco = formatEnderecoParceiro(parte);

  return (
    <section className="orc-pub-card">
      <h2>{title}</h2>
      <p className="orc-pub-lead">{display}</p>
      {legal ? <p className="orc-pub-legal">{legal}</p> : null}
      <div className="orc-pub-meta">
        {meta.map((line) => (
          <span key={line}>{line}</span>
        ))}
        {endereco ? <span className="orc-pub-meta-endereco">{endereco}</span> : null}
      </div>
    </section>
  );
}
