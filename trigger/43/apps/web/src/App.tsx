import type { ReactNode } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/AppShell';
import { PlatformShell } from './components/PlatformShell';
import { useAuth } from './lib/auth';
import { DashboardPage } from './pages/DashboardPage';
import { DocumentoFiscalFichaPage } from './pages/DocumentoFiscalFichaPage';
import { EmpresaFichaPage } from './pages/EmpresaFichaPage';
import { EmpresasPage } from './pages/EmpresasPage';
import { FiscalHubsPage } from './pages/FiscalHubsPage';
import { IaProvedoresPage } from './pages/IaProvedoresPage';
import { CadastroEmpresaPage } from './pages/CadastroEmpresaPage';
import { CadastroPagamentoPage } from './pages/CadastroPagamentoPage';
import { MensalidadeContaPage } from './pages/MensalidadeContaPage';
import { ImplantacaoPage } from './pages/ImplantacaoPage';
import { LoginPage } from './pages/LoginPage';
import { MapasFacasPage } from './pages/MapasFacasPage';
import { NaturezasGerenciaisPage } from './pages/NaturezasGerenciaisPage';
import { BacklogPage } from './pages/BacklogPage';
import { CondicoesPagamentoPage } from './pages/CondicoesPagamentoPage';
import { DepartamentosPage } from './pages/DepartamentosPage';
import { FeriadosPage } from './pages/FeriadosPage';
import { OrcamentoCatalogoPage } from './pages/OrcamentoCatalogoPage';
import { OrcamentoComoCalculaPage } from './pages/OrcamentoComoCalculaPage';
import { OrcamentoDetailPage } from './pages/OrcamentoDetailPage';
import { OrcamentoFichaPage } from './pages/OrcamentoFichaPage';
import { OrcamentoFichaClientePage } from './pages/OrcamentoFichaClientePage';
import { OrcamentoFormPage } from './pages/OrcamentoFormPage';
import { OrcamentoPublicoPage } from './pages/OrcamentoPublicoPage';
import { OrcamentosPage } from './pages/OrcamentosPage';
import { ParametrosPage } from './pages/ParametrosPage';
import { PatrimonioFichaPage } from './pages/PatrimonioFichaPage';
import { PatrimonioFormPage } from './pages/PatrimonioFormPage';
import { PatrimonioPage } from './pages/PatrimonioPage';
import { ParceiroFichaPage } from './pages/ParceiroFichaPage';
import { ParceiroFormPage } from './pages/ParceiroFormPage';
import { ParceiroImportPage } from './pages/ParceiroImportPage';
import { ParceirosPage } from './pages/ParceirosPage';
import { ProdutoFichaPage } from './pages/ProdutoFichaPage';
import { ProdutoFormPage } from './pages/ProdutoFormPage';
import { ProdutoImportPage } from './pages/ProdutoImportPage';
import { ProdutosPage } from './pages/ProdutosPage';
import { UsuariosPage } from './pages/UsuariosPage';
import { ContasPagarPage } from './pages/ContasPagarPage';
import { ContasReceberPage } from './pages/ContasReceberPage';
import { FaturamentoDetailPage } from './pages/FaturamentoDetailPage';
import { FaturamentosPage } from './pages/FaturamentosPage';
import { ComissoesPage } from './pages/ComissoesPage';
import { ComprasCotacoesPage } from './pages/ComprasCotacoesPage';
import { ComprasNecessidadesPage } from './pages/ComprasNecessidadesPage';
import { ComprasOrdemDetailPage } from './pages/ComprasOrdemDetailPage';
import { ComprasOrdemFormPage } from './pages/ComprasOrdemFormPage';
import { ComprasOrdensPage } from './pages/ComprasOrdensPage';
import { ComprasNfeDestinadasPage } from './pages/ComprasNfeDestinadasPage';
import { ComprasReposicaoPage } from './pages/ComprasReposicaoPage';
import { EstoqueAjustesPage } from './pages/EstoqueAjustesPage';
import { EstoqueExtratoPage } from './pages/EstoqueExtratoPage';
import { EstoqueInventariosPage } from './pages/EstoqueInventariosPage';
import { EstoquePage } from './pages/EstoquePage';
import { EstoqueLoteEtiquetaPage } from './pages/EstoqueLoteEtiquetaPage';
import { PedidosPage } from './pages/PedidosPage';
import { PedidoDetailPage } from './pages/PedidoDetailPage';
import { PedidoFichaPage } from './pages/PedidoFichaPage';
import { OrdensProducaoPage } from './pages/OrdensProducaoPage';
import { OrdemProducaoDetailPage } from './pages/OrdemProducaoDetailPage';
import { OrdemProducaoFichaPage } from './pages/OrdemProducaoFichaPage';
import { OrdemServicoDetailPage } from './pages/OrdemServicoDetailPage';
import { RastreioInsumosFichaPage } from './pages/RastreioInsumosFichaPage';
import { RastreioInsumosPage } from './pages/RastreioInsumosPage';
import { ExpedicaoPage } from './pages/ExpedicaoPage';
import { EntregaDetailPage } from './pages/EntregaDetailPage';
import { EntregaFichaPage } from './pages/EntregaFichaPage';
import { PlataformaPainelPage } from './pages/PlataformaPainelPage';
import { PlataformaInterIntegracaoPage } from './pages/PlataformaInterIntegracaoPage';
import { PlataformaMensalidadePage } from './pages/PlataformaMensalidadePage';
import { PlataformaContasPage } from './pages/PlataformaContasPage';
import { PlataformaContaDetailPage } from './pages/PlataformaContaDetailPage';
import { PlataformaAuditoriaPage } from './pages/PlataformaAuditoriaPage';

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

