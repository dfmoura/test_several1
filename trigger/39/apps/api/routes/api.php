<?php

use App\Http\Controllers\Api\V1\AuthController;
use App\Http\Controllers\Api\V1\ConsultaController;
use App\Http\Controllers\Api\V1\EmpresaController;
use App\Http\Controllers\Api\V1\FacasController;
use App\Http\Controllers\Api\V1\HealthController;
use App\Http\Controllers\Api\V1\IaProvedorController;
use App\Http\Controllers\Api\V1\OrcamentoController;
use App\Http\Controllers\Api\V1\ParametroController;
use App\Http\Controllers\Api\V1\ParceiroController;
use App\Http\Controllers\Api\V1\ParceiroImportController;
use App\Http\Controllers\Api\V1\ProdutoController;
use App\Http\Controllers\Api\V1\ProdutoImportController;
use App\Http\Controllers\Api\V1\UsuarioController;
use App\Http\Middleware\SetEmpresaContext;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    Route::get('/health', HealthController::class);

    Route::post('/auth/login', [AuthController::class, 'login']);

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
        Route::get('/parceiros/{parceiro}', [ParceiroController::class, 'show']);
        Route::put('/parceiros/{parceiro}', [ParceiroController::class, 'update']);

        Route::get('/produtos', [ProdutoController::class, 'index']);
        Route::post('/produtos', [ProdutoController::class, 'store']);
        Route::get('/produtos/import/template', [ProdutoImportController::class, 'template']);
        Route::post('/produtos/import/preview', [ProdutoImportController::class, 'preview']);
        Route::post('/produtos/import/commit', [ProdutoImportController::class, 'commit']);
        Route::get('/produtos/{produto}', [ProdutoController::class, 'show']);
        Route::put('/produtos/{produto}', [ProdutoController::class, 'update']);

        Route::get('/orcamentos/catalogo', [OrcamentoController::class, 'catalog']);
        Route::post('/orcamentos/calcular', [OrcamentoController::class, 'calcular']);
        Route::get('/orcamentos', [OrcamentoController::class, 'index']);
        Route::post('/orcamentos', [OrcamentoController::class, 'store']);
        Route::get('/orcamentos/{orcamento}', [OrcamentoController::class, 'show']);
        Route::put('/orcamentos/{orcamento}', [OrcamentoController::class, 'update']);
        Route::delete('/orcamentos/{orcamento}', [OrcamentoController::class, 'destroy']);

        Route::get('/facas', [FacasController::class, 'index']);

        Route::get('/consulta/cnpj/{cnpj}', [ConsultaController::class, 'cnpj']);
        Route::get('/consulta/cep/{cep}', [ConsultaController::class, 'cep']);
        Route::get('/consulta/bancos', [ConsultaController::class, 'bancos']);
        Route::get('/consulta/ncm', [ConsultaController::class, 'ncm']);
        Route::get('/consulta/cest', [ConsultaController::class, 'cest']);
        Route::get('/consulta/csosn', [ConsultaController::class, 'csosn']);
        Route::get('/consulta/cfop', [ConsultaController::class, 'cfop']);
        Route::get('/consulta/cst-icms', [ConsultaController::class, 'cstIcms']);
        Route::get('/consulta/cst-pis-cofins', [ConsultaController::class, 'cstPisCofins']);
        Route::get('/consulta/tipos-item-sped', [ConsultaController::class, 'tiposItemSped']);
        Route::get('/consulta/origens-mercadoria', [ConsultaController::class, 'origensMercadoria']);
        Route::get('/consulta/produto-grupos', [ConsultaController::class, 'produtoGrupos']);
    });
});
