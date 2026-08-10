<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Produto;
use App\Services\Cadastros\ProdutoDescricaoSugeridor;
use App\Services\Cadastros\ProdutoService;
use App\Support\ProdutoValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProdutoController extends Controller
{
    public function __construct(
        private readonly ProdutoService $produtoService,
        private readonly ProdutoDescricaoSugeridor $descricaoSugeridor,
    ) {}

    public function sugerirDescricao(Request $request): JsonResponse
    {
        if (! $request->user()->can('produto.escrever')) {
            abort(403);
        }

        $validated = $request->validate([
            'grupo_id' => ['required', 'integer', 'exists:produto_grupos,id'],
            'texto_livre' => ['nullable', 'string', 'max:500'],
            'largura_mm' => ['nullable', 'string', 'max:32'],
            'comprimento_m' => ['nullable', 'string', 'max:32'],
            'produto_id' => ['nullable', 'integer'],
        ]);

        try {
            $data = $this->descricaoSugeridor->sugerir(app('empresa'), $validated);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        }

        return response()->json(['data' => $data]);
    }

    public function index(Request $request): JsonResponse
    {
        if (! $request->user()->can('produto.ler')) {
            abort(403);
        }

        $validated = $request->validate([
            'familia' => ['nullable', 'string'],
            'grupo' => ['nullable', 'string', 'max:16'],
            'q' => ['nullable', 'string'],
        ]);

        $data = $this->produtoService->list(
            app('empresa'),
            $validated['familia'] ?? null,
            $validated['grupo'] ?? null,
            $validated['q'] ?? null
        );

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->can('produto.escrever')) {
            abort(403);
        }

        $data = $this->validateProduto($request);
        $produto = $this->produtoService->create(app('empresa'), $data);

        return response()->json(['data' => $produto], 201);
    }

    public function show(Request $request, Produto $produto): JsonResponse
    {
        if (! $request->user()->can('produto.ler')) {
            abort(403);
        }
        $this->assertEmpresa($produto);

        return response()->json(['data' => $produto]);
    }

    public function update(Request $request, Produto $produto): JsonResponse
    {
        $this->assertEmpresa($produto);

        $data = $this->validateProduto($request, partial: true);

        $fiscalFields = ProdutoValidationRules::fiscalKeys();
        $hasFiscal = array_intersect(array_keys($data), $fiscalFields) !== [];
        $hasCommercial = array_diff(array_keys($data), $fiscalFields) !== [];

        if ($hasFiscal && ! $request->user()->can('produto.fiscal')) {
            abort(403, 'Permissão produto.fiscal necessária.');
        }
        if ($hasCommercial && ! $request->user()->can('produto.escrever')) {
            abort(403, 'Permissão produto.escrever necessária.');
        }

        $produto = $this->produtoService->update($produto, $data);

        return response()->json(['data' => $produto]);
    }

    private function validateProduto(Request $request, bool $partial = false): array
    {
        return $request->validate(ProdutoValidationRules::rules($partial));
    }

    private function assertEmpresa(Produto $produto): void
    {
        if ($produto->empresa_id !== app('empresa')->id) {
            abort(404);
        }
    }
}
