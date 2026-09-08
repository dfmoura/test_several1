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

    public function estimarImpostos(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $request->validate(CompraValidationRules::estimarImpostos());

        return response()->json([
            'data' => $this->service->estimarImpostos(
                $this->empresa(),
                (int) $data['fornecedor_id'],
                $data['produto_ids'],
            ),
        ]);
    }

    public function show(Request $request, OrdemCompra $ordemCompra): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($ordemCompra);

        return response()->json(['data' => $this->service->show($ordemCompra)]);
    }

    public function update(Request $request, OrdemCompra $ordemCompra): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($ordemCompra);

        $data = $request->validate(CompraValidationRules::ordemCompraDireta());

        return response()->json([
            'data' => $this->service->update($ordemCompra, $this->empresa(), $data),
        ]);
    }

    public function destroy(Request $request, OrdemCompra $ordemCompra): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($ordemCompra);

        $this->service->destroy($ordemCompra);

        return response()->json(null, 204);
    }

    public function enviar(Request $request, OrdemCompra $ordemCompra): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($ordemCompra);

        $validated = $request->validate([
            'reenviar_email' => ['sometimes', 'boolean'],
        ]);

        return response()->json([
            'data' => $this->service->enviar(
                $ordemCompra,
                $this->empresa(),
                (bool) ($validated['reenviar_email'] ?? false),
            ),
        ]);
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
