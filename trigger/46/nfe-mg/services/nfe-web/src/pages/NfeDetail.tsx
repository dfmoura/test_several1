import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { PageHeader, Loading, StatusBadge } from '@/components/ui';
import { api, formatCurrency, formatDate, xmlUrl, danfeUrl } from '@/lib/api';

export function NfeDetail() {
  const { chave } = useParams<{ chave: string }>();
  const [nfe, setNfe] = useState<Record<string, unknown> | null>(null);
  const [motivo, setMotivo] = useState('Erro de emissão — cancelamento em homologação');
  const [correcao, setCorrecao] = useState('');
  const [msg, setMsg] = useState('');

  const load = () => { if (chave) api.getNfe(chave).then((r) => setNfe(r as never)); };
  useEffect(() => { load(); }, [chave]);

  if (!nfe || !chave) return <Loading />;
  const itens = (nfe.itens as Array<Record<string, unknown>>) ?? [];
  const eventos = (nfe.eventos as Array<Record<string, unknown>>) ?? [];

  const cancelar = async () => {
    try {
      await api.cancelar(chave, motivo);
      setMsg('Cancelamento registrado.');
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Falha'); }
  };

  const enviarCce = async () => {
    try {
      await api.cce(chave, correcao);
      setMsg('Carta de correção registrada.');
      load();
    } catch (e) { setMsg(e instanceof Error ? e.message : 'Falha'); }
  };

  return (
    <>
      <PageHeader
        title={`NF-e ${String(nfe.serie)}/${String(nfe.numero)}`}
        subtitle={chave}
        actions={
          <div className="flex gap-2">
            <a className="btn-secondary" href={xmlUrl(chave)}>XML</a>
            <a className="btn-secondary" href={danfeUrl(chave)} target="_blank" rel="noreferrer">DANFE</a>
            <Link to="/nfe" className="btn-secondary">Voltar</Link>
          </div>
        }
      />
      {msg && <p className="mb-4 text-sm text-brand-700">{msg}</p>}
      <div className="mb-6 grid gap-4 md:grid-cols-2">
        <div className="card p-5 text-sm space-y-2">
          <div className="flex justify-between"><span className="text-slate-500">Situação</span><StatusBadge value={String(nfe.situacao)} /></div>
          <div className="flex justify-between"><span className="text-slate-500">cStat</span><span>{String(nfe.cStat ?? '—')}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Protocolo</span><span className="font-mono">{String(nfe.nProt ?? '—')}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Valor</span><span>{formatCurrency(Number(nfe.valorNf))}</span></div>
          <div className="flex justify-between"><span className="text-slate-500">Emissão</span><span>{formatDate(String(nfe.dhEmi))}</span></div>
          <p className="pt-2 text-slate-600">{String(nfe.xMotivo ?? '')}</p>
        </div>
        <div className="card p-5 text-sm space-y-2">
          <div className="font-semibold">Destinatário</div>
          <div>{String(nfe.destRazaoSocial)}</div>
          <div className="font-mono text-slate-500">{String(nfe.destCpfCnpj)}</div>
          <div className="text-slate-500">{String(nfe.naturezaOperacao)}</div>
        </div>
      </div>

      <div className="card mb-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left"><tr>
            <th className="px-3 py-2">#</th><th className="px-3 py-2">Descrição</th><th className="px-3 py-2">NCM</th><th className="px-3 py-2">CFOP</th><th className="px-3 py-2">Total</th>
          </tr></thead>
          <tbody className="divide-y">
            {itens.map((i) => (
              <tr key={String(i.nItem)}>
                <td className="px-3 py-2">{String(i.nItem)}</td>
                <td className="px-3 py-2">{String(i.descricao)}</td>
                <td className="px-3 py-2 font-mono">{String(i.ncm)}</td>
                <td className="px-3 py-2">{String(i.cfop)}</td>
                <td className="px-3 py-2">{formatCurrency(Number(i.valorTotal))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {nfe.situacao === 'AUTORIZADA' && (
        <div className="grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">Cancelar</h2>
            <textarea className="input min-h-[80px]" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            <p className="field-hint">Mínimo 15 caracteres. Evento 110111.</p>
            <button className="btn-danger mt-3" onClick={cancelar}>Cancelar NF-e</button>
          </div>
          <div className="card p-5">
            <h2 className="mb-3 text-sm font-semibold">Carta de correção</h2>
            <textarea className="input min-h-[80px]" value={correcao} onChange={(e) => setCorrecao(e.target.value)} placeholder="Texto da correção (mín. 15 caracteres)" />
            <button className="btn-secondary mt-3" onClick={enviarCce}>Enviar CC-e</button>
          </div>
        </div>
      )}

      {eventos.length > 0 && (
        <div className="card mt-6 p-5">
          <h2 className="mb-3 text-sm font-semibold">Eventos</h2>
          {eventos.map((e, i) => (
            <div key={i} className="mb-2 flex justify-between text-sm">
              <span>{String(e.tipo)} · seq {String(e.sequencial)}</span>
              <StatusBadge value={String(e.status)} />
            </div>
          ))}
        </div>
      )}
    </>
  );
}
