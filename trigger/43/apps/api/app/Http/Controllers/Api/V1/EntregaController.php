<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\Entrega;
use App\Models\Pedido;
use App\Services\Expedicao\EntregaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EntregaController extends Controller
{
    public function __construct(private readonly EntregaService $entregas) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'status' => ['nullable', 'string', 'in:'.implode(',', Entrega::STATUSES)],
        ]);

        return response()->json([
            'data' => $this->entregas->list(
                $this->empresa(),
                $validated['q'] ?? null,
                $validated['status'] ?? null,
            ),
            'meta' => ['statuses' => Entrega::STATUSES],
        ]);
    }

    public function fila(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        return response()->json([
            'data' => $this->entregas->fila($this->empresa()),
        ]);
    }

    public function show(Request $request, Entrega $entrega): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresaEnt($entrega);

        return response()->json(['data' => $this->entregas->show($entrega)]);
    }

    public function preview(Request $request, Pedido $pedido): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresaPed($pedido);

        return response()->json([
            'data' => $this->entregas->preview($this->empresa(), $pedido),
        ]);
    }

    public function expedir(Request $request, Pedido $pedido): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresaPed($pedido);

        $data = $request->validate([
            'tipo_saida' => ['nullable', 'string', 'in:'.implode(',', Entrega::TIPOS_SAIDA)],
            'transportadora_id' => ['nullable', 'integer'],
            'rastreio' => ['nullable', 'string', 'max:80'],
            'volumes' => ['nullable', 'integer', 'min:1', 'max:999'],
            'peso_kg' => ['nullable'],
            'observacao' => ['nullable', 'string', 'max:500'],
        ]);

        $pedido->loadMissing(['itens', 'parceiro.enderecosEntrega', 'faturamento']);

        return response()->json([
            'data' => $this->entregas->expedir($this->empresa(), $pedido, $data),
        ], 201);
    }

    public function confirmar(Request $request, Entrega $entrega): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresaEnt($entrega);

        $data = $request->validate([
            'prova_tipo' => ['required', 'string', 'in:'.implode(',', Entrega::PROVAS)],
            'prova_nome' => ['nullable', 'string', 'max:120'],
            'prova_documento' => ['nullable', 'string', 'max:40'],
            'prova_obs' => ['nullable', 'string', 'max:255'],
        ]);

        return response()->json([
            'data' => $this->entregas->confirmar($this->empresa(), $entrega, $data),
        ]);
    }

    public function recusar(Request $request, Entrega $entrega): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresaEnt($entrega);

        $data = $request->validate([
            'motivo' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        return response()->json([
            'data' => $this->entregas->recusar($this->empresa(), $entrega, (string) $data['motivo']),
        ]);
    }

    public function cancelar(Request $request, Entrega $entrega): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresaEnt($entrega);

        $data = $request->validate([
            'motivo' => ['required', 'string', 'min:3', 'max:255'],
        ]);

        return response()->json([
            'data' => $this->entregas->cancelar($this->empresa(), $entrega, (string) $data['motivo']),
        ]);
    }

    private function authorizeRead(Request $request): void
    {
        if (
            ! $request->user()->can('expedicao.ler')
            && ! $request->user()->can('producao.ler')
            && ! $request->user()->can('faturamento.ler')
        ) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('expedicao.escrever')) {
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

    private function assertEmpresaPed(Pedido $pedido): void
    {
        if ($pedido->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }

    private function assertEmpresaEnt(Entrega $entrega): void
    {
        if ($entrega->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
