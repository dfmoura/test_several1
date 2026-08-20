<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Cotacao;
use App\Models\Empresa;
use App\Services\Compras\CotacaoService;
use App\Support\CompraValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CotacaoController extends Controller
{
    public function __construct(private readonly CotacaoService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate(CompraValidationRules::listFilters(Cotacao::class));

        return response()->json([
            'data' => $this->service->list(
                $this->empresa(),
                $validated['q'] ?? null,
                $validated['status'] ?? null,
            ),
            'meta' => [
                'statuses' => Cotacao::STATUSES,
            ],
        ]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $request->validate(CompraValidationRules::cotacao());

        return response()->json(['data' => $this->service->create($this->empresa(), $data)], 201);
    }

    public function show(Request $request, Cotacao $cotacao): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($cotacao);

        return response()->json(['data' => $this->service->show($cotacao)]);
    }

    public function addProposta(Request $request, Cotacao $cotacao): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($cotacao);

        $data = $request->validate(CompraValidationRules::proposta());

        return response()->json([
            'data' => $this->service->addProposta($this->empresa(), $cotacao, $data),
        ], 201);
    }

    public function decidir(Request $request, Cotacao $cotacao): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($cotacao);

        $data = $request->validate(CompraValidationRules::decidirCotacao());

        return response()->json([
            'data' => $this->service->escolherVencedora($this->empresa(), $cotacao, $data),
        ]);
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

    private function assertEmpresa(Cotacao $cotacao): void
    {
        if ($cotacao->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
