import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './lib/auth';
import { ComprasPage } from './pages/ComprasPage';
import { DashboardPage } from './pages/DashboardPage';
import { DevolucoesPage } from './pages/DevolucoesPage';
import { EmpresasPage } from './pages/EmpresasPage';
import { EntregaPage } from './pages/EntregaPage';
import { EstoquePage } from './pages/EstoquePage';
import { FinanceiroPage } from './pages/FinanceiroPage';
import { FiscalPage } from './pages/FiscalPage';
import { HomologacaoPage } from './pages/HomologacaoPage';
import { JornadaPage } from './pages/JornadaPage';
import { LoginPage } from './pages/LoginPage';
import { NaturezasPage } from './pages/NaturezasPage';
import { NfePage } from './pages/NfePage';
import { OrcamentosPage } from './pages/OrcamentosPage';
import { OrcamentoDetailPage } from './pages/OrcamentoDetailPage';
import { ParceirosPage } from './pages/ParceirosPage';
import { PatrimonioPage } from './pages/PatrimonioPage';
import { PedidosPage } from './pages/PedidosPage';
import { ProducaoPage } from './pages/ProducaoPage';
import { ProdutosPage } from './pages/ProdutosPage';
import { UsuariosPage } from './pages/UsuariosPage';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="jornada" element={<JornadaPage />} />
        <Route path="empresas" element={<EmpresasPage />} />
        <Route path="parceiros" element={<ParceirosPage />} />
        <Route path="produtos" element={<ProdutosPage />} />
        <Route path="orcamentos" element={<OrcamentosPage />} />
        <Route path="orcamentos/:id" element={<OrcamentoDetailPage />} />
        <Route path="pedidos" element={<PedidosPage />} />
        <Route path="producao" element={<ProducaoPage />} />
        <Route path="estoque" element={<EstoquePage />} />
        <Route path="compras" element={<ComprasPage />} />
        <Route path="nfe" element={<NfePage />} />
        <Route path="fiscal" element={<FiscalPage />} />
        <Route path="financeiro" element={<FinanceiroPage />} />
        <Route path="naturezas" element={<NaturezasPage />} />
        <Route path="entrega" element={<EntregaPage />} />
        <Route path="devolucoes" element={<DevolucoesPage />} />
        <Route path="patrimonio" element={<PatrimonioPage />} />
        <Route path="usuarios" element={<UsuariosPage />} />
        <Route path="homologacao" element={<HomologacaoPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
