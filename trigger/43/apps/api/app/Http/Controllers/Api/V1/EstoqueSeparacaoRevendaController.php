<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\PedidoItem;
use App\Services\Estoque\EstoqueSeparacaoRevendaService;
use App\Support\PadraoDecimal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

/**
 * Almoxarifado da revenda — leitura do que pegar e confirmação sem MOV.
 */
class EstoqueSeparacaoRevendaController extends Controller
{
    public function __construct(private readonly EstoqueSeparacaoRevendaService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeLer($request);

        return response()->json([
            'data' => $this->service->fila($this->empresa()),
        ]);
    }

    public function show(Request $request, PedidoItem $pedidoItem): JsonResponse
    {
        $this->authorizeLer($request);

        return response()->json([
            'data' => $this->service->show($this->empresa(), $pedidoItem),
        ]);
    }

    public function resolverVolume(Request $request, PedidoItem $pedidoItem): JsonResponse
    {
        $this->authorizeLer($request);

        $data = $request->validate([
            'payload' => ['required', 'string', 'max:120'],
        ]);

        return response()->json([
            'data' => $this->service->resolverVolume($this->empresa(), $pedidoItem, $data['payload']),
        ]);
    }

    public function confirmar(Request $request, PedidoItem $pedidoItem): JsonResponse
    {
        $this->authorizeEscrever($request);

        $data = $request->validate([
            'volumes' => ['nullable', 'array'],
            'volumes.*.lote_id' => ['required', 'integer'],
            'volumes.*.qtde' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_QTY, true)),
        ]);

        return response()->json([
            'data' => $this->service->confirmar(
                $this->empresa(),
                $pedidoItem,
                is_array($data['volumes'] ?? null) ? $data['volumes'] : [],
            ),
        ]);
    }

    private function authorizeLer(Request $request): void
    {
        $user = $request->user();
        if (! $user?->can('estoque.ler') && ! $user?->can('producao.ler')) {
            abort(403);
        }
    }

    private function authorizeEscrever(Request $request): void
    {
        $user = $request->user();
        if (! $user?->can('estoque.escrever') && ! $user?->can('producao.escrever')) {
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
}
