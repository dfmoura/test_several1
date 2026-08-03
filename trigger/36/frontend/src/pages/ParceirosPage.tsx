import { FormEvent, useEffect, useState } from 'react';
import { PageHeader } from '../components/PageHeader';
import { CreditoChip, PapelChip } from '../components/StatusChip';
import {
  formatCnpj,
  formatMoney,
  getErrorMessage,
  lookupApi,
  parceirosApi,
} from '../lib/api';
import { ETAPAS } from '../lib/stages';
import type { ApiRow, PapelParceiro } from '../types';

const TIPOS: PapelParceiro[] = ['CLIENTE', 'FORNECEDOR', 'VENDEDOR'];

const emptyForm = {
  tipos: ['CLIENTE'] as string[],
  cnpj_cpf: '',
  razao_social: '',
  nome_fantasia: '',
  ie: '',
  email: '',
  telefone: '',
  cep: '',
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  municipio: '',
  uf: '',
  limite_credito: '0',
  credito_bloqueio_manual: false,
  credito_validade_ate: '',
  credito_condicao_max_ddl: '',
  comissao_pct: '',
  observacao: '',
  ativo: true,
};

export function ParceirosPage() {
  const etapa = ETAPAS[1];
  const [lista, setLista] = useState<ApiRow[]>([]);
  const [busca, setBusca] = useState('');
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [formOpen, setFormOpen] = useState(false);

  async function carregar() {
    try {
      const rows = await parceirosApi.list({ q: busca || undefined, com_credito: true });
      setLista(rows as ApiRow[]);
    } catch (e) {
      setErro(getErrorMessage(e));
    }
  }

  useEffect(() => {
    carregar();
  }, []);

  function abrirNovo() {
    setEditId(null);
    setForm(emptyForm);
    setFormOpen(true);
    setErro(null);
  }

  function abrirEditar(p: ApiRow) {
    setEditId(p.id as number);
    setForm({
      tipos: (p.tipos as string[]) ?? ['CLIENTE'],
      cnpj_cpf: String(p.cnpj_cpf ?? ''),
      razao_social: String(p.razao_social ?? ''),
      nome_fantasia: String(p.nome_fantasia ?? ''),
      ie: String(p.ie ?? ''),
      email: String(p.email ?? ''),
      telefone: String(p.telefone ?? ''),
      cep: String(p.cep ?? ''),
      logradouro: String(p.logradouro ?? ''),
      numero: String(p.numero ?? ''),
      complemento: String(p.complemento ?? ''),
      bairro: String(p.bairro ?? ''),
      municipio: String(p.municipio ?? ''),
      uf: String(p.uf ?? ''),
      limite_credito: String(p.limite_credito ?? '0'),
      credito_bloqueio_manual: Boolean(p.credito_bloqueio_manual),
      credito_validade_ate: p.credito_validade_ate ? String(p.credito_validade_ate).slice(0, 10) : '',
      credito_condicao_max_ddl:
        p.credito_condicao_max_ddl != null ? String(p.credito_condicao_max_ddl) : '',
      comissao_pct: p.comissao_pct != null ? String(p.comissao_pct) : '',
      observacao: String(p.observacao ?? ''),
      ativo: Boolean(p.ativo ?? true),
    });
    setFormOpen(true);
    setErro(null);
  }

  function toggleTipo(tipo: string) {
    setForm((f) => {
      const has = f.tipos.includes(tipo);
      const tipos = has ? f.tipos.filter((t) => t !== tipo) : [...f.tipos, tipo];
      return { ...f, tipos: tipos.length ? tipos : [tipo] };
    });
  }

  async function buscarCnpj() {
    if (!form.cnpj_cpf) return;
    setPending(true);
    try {
      const data = await lookupApi.cnpj(form.cnpj_cpf);
      setForm((f) => ({
        ...f,
        razao_social: String(data.razao_social ?? f.razao_social),
        nome_fantasia: String(data.nome_fantasia ?? f.nome_fantasia),
        email: String(data.email ?? f.email),
        telefone: String(data.telefone ?? f.telefone),
        cep: String(data.cep ?? f.cep),
        logradouro: String(data.logradouro ?? f.logradouro),
        numero: String(data.numero ?? f.numero),
        complemento: String(data.complemento ?? f.complemento),
        bairro: String(data.bairro ?? f.bairro),
        municipio: String(data.municipio ?? f.municipio),
        uf: String(data.uf ?? f.uf),
      }));
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function buscarCep() {
    if (!form.cep) return;
    setPending(true);
    try {
      const data = await lookupApi.cep(form.cep);
      setForm((f) => ({
        ...f,
        logradouro: String(data.logradouro ?? f.logradouro),
        bairro: String(data.bairro ?? f.bairro),
        municipio: String(data.municipio ?? f.municipio),
        uf: String(data.uf ?? f.uf),
      }));
    } catch (e) {
      setErro(getErrorMessage(e));
    } finally {
      setPending(false);
    }
  }

  async function salvar(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setErro(null);
    const body: Record<string, unknown> = {
      ...form,
      limite_credito: parseFloat(form.limite_credito) || 0,
      credito_bloqueio_manual: form.credito_bloqueio_manual,
      credito_validade_ate: form.credito_validade_ate || null,
      credito_condicao_max_ddl: form.credito_condicao_max_ddl
        ? parseInt(form.credito_condicao_max_ddl, 10)
        : null,
      comissao_pct: form.comissao_pct ? parseFloat(form.comissao_pct) : null,
    };
    try {
      if (editId) await parceirosApi.update(editId, body);
      else await parceirosApi.create(body);
      setFormOpen(false);
      await carregar();
    } catch (err) {
      setErro(getErrorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      <PageHeader
        ordem={etapa.ordem}
        codigo={etapa.codigo}
        titulo="Parceiros"
        modo={etapa.modo}
        regra={etapa.regra}
        actions={
          <button type="button" className="btn primary" onClick={abrirNovo}>
            Novo parceiro
          </button>
        }
      />

      {erro ? <p className="error">{erro}</p> : null}

      <section className="panel">
        <div className="btn-row" style={{ marginBottom: '1rem' }}>
          <input
            placeholder="Buscar por nome ou código…"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            style={{ flex: 1, minWidth: '12rem' }}
          />
          <button type="button" className="btn" onClick={carregar}>
            Buscar
          </button>
        </div>

        <table className="data">
          <thead>
            <tr>
              <th>Código</th>
              <th>Razão social</th>
              <th>CNPJ/CPF</th>
              <th>Tipos</th>
              <th>Limite</th>
              <th>Crédito</th>
              <th>Ativo</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {lista.map((p) => {
              const cred = p.credito as
                | { situacao?: string; saldo_disponivel?: string | number }
                | undefined;
              return (
                <tr key={String(p.id)}>
                  <td>{String(p.codigo)}</td>
                  <td>{String(p.razao_social)}</td>
                  <td>{formatCnpj(String(p.cnpj_cpf ?? ''))}</td>
                  <td>
                    {((p.tipos as string[]) ?? []).map((t) => (
                      <PapelChip key={t} papel={t} />
                    ))}
                  </td>
                  <td>{formatMoney(p.limite_credito as string | number)}</td>
                  <td>
                    {cred?.situacao ? (
                      <div className="credito-cell">
                        <CreditoChip situacao={String(cred.situacao)} />
                        <span className="muted" style={{ fontSize: '0.78rem' }}>
                          disp. {formatMoney(cred.saldo_disponivel)}
                        </span>
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td>{p.ativo ? 'Sim' : 'Não'}</td>
                  <td>
                    <button type="button" className="btn sm" onClick={() => abrirEditar(p)}>
                      Editar
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </section>

      {formOpen ? (
        <div className="modal-backdrop" onClick={() => setFormOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{editId ? 'Editar parceiro' : 'Novo parceiro'}</h2>
              <button type="button" className="btn ghost sm" onClick={() => setFormOpen(false)}>
                Fechar
              </button>
            </div>

            <form onSubmit={salvar}>
              <div style={{ marginBottom: '1rem' }}>
                <span className="muted" style={{ fontSize: '0.82rem', fontWeight: 600 }}>
                  Tipos
                </span>
                <div className="toggle-group" style={{ marginTop: '0.35rem' }}>
                  {TIPOS.map((t) => (
                    <button
                      key={t}
                      type="button"
                      className={`btn sm${form.tipos.includes(t) ? ' active' : ''}`}
                      onClick={() => toggleTipo(t)}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="form-grid">
                <label>
                  CNPJ/CPF
                  <div className="btn-row">
                    <input
                      value={form.cnpj_cpf}
                      onChange={(e) => setForm({ ...form, cnpj_cpf: e.target.value })}
                    />
                    <button type="button" className="btn sm" onClick={buscarCnpj} disabled={pending}>
                      Consultar
                    </button>
                  </div>
                </label>
                <label>
                  Razão social *
                  <input
                    required
                    value={form.razao_social}
                    onChange={(e) => setForm({ ...form, razao_social: e.target.value })}
                  />
                </label>
                <label>
                  Nome fantasia
                  <input
                    value={form.nome_fantasia}
                    onChange={(e) => setForm({ ...form, nome_fantasia: e.target.value })}
                  />
                </label>
                <label>
                  IE
                  <input value={form.ie} onChange={(e) => setForm({ ...form, ie: e.target.value })} />
                </label>
                <label>
                  E-mail
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </label>
                <label>
                  Telefone
                  <input
                    value={form.telefone}
                    onChange={(e) => setForm({ ...form, telefone: e.target.value })}
                  />
                </label>
                <label>
                  CEP
                  <div className="btn-row">
                    <input value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
                    <button type="button" className="btn sm" onClick={buscarCep} disabled={pending}>
                      CEP
                    </button>
                  </div>
                </label>
                <label>
                  Logradouro
                  <input
                    value={form.logradouro}
                    onChange={(e) => setForm({ ...form, logradouro: e.target.value })}
                  />
                </label>
                <label>
                  Número
                  <input value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} />
                </label>
                <label>
                  Complemento
                  <input
                    value={form.complemento}
                    onChange={(e) => setForm({ ...form, complemento: e.target.value })}
                  />
                </label>
                <label>
                  Bairro
                  <input value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} />
                </label>
                <label>
                  Município
                  <input
                    value={form.municipio}
                    onChange={(e) => setForm({ ...form, municipio: e.target.value })}
                  />
                </label>
                <label>
                  UF
                  <input
                    maxLength={2}
                    value={form.uf}
                    onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })}
                  />
                </label>
                <label>
                  Limite crédito
                  <input
                    type="number"
                    step="0.01"
                    value={form.limite_credito}
                    onChange={(e) => setForm({ ...form, limite_credito: e.target.value })}
                  />
                </label>
                <label>
                  Validade da análise
                  <input
                    type="date"
                    value={form.credito_validade_ate}
                    onChange={(e) => setForm({ ...form, credito_validade_ate: e.target.value })}
                  />
                </label>
                <label>
                  Condição máx. (DDL)
                  <input
                    type="number"
                    placeholder="ex.: 42"
                    value={form.credito_condicao_max_ddl}
                    onChange={(e) => setForm({ ...form, credito_condicao_max_ddl: e.target.value })}
                  />
                </label>
                <label className="checkbox-inline">
                  <input
                    type="checkbox"
                    checked={form.credito_bloqueio_manual}
                    onChange={(e) =>
                      setForm({ ...form, credito_bloqueio_manual: e.target.checked })
                    }
                  />
                  Bloqueio manual de crédito
                </label>
                <label>
                  Comissão %
                  <input
                    type="number"
                    step="0.01"
                    value={form.comissao_pct}
                    onChange={(e) => setForm({ ...form, comissao_pct: e.target.value })}
                  />
                </label>
                <label style={{ gridColumn: '1 / -1' }}>
                  Observação
                  <textarea
                    rows={2}
                    value={form.observacao}
                    onChange={(e) => setForm({ ...form, observacao: e.target.value })}
                  />
                </label>
                <label>
                  Ativo
                  <select
                    value={form.ativo ? '1' : '0'}
                    onChange={(e) => setForm({ ...form, ativo: e.target.value === '1' })}
                  >
                    <option value="1">Sim</option>
                    <option value="0">Não</option>
                  </select>
                </label>
              </div>

              <div className="btn-row" style={{ marginTop: '1rem' }}>
                <button type="submit" className="btn primary" disabled={pending}>
                  Salvar
                </button>
                <button type="button" className="btn" onClick={() => setFormOpen(false)}>
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
