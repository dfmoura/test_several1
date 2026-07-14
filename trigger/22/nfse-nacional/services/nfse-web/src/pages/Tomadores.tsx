import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Pencil, Plus, Trash2, Users, FileText } from 'lucide-react';
import { CartaoCnpjPanel } from '@/components/CartaoCnpjPanel';
import { DataTable } from '@/components/DataTable';
import { Loading } from '@/components/Loading';
import { PageHeader } from '@/components/PageHeader';
import { useCnpjLookup } from '@/hooks/useCnpjLookup';
import { api, formatCnpj, formatDate } from '@/lib/api';
import type { CartaoCnpjData, TomadorCadastro, TomadorEnderecoCadastro } from '@/types';

type EnderecoForm = TomadorEnderecoCadastro;

const emptyEndereco = (): EnderecoForm => ({
  logradouro: '',
  numero: '',
  complemento: '',
  bairro: '',
  codigoMunicipio: '',
  nomeMunicipio: '',
  uf: '',
  cep: '',
});

const emptyForm = () => ({
  apelido: '',
  tipo: 'PJ' as 'PF' | 'PJ',
  cpfCnpj: '',
  razaoSocial: '',
  email: '',
  telefone: '',
  inscricaoMunicipal: '',
  endereco: emptyEndereco(),
  ativo: true,
});

function applyCartaoToForm(
  prev: ReturnType<typeof emptyForm>,
  dados: CartaoCnpjData,
): ReturnType<typeof emptyForm> {
  const end = dados.endereco;
  return {
    ...prev,
    razaoSocial: dados.razaoSocial || prev.razaoSocial,
    email: dados.email ?? prev.email,
    telefone: dados.telefone ?? prev.telefone,
    endereco: end
      ? {
          logradouro: end.logradouro || prev.endereco.logradouro,
          numero: end.numero || prev.endereco.numero,
          complemento: end.complemento ?? prev.endereco.complemento,
          bairro: end.bairro || prev.endereco.bairro,
          codigoMunicipio: end.codigoMunicipio || prev.endereco.codigoMunicipio,
          nomeMunicipio: end.nomeMunicipio ?? prev.endereco.nomeMunicipio,
          uf: end.uf || prev.endereco.uf,
          cep: end.cep || prev.endereco.cep,
        }
      : prev.endereco,
  };
}

function formatCpfCnpj(doc: string, tipo: 'PF' | 'PJ') {
  const d = doc.replace(/\D/g, '');
  if (tipo === 'PJ' && d.length === 14) return formatCnpj(d);
  if (tipo === 'PF' && d.length === 11) {
    return d.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/, '$1.$2.$3-$4');
  }
  return doc;
}

