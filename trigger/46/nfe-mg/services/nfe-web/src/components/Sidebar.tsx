import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard, FileText, PlusCircle, Building2, Users, Package,
  Ban, Inbox, Shield, Settings, LogOut, X,
} from 'lucide-react';
import { api } from '@/lib/api';

const nav = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/nfe', icon: FileText, label: 'NF-e emitidas' },
  { to: '/emitir', icon: PlusCircle, label: 'Emitir' },
  { to: '/emitentes', icon: Building2, label: 'Emitentes' },
  { to: '/destinatarios', icon: Users, label: 'Parceiros' },
  { to: '/produtos', icon: Package, label: 'Produtos' },
  { to: '/inutilizacoes', icon: Ban, label: 'Inutilização' },
  { to: '/lotes', icon: Inbox, label: 'Lotes / Outbox' },
  { to: '/auditoria', icon: Shield, label: 'Auditoria' },
];

interface Props {
  ambiente?: string;
  razaoSocial?: string;
  open?: boolean;
  onClose?: () => void;
}

export function Sidebar({ ambiente, razaoSocial, open = false, onClose }: Props) {
  const handleLogout = async () => {
    await api.logout();
    window.location.href = '/login';
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-brand-950 text-white transition-transform duration-200 lg:static lg:z-auto lg:shrink-0 lg:translate-x-0 ${
        open ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      <div className="border-b border-white/10 px-6 py-5">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wider text-cyan-200">NF-e MG · SEFAZ</div>
            <div className="mt-1 text-lg font-semibold">Console</div>
            {razaoSocial && <div className="mt-2 truncate text-xs text-slate-400">{razaoSocial}</div>}
            {ambiente && (
              <span className="mt-2 inline-block rounded-full bg-cyan-600/30 px-2 py-0.5 text-xs font-medium uppercase text-cyan-100">
                {ambiente}
              </span>
            )}
          </div>
          {onClose && (
            <button type="button" onClick={onClose} className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 lg:hidden" aria-label="Fechar">
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
            onClick={() => onClose?.()}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive ? 'bg-white/10 text-white' : 'text-slate-400 hover:bg-white/5 hover:text-white'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-white/10 p-3">
        <NavLink
          to="/configuracoes"
          onClick={() => onClose?.()}
          className={({ isActive }) =>
            `mb-1 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium ${
              isActive ? 'bg-white/10 text-white' : 'text-slate-300 hover:bg-white/5 hover:text-white'
            }`
          }
        >
          <Settings size={18} />
          Configurações
        </NavLink>
        <button type="button" onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-400 hover:bg-white/5 hover:text-white">
          <LogOut size={18} />
          Sair
        </button>
      </div>
    </aside>
  );
}
