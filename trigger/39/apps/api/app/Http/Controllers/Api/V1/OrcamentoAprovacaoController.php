<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Orcamento;
use App\Services\Comercial\OrcamentoAprovacaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class OrcamentoAprovacaoController extends Controller
{
    public function __construct(private readonly OrcamentoAprovacaoService $aprovacao) {}

    public function enviar(Request $request, Orcamento $orcamento): JsonResponse
    {
        if (! $request->user()->can('orcamento.escrever')) {
            abort(403);
        }
        if ($orcamento->empresa_id !== app('empresa')->id) {
            abort(404);
        }

        $data = $request->validate([
            'destino_envio' => ['nullable', 'string', 'max:255'],
        ]);

        $result = $this->aprovacao->enviarParaAprovacao(
            $orcamento,
            $data['destino_envio'] ?? null,
        );

        return response()->json(['data' => $result]);
    }
}
