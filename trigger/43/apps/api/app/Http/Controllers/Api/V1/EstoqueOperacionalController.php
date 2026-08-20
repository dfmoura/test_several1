<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\EstoqueAjuste;
use App\Services\Estoque\EstoqueAjusteService;
use App\Services\Estoque\EstoqueReposicaoService;
use App\Support\EstoqueValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EstoqueOperacionalController extends Controller
{
    public function __construct(
        private readonly EstoqueReposicaoService $reposicao,
        private readonly EstoqueAjusteService $ajustes,
    ) {}

    public function reposicao(Request $request): JsonResponse
    {
        $this->authorizeComprasOrEstoqueRead($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        return response()->json([
            'data' => $this->reposicao->list($this->empresa(), $validated['q'] ?? null),
        ]);
    }

    public function gerarOcReposicao(Request $request): JsonResponse
    {
        if (! $request->user()->can('compras.escrever')) {
            abort(403);
        }

        $data = $request->validate(EstoqueValidationRules::reposicaoGerarOc());

        return response()->json([
            'data' => $this->reposicao->gerarOc($this->empresa(), $data),
        ], 201);
    }

    public function ajustesIndex(Request $request): JsonResponse
    {
        $this->authorizeEstoqueRead($request);

        $validated = $request->validate(EstoqueValidationRules::listFilters());

        return response()->json([
            'data' => $this->ajustes->list(
                $this->empresa(),
                $validated['status'] ?? null,
                $validated['q'] ?? null,
                $validated['de'] ?? null,
                $validated['ate'] ?? null,
            ),
            'meta' => $this->ajustes->meta(),
        ]);
    }

    public function ajustesStore(Request $request): JsonResponse
    {
        $this->authorizeEstoqueWrite($request);

        $data = $request->validate(EstoqueValidationRules::ajusteCreate());

        return response()->json([
            'data' => $this->ajustes->create($this->empresa(), $data),
        ], 201);
    }

    public function ajustesAprovar(Request $request, EstoqueAjuste $estoqueAjuste): JsonResponse
    {
        $this->authorizeEstoqueAprovar($request);
        $this->assertEmpresa($estoqueAjuste);

        $data = $request->validate(EstoqueValidationRules::ajusteAprovar());

        return response()->json([
            'data' => $this->ajustes->aprovar($this->empresa(), $estoqueAjuste, $request->user(), $data),
        ]);
    }

    public function ajustesRejeitar(Request $request, EstoqueAjuste $estoqueAjuste): JsonResponse
    {
        $this->authorizeEstoqueAprovar($request);
        $this->assertEmpresa($estoqueAjuste);

        $data = $request->validate(EstoqueValidationRules::ajusteRejeitar());

        return response()->json([
            'data' => $this->ajustes->rejeitar(
                $this->empresa(),
                $estoqueAjuste,
                $request->user(),
                $data['observacao'] ?? null,
            ),
        ]);
    }

    public function ajustesCancelar(Request $request, EstoqueAjuste $estoqueAjuste): JsonResponse
    {
        $this->authorizeEstoqueWrite($request);
        $this->assertEmpresa($estoqueAjuste);

        $data = $request->validate(EstoqueValidationRules::ajusteCancelar());

        return response()->json([
            'data' => $this->ajustes->cancelar(
                $this->empresa(),
                $estoqueAjuste,
                $request->user(),
                $data['observacao'] ?? null,
            ),
        ]);
    }

    private function authorizeComprasOrEstoqueRead(Request $request): void
    {
        $user = $request->user();
        if (! $user->can('compras.ler') && ! $user->can('estoque.ler')) {
            abort(403);
        }
    }

    private function authorizeEstoqueRead(Request $request): void
    {
        if (! $request->user()->can('estoque.ler')) {
            abort(403);
        }
    }

    private function authorizeEstoqueWrite(Request $request): void
    {
        if (! $request->user()->can('estoque.escrever')) {
            abort(403);
        }
    }

    private function authorizeEstoqueAprovar(Request $request): void
    {
        if (! $request->user()->can('estoque.aprovar')) {
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

    private function assertEmpresa(EstoqueAjuste $ajuste): void
    {
        if ($ajuste->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
