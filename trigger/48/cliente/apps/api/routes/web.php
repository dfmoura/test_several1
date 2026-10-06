<?php

use App\Http\Controllers\AnexoController;
use App\Http\Controllers\CadastroController;
use App\Http\Controllers\ContaController;
use App\Http\Controllers\DemandaController;
use App\Http\Controllers\EntrarController;
use App\Http\Controllers\ExtratoController;
use App\Http\Controllers\FaturaController;
use App\Http\Controllers\InicioController;
use App\Http\Controllers\LegalController;
use App\Http\Controllers\Operacao\DemandaController as OperacaoDemandaController;
use App\Http\Controllers\Operacao\EmpresaController as OperacaoEmpresaController;
use App\Http\Controllers\Operacao\EntrarController as OperacaoEntrarController;
use App\Http\Controllers\Operacao\FilaController;
use App\Http\Controllers\PixController;
use App\Http\Controllers\SenhaController;
use App\Http\Controllers\WebhookInterController;
use App\Models\Demanda;
use App\Models\Fatura;
use Illuminate\Support\Facades\Route;

Route::bind('demanda', function (string $codigo) {
    $consulta = Demanda::query()->where('codigo', $codigo);
    if (request()->is('operacao/*') && auth('operacao')->check()) {
        return $consulta->firstOrFail();
    }

    return $consulta->where('empresa_id', (int) session('empresa_id'))->firstOrFail();
});

Route::bind('fatura', function (string $id) {
    $consulta = Fatura::query()->whereKey($id);
    if (request()->is('operacao/*') && auth('operacao')->check()) {
        return $consulta->firstOrFail();
    }

    return $consulta->where('empresa_id', (int) session('empresa_id'))->firstOrFail();
});

Route::post('/webhooks/inter/pix', WebhookInterController::class)->name('webhooks.inter');

Route::get('/termos', [LegalController::class, 'termos'])->name('termos');
Route::get('/privacidade', [LegalController::class, 'privacidade'])->name('privacidade');

Route::middleware('guest:web')->group(function () {
    Route::get('/entrar', [EntrarController::class, 'formulario'])->name('entrar');
    Route::post('/entrar', [EntrarController::class, 'entrar'])->middleware('throttle:entrar');
    Route::get('/senha/esqueci', [SenhaController::class, 'formulario'])->name('senha.esqueci');
    Route::post('/senha/esqueci', [SenhaController::class, 'enviar'])->middleware('throttle:senha');
    Route::get('/senha/redefinir/{token}', [SenhaController::class, 'redefinir'])->name('senha.redefinir');
    Route::post('/senha/redefinir', [SenhaController::class, 'salvar'])->middleware('throttle:senha')->name('senha.salvar');
    Route::get('/cadastro', [CadastroController::class, 'cnpj'])->name('cadastro.cnpj');
    Route::post('/cadastro', [CadastroController::class, 'consultar'])->middleware('throttle:cadastro');
    Route::get('/cadastro/responsavel', [CadastroController::class, 'responsavel'])->name('cadastro.responsavel');
    Route::post('/cadastro/responsavel', [CadastroController::class, 'concluir'])->middleware('throttle:cadastro');
});

