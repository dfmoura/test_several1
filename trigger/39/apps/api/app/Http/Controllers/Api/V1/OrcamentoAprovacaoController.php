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

    public function destinatarios(Request $request, Orcamento $orcamento): JsonResponse
    {
        if (! $request->user()->can('orcamento.ler')) {
            abort(403);
        }
        if ($orcamento->empresa_id !== app('empresa')->id) {
            abort(404);
        }

        return response()->json(['data' => $this->aprovacao->listarDestinatarios($orcamento)]);
    }

    public function enviar(Request $request, Orcamento $orcamento): JsonResponse
    {
        if (! $request->user()->can('orcamento.escrever')) {
            abort(403);
        }
        if ($orcamento->empresa_id !== app('empresa')->id) {
            abort(404);
        }

        $data = $request->validate([
            'parceiro_contato_id' => ['nullable', 'integer', 'min:1'],
            'usar_contato_legado' => ['sometimes', 'boolean'],
        ]);

        $result = $this->aprovacao->enviarParaAprovacao($orcamento, $data);

        return response()->json(['data' => $result]);
    }

    /**
     * Prévia da proposta comercial (staff) — sem aprovar/recusar e sem consumir o link do cliente.
     */
    public function propostaComercial(Request $request, Orcamento $orcamento): JsonResponse
    {
        if (! $request->user()->can('orcamento.ler')) {
            abort(403);
        }
        if ($orcamento->empresa_id !== app('empresa')->id) {
            abort(404);
        }

        return response()->json([
            'data' => $this->aprovacao->propostaComercialInterna($orcamento),
        ]);
    }
}