function FlexorcRoute({ children }: { children: ReactNode }) {
  const { consolePlataforma, initialized, user } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (consolePlataforma) return <Navigate to="/plataforma" replace />;
  return <>{children}</>;
}

function PlatformRoute({ children }: { children: ReactNode }) {
  const { hasPermission, consolePlataforma, initialized, user } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  if (!(consolePlataforma || hasPermission('plataforma.operar'))) {
    return <Navigate to="/" replace />;
  }
  return <>{children}</>;
}

function PermissionRoute({
  permission,
  exact = false,
  children,
}: {
  permission: string | string[];
  /** Sem bypass ADMIN — só permissão explícita do `/me`. */
  exact?: boolean;
  children: ReactNode;
}) {
  const { hasPermission, hasGrantedPermission, initialized, user } = useAuth();
  if (!initialized) return <LoadingScreen />;
  if (!user) return <Navigate to="/login" replace />;
  const check = exact ? hasGrantedPermission : hasPermission;
  const ok = Array.isArray(permission)
    ? permission.some((p) => check(p))
    : check(permission);
  if (!ok) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<Navigate to="/login" replace />} />
      <Route path="/cadastro/conta" element={<Navigate to="/login" replace />} />
      <Route path="/cadastro/empresa" element={<Navigate to="/empresas/nova" replace />} />
      <Route path="/cadastro/pagamento" element={<CadastroPagamentoPage />} />
      <Route path="/p/:token" element={<OrcamentoPublicoPage />} />

      <Route
        path="/plataforma"
        element={
          <ProtectedRoute>
            <PlatformRoute>
              <PlatformShell />
            </PlatformRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<PlataformaPainelPage />} />
        <Route path="contas" element={<PlataformaContasPage />} />
        <Route path="contas/:id" element={<PlataformaContaDetailPage />} />
        <Route path="integracoes/inter" element={<PlataformaInterIntegracaoPage />} />
        <Route path="configuracao/mensalidade" element={<PlataformaMensalidadePage />} />
        <Route path="auditoria" element={<PlataformaAuditoriaPage />} />
      </Route>

      <Route
        element={
          <ProtectedRoute>
            <FlexorcRoute>
              <AppShell />
            </FlexorcRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="empresas" element={<EmpresasPage />} />
        <Route path="conta/mensalidade" element={<MensalidadeContaPage />} />
        <Route
          path="implantacao"
          element={
            <PermissionRoute permission="implantacao.ler">
              <ImplantacaoPage />
            </PermissionRoute>
          }
        />
        <Route
          path="empresas/nova"
          element={
            <PermissionRoute permission="empresas.gerir">
              <CadastroEmpresaPage />
            </PermissionRoute>
          }
        />

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
          path="patrimonio"
          element={
            <PermissionRoute permission="patrimonio.ler">
              <PatrimonioPage />
            </PermissionRoute>
          }
        />
        <Route
          path="patrimonio/:id"
          element={
            <PermissionRoute permission="patrimonio.ler">
              <PatrimonioFormPage />
            </PermissionRoute>
          }
        />

        <Route
          path="departamentos"
          element={
            <PermissionRoute permission="departamento.ler">
              <DepartamentosPage />
            </PermissionRoute>
          }
        />

        <Route
          path="feriados"
          element={
            <PermissionRoute permission="feriado.ler">
              <FeriadosPage />
            </PermissionRoute>
          }
        />

        <Route
          path="condicoes-pagamento"
          element={
            <PermissionRoute
              permission={[
                'condicao_pagamento.ler',
                'parceiro.ler',
                'compras.ler',
                'orcamento.ler',
              ]}
            >
              <CondicoesPagamentoPage />
            </PermissionRoute>
          }
        />

        <Route
          path="backlog"
          element={
            <PermissionRoute permission="backlog.ler">
              <BacklogPage />
            </PermissionRoute>
          }
        />

        <Route
          path="naturezas-gerenciais"
          element={
            <PermissionRoute permission="natureza_gerencial.ler">
              <NaturezasGerenciaisPage />
            </PermissionRoute>
          }
        />

        <Route
          path="compras/ordens"
          element={
            <PermissionRoute permission="compras.ler">
              <ComprasOrdensPage />
            </PermissionRoute>
          }
        />
        <Route
          path="compras/nfe-destinadas"
          element={
            <PermissionRoute permission="compras.ler">
              <ComprasNfeDestinadasPage />
            </PermissionRoute>
          }
        />
        <Route
          path="compras/ordens/nova"
          element={
            <PermissionRoute permission="compras.escrever">
              <ComprasOrdemFormPage />
            </PermissionRoute>
          }
        />
        <Route
          path="compras/ordens/:id"
          element={
            <PermissionRoute permission="compras.ler">
              <ComprasOrdemDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="compras/reposicao"
          element={
            <PermissionRoute permission="compras.ler">
              <ComprasReposicaoPage />
            </PermissionRoute>
          }
        />
        <Route
          path="compras/cotacoes"
          element={
            <PermissionRoute permission="compras.ler">
              <ComprasCotacoesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="compras/necessidades"
          element={
            <PermissionRoute permission="compras.ler">
              <ComprasNecessidadesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="estoque"
          element={
            <PermissionRoute permission="estoque.ler">
              <EstoquePage />
            </PermissionRoute>
          }
        />
        <Route
          path="estoque/lotes/:loteId/etiqueta"
          element={
            <PermissionRoute permission="estoque.ler">
              <EstoqueLoteEtiquetaPage />
            </PermissionRoute>
          }
        />
        <Route
          path="estoque/ajustes"
          element={
            <PermissionRoute permission="estoque.ler">
              <EstoqueAjustesPage />
            </PermissionRoute>
          }
        />
        <Route
          path="estoque/inventarios"
          element={
            <PermissionRoute permission="estoque.ler">
              <EstoqueInventariosPage />
            </PermissionRoute>
          }
        />
        <Route
          path="estoque/inventarios/:id"
          element={
            <PermissionRoute permission="estoque.ler">
              <EstoqueInventariosPage />
            </PermissionRoute>
          }
        />
        <Route
          path="estoque/extrato/:produtoId"
          element={
            <PermissionRoute permission="estoque.ler">
              <EstoqueExtratoPage />
            </PermissionRoute>
          }
        />
        <Route
          path="financeiro/contas-a-pagar"
          element={
            <PermissionRoute permission="financeiro.ler">
              <ContasPagarPage />
            </PermissionRoute>
          }
        />
        <Route
          path="financeiro/contas-a-receber"
          element={
            <PermissionRoute permission="financeiro.ler">
              <ContasReceberPage />
            </PermissionRoute>
          }
        />
        <Route
          path="financeiro/faturamentos"
          element={
            <PermissionRoute permission="faturamento.ler">
              <FaturamentosPage />
            </PermissionRoute>
          }
        />
        <Route
          path="financeiro/faturamentos/:id"
          element={
            <PermissionRoute permission="faturamento.ler">
              <FaturamentoDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="financeiro/comissoes"
          element={
            <PermissionRoute permission={['comissao.ler', 'financeiro.ler']}>
              <ComissoesPage />
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
          path="mapa-facas"
          element={
            <PermissionRoute permission="orcamento.ler">
              <MapasFacasPage />
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
          path="pedidos"
          element={
            <PermissionRoute permission="producao.ler">
              <PedidosPage />
            </PermissionRoute>
          }
        />
        <Route
          path="pedidos/:id"
          element={
            <PermissionRoute permission="producao.ler">
              <PedidoDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="ordens-producao"
          element={
            <PermissionRoute permission="producao.ler">
              <OrdensProducaoPage />
            </PermissionRoute>
          }
        />
        <Route
          path="ordens-producao/:id"
          element={
            <PermissionRoute permission="producao.ler">
              <OrdemProducaoDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="rastreio"
          element={
            <PermissionRoute permission={['producao.ler', 'estoque.ler']}>
              <RastreioInsumosPage />
            </PermissionRoute>
          }
        />
        <Route
          path="ordens-servico/:id"
          element={
            <PermissionRoute permission="producao.ler">
              <OrdemServicoDetailPage />
            </PermissionRoute>
          }
        />
        <Route
          path="expedicao"
          element={
            <PermissionRoute permission="expedicao.ler">
              <ExpedicaoPage />
            </PermissionRoute>
          }
        />
        <Route
          path="expedicao/:id"
          element={
            <PermissionRoute permission="expedicao.ler">
              <EntregaDetailPage />
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

      <Route
        path="/produtos/:id/ficha"
        element={
          <ProtectedRoute>
            <PermissionRoute permission="produto.ler">
              <ProdutoFichaPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/empresas/:id/ficha"
        element={
          <ProtectedRoute>
            <EmpresaFichaPage />
          </ProtectedRoute>
        }
      />

      <Route
        path="/patrimonio/:id/ficha"
        element={
          <ProtectedRoute>
            <PermissionRoute permission="patrimonio.ler">
              <PatrimonioFichaPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/orcamentos/:id/ficha"
        element={
          <ProtectedRoute>
            <PermissionRoute permission="orcamento.ler">
              <OrcamentoFichaPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/orcamentos/:id/ficha-cliente"
        element={
          <ProtectedRoute>
            <PermissionRoute permission="orcamento.ler">
              <OrcamentoFichaClientePage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/orcamentos/:id/proposta"
        element={
          <ProtectedRoute>
            <PermissionRoute permission="orcamento.ler">
              <OrcamentoFichaClientePage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pedidos/:id/ficha"
        element={
          <ProtectedRoute>
            <PermissionRoute permission="producao.ler">
              <PedidoFichaPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ordens-producao/:id/ficha"
        element={
          <ProtectedRoute>
            <PermissionRoute permission="producao.ler">
              <OrdemProducaoFichaPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/ordens-producao/:id/rastreio"
        element={
          <ProtectedRoute>
            <PermissionRoute permission={['producao.ler', 'estoque.ler']}>
              <RastreioInsumosFichaPage kind="op" />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/pedidos/:id/rastreio"
        element={
          <ProtectedRoute>
            <PermissionRoute permission={['producao.ler', 'estoque.ler']}>
              <RastreioInsumosFichaPage kind="pedido" />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/rastreio/lotes/:id/ficha"
        element={
          <ProtectedRoute>
            <PermissionRoute permission={['producao.ler', 'estoque.ler']}>
              <RastreioInsumosFichaPage kind="lote" />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/financeiro/faturamentos/:id/nf/:docId/ficha"
        element={
          <ProtectedRoute>
            <PermissionRoute permission="faturamento.ler">
              <DocumentoFiscalFichaPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

      <Route
        path="/expedicao/:id/ficha"
        element={
          <ProtectedRoute>
            <PermissionRoute permission="expedicao.ler">
              <EntregaFichaPage />
            </PermissionRoute>
          </ProtectedRoute>
        }
      />

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
