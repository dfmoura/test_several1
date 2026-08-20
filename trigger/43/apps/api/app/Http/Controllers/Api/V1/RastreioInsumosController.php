<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\EstoqueLote;
use App\Models\OrdemProducao;
use App\Models\Pedido;
use App\Services\Producao\RastreioInsumosService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Genealogia de insumos (ADR-039-PRD-002).
 */
class RastreioInsumosController extends Controller
{
    public function __construct(private readonly RastreioInsumosService $rastreio) {}

    public function buscar(Request $request): JsonResponse
    {
        $this->authorizeRead($request);
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        return response()->json([
            'data' => $this->rastreio->buscar($this->empresa(), (string) ($validated['q'] ?? '')),
        ]);
    }

    public function ordemProducao(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresaId($ordemProducao->empresa_id);

        return response()->json([
            'data' => $this->rastreio->paraOp($this->empresa(), $ordemProducao),
        ]);
    }

    public function pedido(Request $request, Pedido $pedido): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresaId($pedido->empresa_id);

        return response()->json([
            'data' => $this->rastreio->paraPedido($this->empresa(), $pedido),
        ]);
    }

    public function lote(Request $request, EstoqueLote $estoqueLote): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresaId($estoqueLote->empresa_id);

        return response()->json([
            'data' => $this->rastreio->paraLote($this->empresa(), $estoqueLote),
        ]);
    }

    private function authorizeRead(Request $request): void
    {
        $user = $request->user();
        if (! $user->can('producao.ler') && ! $user->can('estoque.ler')) {
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

    private function assertEmpresaId(int $empresaId): void
    {
        if ($empresaId !== $this->empresa()->id) {
            abort(404);
        }
    }
}
