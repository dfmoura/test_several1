<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\OrdemCompra;
use App\Services\Compras\OrdemCompraService;
use App\Support\CompraValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrdemCompraController extends Controller
{
    public function __construct(private readonly OrdemCompraService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate(CompraValidationRules::listFilters(OrdemCompra::class));

        return response()->json([
            'data' => $this->service->list(
                $this->empresa(),
                $validated['q'] ?? null,
                $validated['status'] ?? null,
                isset($validated['fornecedor_id']) ? (int) $validated['fornecedor_id'] : null,
            ),
            'meta' => [
                'origens' => OrdemCompra::ORIGENS,
                'statuses' => OrdemCompra::STATUSES,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $request->validate(CompraValidationRules::ordemCompraDireta());
        $data['origem'] = OrdemCompra::ORIGEM_DIRETA;

        return response()->json(['data' => $this->service->create($this->empresa(), $data)], 201);
    }

    public function show(Request $request, OrdemCompra $ordemCompra): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($ordemCompra);

        return response()->json(['data' => $this->service->show($ordemCompra)]);
    }

    public function cancel(Request $request, OrdemCompra $ordemCompra): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($ordemCompra);

        return response()->json(['data' => $this->service->cancel($ordemCompra)]);
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

    private function assertEmpresa(OrdemCompra $oc): void
    {
        if ($oc->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