Route::middleware(['cliente', 'sessao.absoluta:web'])->group(function () {
    Route::get('/inicio', InicioController::class)->name('inicio');
    Route::post('/avisos/lidos', [InicioController::class, 'lerAvisos'])->name('avisos.lidos');
    Route::post('/sair', [EntrarController::class, 'sair'])->name('sair');
    Route::get('/demandas', [DemandaController::class, 'index'])->name('demandas.index');
    Route::get('/demandas/nova', [DemandaController::class, 'criar'])->name('demandas.criar');
    Route::post('/demandas', [DemandaController::class, 'salvar'])->name('demandas.salvar');
    Route::get('/demandas/{demanda}', [DemandaController::class, 'mostrar'])->name('demandas.mostrar');
    Route::post('/demandas/{demanda}/enviar', [DemandaController::class, 'enviar'])->name('demandas.enviar');
    Route::post('/demandas/{demanda}/descartar', [DemandaController::class, 'descartar'])->name('demandas.descartar');
    Route::post('/demandas/{demanda}/mensagens', [DemandaController::class, 'mensagem'])->name('demandas.mensagem');
    Route::post('/demandas/{demanda}/aprovar', [DemandaController::class, 'aprovar'])->name('demandas.aprovar');
    Route::post('/demandas/{demanda}/recusar', [DemandaController::class, 'recusar'])->name('demandas.recusar');
    Route::get('/demandas/{demanda}/anexos/{anexo}', [AnexoController::class, 'baixar'])->name('anexos.baixar');
    Route::get('/faturas/{fatura}/pdf', [FaturaController::class, 'pdf'])->name('faturas.pdf');
    Route::get('/extrato', ExtratoController::class)->name('extrato');
    Route::get('/conta', [ContaController::class, 'mostrar'])->name('conta');
    Route::get('/conta/recarga', [ContaController::class, 'recarga'])->name('conta.recarga');
    Route::post('/conta/recarga', [ContaController::class, 'emitirRecarga'])->middleware('throttle:pix');
    Route::get('/pix/{txid}', [PixController::class, 'mostrar'])->name('pix.mostrar');
    Route::get('/pix/{txid}/situacao', [PixController::class, 'situacao'])->name('pix.situacao');
    Route::post('/pix/{txid}/simular', [PixController::class, 'simular'])->name('pix.simular');
});

Route::prefix('operacao')->group(function () {
    Route::middleware('guest:operacao')->group(function () {
        Route::get('/entrar', [OperacaoEntrarController::class, 'formulario'])->name('operacao.entrar');
        Route::post('/entrar', [OperacaoEntrarController::class, 'entrar'])->middleware('throttle:entrar');
    });
    Route::middleware(['operacao', 'sessao.absoluta:operacao'])->group(function () {
        Route::get('/', FilaController::class)->name('operacao.fila');
        Route::get('/auditoria', [FilaController::class, 'auditoria'])->name('operacao.auditoria');
        Route::get('/empresas', [OperacaoEmpresaController::class, 'index'])->name('operacao.empresas');
        Route::get('/empresas/{empresa}', [OperacaoEmpresaController::class, 'mostrar'])->name('operacao.empresa');
        Route::post('/empresas/{empresa}/bloquear', [OperacaoEmpresaController::class, 'bloquear'])->name('operacao.empresas.bloquear');
        Route::post('/empresas/{empresa}/reativar', [OperacaoEmpresaController::class, 'reativar'])->name('operacao.empresas.reativar');
        Route::post('/empresas/{empresa}/cancelar', [OperacaoEmpresaController::class, 'cancelar'])->name('operacao.empresas.cancelar');
        Route::get('/demandas/{demanda}', [OperacaoDemandaController::class, 'mostrar'])->name('operacao.demanda');
        Route::post('/demandas/{demanda}/mensagens', [OperacaoDemandaController::class, 'mensagem'])->name('operacao.mensagens');
        Route::post('/demandas/{demanda}/proposta', [OperacaoDemandaController::class, 'propor'])->name('operacao.propor');
        Route::post('/demandas/{demanda}/recusar', [OperacaoDemandaController::class, 'recusar'])->name('operacao.recusar');
        Route::post('/demandas/{demanda}/executar', [OperacaoDemandaController::class, 'executar'])->name('operacao.executar');
        Route::post('/demandas/{demanda}/marco', [OperacaoDemandaController::class, 'marco'])->name('operacao.marco');
        Route::post('/demandas/{demanda}/apresentar', [OperacaoDemandaController::class, 'apresentar'])->name('operacao.apresentar');
        Route::post('/demandas/{demanda}/cancelar', [OperacaoDemandaController::class, 'cancelar'])->name('operacao.cancelar');
        Route::post('/sair', [OperacaoEntrarController::class, 'sair'])->name('operacao.sair');
    });
});

Route::get('/', function () {
    if (auth('web')->check()) {
        return redirect()->route('inicio');
    }

    return redirect()->route('entrar');
});
