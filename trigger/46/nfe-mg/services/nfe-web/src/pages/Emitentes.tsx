import { useEffect, useState } from 'react';
import { PageHeader, Loading, StatusBadge } from '@/components/ui';
import { api, formatCnpj } from '@/lib/api';
import { applyCnpjToEmitente, patchEnderecoFromCep } from '@/lib/cadastroFill';
import type { Emitente } from '@/types';
import { EMITENTE_KEY } from '@/types';

export function Emitentes() {
  const [list, setList] = useState<Emitente[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Emitente | null>(null);
  const [consulting, setConsulting] = useState<'cnpj' | 'cep' | null>(null);
  const [form, setForm] = useState({
    apelido: '', cnpj: '', inscricaoEstadual: '', razaoSocial: '', crt: '1',
    nomeFantasia: '', cnae: '', email: '', telefone: '',
    logradouro: '', numero: '', complemento: '', bairro: '',
    codigoMunicipio: '', municipio: '', uf: 'MG', cep: '',
  });

  const load = () => api.listEmitentes().then(setList).finally(() => setLoading(false));
  useEffect(() => { load(); }, []);

  const consultarCnpj = async () => {
    setConsulting('cnpj');
    try {
      const data = await api.consultaCnpj(form.cnpj);
      setForm((f) => applyCnpjToEmitente(f, data) as typeof f);
      setMsg(`CNPJ via ${data.fonte}${data.cacheHit ? ' (cache)' : ''}${data.situacaoCadastral ? ` · ${data.situacaoCadastral}` : ''} — revise e salve.`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Falha CNPJ');
    } finally {
      setConsulting(null);
    }
  };

  const consultarCep = async () => {
    setConsulting('cep');
    try {
      const data = await api.consultaCep(form.cep);
      setForm((f) => {
        const end = patchEnderecoFromCep({
          logradouro: f.logradouro,
          numero: f.numero,
          complemento: f.complemento,
          bairro: f.bairro,
          codigoMunicipio: f.codigoMunicipio,
          municipio: f.municipio,
          uf: f.uf,
          cep: f.cep,
        }, data);
        return { ...f, ...end };
      });
      setMsg(`CEP via ${data.fonte} · IBGE ${data.codigoMunicipio || '—'}`);
    } catch (err) {
      setMsg(err instanceof Error ? err.message : 'Falha CEP');
    } finally {
      setConsulting(null);
    }
  };

  const criar = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.criarEmitente({
        apelido: form.apelido,
        cnpj: form.cnpj,
        inscricaoEstadual: form.inscricaoEstadual,
        razaoSocial: form.razaoSocial,
        nomeFantasia: form.nomeFantasia || undefined,
        crt: form.crt,
        cnae: form.cnae || undefined,
        email: form.email || undefined,
        telefone: form.telefone || undefined,
        endereco: {
          logradouro: form.logradouro, numero: form.numero, complemento: form.complemento || undefined,
          bairro: form.bairro,
          codigoMunicipio: form.codigoMunicipio, municipio: form.municipio, uf: form.uf, cep: form.cep,
        },
      });
      setShowForm(false);
      setMsg('Emitente criado.');
      load();
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Falha'); }
  };

  const status = async (id: string) => {
    try {
      const r = await api.statusServico(id);
      setMsg(`StatusServico: ${r.cStat} — ${r.xMotivo}${r.mock ? ' (mock)' : ''}`);
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Falha'); }
  };

  const marcarSiare = async (e: Emitente) => {
    await api.atualizarEmitente(e.id, { credenciadoSiare: !e.credenciadoSiare });
    load();
  };

  const upload = async (id: string, file: File, password: string) => {
    const fd = new FormData();
    fd.append('pfx', file);
    fd.append('password', password);
    const res = await fetch(`/api/v1/emitentes/${id}/certificado`, {
      method: 'POST',
      body: fd,
      credentials: 'include',
      headers: { 'X-Emitente-Id': id },
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ detail: res.statusText }));
      throw new Error(err.detail ?? 'Falha no upload');
    }
    setMsg('Certificado armazenado com criptografia em repouso.');
    load();
  };

  if (loading) return <Loading />;

  return (
    <>
      <PageHeader title="Emitentes" subtitle="Cada vendedor é um tenant: CNPJ + IE MG + A1 próprio." actions={
        <button className="btn-primary" onClick={() => setShowForm(true)}>Novo emitente</button>
      } />
      {msg && <p className="mb-4 text-sm text-brand-700">{msg}</p>}

      {showForm && (
        <form onSubmit={criar} className="card mb-6 grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="label">CNPJ</label>
            <div className="flex gap-2">
              <input className="input font-mono" required value={form.cnpj} onChange={(e) => setForm({ ...form, cnpj: e.target.value })} />
              <button type="button" className="btn-secondary shrink-0" disabled={consulting === 'cnpj'} onClick={consultarCnpj}>
                {consulting === 'cnpj' ? '…' : 'CNPJ'}
              </button>
            </div>
          </div>
          <div><label className="label">Apelido</label><input className="input" required value={form.apelido} onChange={(e) => setForm({ ...form, apelido: e.target.value })} /></div>
          <div><label className="label">IE MG</label><input className="input" required value={form.inscricaoEstadual} onChange={(e) => setForm({ ...form, inscricaoEstadual: e.target.value })} /></div>
          <div className="lg:col-span-2"><label className="label">Razão social</label><input className="input" required value={form.razaoSocial} onChange={(e) => setForm({ ...form, razaoSocial: e.target.value })} /></div>
          <div><label className="label">CRT</label>
            <select className="input" value={form.crt} onChange={(e) => setForm({ ...form, crt: e.target.value })}>
              <option value="1">1 — Simples Nacional</option>
              <option value="2">2 — SN excesso sublimite</option>
              <option value="3">3 — Regime Normal</option>
            </select>
          </div>
          <div>
            <label className="label">CEP</label>
            <div className="flex gap-2">
              <input className="input font-mono" required value={form.cep} onChange={(e) => setForm({ ...form, cep: e.target.value })} />
              <button type="button" className="btn-secondary shrink-0" disabled={consulting === 'cep'} onClick={consultarCep}>
                {consulting === 'cep' ? '…' : 'CEP'}
              </button>
            </div>
          </div>
          <div className="lg:col-span-2"><label className="label">Logradouro</label><input className="input" required value={form.logradouro} onChange={(e) => setForm({ ...form, logradouro: e.target.value })} /></div>
          <div><label className="label">Número</label><input className="input" required value={form.numero} onChange={(e) => setForm({ ...form, numero: e.target.value })} /></div>
          <div><label className="label">Bairro</label><input className="input" required value={form.bairro} onChange={(e) => setForm({ ...form, bairro: e.target.value })} /></div>
          <div><label className="label">Município</label><input className="input" required value={form.municipio} onChange={(e) => setForm({ ...form, municipio: e.target.value })} /></div>
          <div><label className="label">UF</label><input className="input" required maxLength={2} value={form.uf} onChange={(e) => setForm({ ...form, uf: e.target.value.toUpperCase() })} /></div>
          <div><label className="label">IBGE</label><input className="input font-mono" required maxLength={7} value={form.codigoMunicipio} onChange={(e) => setForm({ ...form, codigoMunicipio: e.target.value })} /></div>
          <div className="sm:col-span-2 lg:col-span-3 flex gap-2">
            <button className="btn-primary" type="submit">Salvar</button>
            <button className="btn-secondary" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
          </div>
        </form>
      )}

      <div className="space-y-4">
        {list.map((e) => (
          <div key={e.id} className="card p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-semibold">{e.apelido}</div>
                <div className="text-sm text-slate-600">{e.razaoSocial}</div>
                <div className="mt-1 font-mono text-xs text-slate-500">{formatCnpj(e.cnpj)} · IE {e.inscricaoEstadual} · CRT {e.crt}</div>
              </div>
              <div className="flex flex-wrap gap-2">
                <StatusBadge value={e.ambiente} />
                <StatusBadge value={e.certificado.alerta} />
                <button className="btn-secondary text-xs" onClick={() => { localStorage.setItem(EMITENTE_KEY, e.id); window.location.reload(); }}>Usar</button>
              </div>
            </div>
            <div className="mt-4 grid gap-3 text-sm md:grid-cols-2">
              <label className="flex items-center gap-2">
                <input type="checkbox" checked={e.credenciadoSiare} onChange={() => marcarSiare(e)} />
                Credenciado NF-e no SIARE
                <a className="text-brand-700 underline" href="https://www2.fazenda.mg.gov.br/sol/" target="_blank" rel="noreferrer">abrir portal</a>
              </label>
              <div>Série padrão {e.seriePadrao} · último número {e.ultimoNumero}</div>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <button className="btn-secondary" onClick={() => status(e.id)}>Testar StatusServico</button>
              <button className="btn-secondary" onClick={() => setSelected(selected?.id === e.id ? null : e)}>Wizard A1</button>
            </div>
            {selected?.id === e.id && (
              <CertWizard emitente={e} onUpload={upload} />
            )}
          </div>
        ))}
      </div>
    </>
  );
}

