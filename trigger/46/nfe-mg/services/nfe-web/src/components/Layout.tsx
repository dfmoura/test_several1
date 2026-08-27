import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Menu, Settings } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { api } from '@/lib/api';
import type { Emitente, SystemConfig } from '@/types';
import { EMITENTE_KEY } from '@/types';

export function Layout() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [emitentes, setEmitentes] = useState<Emitente[]>([]);
  const [emitenteId, setEmitenteId] = useState(localStorage.getItem(EMITENTE_KEY) ?? '');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    Promise.all([api.config(), api.listEmitentes()])
      .then(([c, list]) => {
        setConfig(c);
        setEmitentes(list);
        if (!emitenteId && list[0]) {
          localStorage.setItem(EMITENTE_KEY, list[0].id);
          setEmitenteId(list[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const atual = emitentes.find((e) => e.id === emitenteId);

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <button type="button" className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} aria-label="Fechar" />
      )}
      <Sidebar ambiente={atual?.ambiente ?? config?.ambiente} razaoSocial={atual?.razaoSocial} open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => setSidebarOpen(true)} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100 lg:hidden" aria-label="Menu">
              <Menu size={20} />
            </button>
            <select
              className="input max-w-xs text-sm"
              value={emitenteId}
              onChange={(e) => {
                localStorage.setItem(EMITENTE_KEY, e.target.value);
                setEmitenteId(e.target.value);
                window.location.reload();
              }}
            >
              {emitentes.length === 0 && <option value="">Nenhum emitente</option>}
              {emitentes.map((e) => (
                <option key={e.id} value={e.id}>{e.apelido} · {e.cnpj}</option>
              ))}
            </select>
          </div>
          <Link
            to="/configuracoes"
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium ${
              location.pathname === '/configuracoes' ? 'bg-brand-50 text-brand-700' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Settings size={18} />
            <span className="hidden sm:inline">Configurações</span>
          </Link>
        </header>
        <main className="flex-1 overflow-auto">
          <div className="page-container">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
