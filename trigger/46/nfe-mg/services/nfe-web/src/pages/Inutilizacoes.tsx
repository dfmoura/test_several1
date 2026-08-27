import { useEffect, useState } from 'react';
import { PageHeader, Loading } from '@/components/ui';
import { api, formatDate } from '@/lib/api';

export function Inutilizacoes() {
  const [items, setItems] = useState<Array<Record<string, unknown>>>([]);
  const [form, setForm] = useState({ serie: '1', numeroIni: '1', numeroFim: '1', ano: String(new Date().getFullYear()), motivo: 'Falha de numeração em homologação' });
  const [msg, setMsg] = useState('');

  const load = () => api.listInutilizacoes().then((r) => setItems(r.items as never));
  useEffect(() => { load(); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const r = await api.inutilizar({
        serie: Number(form.serie),
        numeroIni: Number(form.numeroIni),
        numeroFim: Number(form.numeroFim),
        ano: Number(form.ano),
        motivo: form.motivo,
      }) as { cStat: string; xMotivo: string };
      setMsg(`${r.cStat} — ${r.xMotivo}`);
      load();
    } catch (err) { setMsg(err instanceof Error ? err.message : 'Falha'); }
  };

  return (
    <>
      <PageHeader title="Inutilização" subtitle="Reserva faixas de numeração não utilizadas (NFeInutilizacao4)." />
      <form onSubmit={submit} className="card mb-6 grid gap-3 p-5 sm:grid-cols-5">
        <input className="input" placeholder="Série" value={form.serie} onChange={(e) => setForm({ ...form, serie: e.target.value })} />
        <input className="input" placeholder="Nº inicial" value={form.numeroIni} onChange={(e) => setForm({ ...form, numeroIni: e.target.value })} />
        <input className="input" placeholder="Nº final" value={form.numeroFim} onChange={(e) => setForm({ ...form, numeroFim: e.target.value })} />
        <input className="input" placeholder="Ano" value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} />
        <button className="btn-primary" type="submit">Inutilizar</button>
        <textarea className="input sm:col-span-5" value={form.motivo} onChange={(e) => setForm({ ...form, motivo: e.target.value })} />
      </form>
      {msg && <p className="mb-4 text-sm text-brand-700">{msg}</p>}
      {items.length === 0 ? <Loading label="Nenhum registro." /> : (
        <div className="card p-5 text-sm space-y-2">
          {items.map((i) => (
            <div key={String(i.id)} className="flex justify-between">
              <span>Série {String(i.serie)} · {String(i.numeroIni)}–{String(i.numeroFim)}</span>
              <span>{String(i.cStat)} · {i.createdAt ? formatDate(String(i.createdAt)) : ''}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

export function Lotes() {
  const [lotes, setLotes] = useState<{ items: Array<Record<string, unknown>> } | null>(null);
  const [outbox, setOutbox] = useState<{ items: Array<Record<string, unknown>> } | null>(null);
  useEffect(() => {
    Promise.all([api.lotes(), api.outbox()]).then(([l, o]) => { setLotes(l); setOutbox(o); });
  }, []);
  if (!lotes || !outbox) return <Loading />;
  return (
    <>
      <PageHeader title="Lotes e outbox" subtitle="Recibos assíncronos (RetAutorizacao) e eventos de integração." />
      <div className="grid gap-4 md:grid-cols-2">
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Lotes ({lotes.items.length})</h2>
          {lotes.items.map((l) => (
            <div key={String(l.id)} className="mb-2 text-sm">{String(l.status)} · rec {String(l.nRec ?? '—')}</div>
          ))}
          {lotes.items.length === 0 && <p className="text-sm text-slate-500">Nenhum lote pendente (emissão síncrona).</p>}
        </div>
        <div className="card p-5">
          <h2 className="mb-3 text-sm font-semibold">Outbox ({outbox.items.length})</h2>
          {outbox.items.map((o) => (
            <div key={String(o.id)} className="mb-2 text-sm">{String(o.eventType)}</div>
          ))}
        </div>
      </div>
    </>
  );
}

export function Auditoria() {
  const [data, setData] = useState<{ items: Array<Record<string, unknown>> } | null>(null);
  useEffect(() => { api.audit().then(setData); }, []);
  if (!data) return <Loading />;
  return (
    <>
      <PageHeader title="Auditoria" subtitle="Log imutável de ações. Senha de certificado nunca é registrada." />
      <div className="card overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left"><tr>
            <th className="px-4 py-2">Ação</th><th className="px-4 py-2">Entidade</th><th className="px-4 py-2">Quando</th>
          </tr></thead>
          <tbody className="divide-y">
            {data.items.map((a) => (
              <tr key={String(a.id)}>
                <td className="px-4 py-2">{String(a.action)}</td>
                <td className="px-4 py-2 font-mono text-xs">{String(a.entity)} · {String(a.entityId).slice(0, 24)}</td>
                <td className="px-4 py-2 text-slate-500">{a.createdAt ? formatDate(String(a.createdAt)) : ''}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export function Configuracoes() {
  const [cfg, setCfg] = useState<Record<string, unknown> | null>(null);
  useEffect(() => { api.config().then((c) => setCfg(c as never)); }, []);
  if (!cfg) return <Loading />;
  return (
    <>
      <PageHeader title="Configurações" subtitle="Ambiente da softhouse. O ambiente fiscal (homolog/prod) é por emitente." />
      <div className="card p-5 text-sm space-y-3">
        <div className="flex justify-between"><span className="text-slate-500">Ambiente da stack</span><span>{String(cfg.ambiente)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Mock SEFAZ</span><span>{String(cfg.sefazMock)}</span></div>
        <div className="flex justify-between"><span className="text-slate-500">UF autorizadora</span><span>{String(cfg.uf)} ({String(cfg.cUF)})</span></div>
        <div className="flex justify-between"><span className="text-slate-500">Modelo / layout</span><span>{String(cfg.modelo)} / {String(cfg.layout)}</span></div>
      </div>
      <div className="card mt-4 p-5 text-sm text-slate-600">
        <p className="font-semibold text-slate-900">Produção</p>
        <p className="mt-2">Depois da homologação no SIARE, altere o ambiente do emitente para produção. O código é o mesmo; mudam `tpAmb=1` e o prefixo `nfe.` nos endpoints.</p>
        <p className="mt-2">Homologação MG é apagada periodicamente (~6 meses) — não use como arquivo fiscal.</p>
      </div>
    </>
  );
}
