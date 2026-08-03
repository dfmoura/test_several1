import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { LoginPage } from './pages/LoginPage';
import { HomePage } from './pages/HomePage';
import { ParametrosPage } from './pages/ParametrosPage';
import { AuditoriaPage } from './pages/AuditoriaPage';
import { ParceirosPage } from './pages/cadastros/ParceirosPage';
import { ProdutosPage } from './pages/cadastros/ProdutosPage';
import { UnidadesFacasPage } from './pages/cadastros/UnidadesFacasPage';
import { OrcamentosPage } from './pages/comercial/OrcamentosPage';
import { PedidosPage } from './pages/comercial/PedidosPage';
import { EstoquePage } from './pages/estoque/EstoquePage';
import { ProducaoPage } from './pages/producao/ProducaoPage';
import { DocumentosFiscaisPage } from './pages/fiscal/DocumentosFiscaisPage';
import { TitulosPage } from './pages/financeiro/TitulosPage';
import { ExportContadorPage } from './pages/gerencial/ExportContadorPage';
import { ComprasPage } from './pages/compras/ComprasPage';
import { AceitePublicoPage } from './pages/publico/AceitePublicoPage';
import { Shell } from './components/Shell';

function Private({ children }: { children: React.ReactNode }) {
  const { token } = useAuth();
  if (!token) return <Navigate to="/login" replace />;
  return children;
}

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/aceite/:token" element={<AceitePublicoPage />} />
      <Route
        path="/"
        element={
          <Private>
            <Shell />
          </Private>
        }
      >
        <Route index element={<HomePage />} />
        <Route path="parceiros" element={<ParceirosPage />} />
        <Route path="produtos" element={<ProdutosPage />} />
        <Route path="unidades-facas" element={<UnidadesFacasPage />} />
        <Route path="orcamentos" element={<OrcamentosPage />} />
        <Route path="pedidos" element={<PedidosPage />} />
        <Route path="estoque" element={<EstoquePage />} />
        <Route path="producao" element={<ProducaoPage />} />
        <Route path="documentos-fiscais" element={<DocumentosFiscaisPage />} />
        <Route path="titulos" element={<TitulosPage />} />
        <Route path="export-contador" element={<ExportContadorPage />} />
        <Route path="compras" element={<ComprasPage />} />
        <Route path="parametros" element={<ParametrosPage />} />
        <Route path="auditoria" element={<AuditoriaPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
