import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { PageHeader, Loading, StatusBadge } from '@/components/ui';
import { api, formatCurrency, formatDate, truncate } from '@/lib/api';
import type { NfeRow } from '@/types';

export function NfeList() {
  const [items, setItems] = useState<NfeRow[]>([]);
  const [total, setTotal] = useState(0);
  const [situacao, setSituacao] = useState('');
  const [chave, setChave] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  const load = () => {
    setLoading(true);
    api.listNfe({ situacao: situacao || undefined, chave: chave || undefined, limit: 50 })
      .then((r) => { setItems(r.items); setTotal(r.total); })
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  return (
    <>
      <PageHeader title="NF-e emitidas" subtitle={`${total} documento(s)`} actions={
        <Link to="/emitir" className="btn-primary">Emitir NF-e</Link>
      } />
      <div className="mb-4 flex flex-wrap gap-3">
        <input className="input max-w-xs" placeholder="Chave de acesso" value={chave} onChange={(e) => setChave(e.target.value)} />
        <select className="input max-w-[12rem]" value={situacao} onChange={(e) => setSituacao(e.target.value)}>
          <option value="">Todas</option>
          {['AUTORIZADA','PROCESSANDO','CANCELADA','REJEITADA','DENEGADA'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <button className="btn-secondary" onClick={load}>Filtrar</button>
      </div>
      {loading ? <Loading /> : items.length === 0 ? (
        <div className="card px-4 py-12 text-center text-sm text-slate-500">Nenhuma NF-e encontrada.</div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[40rem] text-left text-sm">
            <thead className="border-b bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-3">Número</th>
                <th className="px-4 py-3">Destinatário</th>
                <th className="px-4 py-3">Situação</th>
                <th className="px-4 py-3">Valor</th>
                <th className="px-4 py-3">Emissão</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {items.map((n) => (
                <tr key={n.chaveAcesso} className="cursor-pointer hover:bg-slate-50" onClick={() => navigate(`/nfe/${n.chaveAcesso}`)}>
                  <td className="px-4 py-3">
                    <div className="font-medium">{n.serie}/{n.numero}</div>
                    <div className="font-mono text-xs text-slate-400">{truncate(n.chaveAcesso, 24)}</div>
                  </td>
                  <td className="px-4 py-3">{n.destRazaoSocial}</td>
                  <td className="px-4 py-3"><StatusBadge value={n.situacao} /></td>
                  <td className="px-4 py-3">{formatCurrency(n.valorNf)}</td>
                  <td className="px-4 py-3 text-slate-500">{formatDate(n.dhEmi)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
