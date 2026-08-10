<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\BemPatrimonialController;
use App\Http\Controllers\Api\V1\ConsultaController;
use App\Http\Controllers\Api\V1\EmpresaController;
use App\Http\Controllers\Api\V1\FacasController;
use App\Http\Controllers\Api\V1\FiscalHubController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\IaProvedorController;
use App\Http\Controllers\Api\V1\OrcamentoAprovacaoController;
use App\Http\Controllers\Api\V1\OrcamentoCatalogoController;
use App\Http\Controllers\Api\V1\OrcamentoController;
use App\Http\Controllers\Api\V1\OrcamentoPublicoController;
use App\Http\Controllers\Api\V1\ParametroController;
use App\Http\Controllers\Api\V1\ParceiroController;
use App\Http\Controllers\Api\V1\ParceiroImportController;
use App\Http\Controllers\Api\V1\ProdutoController;
use App\Http\Controllers\Api\V1\ProdutoImportController;
use App\Http\Controllers\Api\V1\RelatorioController;
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
        Route::post('/publico/orcamentos/{token}/decidir', [OrcamentoPublicoController::class, 'decidir'])
            ->where('token', '[A-Za-z0-9_-]{20,128}')
            ->middleware('throttle:20,1');
    });

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

        Route::get('/orcamentos/catalogo', [OrcamentoController::class, 'catalog']);
        Route::post('/orcamentos/calcular', [OrcamentoController::class, 'calcular']);
        Route::get('/orcamentos', [OrcamentoController::class, 'index']);
        Route::post('/orcamentos', [OrcamentoController::class, 'store']);
        Route::get('/orcamentos/{orcamento}', [OrcamentoController::class, 'show']);
        Route::put('/orcamentos/{orcamento}', [OrcamentoController::class, 'update']);
        Route::delete('/orcamentos/{orcamento}', [OrcamentoController::class, 'destroy']);
        Route::post('/orcamentos/{orcamento}/enviar-aprovacao', [OrcamentoAprovacaoController::class, 'enviar']);

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

        Route::get('/facas/resumo', [FacasController::class, 'resumo']);
        Route::post('/facas/seed', [FacasController::class, 'seed']);
        Route::get('/facas', [FacasController::class, 'index']);
        Route::post('/facas', [FacasController::class, 'store']);
        Route::get('/facas/{faca}', [FacasController::class, 'show'])->whereNumber('faca');
        Route::patch('/facas/{faca}/ativo', [FacasController::class, 'setAtivo'])->whereNumber('faca');

        Route::middleware('relatorio.ia')->group(function () {
            Route::get('/relatorios/catalogo', [RelatorioController::class, 'catalogo']);
            Route::get('/relatorios', [RelatorioController::class, 'index']);
            Route::post('/relatorios', [RelatorioController::class, 'store'])
                ->middleware('throttle:'.config('erp.relatorio_ia_rate_gerar', '10,1'));
            Route::post('/relatorios/planejar', [RelatorioController::class, 'planejar'])
                ->middleware('throttle:'.config('erp.relatorio_ia_rate_planejar', '20,1'));
            Route::get('/relatorios/planejamentos/{planejamento}', [RelatorioController::class, 'showPlanejamento']);
            Route::get('/relatorios/{relatorio}', [RelatorioController::class, 'show']);
            Route::post('/relatorios/{relatorio}/reprocessar', [RelatorioController::class, 'reprocessar']);
            Route::post('/relatorios/{relatorio}/replanejar', [RelatorioController::class, 'replanejar']);
            Route::delete('/relatorios/{relatorio}', [RelatorioController::class, 'destroy']);
            Route::get('/relatorios/{relatorio}/download', [RelatorioController::class, 'download']);
        });

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
    });
});
