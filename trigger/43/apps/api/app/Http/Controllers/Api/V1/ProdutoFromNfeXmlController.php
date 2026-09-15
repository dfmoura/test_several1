<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Cadastros\ProdutoFromNfeXmlService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ProdutoFromNfeXmlController extends Controller
{
    public function __construct(
        private readonly ProdutoFromNfeXmlService $service,
    ) {}

    public function preview(Request $request): JsonResponse
    {
        if (! $request->user()->can('produto.escrever')) {
            abort(403);
        }

        $request->validate([
            'file' => ['required', 'file', 'max:'.ProdutoFromNfeXmlService::MAX_FILE_KB],
        ]);

        $file = $request->file('file');
        if ($file === null) {
            return response()->json([
                'message' => 'Envie o XML da NF-e.',
                'errors' => ['file' => ['Envie o XML da NF-e.']],
            ], 422);
        }

        $result = $this->service->preview(app('empresa'), $file);

        return response()->json(['data' => $result]);
    }

    public function commit(Request $request): JsonResponse
    {
        if (! $request->user()->can('produto.escrever')) {
            abort(403);
        }

        $validated = $request->validate([
            'items' => ['required', 'array', 'min:1', 'max:'.ProdutoFromNfeXmlService::MAX_COMMIT_ITEMS],
            'items.*.acao' => ['required', 'string', 'in:criar,pular'],
            'items.*.c_prod' => ['required_if:items.*.acao,criar', 'nullable', 'string', 'max:60'],
            'items.*.x_prod' => ['nullable', 'string', 'max:240'],
            'items.*.ncm' => ['nullable', 'string', 'max:16'],
            'items.*.u_com' => ['nullable', 'string', 'max:8'],
            'items.*.origem' => ['nullable', 'integer', 'min:0', 'max:8'],
            'items.*.fornecedor_id' => ['nullable', 'integer'],
            'items.*.fornecedor_cnpj' => ['nullable', 'string', 'max:18'],
            'items.*.familia' => ['nullable', 'string', 'in:MP,EMB,REV,PA,SVC,FAC,MUC'],
            'items.*.grupo' => ['nullable', 'string', 'max:16'],
            'items.*.descricao_fiscal' => ['nullable', 'string', 'max:255'],
            'items.*.descricao_comercial' => ['nullable', 'string', 'max:255'],
            'items.*.unidade_comercial' => ['nullable', 'string', 'max:8'],
            'items.*.unidade_interna' => ['nullable', 'string', 'max:8'],
            'items.*.programa_compra' => ['nullable', 'string', 'max:40'],
            'items.*.gravar_depara' => ['sometimes', 'boolean'],
            'items.*.forcar_depara' => ['sometimes', 'boolean'],
        ]);

        $result = $this->service->commit(app('empresa'), $validated['items']);

        return response()->json(['data' => $result]);
    }
}
