<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\OrdemProducao;
use App\Services\Producao\OrdemProducaoService;
use App\Services\Producao\ProducaoApontamentoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Porta do chão: apontar retorno/perda e concluir a OP — mesmo motor da OP.
 */
class ProducaoApontamentoController extends Controller
{
    public function __construct(
        private readonly ProducaoApontamentoService $apontamento,
        private readonly OrdemProducaoService $ordens,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        return response()->json([
            'data' => $this->apontamento->fila($this->empresa()),
        ]);
    }

    public function show(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($ordemProducao);

        return response()->json(['data' => $this->ordens->show($ordemProducao)]);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('producao.ler')) {
            abort(403);
        }
    }

    private function empresa(): Empresa
    {
        $empresa = app('empresa');
        if (! $empresa instanceof Empresa) {
            abort(400, 'Empresa não selecionada.');
        }

        return $empresa;
    }

    private function assertEmpresa(OrdemProducao $op): void
    {
        if ($op->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
