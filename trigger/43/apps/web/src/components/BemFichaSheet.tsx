import type { ReactNode } from 'react';
import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import type { BemPatrimonial } from '../lib/api';
import { BRAND } from '../lib/brand';
import { DECIMAL_SCALE, formatDecimalBr } from '../lib/format';
import { bemCategoriaLabel, bemStatusLabel } from '../lib/patrimonio';

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const s = String(value).trim();
  return s === '' ? '—' : s;
}

function yesNo(value: boolean | null | undefined): string {
  return value ? 'Sim' : 'Não';
}

function formatDateBr(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = iso.slice(0, 10);
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
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

function money(value: string | null | undefined): string {
  if (value == null || value === '') return '—';
  return `R$ ${formatDecimalBr(value, DECIMAL_SCALE.money)}`;
}

function statusChipClass(status: string | null | undefined): string {
  const s = (status ?? '').toLowerCase();
  if (s === 'ativo') return 'situacao-ativo';
  if (s === 'em_manutencao') return 'situacao-em_manutencao';
  if (s === 'cedido') return 'situacao-cedido';
  if (s === 'baixado' || s === 'vendido') return 'situacao-baixado';
  return '';
}

type KvProps = {
  label: string;
  value: ReactNode;
  wide?: boolean;
};

function Kv({ label, value, wide }: KvProps) {
  return (
    <div className={`ficha-kv${wide ? ' ficha-kv-wide' : ''}`}>
      <span className="ficha-kv-label">{label}</span>
      <span className="ficha-kv-value">{value}</span>
    </div>
  );
}

function Section({
  title,
  children,
  className = '',
}: {
  title: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`ficha-section ${className}`.trim()}>
      <h3>{title}</h3>
      <div className="ficha-section-body">{children}</div>
    </section>
  );
}

export type BemFichaSheetProps = {
  bem: BemPatrimonial;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
};

/**
 * Ficha patrimonial A4 retrato — mesmo padrão visual de PAR/produto/empresa (BL-015/018/019).
 * Domínio: PATRIMONIO_CONTROLE.txt — controle gerencial; depreciação oficial = contador.
 */
export function BemFichaSheet({ bem: b, empresaNome, emitidoPor, emitidoEm }: BemFichaSheetProps) {
  const marcaModelo = [b.marca, b.modelo].filter(Boolean).join(' · ');
  const isMaquina = b.categoria === 'MAQUINA_GRAFICA';
  const isVeiculo = b.categoria === 'VEICULO';
  const isBaixa = b.status === 'BAIXADO' || b.status === 'VENDIDO';
  const showProducao = isMaquina || Boolean(b.grupo_hora_maquina?.nome);
  const capitalizacao = b.capitalizacao;

  const fornecedorLabel = b.fornecedor
    ? `${b.fornecedor.codigo} — ${b.fornecedor.nome_fantasia || b.fornecedor.razao_social}`
    : '—';

  return (
    <article className="ficha-sheet" aria-label={`Ficha patrimonial ${b.codigo}`}>
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Ficha patrimonial · Bem (BEM)</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{b.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{b.descricao}</h2>
          {marcaModelo ? <p className="ficha-fantasia">{marcaModelo}</p> : null}
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip ${statusChipClass(b.status)}`.trim()}>
            {bemStatusLabel(b.status)}
          </span>
          <span className="ficha-chip ficha-chip-papel">{bemCategoriaLabel(b.categoria)}</span>
          <span className="ficha-chip ficha-chip-muted">
            {b.capitalizado ? 'Capitalizado' : 'Não capitalizado'}
          </span>
          {b.grupo_hora_maquina?.nome ? (
            <span className="ficha-chip ficha-chip-muted">
              ORC · {b.grupo_hora_maquina.nome}
            </span>
          ) : null}
        </div>
      </div>

      <div className="ficha-kv-strip">
        <Kv label="Código" value={b.codigo} />
        <Kv label="Valor aquisição" value={money(b.valor_aquisicao)} />
        <Kv label="Departamento" value={dash(b.departamento?.nome ?? b.local)} />
        <Kv label="Nº de série" value={dash(b.numero_serie)} />
      </div>

      <div className="ficha-columns">
        <Section title="Identificação">
          <div className="ficha-kv-grid cols-2">
            <Kv label="Categoria" value={bemCategoriaLabel(b.categoria)} wide />
            <Kv label="Status" value={bemStatusLabel(b.status)} />
            <Kv label="Marca" value={dash(b.marca)} />
            <Kv label="Modelo" value={dash(b.modelo)} />
            <Kv label="Nº de série" value={dash(b.numero_serie)} wide />
            <Kv label="Capitalizado" value={yesNo(b.capitalizado)} />
          </div>
        </Section>

        <Section title="Localização e responsável">
          <div className="ficha-kv-grid cols-2">
            <Kv label="Departamento" value={dash(b.departamento?.nome ?? b.local)} wide />
            <Kv label="Responsável" value={dash(b.responsavel)} wide />
            {showProducao ? (
              <Kv
                label="Grupo hora-máquina (ORC)"
                value={dash(b.grupo_hora_maquina?.nome)}
                wide
              />
            ) : null}
            {isVeiculo ? (
              <>
                <Kv label="Placa" value={dash(b.placa)} />
                <Kv label="RENAVAM" value={dash(b.renavam)} />
              </>
            ) : null}
          </div>
        </Section>
      </div>

      <Section title="Aquisição">
        <div className="ficha-kv-grid cols-4">
          <Kv label="Data aquisição" value={formatDateBr(b.adquirido_em)} />
          <Kv label="Valor" value={money(b.valor_aquisicao)} />
          <Kv label="NF / documento" value={dash(b.nf_numero)} />
          <Kv label="Garantia até" value={formatDateBr(b.garantia_ate)} />
          <Kv label="Fornecedor" value={fornecedorLabel} wide />
          <Kv
            label="Vida útil (gerencial)"
            value={b.vida_util_meses != null ? `${b.vida_util_meses} meses` : '—'}
          />
          <Kv label="Capitalizado" value={yesNo(b.capitalizado)} />
        </div>
        {capitalizacao?.abaixo_do_minimo && capitalizacao.mensagem ? (
          <p className="ficha-note" style={{ marginTop: '1.5mm' }}>
            {capitalizacao.mensagem}
          </p>
        ) : null}
      </Section>

      {isBaixa ? (
        <Section title="Baixa / alienação">
          <div className="ficha-kv-grid cols-2">
            <Kv label="Status" value={bemStatusLabel(b.status)} />
            <Kv label="Data da baixa" value={formatDateBr(b.baixado_em)} />
            <Kv label="Motivo" value={dash(b.motivo_baixa)} wide />
          </div>
        </Section>
      ) : null}

      {b.observacao ? (
        <Section title="Observações">
          <p className="ficha-note" style={{ margin: 0, whiteSpace: 'pre-wrap' }}>
            {b.observacao}
          </p>
        </Section>
      ) : null}

      <p className="ficha-note">
        Controle patrimonial <strong>gerencial</strong> (estudo 32 · PATRIMONIO_CONTROLE). Não substitui
        o imobilizado nem a depreciação fiscal/contábil do contador. Etiqueta física sugerida:{' '}
        <code>{b.codigo}</code>.
      </p>

      <RegistroMetaStrip registro={b} className="ficha-autoria" />

      <footer className="ficha-footer">
        <span>
          Uso interno · bem patrimonial BEM · emitido por {emitidoPor}
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
