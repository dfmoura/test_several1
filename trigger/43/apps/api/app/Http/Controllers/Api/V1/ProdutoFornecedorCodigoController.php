<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Produto;
use App\Models\ProdutoFornecedorCodigo;
use App\Services\Cadastros\ProdutoFornecedorCodigoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProdutoFornecedorCodigoController extends Controller
{
    public function __construct(
        private readonly ProdutoFornecedorCodigoService $service,
    ) {}

    public function index(Request $request, Produto $produto): JsonResponse
    {
        if (! $request->user()->can('produto.ler')) {
            abort(403);
        }
        $this->assertEmpresa($produto);

        return response()->json(['data' => $this->service->listForProduto($produto)]);
    }

    public function store(Request $request, Produto $produto): JsonResponse
    {
        if (! $request->user()->can('produto.escrever')) {
            abort(403);
        }
        $this->assertEmpresa($produto);

        $data = $request->validate([
            'fornecedor_id' => ['required', 'integer'],
            'c_prod' => ['required', 'string', 'max:60'],
            'x_prod' => ['nullable', 'string', 'max:240'],
        ]);

        $row = $this->service->create($produto, $data);

        return response()->json(['data' => $row], 201);
    }

    public function update(
        Request $request,
        Produto $produto,
        ProdutoFornecedorCodigo $fornecedorCodigo,
    ): JsonResponse {
        if (! $request->user()->can('produto.escrever')) {
            abort(403);
        }
        $this->assertEmpresa($produto);
        $this->assertMapDoProduto($produto, $fornecedorCodigo);

        $data = $request->validate([
            'fornecedor_id' => ['sometimes', 'integer'],
            'c_prod' => ['sometimes', 'string', 'max:60'],
            'x_prod' => ['nullable', 'string', 'max:240'],
        ]);

        $row = $this->service->update($fornecedorCodigo, $data);

        return response()->json(['data' => $row]);
    }

    public function destroy(
        Request $request,
        Produto $produto,
        ProdutoFornecedorCodigo $fornecedorCodigo,
    ): JsonResponse {
        if (! $request->user()->can('produto.escrever')) {
            abort(403);
        }
        $this->assertEmpresa($produto);
        $this->assertMapDoProduto($produto, $fornecedorCodigo);

        $this->service->delete($fornecedorCodigo);

        return response()->json(null, 204);
    }

    private function assertEmpresa(Produto $produto): void
    {
        if ($produto->empresa_id !== app('empresa')->id) {
            abort(404);
        }
    }

    private function assertMapDoProduto(Produto $produto, ProdutoFornecedorCodigo $map): void
    {
        if ($map->empresa_id !== $produto->empresa_id || $map->produto_id !== $produto->id) {
            abort(404);
        }
    }
}
