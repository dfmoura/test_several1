<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\OrdemProducao;
use App\Models\PaEmbalagem;
use App\Services\Producao\PaEmbalagemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class PaEmbalagemController extends Controller
{
    public function __construct(private readonly PaEmbalagemService $service) {}

    public function sugerir(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertOp($ordemProducao);

        return response()->json([
            'data' => $this->service->sugerir($this->empresa(), $ordemProducao),
        ]);
    }

    public function confirmar(Request $request, OrdemProducao $ordemProducao): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertOp($ordemProducao);

        $data = $request->validate([
            'observacao' => ['nullable', 'string', 'max:2000'],
            'bobinas' => ['nullable', 'array', 'min:1', 'max:500'],
            'bobinas.*.qtde_etiquetas' => ['required_with:bobinas', 'numeric'],
        ]);

        return response()->json([
            'data' => $this->service->confirmar($this->empresa(), $ordemProducao, $data),
        ]);
    }

    public function show(Request $request, PaEmbalagem $paEmbalagem): JsonResponse
    {
        $this->authorizeRead($request);
        if ($paEmbalagem->empresa_id !== $this->empresa()->id) {
            abort(404);
        }

        $paEmbalagem->load(['bobinas', 'caixas']);

        return response()->json(['data' => $this->service->toOut($paEmbalagem)]);
    }

    public function etiquetas(Request $request, PaEmbalagem $paEmbalagem): JsonResponse
    {
        $this->authorizeEtiquetas($request);

        return response()->json([
            'data' => $this->service->etiquetas($this->empresa(), $paEmbalagem),
        ]);
    }

    private function assertOp(OrdemProducao $op): void
    {
        if ($op->empresa_id !== $this->empresa()->id) {
            abort(404);
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

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('producao.ler')) {
            abort(403);
        }
    }

    /** Impressão BOB/CX no chão ou no kit de saída. */
    private function authorizeEtiquetas(Request $request): void
    {
        if ($request->user()->can('producao.ler') || $request->user()->can('expedicao.ler')) {
            return;
        }

        abort(403);
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('producao.escrever')) {
            abort(403);
        }
    }
}
