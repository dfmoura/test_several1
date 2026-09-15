<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Cadastros\ProdutoFromNfeItemService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProdutoFromNfeItemController extends Controller
{
    public function __construct(
        private readonly ProdutoFromNfeItemService $service,
    ) {}

    public function preview(Request $request): JsonResponse
    {
        if (! $request->user()->can('produto.escrever')) {
            abort(403);
        }

        $data = $this->validated($request, preview: true);
        $result = $this->service->preview(app('empresa'), $data);

        return response()->json(['data' => $result]);
    }

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->can('produto.escrever')) {
            abort(403);
        }

        $data = $this->validated($request, preview: false);
        $result = $this->service->create(app('empresa'), $data);

        return response()->json(['data' => $result], 201);
    }

    /**
     * @return array<string, mixed>
     */
    private function validated(Request $request, bool $preview): array
    {
        return $request->validate([
            'c_prod' => [$preview ? 'nullable' : 'required', 'string', 'max:60'],
            'x_prod' => ['nullable', 'string', 'max:240'],
            'ncm' => ['nullable', 'string', 'max:16'],
            'u_com' => ['nullable', 'string', 'max:8'],
            'origem' => ['nullable', 'integer', 'min:0', 'max:8'],
            'fornecedor_id' => ['nullable', 'integer'],
            'fornecedor_cnpj' => ['nullable', 'string', 'max:18'],
            'familia' => ['nullable', 'string', 'in:MP,EMB,REV,PA,SVC,FAC'],
            'grupo' => ['nullable', 'string', 'max:16'],
            'descricao_fiscal' => ['nullable', 'string', 'max:255'],
            'descricao_comercial' => ['nullable', 'string', 'max:255'],
            'unidade_comercial' => ['nullable', 'string', 'max:8'],
            'unidade_interna' => ['nullable', 'string', 'max:8'],
            'programa_compra' => ['nullable', 'string', 'max:40'],
            'gravar_depara' => ['sometimes', 'boolean'],
            'forcar_depara' => ['sometimes', 'boolean'],
        ]);
    }
}