export function Tomadores() {
  const [data, setData] = useState<{ total: number; items: TomadorCadastro[] } | null>(null);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState('');
  const [somenteAtivos, setSomenteAtivos] = useState(true);
  const [editando, setEditando] = useState<TomadorCadastro | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [salvando, setSalvando] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [formAberto, setFormAberto] = useState(false);
  const cnpjLookup = useCnpjLookup();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await api.listTomadores({
        q: busca || undefined,
        ativo: somenteAtivos ? true : undefined,
        limit: 200,
      });
      setData(result);
    } finally {
      setLoading(false);
    }
  }, [busca, somenteAtivos]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (form.tipo !== 'PJ') {
      cnpjLookup.reset();
      return;
    }
    cnpjLookup.lookup(form.cpfCnpj);
  }, [form.cpfCnpj, form.tipo]);

  useEffect(() => {
    if (cnpjLookup.status !== 'found' || !cnpjLookup.dados) return;
    setForm((f) => applyCartaoToForm(f, cnpjLookup.dados!));
  }, [cnpjLookup.status, cnpjLookup.dados]);

  const showMessage = (type: 'ok' | 'err', text: string) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const abrirNovo = () => {
    setEditando(null);
    setForm(emptyForm());
    setFormAberto(true);
  };

  const abrirEdicao = (t: TomadorCadastro) => {
    setEditando(t);
    setForm({
      apelido: t.apelido,
      tipo: t.tipo,
      cpfCnpj: t.cpfCnpj,
      razaoSocial: t.razaoSocial ?? '',
      email: t.email ?? '',
      telefone: t.telefone ?? '',
      inscricaoMunicipal: t.inscricaoMunicipal ?? '',
      endereco: t.endereco
        ? {
            logradouro: t.endereco.logradouro,
            numero: t.endereco.numero,
            complemento: t.endereco.complemento ?? '',
            bairro: t.endereco.bairro,
            codigoMunicipio: t.endereco.codigoMunicipio,
            nomeMunicipio: t.endereco.nomeMunicipio ?? '',
            uf: t.endereco.uf,
            cep: t.endereco.cep,
          }
        : emptyEndereco(),
      ativo: t.ativo,
    });
    setFormAberto(true);
  };

  const fecharForm = () => {
    setFormAberto(false);
    setEditando(null);
    setForm(emptyForm());
    cnpjLookup.reset();
  };

  const setEndereco = (key: keyof EnderecoForm, value: string) =>
    setForm((f) => ({ ...f, endereco: { ...f.endereco, [key]: value } }));

  const hasEndereco = () => {
    const e = form.endereco;
    return Boolean(e.logradouro || e.bairro || e.codigoMunicipio || e.cep);
  };

  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    setSalvando(true);
    try {
      const payload = {
        apelido: form.apelido.trim(),
        tipo: form.tipo,
        cpfCnpj: form.cpfCnpj.replace(/\D/g, ''),
        razaoSocial: form.razaoSocial.trim() || undefined,
        email: form.email.trim() || undefined,
        telefone: form.telefone.trim() || undefined,
        inscricaoMunicipal: form.inscricaoMunicipal.trim() || undefined,
        endereco: hasEndereco() ? form.endereco : null,
        ativo: form.ativo,
      };

      if (editando) {
        await api.updateTomador(editando.id, payload);
        showMessage('ok', 'Tomador atualizado.');
      } else {
        await api.createTomador(payload);
        showMessage('ok', 'Tomador cadastrado.');
      }
      fecharForm();
      await load();
    } catch (err) {
      showMessage('err', err instanceof Error ? err.message : 'Erro ao salvar tomador');
    } finally {
      setSalvando(false);
    }
  };

  const handleExcluir = async (t: TomadorCadastro) => {
    if (!window.confirm(`Excluir o tomador "${t.apelido}"?`)) return;
    try {
      await api.deleteTomador(t.id);
      showMessage('ok', 'Tomador excluído.');
      if (editando?.id === t.id) fecharForm();
      await load();
    } catch (err) {
      showMessage('err', err instanceof Error ? err.message : 'Erro ao excluir tomador');
    }
  };

  const tomadorCartao =
    form.tipo === 'PJ' && cnpjLookup.status === 'found' && cnpjLookup.dados
      ? cnpjLookup.dados
      : null;

  return (
    <>
      <PageHeader
        title="Tomadores"
        subtitle="Pré-cadastro reutilizado na emissão de NFS-e"
        actions={
          <div className="flex flex-wrap gap-2">
            <Link to="/emitir" className="btn-secondary">
              Emitir NFS-e
            </Link>
            <button type="button" className="btn-primary" onClick={abrirNovo}>
              <Plus size={16} className="mr-1 inline" />
              Novo tomador
            </button>
          </div>
        }
      />

      {message && (
        <div
          className={`mb-4 rounded-lg px-4 py-3 text-sm ${
            message.type === 'ok' ? 'bg-emerald-50 text-emerald-800' : 'bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      {formAberto && (
        <form onSubmit={handleSalvar} className="card mb-6 p-4 sm:p-6 xl:max-w-4xl">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wide text-slate-500">
            {editando ? 'Editar tomador' : 'Novo tomador'}
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Apelido / identificação</label>
              <input
                className="input"
                value={form.apelido}
                onChange={(e) => setForm((f) => ({ ...f, apelido: e.target.value }))}
                placeholder="Ex.: Cliente ABC, NEUON"
                required
              />
              <p className="mt-1 text-xs text-slate-500">Nome curto para seleção na emissão.</p>
            </div>
            <div>
              <label className="label">Tipo</label>
              <select
                className="input"
                value={form.tipo}
                onChange={(e) => {
                  const tipo = e.target.value as 'PF' | 'PJ';
                  setForm((f) => ({
                    ...f,
                    tipo,
                    endereco: tipo === 'PF' ? emptyEndereco() : f.endereco,
                  }));
                }}
              >
                <option value="PJ">Pessoa Jurídica</option>
                <option value="PF">Pessoa Física</option>
              </select>
            </div>
            <div>
              <label className="label">CPF/CNPJ</label>
              <input
                className="input"
                value={form.cpfCnpj}
                onChange={(e) => setForm((f) => ({ ...f, cpfCnpj: e.target.value }))}
                required
              />
              {form.tipo === 'PJ' && cnpjLookup.status === 'loading' && (
                <p className="mt-1 text-xs text-slate-500">Consultando cartão CNPJ…</p>
              )}
              {cnpjLookup.error && (
                <p className="mt-1 text-xs text-amber-700">{cnpjLookup.error}</p>
              )}
            </div>
          </div>

          {tomadorCartao && (
            <div className="mt-4 space-y-3">
              <CartaoCnpjPanel
                titulo="Cartão CNPJ — referência"
                dados={tomadorCartao}
                inscricaoMunicipal={form.inscricaoMunicipal}
                showInscricaoMunicipal
              />
              <button
                type="button"
                className="text-xs text-sky-700 hover:underline"
                onClick={() => cnpjLookup.lookup(form.cpfCnpj, true)}
              >
                Atualizar dados do cartão CNPJ
              </button>
            </div>
          )}

          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label">Razão social / Nome</label>
              <input
                className="input"
                value={form.razaoSocial}
                onChange={(e) => setForm((f) => ({ ...f, razaoSocial: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">E-mail</label>
              <input
                type="email"
                className="input"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">Telefone</label>
              <input
                className="input"
                value={form.telefone}
                onChange={(e) => setForm((f) => ({ ...f, telefone: e.target.value }))}
              />
            </div>
            {form.tipo === 'PJ' && (
              <div className="sm:col-span-2">
                <label className="label">Inscrição municipal (opcional)</label>
                <input
                  className="input"
                  value={form.inscricaoMunicipal}
                  onChange={(e) => setForm((f) => ({ ...f, inscricaoMunicipal: e.target.value }))}
                />
              </div>
            )}
            <div className="sm:col-span-2">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={form.ativo}
                  onChange={(e) => setForm((f) => ({ ...f, ativo: e.target.checked }))}
                />
                Ativo na lista de seleção da emissão
              </label>
            </div>
          </div>

          <div className="mt-6">
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-slate-500">
              Endereço (opcional)
            </h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label">Logradouro</label>
                <input
                  className="input"
                  value={form.endereco.logradouro}
                  onChange={(e) => setEndereco('logradouro', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Número</label>
                <input
                  className="input"
                  value={form.endereco.numero}
                  onChange={(e) => setEndereco('numero', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Complemento</label>
                <input
                  className="input"
                  value={form.endereco.complemento}
                  onChange={(e) => setEndereco('complemento', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Bairro</label>
                <input
                  className="input"
                  value={form.endereco.bairro}
                  onChange={(e) => setEndereco('bairro', e.target.value)}
                />
              </div>
              <div>
                <label className="label">CEP</label>
                <input
                  className="input"
                  value={form.endereco.cep}
                  onChange={(e) => setEndereco('cep', e.target.value)}
                />
              </div>
              <div>
                <label className="label">Município (IBGE)</label>
                <input
                  className="input"
                  value={form.endereco.codigoMunicipio}
                  onChange={(e) => setEndereco('codigoMunicipio', e.target.value)}
                  maxLength={7}
                />
              </div>
              <div>
                <label className="label">Nome do município</label>
                <input
                  className="input"
                  value={form.endereco.nomeMunicipio}
                  onChange={(e) => setEndereco('nomeMunicipio', e.target.value)}
                />
              </div>
              <div>
                <label className="label">UF</label>
                <input
                  className="input"
                  value={form.endereco.uf}
                  onChange={(e) => setEndereco('uf', e.target.value)}
                  maxLength={2}
                />
              </div>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <button type="submit" className="btn-primary" disabled={salvando}>
              {salvando ? 'Salvando…' : editando ? 'Salvar alterações' : 'Cadastrar tomador'}
            </button>
            <button type="button" className="btn-secondary" onClick={fecharForm}>
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="filter-toolbar">
        <input
          className="input w-full sm:max-w-sm"
          placeholder="Buscar por apelido, razão social ou CPF/CNPJ…"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
        />
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={somenteAtivos}
            onChange={(e) => setSomenteAtivos(e.target.checked)}
          />
          Somente ativos
        </label>
        <button type="button" className="btn-secondary w-full sm:w-auto" onClick={load}>
          Atualizar
        </button>
      </div>

      {loading || !data ? (
        <Loading />
      ) : data.total === 0 ? (
        <div className="card flex flex-col items-center px-6 py-12 text-center">
          <Users className="mb-3 text-slate-300" size={40} />
          <p className="text-sm text-slate-600">Nenhum tomador cadastrado.</p>
          <button type="button" className="btn-primary mt-4" onClick={abrirNovo}>
            Cadastrar primeiro tomador
          </button>
        </div>
      ) : (
        <>
          <p className="mb-3 text-sm text-slate-500">{data.total} tomador(es) cadastrado(s)</p>
          <DataTable
            data={data.items}
            columns={[
              {
                key: 'apelido',
                header: 'Apelido',
                render: (r) => (
                  <div>
                    <div className="font-medium text-slate-800">{r.apelido}</div>
                    {r.razaoSocial && r.razaoSocial !== r.apelido && (
                      <div className="text-xs text-slate-500">{r.razaoSocial}</div>
                    )}
                  </div>
                ),
              },
              {
                key: 'doc',
                header: 'CPF/CNPJ',
                render: (r) => (
                  <span className="font-mono text-xs">{formatCpfCnpj(r.cpfCnpj, r.tipo)}</span>
                ),
              },
              {
                key: 'tipo',
                header: 'Tipo',
                render: (r) => (r.tipo === 'PJ' ? 'PJ' : 'PF'),
              },
              {
                key: 'ativo',
                header: 'Status',
                render: (r) => (
                  <span
                    className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                      r.ativo ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {r.ativo ? 'Ativo' : 'Inativo'}
                  </span>
                ),
              },
              {
                key: 'updated',
                header: 'Atualizado',
                render: (r) => formatDate(r.updatedAt),
              },
              {
                key: 'acoes',
                header: '',
                render: (r) => (
                  <div className="flex justify-end gap-1">
                    <Link
                      to={`/emitir?tomador=${r.id}`}
                      className="rounded p-1.5 text-slate-500 hover:bg-sky-50 hover:text-sky-700"
                      title="Usar na emissão"
                    >
                      <FileText size={16} />
                    </Link>
                    <button
                      type="button"
                      className="rounded p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                      title="Editar"
                      onClick={() => abrirEdicao(r)}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      type="button"
                      className="rounded p-1.5 text-slate-500 hover:bg-red-50 hover:text-red-700"
                      title="Excluir"
                      onClick={() => handleExcluir(r)}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ),
              },
            ]}
          />
        </>
      )}
    </>
  );
}
