import type { ReactNode } from 'react';
import { RegistroMetaStrip } from './RegistroMetaStrip';
import { TriggerAttribution } from './TriggerAttribution';
import type { Parceiro } from '../lib/api';
import { BRAND } from '../lib/brand';
import {
  formatCep,
  formatCnae,
  formatCnpjCpf,
  formatDecimalBr,
  formatPhone,
  DECIMAL_SCALE,
} from '../lib/format';
import { finalidadeLabel, ieStatusLabel, indIeDestLabel, regimeLabel } from '../lib/parceiroFiscal';
import { formaPagamentoLabel } from '../lib/condicoesComerciais';

const PAPEIS: Array<{ key: keyof Parceiro; label: string }> = [
  { key: 'papel_cliente', label: 'Cliente' },
  { key: 'papel_fornecedor', label: 'Fornecedor' },
  { key: 'papel_colaborador', label: 'Colaborador' },
  { key: 'papel_transportadora', label: 'Transportadora' },
  { key: 'papel_banco', label: 'Banco' },
  { key: 'papel_entidade', label: 'Entidade' },
  { key: 'papel_vendedor', label: 'Vendedor' },
  { key: 'papel_contador', label: 'Contador' },
];

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const s = String(value).trim();
  return s === '' ? '—' : s;
}