function CertWizard({ emitente, onUpload }: { emitente: Emitente; onUpload: (id: string, file: File, password: string) => Promise<void> }) {
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [err, setErr] = useState('');
  return (
    <div className="mt-4 rounded-lg border border-slate-100 bg-slate-50 p-4">
      <ol className="mb-3 list-decimal pl-5 text-sm text-slate-600">
        <li>Cliente credencia NF-e homologação no SIARE (aplicativo de terceiros).</li>
        <li>Upload do A1 e-CNPJ cujo CNPJ coincide com o emitente.</li>
        <li>Testar StatusServico — o mesmo certificado transmite e consulta.</li>
        <li>Emitir uma NF-e de homologação (destinatário fictício).</li>
      </ol>
      <div className="form-grid">
        <div>
          <label className="label">Arquivo PFX</label>
          <input type="file" accept=".pfx,.p12" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </div>
        <div>
          <label className="label">Senha do certificado</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
      </div>
      {err && <p className="mt-2 text-sm text-red-600">{err}</p>}
      <button
        className="btn-primary mt-3"
        type="button"
        onClick={async () => {
          if (!file || !password) { setErr('Informe PFX e senha'); return; }
          try { await onUpload(emitente.id, file, password); setErr(''); }
          catch (e) { setErr(e instanceof Error ? e.message : 'Falha'); }
        }}
      >
        Criptografar e armazenar A1
      </button>
      <p className="field-hint">A senha nunca é logada. PFX em AES-256-GCM no MinIO.</p>
    </div>
  );
}
