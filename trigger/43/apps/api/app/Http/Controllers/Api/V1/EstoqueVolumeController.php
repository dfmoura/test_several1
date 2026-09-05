<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\EstoqueLote;
use App\Services\Estoque\EstoqueEnderecoService;
use App\Services\Estoque\EstoqueVolumeService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EstoqueVolumeController extends Controller
{
    public function __construct(
        private readonly EstoqueEnderecoService $enderecos,
        private readonly EstoqueVolumeService $volumes,
    ) {}

    public function enderecos(Request $request): JsonResponse
    {
        $this->authorizeEstoqueRead($request);

        return response()->json([
            'data' => $this->enderecos->list($this->empresa()),
        ]);
    }

    public function seedEnderecos(Request $request): JsonResponse
    {
        if (! $request->user()->can('estoque.escrever')) {
            abort(403);
        }

        return response()->json([
            'data' => $this->volumes->seedEnderecos($this->empresa()),
        ]);
    }

    public function etiqueta(Request $request, EstoqueLote $estoqueLote): JsonResponse
    {
        $this->authorizeEstoqueRead($request);

        return response()->json([
            'data' => $this->volumes->etiqueta($this->empresa(), $estoqueLote),
        ]);
    }

    public function vincularEndereco(Request $request, EstoqueLote $estoqueLote): JsonResponse
    {
        if (! $request->user()->can('estoque.escrever')) {
            abort(403);
        }

        $data = $request->validate([
            'endereco_id' => ['required', 'integer', 'exists:estoque_enderecos,id'],
        ]);

        return response()->json([
            'data' => $this->volumes->vincularEndereco(
                $this->empresa(),
                $estoqueLote,
                (int) $data['endereco_id'],
            ),
        ]);
    }

    private function authorizeEstoqueRead(Request $request): void
    {
        if (! $request->user()->can('estoque.ler')) {
            abort(403);
        }
    }

    private function empresa(): \App\Models\Empresa
    {
        $empresa = app('empresa');
        if (! $empresa instanceof \App\Models\Empresa) {
            abort(400, 'Empresa não selecionada.');
        }

        return $empresa;
    }
}