function yesNo(value: boolean | null | undefined): string {
  return value ? 'Sim' : 'Não';
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

function tipoPessoaLabel(tipo: string | null | undefined): string {
  if (tipo === 'PJ') return 'PJ';
  if (tipo === 'PF') return 'PF';
  if (tipo === 'ESTRANGEIRO') return 'Estrangeiro';
  return dash(tipo);
}

function situacaoLabel(s: string | null | undefined): string {
  const map: Record<string, string> = {
    ATIVO: 'Ativo',
    INATIVO: 'Inativo',
    BLOQUEADO: 'Bloqueado',
  };
  return s ? (map[s] ?? s) : '—';
}

function tipoFornecimentoLabel(v: string | null | undefined): string {
  const map: Record<string, string> = {
    MERCADORIA: 'Mercadoria',
    SERVICO: 'Serviço',
    UTILIDADE: 'Utilidade',
    TRIBUTO_TAXA: 'Tributo / taxa',
  };
  return v ? (map[v] ?? v) : '—';
}

function vinculoLabel(v: string | null | undefined): string {
  const map: Record<string, string> = {
    CLT: 'CLT',
    SOCIO: 'Sócio (vínculo)',
    ESTAGIARIO: 'Estagiário',
    AUTONOMO: 'Autônomo',
    PJ: 'PJ (prestador)',
  };
  return v ? (map[v] ?? v) : '—';
}

function tipoContaLabel(v: string | null | undefined): string {
  const map: Record<string, string> = {
    CORRENTE: 'Corrente',
    POUPANCA: 'Poupança',
    PAGAMENTO: 'Pagamento',
  };
  return v ? (map[v] ?? v) : '—';
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

export type ParceiroFichaSheetProps = {
  parceiro: Parceiro;
  empresaNome: string;
  emitidoPor: string;
  emitidoEm: Date;
  /** SoD — estudo 32 §6 / UC-CAD-007 */
  showBancario: boolean;
  showCredito: boolean;
};

export function ParceiroFichaSheet({
  parceiro: p,
  empresaNome,
  emitidoPor,
  emitidoEm,
  showBancario,
  showCredito,
}: ParceiroFichaSheetProps) {
  const papeis = PAPEIS.filter((item) => Boolean(p[item.key])).map((item) => item.label);
  const contatos = [...(p.contatos ?? [])].sort((a, b) => {
    if (a.principal !== b.principal) return a.principal ? -1 : 1;
    return (a.ordem ?? 0) - (b.ordem ?? 0);
  });
  const contas = [...(p.contas_bancarias ?? [])].sort((a, b) => {
    if (a.principal !== b.principal) return a.principal ? -1 : 1;
    return (a.ordem ?? 0) - (b.ordem ?? 0);
  });
  const enderecosEntrega = [...(p.enderecos_entrega ?? [])].sort((a, b) => {
    if (a.principal !== b.principal) return a.principal ? -1 : 1;
    return (a.ordem ?? 0) - (b.ordem ?? 0);
  });
  const cnaesSec = Array.isArray(p.cnaes_secundarios) ? p.cnaes_secundarios : [];
  const showLegadoContato = hasText(p.contato_nome) || hasText(p.contato_funcao);
  const showPapelExtra = p.papel_fornecedor || p.papel_colaborador;

  return (
    <article className="ficha-sheet" aria-label={`Ficha do parceiro ${p.codigo}`}>
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{empresaNome}</strong>
            <span className="ficha-doc-label">Ficha cadastral · Parceiro (PAR)</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{p.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{p.razao_social}</h2>
          {p.nome_fantasia ? <p className="ficha-fantasia">{p.nome_fantasia}</p> : null}
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip situacao-${(p.situacao ?? '').toLowerCase()}`}>
            {situacaoLabel(p.situacao)}
          </span>
          {p.is_prospect ? <span className="ficha-chip ficha-chip-muted">Prospect</span> : null}
          <span className="ficha-chip ficha-chip-muted">{tipoPessoaLabel(p.tipo_pessoa)}</span>
          {papeis.map((papel) => (
            <span key={papel} className="ficha-chip ficha-chip-papel">
              {papel}
            </span>
          ))}
        </div>
      </div>

      <div className="ficha-kv-strip">
        <Kv label="CNPJ / CPF" value={formatCnpjCpf(p.cnpj_cpf) || '—'} />
        <Kv
          label="Cadastro fiscal"
          value={p.cadastro_fiscal_completo ? 'Completo' : 'Incompleto'}
        />
        <Kv label="Emite / recebe NF-e" value={yesNo(p.emite_documento_fiscal)} />
        <Kv label="Apto emissão NF-e" value={yesNo(p.apto_emissao_nfe)} />
      </div>

      <div className="ficha-columns">
        <Section title="Endereço fiscal">
          <div className="ficha-kv-grid cols-2">
            <Kv label="Logradouro" value={dash(p.logradouro)} wide />
            <Kv label="Nº" value={dash(p.numero)} />
            <Kv label="Complemento" value={dash(p.complemento)} />
            <Kv label="Bairro" value={dash(p.bairro)} />
            <Kv
              label="Município / UF"
              value={[p.municipio, p.uf].filter(Boolean).join(' / ') || '—'}
            />
            <Kv label="CEP" value={p.cep ? formatCep(p.cep) : '—'} />
            <Kv label="IBGE" value={dash(p.ibge)} />
          </div>
        </Section>

        <Section title="Canais">
          <div className="ficha-kv-grid cols-2">
            <Kv label="Telefone" value={formatPhone(p.telefone) || '—'} />
            <Kv label="WhatsApp" value={formatPhone(p.whatsapp) || '—'} />
            <Kv label="E-mail" value={dash(p.email)} wide />
            <Kv label="E-mail XML/DANFE" value={dash(p.email_xml)} wide />
            {showLegadoContato ? (
              <>
                <Kv label="Contato" value={dash(p.contato_nome)} />
                <Kv label="Função" value={dash(p.contato_funcao)} />
              </>
            ) : null}
          </div>
        </Section>
      </div>

      <Section title="Entrega">
        {enderecosEntrega.length === 0 ? (
          <p className="ficha-inline-list">Mesmo do endereço fiscal</p>
        ) : (
          <table className="ficha-table">
            <colgroup>
              <col style={{ width: '14%' }} />
              <col style={{ width: '34%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '16%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Apelido</th>
                <th>Endereço</th>
                <th>Responsável</th>
                <th>Telefone</th>
                <th>Documento</th>
              </tr>
            </thead>
            <tbody>
              {enderecosEntrega.map((e, idx) => (
                <tr key={e.id ?? `${e.apelido}-${idx}`}>
                  <td>
                    {dash(e.apelido)}
                    {e.principal ? <span className="ficha-flag">P</span> : null}
                  </td>
                  <td>
                    {[e.logradouro, e.numero].filter(Boolean).join(', ') || '—'}
                    {e.complemento ? ` — ${e.complemento}` : ''}
                    <br />
                    {[e.bairro, [e.municipio, e.uf].filter(Boolean).join('/')].filter(Boolean).join(' · ')}
                    {e.cep ? ` · ${formatCep(e.cep)}` : ''}
                    {e.observacoes ? (
                      <>
                        <br />
                        <em>{e.observacoes}</em>
                      </>
                    ) : null}
                  </td>
                  <td>{dash(e.responsavel_nome)}</td>
                  <td>{formatPhone(e.responsavel_telefone) || '—'}</td>
                  <td>{dash(e.responsavel_documento)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Section>

      <Section title="Fiscal">
        <div className="ficha-kv-grid cols-4">
          <Kv label="IE" value={dash(p.ie)} />
          <Kv
            label="indIEDest"
            value={p.ind_ie_dest != null ? indIeDestLabel(p.ind_ie_dest) : '—'}
          />
          <Kv label="Status IE" value={p.ie_status ? ieStatusLabel(p.ie_status) : '—'} />
          <Kv label="IE consultada" value={formatDateBr(p.ie_consultado_em)} />
          <Kv label="IM" value={dash(p.im)} />
          <Kv label="SUFRAMA" value={dash(p.suframa)} />
          <Kv label="Área incentivada" value={yesNo(p.area_incentivada)} />
          <Kv label="Consumidor final" value={yesNo(p.consumidor_final)} />
          <Kv label="Regime" value={p.regime ? regimeLabel(p.regime) : '—'} />
          <Kv label="Regime desde" value={formatDateBr(p.regime_desde)} />
          <Kv
            label="Finalidade"
            value={p.finalidade ? finalidadeLabel(p.finalidade) : '—'}
          />
          <Kv label="CNAE principal" value={p.cnae ? formatCnae(p.cnae) : '—'} />
        </div>
        {cnaesSec.length > 0 ? (
          <p className="ficha-inline-list">
            <strong>CNAE secundário:</strong>{' '}
            {cnaesSec
              .map((item) =>
                item.descricao
                  ? `${formatCnae(item.codigo)} (${item.descricao})`
                  : formatCnae(item.codigo),
              )
              .join(' · ')}
          </p>
        ) : null}
      </Section>

      {showPapelExtra ? (
        <div
          className={`ficha-columns${p.papel_fornecedor && p.papel_colaborador ? '' : ' ficha-columns-single'}`}
        >
          {p.papel_fornecedor ? (
            <Section title="Fornecedor">
              <div className="ficha-kv-grid cols-2">
                <Kv
                  label="Tipo de fornecimento"
                  value={tipoFornecimentoLabel(p.tipo_fornecimento)}
                />
                <Kv label="CFOP entrada padrão" value={dash(p.cfop_entrada_padrao)} />
              </div>
            </Section>
          ) : null}
          {p.papel_colaborador ? (
            <Section title="Colaborador">
              <div className="ficha-kv-grid cols-2">
                <Kv label="Vínculo" value={vinculoLabel(p.vinculo)} />
                <Kv label="Cargo" value={dash(p.cargo)} />
                <Kv label="Departamento" value={dash(p.departamento_ref?.nome ?? p.departamento)} wide />
              </div>
            </Section>
          ) : null}
        </div>
      ) : null}

      {contatos.length > 0 ? (
        <Section title="Pessoas de contato">
          <table className="ficha-table">
            <colgroup>
              <col style={{ width: '22%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '34%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Função</th>
                <th>Telefone</th>
                <th>WhatsApp</th>
                <th>E-mail</th>
              </tr>
            </thead>
            <tbody>
              {contatos.map((c, idx) => (
                <tr key={c.id ?? `${c.nome}-${idx}`}>
                  <td>
                    {dash(c.nome)}
                    {c.principal ? <span className="ficha-flag">P</span> : null}
                  </td>
                  <td>{dash(c.funcao)}</td>
                  <td>{formatPhone(c.telefone) || '—'}</td>
                  <td>{formatPhone(c.whatsapp) || '—'}</td>
                  <td>{dash(c.email)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}

      <Section title="Condições comerciais">
        <p className="ficha-note">Defaults do parceiro · condição efetiva no documento (OC/ORC/PED).</p>
        <div className="ficha-kv-grid cols-4">
          <Kv label="Condição padrão" value={dash(p.condicao_pagamento)} />
          <Kv label="Forma preferida" value={formaPagamentoLabel(p.forma_pagamento)} />
          {showCredito && p.papel_cliente ? (
            <>
              <Kv label="Limite de crédito" value={money(p.limite_credito)} />
              <Kv label="Crédito utilizado" value={money(p.credito_utilizado)} />
            </>
          ) : (
            <>
              <Kv label="Limite de crédito" value={p.papel_cliente ? 'Restrito' : '—'} />
              <Kv label="Crédito utilizado" value={p.papel_cliente ? 'Restrito' : '—'} />
            </>
          )}
        </div>
        {!showCredito && p.papel_cliente ? (
          <p className="ficha-note">Valores de crédito omitidos · sem alçada <code>credito.escrever</code>.</p>
        ) : null}
      </Section>

      {showBancario ? (
        <Section title="Dados bancários">
          {contas.length === 0 ? (
            <p className="ficha-note">Nenhuma conta cadastrada.</p>
          ) : (
            <table className="ficha-table">
              <colgroup>
                <col style={{ width: '32%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '14%' }} />
                <col style={{ width: '12%' }} />
                <col style={{ width: '30%' }} />
              </colgroup>
              <thead>
                <tr>
                  <th>Banco</th>
                  <th>Agência</th>
                  <th>Conta</th>
                  <th>Tipo</th>
                  <th>PIX</th>
                </tr>
              </thead>
              <tbody>
                {contas.map((c, idx) => (
                  <tr key={c.id ?? `${c.banco_codigo}-${idx}`}>
                    <td>
                      {[c.banco_codigo, c.banco_nome].filter(Boolean).join(' — ') || '—'}
                      {c.principal ? <span className="ficha-flag">P</span> : null}
                    </td>
                    <td>{dash(c.agencia)}</td>
                    <td>{dash(c.conta)}</td>
                    <td>{tipoContaLabel(c.tipo_conta)}</td>
                    <td>{dash(c.pix_chave)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>
      ) : (
        <p className="ficha-sod-line">
          Dados bancários omitidos · exige <code>parceiro.bancario</code> (SoD).
        </p>
      )}

      <RegistroMetaStrip registro={p} className="ficha-autoria" />

      <footer className="ficha-footer">
        <span>
          Uso interno · cadastro único PAR · sem QSA · emitido por {emitidoPor}
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
