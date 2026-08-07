import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { useAuth } from './lib/auth';
import { DashboardPage } from './pages/DashboardPage';
import { EmpresasPage } from './pages/EmpresasPage';
import { FiscalHubsPage } from './pages/FiscalHubsPage';
import { IaProvedoresPage } from './pages/IaProvedoresPage';
import { LoginPage } from './pages/LoginPage';
import { OrcamentoCatalogoPage } from './pages/OrcamentoCatalogoPage';
import { OrcamentoComoCalculaPage } from './pages/OrcamentoComoCalculaPage';
import { OrcamentoDetailPage } from './pages/OrcamentoDetailPage';
import { OrcamentoFormPage } from './pages/OrcamentoFormPage';
import { OrcamentosPage } from './pages/OrcamentosPage';
import { ParametrosPage } from './pages/ParametrosPage';
import { ParceiroFichaPage } from './pages/ParceiroFichaPage';
import { ParceiroFormPage } from './pages/ParceiroFormPage';
import { ParceiroImportPage } from './pages/ParceiroImportPage';
import { ParceirosPage } from './pages/ParceirosPage';
import { ProdutoFormPage } from './pages/ProdutoFormPage';
import { ProdutoImportPage } from './pages/ProdutoImportPage';
import { ProdutosPage } from './pages/ProdutosPage';
import { RelatorioDetailPage } from './pages/RelatorioDetailPage';
import { RelatorioNovoPage } from './pages/RelatorioNovoPage';
import { RelatoriosPage } from './pages/RelatoriosPage';
import { UsuariosPage } from './pages/UsuariosPage';

function LoadingScreen() {
  return (
    <div className="loading" style={{ minHeight: '100vh' }}>
      Carregando…
    </div>
  );
}

function ProtectedRoute({ children }: { children: ReactNode }) {
  const { user, initialized } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function PermissionRoute({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { hasPermission, initialized, user } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!hasPermission(permission)) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />

      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="empresas" element={<EmpresasPage />} />

        <Route
          path="parceiros"
          element={
            <PermissionRoute permission="parceiro.ler">
              <ParceirosPage />
            </PermissionRoute>
          }
        />
        <Route
          path="parceiros/importar"
          element={
            <PermissionRoute permission="parceiro.escrever">
              <ParceiroImportPage />
            </PermissionRoute>
          }
        />
        <Route
          path="parceiros/:id"
          element={
            <PermissionRoute permission="parceiro.ler">
              <ParceiroFormPage />
            </PermissionRoute>
          }
        />

        <Route
          path="produtos"
          element={
            <PermissionRoute permission="produto.ler">
              <ProdutosPage />
            </PermissionRoute>
          }
        />
        <Route
          path="produtos/importar"
          element={
            <PermissionRoute permission="produto.escrever">
              <ProdutoImportPage />
            </PermissionRoute>
          }
        />
        <Route
          path="produtos/:id"
          element={
            <PermissionRoute permission="produto.ler">
              <ProdutoFormPage />
            </PermissionRoute>
          }
        />

        <Route
          path="orcamentos"
          element={
            <PermissionRoute permission="orcamento.ler">
              <OrcamentosPage />
            </PermissionRoute>
          }
        />
        <Route
          path="orcamentos/novo"
          element={
            <PermissionRoute permission="orcamento.escrever">
              <OrcamentoFormPage />
            </PermissionRoute>
          }
        />
        <Route
          path="orcamentos/como-calcula"
          element={
            <PermissionRoute permission="orcamento.ler">
              <OrcamentoComoCalculaPage />
            </PermissionRoute>
          }
        />
        <Route
          path="orcamentos/:id/editar"
          element={
            <PermissionRoute permission="orcamento.escrever">
              <OrcamentoFormPage />
            </PermissionRoute>
          }
        />
        <Route
          path="orcamentos/:id"
          element={
            <PermissionRoute permission="orcamento.ler">
              <OrcamentoDetailPage />
            </PermissionRoute>
          }
        />

        <Route
          path="orcamento-catalogo"
          element={
            <PermissionRoute permission="orcamento.catalogo.gerir">
              <OrcamentoCatalogoPage />
            </PermissionRoute>
          }
        />

        <Route
          path="relatorios"
          element={
            <PermissionRoute permission="relatorio.ler">
              <RelatoriosPage />
            </PermissionRoute>
          }
        />
        <Route
          path="relatorios/novo"
          element={
            <PermissionRoute permission="relatorio.escrever">
              <RelatorioNovoPage />
            </PermissionRoute>
          }
        />
        <Route
          path="relatorios/:id"
          element={
            <PermissionRoute permission="relatorio.ler">
              <RelatorioDetailPage />
            </PermissionRoute>
          }
        />

        <Route
          path="usuarios"
          element={
            <PermissionRoute permission="usuarios.gerir">
              <UsuariosPage />
            </PermissionRoute>
          }
        />
        <Route
          path="parametros"
          element={
            <PermissionRoute permission="parametros.gerir">
              <ParametrosPage />
            </PermissionRoute>
          }
        />
        <Route
          path="ia-provedores"
          element={
            <PermissionRoute permission="ia.provedores.gerir">
              <IaProvedoresPage />
            </PermissionRoute>
          }
        />
        <Route
          path="fiscal-hubs"
          element={
            <PermissionRoute permission="fiscal.hubs.gerir">
              <FiscalHubsPage />
            </PermissionRoute>
          }
        />
      </Route>

      <Route
        path="/parceiros/:id/ficha"
        element={
          <ProtectedRoute>
            <PermissionRoute permission="parceiro.ler">
              <ParceiroFichaPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
