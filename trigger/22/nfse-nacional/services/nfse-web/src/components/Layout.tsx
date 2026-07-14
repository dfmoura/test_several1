import { Outlet, Link, useLocation } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { Menu, Settings } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { api } from '@/lib/api';
import type { SystemConfig } from '@/types';

export function Layout() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const onConfiguracoes = location.pathname === '/configuracoes';

  useEffect(() => {
    api.config().then(setConfig).catch(() => {});
  }, []);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 1024) setSidebarOpen(false);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return (
    <div className="flex h-screen overflow-hidden">
      {sidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-label="Fechar menu"
        />
      )}

      <Sidebar
        ambiente={config?.ambiente}
        razaoSocial={config?.razaoSocial}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button
              type="button"
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-2 text-slate-600 transition hover:bg-slate-100 lg:hidden"
              aria-label="Abrir menu"
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0 lg:hidden">
              <div className="truncate text-sm font-semibold text-slate-900">NFS-e Nacional</div>
              {config?.ambiente && (
                <div className="text-xs uppercase text-slate-500">{config.ambiente}</div>
              )}
            </div>
          </div>

          <Link
            to="/configuracoes"
            className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
              onConfiguracoes
                ? 'bg-brand-50 text-brand-700'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
            title="Configurações do sistema"
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
