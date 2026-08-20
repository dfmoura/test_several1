<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CompraNecessidade;
use App\Models\Empresa;
use App\Services\Compras\CompraNecessidadeService;
use App\Support\CompraValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CompraNecessidadeController extends Controller
{
    public function __construct(private readonly CompraNecessidadeService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate(CompraValidationRules::listFilters(CompraNecessidade::class));

        $data = $this->service->list(
            $this->empresa(),
            $validated['q'] ?? null,
            $validated['status'] ?? null,
            isset($validated['produto_id']) ? (int) $validated['produto_id'] : null,
        );

        return response()->json([
            'data' => $data,
            'meta' => [
                'prioridades' => CompraNecessidade::PRIORIDADES,
                'statuses' => CompraNecessidade::STATUSES,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $request->validate(CompraValidationRules::necessidade(false));

        return response()->json(['data' => $this->service->create($this->empresa(), $data)], 201);
    }

    public function show(Request $request, CompraNecessidade $compraNecessidade): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($compraNecessidade);

        return response()->json(['data' => $this->service->toOut($compraNecessidade)]);
    }

    public function update(Request $request, CompraNecessidade $compraNecessidade): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($compraNecessidade);

        $data = $request->validate(CompraValidationRules::necessidade(true));

        return response()->json(['data' => $this->service->update($compraNecessidade, $data)]);
    }

    public function cancel(Request $request, CompraNecessidade $compraNecessidade): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($compraNecessidade);

        return response()->json(['data' => $this->service->cancel($compraNecessidade)]);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('compras.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('compras.escrever')) {
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

    private function assertEmpresa(CompraNecessidade $necessidade): void
    {
        if ($necessidade->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
