import type { ReactNode } from 'react';
import { TriggerAttribution } from './TriggerAttribution';
import type { CnaeSecundario, Empresa, EmpresaContaFinanceira, SocioQsa } from '../lib/api';
import { BRAND } from '../lib/brand';
import { crtLabel } from '../lib/empresaFiscal';
import {
  formatCep,
  formatCnae,
  formatCnpj,
  formatCnpjCpf,
  formatCurrency,
  formatDate,
  formatPhone,
} from '../lib/format';
import { ieStatusLabel } from '../lib/parceiroFiscal';

function dash(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '—';
  const s = String(value).trim();
  return s === '' ? '—' : s;
}

function yesNo(value: boolean | null | undefined): string {
  return value ? 'Sim' : 'Não';
}

function situacaoLabel(s: string | null | undefined): string {
  const map: Record<string, string> = {
    ATIVO: 'Ativo',
    INATIVO: 'Inativo',
  };
  return s ? (map[s] ?? s) : '—';
}

function regimeLabel(regime: string | null | undefined): string {
  const map: Record<string, string> = {
    SIMPLES_NACIONAL: 'Simples Nacional',
    LUCRO_PRESUMIDO: 'Lucro Presumido',
    LUCRO_REAL: 'Lucro Real',
    MEI: 'MEI',
    PRESUMIDO: 'Lucro Presumido',
    REAL: 'Lucro Real',
  };
  return regime ? (map[regime] ?? regime) : '—';
}

