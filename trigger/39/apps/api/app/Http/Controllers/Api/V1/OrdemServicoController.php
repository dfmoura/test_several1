<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\OrdemServico;
use App\Services\Producao\OrdemServicoService;
use App\Support\PadraoDecimal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrdemServicoController extends Controller
{
    public function __construct(private readonly OrdemServicoService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', 'in:'.implode(',', OrdemServico::STATUSES)],
        ]);

        return response()->json([
            'data' => $this->service->list(
                $this->empresa(),
                $validated['q'] ?? null,
                $validated['status'] ?? null,
            ),
            'meta' => ['statuses' => OrdemServico::STATUSES],
        ]);
    }

    public function show(Request $request, OrdemServico $ordemServico): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($ordemServico);

        return response()->json(['data' => $this->service->show($ordemServico)]);
    }

    public function concluir(Request $request, OrdemServico $ordemServico): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($ordemServico);

        $data = $request->validate([
            'qtde_executada' => array_merge(['nullable'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, true)),
            'aceitar_fora_tolerancia' => ['sometimes', 'boolean'],
            'motivo_fora_tolerancia' => ['nullable', 'string', 'max:255'],
            'observacao' => ['nullable', 'string', 'max:2000'],
        ]);

        return response()->json([
            'data' => $this->service->concluir($this->empresa(), $ordemServico, $data),
        ]);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('producao.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('producao.escrever')) {
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

    private function assertEmpresa(OrdemServico $os): void
    {
        if ($os->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
