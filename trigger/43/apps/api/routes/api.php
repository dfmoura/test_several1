<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\EmpresaAtivacaoController;
use App\Http\Controllers\Api\V1\EmpresaOnboardingController;
use App\Http\Controllers\Api\V1\BemPatrimonialController;
use App\Http\Controllers\Api\V1\CessaoBemController;
use App\Http\Controllers\Api\V1\CompraNecessidadeController;
use App\Http\Controllers\Api\V1\ConsultaController;
use App\Http\Controllers\Api\V1\ComissaoController;
use App\Http\Controllers\Api\V1\BacklogController;
use App\Http\Controllers\Api\V1\CondicaoPagamentoSugestaoController;
use App\Http\Controllers\Api\V1\CalendarioController;
use App\Http\Controllers\Api\V1\DepartamentoController;
use App\Http\Controllers\Api\V1\DfeCaixaController;
use App\Http\Controllers\Api\V1\FeriadoController;
use App\Http\Controllers\Api\V1\CotacaoController;
use App\Http\Controllers\Api\V1\EmpresaCertificadoA1Controller;
use App\Http\Controllers\Api\V1\EmpresaController;
use App\Http\Controllers\Api\V1\EstoqueController;
use App\Http\Controllers\Api\V1\EstoqueInventarioController;
use App\Http\Controllers\Api\V1\EstoqueOperacionalController;
use App\Http\Controllers\Api\V1\EntregaController;
use App\Http\Controllers\Api\V1\FacasController;
use App\Http\Controllers\Api\V1\FaturamentoController;
use App\Http\Controllers\Api\V1\FiscalHubController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\ImplantacaoController;
use App\Http\Controllers\Api\V1\IaProvedorController;
use App\Http\Controllers\Api\V1\NaturezaGerencialController;
use App\Http\Controllers\Api\V1\OrcamentoAprovacaoController;
use App\Http\Controllers\Api\V1\OrcamentoCatalogoController;
use App\Http\Controllers\Api\V1\OrcamentoController;
use App\Http\Controllers\Api\V1\OrcamentoPublicoController;
use App\Http\Controllers\Api\V1\PainelController;
use App\Http\Controllers\Api\V1\OrdemCompraController;
use App\Http\Controllers\Api\V1\OrdemProducaoController;
use App\Http\Controllers\Api\V1\OrdemServicoController;
use App\Http\Controllers\Api\V1\PedidoController;
use App\Http\Controllers\Api\V1\RastreioInsumosController;
use App\Http\Controllers\Api\V1\ParametroController;
use App\Http\Controllers\Api\V1\ParceiroController;
use App\Http\Controllers\Api\V1\ParceiroImportController;
use App\Http\Controllers\Api\V1\ProdutoController;
use App\Http\Controllers\Api\V1\ProdutoImportController;
use App\Http\Controllers\Api\V1\TituloController;
use App\Http\Controllers\Api\V1\WebhookAsaasAutorizacaoSaqueController;
use App\Http\Controllers\Api\V1\WebhookBancarioController;
use App\Http\Controllers\Api\V1\UsuarioController;
use App\Http\Controllers\Api\V1\ConsolePlataformaController;
use App\Http\Controllers\Api\V1\InterIntegracaoController;
use App\Http\Controllers\Api\V1\BillingCatalogoController;
use App\Http\Middleware\EnsurePlatformOperator;
use App\Http\Middleware\SetEmpresaContext;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', HealthController::class);

    Route::post('/auth/login', [AuthController::class, 'login'])
        ->middleware('throttle:12,1');
    Route::post('/auth/registrar-conta', [EmpresaOnboardingController::class, 'storeConta'])
        ->middleware('throttle:8,1');
    Route::post('/auth/registrar-empresa', [EmpresaOnboardingController::class, 'store'])
        ->middleware('throttle:8,1');

    Route::middleware('throttle:30,1')->group(function () {
        Route::get('/publico/consulta/cnpj/{cnpj}', [ConsultaController::class, 'cnpj']);
        Route::get('/publico/consulta/cep/{cep}', [ConsultaController::class, 'cep']);
    });

    // Link de aprovação do cliente (token; sem login). Throttle anti-abuso.
    Route::middleware('throttle:60,1')->group(function () {
        Route::get('/publico/orcamentos/{token}', [OrcamentoPublicoController::class, 'show'])
            ->where('token', '[A-Za-z0-9_-]{20,128}');
        Route::get('/publico/orcamentos/{token}/adiantamento', [OrcamentoPublicoController::class, 'adiantamento'])
            ->where('token', '[A-Za-z0-9_-]{20,128}');
        Route::post('/publico/orcamentos/{token}/simular-pagamento-pix', [OrcamentoPublicoController::class, 'simularPagamento'])
            ->where('token', '[A-Za-z0-9_-]{20,128}')
            ->middleware('throttle:10,1');
        Route::post('/publico/orcamentos/{token}/decidir', [OrcamentoPublicoController::class, 'decidir'])
            ->where('token', '[A-Za-z0-9_-]{20,128}')
            ->middleware('throttle:20,1');
    });

    // Validação de saque ASAAS — URL distinta (registrar antes do {provider}).
    Route::post('/webhooks/bancarios/asaas/autorizar-saque', WebhookAsaasAutorizacaoSaqueController::class)
        ->middleware('throttle:60,1');

    // Webhooks bancários (BankProvider) — sem Sanctum; idempotência no inbox.
    Route::post('/webhooks/bancarios/{provider}', WebhookBancarioController::class)
        ->where('provider', 'mock|inter|asaas')
        ->middleware('throttle:120,1');

    Route::middleware(['auth:sanctum', EnsurePlatformOperator::class])
        ->prefix('plataforma')
        ->group(function () {
            Route::get('/metricas', [ConsolePlataformaController::class, 'metricas']);
            Route::get('/contas', [ConsolePlataformaController::class, 'contas']);
            Route::post('/contas', [ConsolePlataformaController::class, 'criarConta'])
                ->middleware('throttle:20,1');
            Route::get('/contas/{conta}', [ConsolePlataformaController::class, 'conta'])
                ->whereNumber('conta');
            Route::post('/contas/{conta}/cortesia', [ConsolePlataformaController::class, 'bonificar'])
                ->whereNumber('conta')
                ->middleware('throttle:30,1');
            Route::get('/auditoria', [ConsolePlataformaController::class, 'auditoria']);
            Route::get('/integracoes/inter', [InterIntegracaoController::class, 'show']);
            Route::put('/integracoes/inter', [InterIntegracaoController::class, 'update'])
                ->middleware('throttle:20,1');
            Route::post('/integracoes/inter/testar', [InterIntegracaoController::class, 'testar'])
                ->middleware('throttle:10,1');
            Route::get('/billing/catalogo', [BillingCatalogoController::class, 'show']);
            Route::put('/billing/catalogo', [BillingCatalogoController::class, 'update'])
                ->middleware('throttle:20,1');
        });

    Route::middleware(['auth:sanctum', SetEmpresaContext::class])->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);
        Route::post('/auth/ping', [AuthController::class, 'ping'])
            ->middleware('throttle:30,1');
        Route::post('/auth/abrir-empresa', [EmpresaOnboardingController::class, 'abrirEmpresa'])
            ->middleware('throttle:8,1');
        Route::get('/painel', [PainelController::class, 'show']);
        Route::get('/ativacao', [EmpresaAtivacaoController::class, 'show']);
        Route::post('/ativacao/pagamento', [EmpresaAtivacaoController::class, 'iniciarPagamento']);
        Route::post('/ativacao/pagamento/confirmar-demo', [EmpresaAtivacaoController::class, 'confirmarPagamentoDemo']);
        Route::post('/ativacao/recebimento', [EmpresaAtivacaoController::class, 'recebimento']);
        Route::post('/ativacao/catalogo/conferir', [EmpresaAtivacaoController::class, 'conferirCatalogo']);

        Route::get('/implantacao', [ImplantacaoController::class, 'show']);
        Route::patch('/implantacao/{codigo}', [ImplantacaoController::class, 'validar'])
            ->where('codigo', '[A-Z0-9_]{2,32}')
            ->middleware('throttle:60,1');

        Route::get('/empresas', [EmpresaController::class, 'index']);
        Route::get('/empresas/{empresa}', [EmpresaController::class, 'show']);
        Route::put('/empresas/{empresa}', [EmpresaController::class, 'update']);
        Route::get('/empresas/{empresa}/exclusao-preflight', [EmpresaController::class, 'exclusaoPreflight']);
        Route::delete('/empresas/{empresa}', [EmpresaController::class, 'destroy']);
        Route::get('/empresas/{empresa}/certificado-a1', [EmpresaCertificadoA1Controller::class, 'show']);
        Route::post('/empresas/{empresa}/certificado-a1', [EmpresaCertificadoA1Controller::class, 'store']);
        Route::delete('/empresas/{empresa}/certificado-a1', [EmpresaCertificadoA1Controller::class, 'destroy']);

        Route::get('/parametros', [ParametroController::class, 'index']);
        Route::put('/parametros', [ParametroController::class, 'upsert']);

        Route::get('/ia-provedores', [IaProvedorController::class, 'index']);
        Route::post('/ia-provedores', [IaProvedorController::class, 'store']);
        Route::get('/ia-provedores/{iaProvedor}', [IaProvedorController::class, 'show']);
        Route::put('/ia-provedores/{iaProvedor}', [IaProvedorController::class, 'update']);
        Route::delete('/ia-provedores/{iaProvedor}', [IaProvedorController::class, 'destroy']);
        Route::post('/ia-provedores/{iaProvedor}/testar', [IaProvedorController::class, 'testar']);

        Route::get('/fiscal-hubs', [FiscalHubController::class, 'index']);
        Route::post('/fiscal-hubs', [FiscalHubController::class, 'store']);
        Route::get('/fiscal-hubs/{fiscalHub}', [FiscalHubController::class, 'show']);
        Route::put('/fiscal-hubs/{fiscalHub}', [FiscalHubController::class, 'update']);
        Route::delete('/fiscal-hubs/{fiscalHub}', [FiscalHubController::class, 'destroy']);
        Route::post('/fiscal-hubs/{fiscalHub}/testar', [FiscalHubController::class, 'testar']);

        Route::get('/usuarios/colaboradores-disponiveis', [UsuarioController::class, 'colaboradoresDisponiveis']);
        Route::get('/usuarios', [UsuarioController::class, 'index']);
        Route::post('/usuarios', [UsuarioController::class, 'store']);
        Route::put('/usuarios/{usuario}', [UsuarioController::class, 'update']);
        Route::patch('/usuarios/{usuario}/deactivate', [UsuarioController::class, 'deactivate']);
        Route::patch('/usuarios/{usuario}/activate', [UsuarioController::class, 'activate']);
        Route::post('/usuarios/{usuario}/liberar-sessao', [UsuarioController::class, 'liberarSessao']);

        Route::get('/parceiros', [ParceiroController::class, 'index']);
        Route::post('/parceiros', [ParceiroController::class, 'store']);
        Route::post('/parceiros/prospect-rapido', [ParceiroController::class, 'prospectRapido']);
        Route::get('/parceiros/import/template', [ParceiroImportController::class, 'template']);
        Route::post('/parceiros/import/preview', [ParceiroImportController::class, 'preview']);
        Route::post('/parceiros/import/commit', [ParceiroImportController::class, 'commit']);
        Route::post('/parceiros/import/xml/preview', [ParceiroImportController::class, 'xmlPreview']);
        Route::post('/parceiros/import/xml/commit', [ParceiroImportController::class, 'xmlCommit']);
        Route::get('/parceiros/{parceiro}', [ParceiroController::class, 'show']);
        Route::put('/parceiros/{parceiro}', [ParceiroController::class, 'update']);

        Route::get('/produtos', [ProdutoController::class, 'index']);
        Route::post('/produtos', [ProdutoController::class, 'store']);
        Route::post('/produtos/sugerir-descricao', [ProdutoController::class, 'sugerirDescricao']);
        Route::get('/produtos/import/template', [ProdutoImportController::class, 'template']);
        Route::post('/produtos/import/preview', [ProdutoImportController::class, 'preview']);
        Route::post('/produtos/import/commit', [ProdutoImportController::class, 'commit']);
        Route::get('/produtos/{produto}', [ProdutoController::class, 'show']);
        Route::put('/produtos/{produto}', [ProdutoController::class, 'update']);

        Route::get('/bens', [BemPatrimonialController::class, 'index']);
        Route::post('/bens', [BemPatrimonialController::class, 'store']);
        Route::post('/bens/seed-modelo', [BemPatrimonialController::class, 'seedModelo']);
        Route::get('/bens/{bem}', [BemPatrimonialController::class, 'show']);
        Route::put('/bens/{bem}', [BemPatrimonialController::class, 'update']);
        Route::delete('/bens/{bem}', [BemPatrimonialController::class, 'destroy']);
        Route::get('/cessoes-bem', [CessaoBemController::class, 'index']);
        Route::post('/cessoes-bem', [CessaoBemController::class, 'store']);
        Route::get('/cessoes-bem/{cessaoBem}', [CessaoBemController::class, 'show']);
        Route::post('/cessoes-bem/{cessaoBem}/encerrar', [CessaoBemController::class, 'encerrar']);

        Route::get('/departamentos', [DepartamentoController::class, 'index']);
        Route::post('/departamentos', [DepartamentoController::class, 'store']);
        Route::post('/departamentos/seed-canonicos', [DepartamentoController::class, 'seedCanonicos']);
        Route::get('/departamentos/{departamento}', [DepartamentoController::class, 'show']);
        Route::put('/departamentos/{departamento}', [DepartamentoController::class, 'update']);
        Route::delete('/departamentos/{departamento}', [DepartamentoController::class, 'destroy']);

        Route::get('/feriados', [FeriadoController::class, 'index']);
        Route::post('/feriados', [FeriadoController::class, 'store']);
        Route::post('/feriados/seed-nacionais', [FeriadoController::class, 'seedNacionais']);
        Route::get('/feriados/{feriado}', [FeriadoController::class, 'show']);
        Route::put('/feriados/{feriado}', [FeriadoController::class, 'update']);
        Route::delete('/feriados/{feriado}', [FeriadoController::class, 'destroy']);

        Route::get('/calendario/previsao-entrega', [CalendarioController::class, 'previsaoEntrega']);

        Route::get('/condicoes-pagamento-sugestoes', [CondicaoPagamentoSugestaoController::class, 'index']);
        Route::post('/condicoes-pagamento-sugestoes', [CondicaoPagamentoSugestaoController::class, 'store']);
        Route::post('/condicoes-pagamento-sugestoes/seed-canonicos', [CondicaoPagamentoSugestaoController::class, 'seedCanonicos']);
        Route::get('/condicoes-pagamento-sugestoes/{condicaoPagamentoSugestao}', [CondicaoPagamentoSugestaoController::class, 'show']);
        Route::put('/condicoes-pagamento-sugestoes/{condicaoPagamentoSugestao}', [CondicaoPagamentoSugestaoController::class, 'update']);
        Route::delete('/condicoes-pagamento-sugestoes/{condicaoPagamentoSugestao}', [CondicaoPagamentoSugestaoController::class, 'destroy']);

        Route::get('/backlog', [BacklogController::class, 'index']);
        Route::post('/backlog', [BacklogController::class, 'store']);
        Route::get('/backlog/{backlogItem}', [BacklogController::class, 'show']);
        Route::put('/backlog/{backlogItem}', [BacklogController::class, 'update']);
        Route::post('/backlog/{backlogItem}/concluir', [BacklogController::class, 'concluir']);
        Route::post('/backlog/{backlogItem}/reabrir', [BacklogController::class, 'reabrir']);
        Route::delete('/backlog/{backlogItem}', [BacklogController::class, 'destroy']);

        // BL-033 — Compras → Estoque → TIT
        Route::get('/compra-necessidades', [CompraNecessidadeController::class, 'index']);
        Route::post('/compra-necessidades', [CompraNecessidadeController::class, 'store']);
        Route::get('/compra-necessidades/{compraNecessidade}', [CompraNecessidadeController::class, 'show']);
        Route::put('/compra-necessidades/{compraNecessidade}', [CompraNecessidadeController::class, 'update']);
        Route::post('/compra-necessidades/{compraNecessidade}/cancelar', [CompraNecessidadeController::class, 'cancel']);

        Route::get('/cotacoes', [CotacaoController::class, 'index']);
        Route::post('/cotacoes', [CotacaoController::class, 'store']);
        Route::get('/cotacoes/{cotacao}', [CotacaoController::class, 'show']);
        Route::post('/cotacoes/{cotacao}/propostas', [CotacaoController::class, 'addProposta']);
        Route::post('/cotacoes/{cotacao}/decidir', [CotacaoController::class, 'decidir']);

        Route::get('/ordens-compra', [OrdemCompraController::class, 'index']);
        Route::post('/ordens-compra', [OrdemCompraController::class, 'store']);
        Route::get('/ordens-compra/{ordemCompra}', [OrdemCompraController::class, 'show']);
        Route::post('/ordens-compra/{ordemCompra}/cancelar', [OrdemCompraController::class, 'cancel']);
        Route::post('/ordens-compra/{ordemCompra}/receber', [EstoqueController::class, 'receber']);
        Route::post('/ordens-compra/{ordemCompra}/receber/xml/preview', [EstoqueController::class, 'receberXmlPreview']);

        // Caixa DF-e (BL-090) — leitura local; sync SEFAZ = BL-091
        Route::get('/dfe-documentos', [DfeCaixaController::class, 'index']);
        Route::get('/dfe-documentos/{dfeDocumento}', [DfeCaixaController::class, 'show']);
        Route::post('/dfe-documentos/{dfeDocumento}/amarrar', [DfeCaixaController::class, 'amarrar']);
        Route::post('/dfe-documentos/{dfeDocumento}/buscar-xml', [DfeCaixaController::class, 'buscarXml']);
        Route::post('/dfe-documentos/{dfeDocumento}/sem-interesse', [DfeCaixaController::class, 'semInteresse']);
        Route::get('/dfe-sync', [DfeCaixaController::class, 'syncEstado']);
        Route::post('/dfe-sync', [DfeCaixaController::class, 'enfileirarSync']);
        Route::post('/ordens-compra/{ordemCompra}/receber/xml/preview-dfe', [DfeCaixaController::class, 'previewNaOc']);

        Route::get('/estoque/saldos', [EstoqueController::class, 'saldos']);
        Route::get('/estoque/lotes', [EstoqueController::class, 'lotes']);
        Route::get('/estoque/movimentos', [EstoqueController::class, 'movimentos']);
        Route::get('/estoque/produtos/{produto}/extrato', [EstoqueController::class, 'extrato']);

        // BL-036 — Reposição (mínimo) + AJU
        Route::get('/estoque/reposicao', [EstoqueOperacionalController::class, 'reposicao']);
        Route::post('/estoque/reposicao/gerar-oc', [EstoqueOperacionalController::class, 'gerarOcReposicao']);
        Route::get('/estoque/ajustes', [EstoqueOperacionalController::class, 'ajustesIndex']);
        Route::post('/estoque/ajustes', [EstoqueOperacionalController::class, 'ajustesStore']);
        Route::post('/estoque/ajustes/{estoqueAjuste}/aprovar', [EstoqueOperacionalController::class, 'ajustesAprovar']);
        Route::post('/estoque/ajustes/{estoqueAjuste}/rejeitar', [EstoqueOperacionalController::class, 'ajustesRejeitar']);
        Route::post('/estoque/ajustes/{estoqueAjuste}/cancelar', [EstoqueOperacionalController::class, 'ajustesCancelar']);

        // BL-042 — Inventário profissional
        Route::get('/estoque/inventarios', [EstoqueInventarioController::class, 'index']);
        Route::post('/estoque/inventarios', [EstoqueInventarioController::class, 'store']);
        Route::get('/estoque/inventarios/{estoqueInventario}', [EstoqueInventarioController::class, 'show']);
        Route::post('/estoque/inventarios/{estoqueInventario}/itens/{item}/contar-1', [EstoqueInventarioController::class, 'contar1']);
        Route::post('/estoque/inventarios/{estoqueInventario}/itens/{item}/contar-2', [EstoqueInventarioController::class, 'contar2']);
        Route::post('/estoque/inventarios/{estoqueInventario}/itens/{item}/gerar-ajuste', [EstoqueInventarioController::class, 'gerarAjuste']);
        Route::post('/estoque/inventarios/{estoqueInventario}/encerrar', [EstoqueInventarioController::class, 'encerrar']);
        Route::post('/estoque/inventarios/{estoqueInventario}/cancelar', [EstoqueInventarioController::class, 'cancelar']);

        Route::get('/titulos', [TituloController::class, 'index']);
        Route::post('/titulos', [TituloController::class, 'store']);
        Route::get('/titulos/{titulo}', [TituloController::class, 'show']);
        Route::post('/titulos/{titulo}/baixar', [TituloController::class, 'baixar']);
        Route::post('/titulos/{titulo}/cancelar', [TituloController::class, 'cancelar']);

        Route::get('/comissoes', [ComissaoController::class, 'index']);
        Route::get('/comissoes/fechamentos', [ComissaoController::class, 'fechamentos']);
        Route::post('/comissoes/fechamentos', [ComissaoController::class, 'fechar']);
        Route::get('/comissoes/fechamentos/{comissaoFechamento}', [ComissaoController::class, 'showFechamento']);
        Route::post('/comissoes/fechamentos/{comissaoFechamento}/gerar-pagamento', [ComissaoController::class, 'gerarPagamento']);
        Route::post('/comissoes/fechamentos/{comissaoFechamento}/cancelar', [ComissaoController::class, 'cancelarFechamento']);
        Route::get('/pedidos/{pedido}/comissao', [ComissaoController::class, 'resumoPedido']);

        Route::get('/naturezas-gerenciais', [NaturezaGerencialController::class, 'index']);
        Route::get('/naturezas-gerenciais/{naturezaGerencial}', [NaturezaGerencialController::class, 'show']);
        Route::patch('/naturezas-gerenciais/{naturezaGerencial}', [NaturezaGerencialController::class, 'update']);

        Route::get('/orcamentos/catalogo', [OrcamentoController::class, 'catalog']);
        Route::post('/orcamentos/calcular', [OrcamentoController::class, 'calcular']);
        Route::get('/orcamentos', [OrcamentoController::class, 'index']);
        Route::post('/orcamentos', [OrcamentoController::class, 'store']);
        Route::get('/orcamentos/{orcamento}', [OrcamentoController::class, 'show']);
        Route::put('/orcamentos/{orcamento}', [OrcamentoController::class, 'update']);
        Route::delete('/orcamentos/{orcamento}', [OrcamentoController::class, 'destroy']);
        Route::post('/orcamentos/{orcamento}/enviar-aprovacao', [OrcamentoAprovacaoController::class, 'enviar']);
        Route::get('/orcamentos/{orcamento}/destinatarios-aprovacao', [OrcamentoAprovacaoController::class, 'destinatarios']);
        Route::get('/orcamentos/{orcamento}/proposta-comercial', [OrcamentoAprovacaoController::class, 'propostaComercial']);

        // BL-044 — PED / OP / OS
        Route::get('/pedidos', [PedidoController::class, 'index']);
        Route::get('/pedidos/{pedido}', [PedidoController::class, 'show']);
        Route::post('/pedidos/{pedido}/abrir-op', [PedidoController::class, 'abrirOp']);
        Route::post('/pedidos/{pedido}/abrir-os', [PedidoController::class, 'abrirOs']);
        Route::get('/ordens-producao', [OrdemProducaoController::class, 'index']);
        Route::get('/ordens-producao/{ordemProducao}', [OrdemProducaoController::class, 'show']);
        Route::post('/ordens-producao/{ordemProducao}/requisitar', [OrdemProducaoController::class, 'requisitar']);
        Route::post('/ordens-producao/{ordemProducao}/requisitar-pendentes', [OrdemProducaoController::class, 'requisitarPendentes']);
        Route::post('/ordens-producao/{ordemProducao}/concluir', [OrdemProducaoController::class, 'concluir']);
        Route::post('/ordens-producao/{ordemProducao}/devolver-ao-pedido', [OrdemProducaoController::class, 'devolverAoPedido']);
        Route::get('/rastreio', [RastreioInsumosController::class, 'buscar']);
        Route::get('/rastreio/ordens-producao/{ordemProducao}', [RastreioInsumosController::class, 'ordemProducao']);
        Route::get('/rastreio/pedidos/{pedido}', [RastreioInsumosController::class, 'pedido']);
        Route::get('/rastreio/lotes/{estoqueLote}', [RastreioInsumosController::class, 'lote']);
        Route::get('/ordens-servico', [OrdemServicoController::class, 'index']);
        Route::get('/ordens-servico/{ordemServico}', [OrdemServicoController::class, 'show']);
        Route::post('/ordens-servico/{ordemServico}/concluir', [OrdemServicoController::class, 'concluir']);

        Route::get('/faturamentos', [FaturamentoController::class, 'index']);
        Route::get('/faturamentos/{faturamento}', [FaturamentoController::class, 'show']);
        Route::post('/faturamentos/{faturamento}/estornar', [FaturamentoController::class, 'estornar']);
        Route::post('/faturamentos/{faturamento}/emitir-nf', [FaturamentoController::class, 'emitirNf']);
        Route::post('/faturamentos/{faturamento}/consultar-nf', [FaturamentoController::class, 'consultarNf']);
        Route::get('/pedidos/{pedido}/faturamento-preview', [FaturamentoController::class, 'preview']);
        Route::post('/pedidos/{pedido}/faturar', [FaturamentoController::class, 'faturar']);

        Route::get('/entregas/fila', [EntregaController::class, 'fila']);
        Route::get('/entregas', [EntregaController::class, 'index']);
        Route::get('/entregas/{entrega}', [EntregaController::class, 'show']);
        Route::get('/pedidos/{pedido}/entrega-preview', [EntregaController::class, 'preview']);
        Route::post('/pedidos/{pedido}/expedir', [EntregaController::class, 'expedir']);
        Route::post('/entregas/{entrega}/confirmar', [EntregaController::class, 'confirmar']);
        Route::post('/entregas/{entrega}/recusar', [EntregaController::class, 'recusar']);
        Route::post('/entregas/{entrega}/cancelar', [EntregaController::class, 'cancelar']);

        Route::get('/orcamento-catalogo/resumo', [OrcamentoCatalogoController::class, 'resumo']);
        Route::post('/orcamento-catalogo/seed', [OrcamentoCatalogoController::class, 'seed']);
        Route::get('/orcamento-catalogo/papeis', [OrcamentoCatalogoController::class, 'papeis']);
        Route::post('/orcamento-catalogo/papeis', [OrcamentoCatalogoController::class, 'storePapel']);
        Route::put('/orcamento-catalogo/papeis/{papel}', [OrcamentoCatalogoController::class, 'updatePapel']);
        Route::get('/orcamento-catalogo/acabamentos', [OrcamentoCatalogoController::class, 'acabamentos']);
        Route::post('/orcamento-catalogo/acabamentos', [OrcamentoCatalogoController::class, 'storeAcabamento']);
        Route::put('/orcamento-catalogo/acabamentos/{acabamento}', [OrcamentoCatalogoController::class, 'updateAcabamento']);
        Route::get('/orcamento-catalogo/tipos-troca', [OrcamentoCatalogoController::class, 'tiposTroca']);
        Route::post('/orcamento-catalogo/tipos-troca', [OrcamentoCatalogoController::class, 'storeTipoTroca']);
        Route::put('/orcamento-catalogo/tipos-troca/{tipoTroca}', [OrcamentoCatalogoController::class, 'updateTipoTroca']);
        Route::get('/orcamento-catalogo/maquinas', [OrcamentoCatalogoController::class, 'maquinas']);
        Route::post('/orcamento-catalogo/maquinas', [OrcamentoCatalogoController::class, 'storeMaquina']);
        Route::put('/orcamento-catalogo/maquinas/{maquina}', [OrcamentoCatalogoController::class, 'updateMaquina']);
        Route::get('/orcamento-catalogo/parametros', [OrcamentoCatalogoController::class, 'parametros']);
        Route::put('/orcamento-catalogo/parametros/{chave}', [OrcamentoCatalogoController::class, 'updateParametro']);
        Route::get('/orcamento-catalogo/estruturas', [OrcamentoCatalogoController::class, 'estruturas']);
        Route::put('/orcamento-catalogo/estruturas/{chave}', [OrcamentoCatalogoController::class, 'updateEstrutura']);
        Route::get('/orcamento-catalogo/regras', [OrcamentoCatalogoController::class, 'regras']);

        Route::get('/facas/resumo', [FacasController::class, 'resumo']);
        Route::get('/facas/sugestao-n-facas', [FacasController::class, 'sugestaoNFacas']);
        Route::post('/facas/seed', [FacasController::class, 'seed']);
        Route::post('/facas/alinhar-fornecedores', [FacasController::class, 'alinharFornecedores']);
        Route::get('/facas', [FacasController::class, 'index']);
        Route::post('/facas', [FacasController::class, 'store']);
        Route::get('/facas/{faca}', [FacasController::class, 'show'])->whereNumber('faca');
        Route::patch('/facas/{faca}', [FacasController::class, 'update'])->whereNumber('faca');
        Route::patch('/facas/{faca}/ativo', [FacasController::class, 'setAtivo'])->whereNumber('faca');

        Route::get('/consulta/cnpj/{cnpj}', [ConsultaController::class, 'cnpj']);
        Route::get('/consulta/cep/{cep}', [ConsultaController::class, 'cep']);
        Route::get('/consulta/rota', [ConsultaController::class, 'rota']);
        Route::get('/consulta/geo-endereco', [ConsultaController::class, 'geoEndereco']);
        Route::get('/consulta/bancos', [ConsultaController::class, 'bancos']);
        Route::get('/consulta/ncm', [ConsultaController::class, 'ncm']);
        Route::get('/consulta/cest', [ConsultaController::class, 'cest']);
        Route::get('/consulta/csosn', [ConsultaController::class, 'csosn']);
        Route::get('/consulta/cfop', [ConsultaController::class, 'cfop']);
        Route::get('/consulta/cst-icms', [ConsultaController::class, 'cstIcms']);
        Route::get('/consulta/cst-pis-cofins', [ConsultaController::class, 'cstPisCofins']);
        Route::get('/consulta/cst-cbs', [ConsultaController::class, 'cstCbs']);
        Route::get('/consulta/cclass-trib', [ConsultaController::class, 'cClassTrib']);
        Route::get('/consulta/tipos-item-sped', [ConsultaController::class, 'tiposItemSped']);
        Route::get('/consulta/origens-mercadoria', [ConsultaController::class, 'origensMercadoria']);
        Route::get('/consulta/unidades', [ConsultaController::class, 'unidadesMedida']);
        Route::get('/consulta/fator-conversao', [ConsultaController::class, 'fatorConversao']);
        Route::get('/consulta/produto-grupos', [ConsultaController::class, 'produtoGrupos']);
        Route::get('/consulta/naturezas-gerenciais', [ConsultaController::class, 'naturezasGerenciais']);
        Route::get('/consulta/departamentos', [ConsultaController::class, 'departamentos']);
        Route::get('/consulta/condicoes-pagamento-sugestoes', [ConsultaController::class, 'condicoesPagamentoSugestoes']);
    });
});
