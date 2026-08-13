<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\Titulo;
use App\Services\Financeiro\TituloService;
use App\Support\CompraValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class TituloController extends Controller
{
    public function __construct(private readonly TituloService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate(array_merge(
            CompraValidationRules::listFilters(Titulo::class),
            ['tipo' => ['nullable', 'string', 'in:PAGAR,RECEBER']],
        ));

        $tipo = strtoupper((string) ($validated['tipo'] ?? Titulo::TIPO_PAGAR));
        $empresa = $this->empresa();
        $q = $validated['q'] ?? null;
        $status = $validated['status'] ?? null;
        $parceiroId = isset($validated['parceiro_id']) ? (int) $validated['parceiro_id'] : null;

        $data = $tipo === Titulo::TIPO_RECEBER
            ? $this->service->listReceber($empresa, $q, $status, $parceiroId)
            : $this->service->listPagar($empresa, $q, $status, $parceiroId);

        return response()->json([
            'data' => $data,
            'meta' => [
                'tipo' => $tipo,
                'statuses' => Titulo::STATUSES,
            ],
        ]);
    }

    public function show(Request $request, Titulo $titulo): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($titulo);

        return response()->json(['data' => $this->service->toOut($titulo)]);
    }

    public function baixar(Request $request, Titulo $titulo): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($titulo);

        $data = $request->validate(CompraValidationRules::baixarTitulo());

        return response()->json([
            'data' => $this->service->baixar($this->empresa(), $titulo, $data),
        ], 201);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('financeiro.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('financeiro.escrever')) {
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

    private function assertEmpresa(Titulo $titulo): void
    {
        if ($titulo->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
