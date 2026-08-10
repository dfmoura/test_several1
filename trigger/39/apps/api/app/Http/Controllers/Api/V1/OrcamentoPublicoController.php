<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Comercial\OrcamentoAprovacaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/** Endpoints públicos do link de aprovação (sem Sanctum). */
class OrcamentoPublicoController extends Controller
{
    public function __construct(private readonly OrcamentoAprovacaoService $aprovacao) {}

    public function show(string $token): JsonResponse
    {
        $data = $this->aprovacao->propostaPublica($token);

        return response()->json(['data' => $data]);
    }

    public function decidir(Request $request, string $token): JsonResponse
    {
        $data = $request->validate([
            'acao' => ['required', 'string', 'in:APROVAR,RECUSAR'],
            'faixa_index' => ['nullable', 'integer', 'min:0'],
            'nome_cliente' => ['nullable', 'string', 'max:160'],
            'motivo' => ['nullable', 'string', 'max:2000'],
        ]);

        $result = $this->aprovacao->decidirPeloLink(
            $token,
            $data,
            $request->ip(),
            $request->userAgent(),
        );

        return response()->json(['data' => $result]);
    }
}
