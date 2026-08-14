<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BemPatrimonialController;
use App\Http\Controllers\Api\V1\CompraNecessidadeController;
use App\Http\Controllers\Api\V1\ConsultaController;
use App\Http\Controllers\Api\V1\DepartamentoController;
use App\Http\Controllers\Api\V1\CotacaoController;
use App\Http\Controllers\Api\V1\EmpresaController;
use App\Http\Controllers\Api\V1\EstoqueController;
use App\Http\Controllers\Api\V1\EstoqueInventarioController;
use App\Http\Controllers\Api\V1\EstoqueOperacionalController;
use App\Http\Controllers\Api\V1\FacasController;
use App\Http\Controllers\Api\V1\FaturamentoController;
use App\Http\Controllers\Api\V1\FiscalHubController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\IaProvedorController;
use App\Http\Controllers\Api\V1\NaturezaGerencialController;
use App\Http\Controllers\Api\V1\OrcamentoAprovacaoController;
use App\Http\Controllers\Api\V1\OrcamentoCatalogoController;
use App\Http\Controllers\Api\V1\OrcamentoController;
use App\Http\Controllers\Api\V1\OrcamentoPublicoController;
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
use App\Http\Controllers\Api\V1\WebhookBancarioController;
use App\Http\Controllers\Api\V1\UsuarioController;
use App\Http\Middleware\SetEmpresaContext;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', HealthController::class);

    Route::post('/auth/login', [AuthController::class, 'login']);

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

    // Webhooks bancários (BankProvider) — sem Sanctum; idempotência no inbox.
    Route::post('/webhooks/bancarios/{provider}', WebhookBancarioController::class)
        ->where('provider', 'mock|inter')
        ->middleware('throttle:120,1');

    Route::middleware(['auth:sanctum', SetEmpresaContext::class])->group(function () {
        Route::post('/auth/logout', [AuthController::class, 'logout']);
        Route::get('/auth/me', [AuthController::class, 'me']);

        Route::get('/empresas', [EmpresaController::class, 'index']);
        Route::get('/empresas/{empresa}', [EmpresaController::class, 'show']);
        Route::put('/empresas/{empresa}', [EmpresaController::class, 'update']);

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

        Route::get('/usuarios', [UsuarioController::class, 'index']);
        Route::post('/usuarios', [UsuarioController::class, 'store']);
        Route::put('/usuarios/{usuario}', [UsuarioController::class, 'update']);
        Route::patch('/usuarios/{usuario}/deactivate', [UsuarioController::class, 'deactivate']);
        Route::patch('/usuarios/{usuario}/activate', [UsuarioController::class, 'activate']);

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
        Route::get('/bens/{bem}', [BemPatrimonialController::class, 'show']);
        Route::put('/bens/{bem}', [BemPatrimonialController::class, 'update']);
        Route::delete('/bens/{bem}', [BemPatrimonialController::class, 'destroy']);

        Route::get('/departamentos', [DepartamentoController::class, 'index']);
        Route::post('/departamentos', [DepartamentoController::class, 'store']);
        Route::get('/departamentos/{departamento}', [DepartamentoController::class, 'show']);
        Route::put('/departamentos/{departamento}', [DepartamentoController::class, 'update']);
        Route::delete('/departamentos/{departamento}', [DepartamentoController::class, 'destroy']);

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
        Route::get('/titulos/{titulo}', [TituloController::class, 'show']);
        Route::post('/titulos/{titulo}/baixar', [TituloController::class, 'baixar']);

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
        Route::get('/orcamento-catalogo/faixas-frete', [OrcamentoCatalogoController::class, 'faixasFrete']);
        Route::post('/orcamento-catalogo/faixas-frete', [OrcamentoCatalogoController::class, 'storeFaixaFrete']);
        Route::put('/orcamento-catalogo/faixas-frete/{faixaFrete}', [OrcamentoCatalogoController::class, 'updateFaixaFrete']);

        Route::get('/facas/resumo', [FacasController::class, 'resumo']);
        Route::post('/facas/seed', [FacasController::class, 'seed']);
        Route::get('/facas', [FacasController::class, 'index']);
        Route::post('/facas', [FacasController::class, 'store']);
        Route::get('/facas/{faca}', [FacasController::class, 'show'])->whereNumber('faca');
        Route::patch('/facas/{faca}/ativo', [FacasController::class, 'setAtivo'])->whereNumber('faca');

        Route::get('/consulta/cnpj/{cnpj}', [ConsultaController::class, 'cnpj']);
        Route::get('/consulta/cep/{cep}', [ConsultaController::class, 'cep']);
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
    });
});
