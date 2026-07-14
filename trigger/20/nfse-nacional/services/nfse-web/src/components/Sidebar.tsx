import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  PlusCircle,
  Layers,
  RefreshCw,
  Inbox,
  Shield,
  Settings,
  LogOut,
  X,
} from 'lucide-react';
import { api } from '@/lib/api';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/nfse', icon: FileText, label: 'NFS-e emitidas' },
  { to: '/nfse?aba=recebidas', icon: Inbox, label: 'NFS-e recebidas (ADN)' },
  { to: '/emitir', icon: PlusCircle, label: 'Emitir' },
  { to: '/dps', icon: Layers, label: 'DPS' },
  { to: '/sync', icon: RefreshCw, label: 'Sincronização' },
  { to: '/outbox', icon: Inbox, label: 'Outbox' },
  { to: '/auditoria', icon: Shield, label: 'Auditoria' },
];

const settingsNav = { to: '/configuracoes', icon: Settings, label: 'Configurações' };

interface Props {
  ambiente?: string;
  razaoSocial?: string;
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ ambiente, razaoSocial, open = false, onClose }: Props) {
  const location = useLocation();

  const handleLogout = async () => {
    await api.logout();
    window.location.href = '/login';
  };

  const handleNavClick = () => {
    onClose?.();
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-950 text-white transition-transform duration-200 ease-in-out lg:static lg:z-auto lg:shrink-0 lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-brand-100">NFS-e Nacional</div>
            <div className="mt-1 text-lg font-semibold">Console</div>
            {razaoSocial && <div className="mt-2 truncate text-xs text-slate-400">{razaoSocial}</div>}
            {ambiente && (
              <span className="mt-2 inline-block rounded-full bg-brand-600/30 px-2 py-0.5 text-xs font-medium uppercase text-brand-100">
                {ambiente}
              </span>
            )}
          </div>
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Fechar menu"
            >
              <X size={20} />
            </button>
          )}
        </div>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            onClick={handleNavClick}
            className={({ isActive }) => {
              const recebidas =
                location.pathname === '/nfse' && location.search.includes('aba=recebidas');
              const active =
                to === '/nfse?aba=recebidas'
                  ? recebidas
                  : to === '/nfse'
                    ? location.pathname === '/nfse' && !recebidas
                    : isActive;
              return `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                active ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`;
            }}
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <NavLink
          to={settingsNav.to}
          onClick={handleNavClick}
          className={({ isActive }) =>
            `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
              isActive
                ? 'bg-white/10 text-white'
                : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <Settings size={18} />
          {settingsNav.label}
        </NavLink>
        <button
          type="button"
          onClick={handleLogout}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 transition hover:bg-white/5 hover:text-white"
        >
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