function tipoContaFinLabel(tipo: string | null | undefined): string {
  const map: Record<string, string> = {
    BANCO: 'Banco',
    CAIXA: 'Caixa',
    APLICACAO: 'Aplicação',
  };
  return tipo ? (map[tipo] ?? tipo) : '—';
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

export type EmpresaFichaSheetProps = {
  empresa: Empresa;
  emitidoPor: string;
  emitidoEm: Date;
  /** CNAEs secundários já mesclados (cadastro ⊕ consulta). */
  cnaesSecundarios: CnaeSecundario[];
  cnaeDescricao: string;
  socios: SocioQsa[];
  /** Consulta Receita em andamento (QSA / descrições). */
  consultaReceita: 'idle' | 'loading' | 'ok' | 'erro';
};

export function EmpresaFichaSheet({
  empresa: e,
  emitidoPor,
  emitidoEm,
  cnaesSecundarios,
  cnaeDescricao,
  socios,
  consultaReceita,
}: EmpresaFichaSheetProps) {
  const historico = [...(e.fiscais_historico ?? [])].sort((a, b) =>
    (b.vigencia_inicio ?? '').localeCompare(a.vigencia_inicio ?? ''),
  );
  const pendencias = e.fiscal_pendencias ?? [];
  const pendenciasEmissao = e.fiscal_pendencias_emissao ?? [];
  const vendaOff = !e.venda_ativa;
  const contas: EmpresaContaFinanceira[] = e.contas_financeiras ?? [];

  return (
    <article className="ficha-sheet" aria-label={`Ficha da empresa ${e.codigo}`}>
      <header className="ficha-masthead">
        <div className="ficha-masthead-brand">
          <img src={BRAND.licensee.logo} alt={BRAND.licensee.logoAlt} className="ficha-logo" />
          <div>
            <strong className="ficha-org">{e.razao_social}</strong>
            <span className="ficha-doc-label">Ficha cadastral · Empresa (EMP)</span>
          </div>
        </div>
        <div className="ficha-masthead-id">
          <span className="ficha-doc-code">{e.codigo}</span>
          <span className="ficha-doc-when">{formatDateTimeBr(emitidoEm)}</span>
        </div>
      </header>

      <div className="ficha-title-block">
        <div className="ficha-title-main">
          <h2 className="ficha-razao">{e.razao_social}</h2>
          {e.nome_fantasia ? <p className="ficha-fantasia">{e.nome_fantasia}</p> : null}
        </div>
        <div className="ficha-title-meta">
          <span className={`ficha-chip situacao-${(e.situacao ?? '').toLowerCase()}`}>
            {situacaoLabel(e.situacao)}
          </span>
          {e.venda_ativa ? (
            <span className="ficha-chip ficha-chip-papel">Venda ativa</span>
          ) : (
            <span className="ficha-chip ficha-chip-muted">Venda desligada</span>
          )}
          {e.estoque_ativo ? (
            <span className="ficha-chip ficha-chip-papel">Estoque ativo</span>
          ) : (
            <span className="ficha-chip ficha-chip-muted">Estoque desligado</span>
          )}
          {e.regime ? (
            <span className="ficha-chip ficha-chip-muted">{regimeLabel(e.regime)}</span>
          ) : null}
          {socios.length > 0 ? (
            <span className="ficha-chip ficha-chip-muted">QSA · {socios.length}</span>
          ) : null}
        </div>
      </div>

      <div className="ficha-kv-strip">
        <Kv label="CNPJ" value={formatCnpj(e.cnpj) || '—'} />
        <Kv
          label="Cadastro fiscal"
          value={e.cadastro_fiscal_completo ? 'Completo' : 'Incompleto'}
        />
        <Kv label="Apto emissão NF-e" value={yesNo(e.apto_emissao_nfe)} />
        <Kv label="CRT" value={e.crt != null ? crtLabel(e.crt) : '—'} />
      </div>

      <div className="ficha-columns">
        <Section title="Endereço">
          <div className="ficha-kv-grid cols-2">
            <Kv label="Logradouro" value={dash(e.logradouro)} wide />
            <Kv label="Nº" value={dash(e.numero)} />
            <Kv label="Complemento" value={dash(e.complemento)} />
            <Kv label="Bairro" value={dash(e.bairro)} />
            <Kv
              label="Município / UF"
              value={[e.municipio, e.uf].filter(Boolean).join(' / ') || '—'}
            />
            <Kv label="CEP" value={e.cep ? formatCep(e.cep) : '—'} />
            <Kv label="IBGE" value={dash(e.ibge)} />
          </div>
        </Section>

        <Section title="Contato">
          <div className="ficha-kv-grid cols-2">
            <Kv label="Telefone" value={formatPhone(e.telefone) || '—'} />
            <Kv label="E-mail" value={dash(e.email)} wide />
          </div>
        </Section>
      </div>

      <Section title="Atividades econômicas">
        <div className="ficha-kv-grid cols-2">
          <Kv label="CNAE principal" value={e.cnae ? formatCnae(e.cnae) : '—'} />
          <Kv label="Descrição" value={dash(cnaeDescricao)} wide />
        </div>
        {cnaesSecundarios.length > 0 ? (
          <table className="ficha-table" style={{ marginTop: '0.5rem' }}>
            <colgroup>
              <col style={{ width: '18%' }} />
              <col style={{ width: '82%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>CNAE secundário</th>
                <th>Descrição</th>
              </tr>
            </thead>
            <tbody>
              {cnaesSecundarios.map((item, idx) => (
                <tr key={`${item.codigo}-${idx}`}>
                  <td>{formatCnae(String(item.codigo)) || dash(item.codigo)}</td>
                  <td>{dash(item.descricao)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="ficha-note">Nenhum CNAE secundário cadastrado ou retornado pela Receita.</p>
        )}
      </Section>

      <Section title="Fiscal">
        <div className="ficha-kv-grid cols-4">
          <Kv label="IE" value={dash(e.ie)} />
          <Kv label="Status IE" value={e.ie_status ? ieStatusLabel(e.ie_status) : '—'} />
          <Kv label="IE consultada" value={formatDate(e.ie_consultado_em)} />
          <Kv label="IM" value={dash(e.im)} />
          <Kv label="IEST" value={dash(e.iest)} />
          <Kv label="Regime" value={regimeLabel(e.regime)} />
          <Kv label="CRT" value={e.crt != null ? crtLabel(e.crt) : '—'} />
          <Kv label="Regime desde" value={formatDate(e.regime_desde)} />
        </div>
      </Section>

      <Section title="QSA — Sócios e administradores">
        {consultaReceita === 'loading' ? (
          <p className="ficha-note">Consultando quadro societário na Receita (BrasilAPI)…</p>
        ) : socios.length === 0 ? (
          <p className="ficha-note">
            {consultaReceita === 'erro'
              ? 'Consulta Receita indisponível · QSA não carregado.'
              : 'Nenhum sócio retornado pela Receita para este CNPJ.'}
          </p>
        ) : (
          <table className="ficha-table">
            <colgroup>
              <col style={{ width: '32%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Nome</th>
                <th>Qualificação</th>
                <th>CPF / CNPJ</th>
                <th>Entrada</th>
                <th>Faixa etária</th>
              </tr>
            </thead>
            <tbody>
              {socios.map((s, idx) => (
                <tr key={`${s.nome_socio ?? 'socio'}-${idx}`}>
                  <td>
                    {dash(s.nome_socio)}
                    {s.nome_representante_legal ? (
                      <span className="ficha-note" style={{ display: 'block', margin: '0.15rem 0 0' }}>
                        Rep. legal: {s.nome_representante_legal}
                        {s.qualificacao_representante_legal
                          ? ` (${s.qualificacao_representante_legal})`
                          : ''}
                      </span>
                    ) : null}
                  </td>
                  <td>{dash(s.qualificacao_socio)}</td>
                  <td>{formatCnpjCpf(s.cnpj_cpf_do_socio) || dash(s.cnpj_cpf_do_socio)}</td>
                  <td>{formatDate(s.data_entrada_sociedade)}</td>
                  <td>{dash(s.faixa_etaria)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="ficha-note">QSA somente consulta (Receita) · não persistido no cadastro EMP.</p>
      </Section>

      <Section title="Contas financeiras">
        {contas.length === 0 ? (
          <p className="ficha-empty">Nenhuma conta financeira cadastrada.</p>
        ) : (
          <table className="ficha-table">
            <colgroup>
              <col style={{ width: '12%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '22%' }} />
              <col style={{ width: '20%' }} />
              <col style={{ width: '16%' }} />
              <col style={{ width: '20%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Código</th>
                <th>Tipo</th>
                <th>Descrição</th>
                <th>Banco / conta</th>
                <th>PIX</th>
                <th>Saldo abertura</th>
              </tr>
            </thead>
            <tbody>
              {contas.map((c, idx) => (
                <tr key={c.id ?? `${c.codigo}-${idx}`}>
                  <td>
                    {dash(c.codigo)}
                    {c.principal ? ' · princ.' : ''}
                    {c.ativa === false ? ' · inativa' : ''}
                  </td>
                  <td>{tipoContaFinLabel(c.tipo)}</td>
                  <td>{dash(c.descricao)}</td>
                  <td>
                    {[c.banco_codigo, c.banco_nome].filter(Boolean).join(' — ') || '—'}
                    {c.agencia || c.conta
                      ? ` · ag ${dash(c.agencia)} / cc ${dash(c.conta)}`
                      : ''}
                  </td>
                  <td>{dash(c.pix_chave)}</td>
                  <td>
                    {c.saldo_abertura != null && c.saldo_abertura !== ''
                      ? `${formatCurrency(Number(c.saldo_abertura))}${
                          c.saldo_abertura_em ? ` em ${formatDate(c.saldo_abertura_em)}` : ''
                        }`
                      : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <p className="ficha-note">
          Conta financeira = tesouraria da EMP (destino de BX). Diferente das contas do parceiro.
        </p>
      </Section>

      <Section title="Operação">
        <div className="ficha-kv-grid cols-4">
          <Kv label="Situação" value={situacaoLabel(e.situacao)} />
          <Kv label="Venda ativa" value={yesNo(e.venda_ativa)} />
          <Kv label="Estoque ativo" value={yesNo(e.estoque_ativo)} />
          <Kv label="Código" value={e.codigo} />
        </div>
        {vendaOff ? (
          <p className="ficha-note">
            Venda desligada neste CNPJ · alinhar a MULTI_EMPRESA (estudo 32): não emitir NF de
            produto até parecer Contador + Direção.
          </p>
        ) : null}
      </Section>

      {historico.length > 0 ? (
        <Section title="Histórico fiscal">
          <table className="ficha-table">
            <colgroup>
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '14%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '10%' }} />
              <col style={{ width: '30%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>Início</th>
                <th>Fim</th>
                <th>IE</th>
                <th>Regime</th>
                <th>CRT</th>
                <th>Motivo</th>
              </tr>
            </thead>
            <tbody>
              {historico.map((h) => (
                <tr key={h.id}>
                  <td>{formatDate(h.vigencia_inicio)}</td>
                  <td>{formatDate(h.vigencia_fim)}</td>
                  <td>{dash(h.ie)}</td>
                  <td>{regimeLabel(h.regime)}</td>
                  <td>{h.crt != null ? h.crt : '—'}</td>
                  <td>{dash(h.motivo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Section>
      ) : null}

      {pendencias.length > 0 || pendenciasEmissao.length > 0 ? (
        <Section title="Pendências cadastrais">
          {pendencias.length > 0 ? (
            <p className="ficha-inline-list">
              <strong>Cadastro:</strong> {pendencias.join(' · ')}
            </p>
          ) : null}
          {pendenciasEmissao.length > 0 ? (
            <p className="ficha-inline-list">
              <strong>Emissão NF-e:</strong> {pendenciasEmissao.join(' · ')}
            </p>
          ) : null}
        </Section>
      ) : null}

      <p className="ficha-note">
        Multi-CNPJ oficial · empresa_id + EMP-NNNNN · sem LAI / natureza 9.xx (estudo 32).
      </p>

      <footer className="ficha-footer">
        <span>Uso interno · empresa / EMP · emitido por {emitidoPor}</span>
        <TriggerAttribution
          variant="print"
          className="ficha-powered"
          logoClassName="ficha-trigger"
        />
      </footer>
    </article>
  );
}
