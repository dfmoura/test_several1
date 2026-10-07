<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
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

    /**
     * Mapa de ocupação — leitura agregada da malha gravada (ADR F4 / WMS leve).
     */
    public function mapa(Request $request): JsonResponse
    {
        $this->authorizeEstoqueRead($request);

        $validated = $request->validate([
            'produto_id' => ['nullable', 'integer'],
        ]);

        return response()->json([
            'data' => $this->enderecos->mapaOcupacao(
                $this->empresa(),
                isset($validated['produto_id']) ? (int) $validated['produto_id'] : null,
            ),
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

    public function storeEndereco(Request $request): JsonResponse
    {
        if (! $request->user()->can('estoque.escrever')) {
            abort(403);
        }

        $data = $request->validate([
            'prateleira' => ['required', 'integer', 'min:1', 'max:255'],
            'coluna' => ['required', 'integer', 'min:1', 'max:255'],
            'vao' => ['nullable', 'integer', 'min:1', 'max:255'],
            'largura_m' => ['nullable', 'numeric', 'min:0.001', 'max:999.999'],
            'profundidade_m' => ['nullable', 'numeric', 'min:0.001', 'max:999.999'],
            'altura_m' => ['nullable', 'numeric', 'min:0.001', 'max:999.999'],
        ]);

        $end = $this->enderecos->cadastrar($this->empresa(), $data);

        return response()->json([
            'data' => $this->enderecos->toOut($end),
        ], 201);
    }

    public function updateEndereco(Request $request, int $estoqueEndereco): JsonResponse
    {
        if (! $request->user()->can('estoque.escrever')) {
            abort(403);
        }

        $data = $request->validate([
            'ativo' => ['sometimes', 'boolean'],
            'largura_m' => ['sometimes', 'nullable', 'numeric', 'min:0.001', 'max:999.999'],
            'profundidade_m' => ['sometimes', 'nullable', 'numeric', 'min:0.001', 'max:999.999'],
            'altura_m' => ['sometimes', 'nullable', 'numeric', 'min:0.001', 'max:999.999'],
        ]);

        if ($data === []) {
            return response()->json([
                'message' => 'Informe o que alterar no local.',
                'errors' => ['ativo' => ['Informe o que alterar no local.']],
            ], 422);
        }

        $end = $this->enderecos->atualizar($this->empresa(), $estoqueEndereco, $data);

        return response()->json([
            'data' => $this->enderecos->toOut($end),
        ]);
    }

    public function etiqueta(Request $request, EstoqueLote $estoqueLote): JsonResponse
    {
        $this->authorizeEstoqueRead($request);

        return response()->json([
            'data' => $this->volumes->etiqueta($this->empresa(), $estoqueLote),
        ]);
    }

    public function fichaEntrada(Request $request, EstoqueMovimento $estoqueMovimento): JsonResponse
    {
        $this->authorizeEstoqueRead($request);

        return response()->json([
            'data' => $this->volumes->fichaEntrada($this->empresa(), $estoqueMovimento),
        ]);
    }

    public function etiquetasVolumes(Request $request): JsonResponse
    {
        $this->authorizeEstoqueRead($request);

        $data = $request->validate([
            'sem_endereco' => ['nullable', 'boolean'],
            'ids' => ['nullable', 'array'],
            'ids.*' => ['integer'],
            'movimento_id' => ['nullable', 'integer'],
        ]);

        $ids = isset($data['ids']) ? array_map('intval', $data['ids']) : null;
        $movimentoId = isset($data['movimento_id']) ? (int) $data['movimento_id'] : null;

        return response()->json([
            'data' => $this->volumes->etiquetasVolumes(
                $this->empresa(),
                $ids,
                (bool) ($data['sem_endereco'] ?? false),
                $movimentoId,
            ),
        ]);
    }

    public function resolverVolume(Request $request): JsonResponse
    {
        $this->authorizeEstoqueRead($request);

        $data = $request->validate([
            'payload' => ['required', 'string', 'max:120'],
        ]);

        return response()->json([
            'data' => $this->volumes->resolverVolumePorQr($this->empresa(), $data['payload']),
        ]);
    }

    public function resolverEndereco(Request $request): JsonResponse
    {
        $this->authorizeEstoqueRead($request);

        $data = $request->validate([
            'payload' => ['required', 'string', 'max:120'],
        ]);

        $end = $this->enderecos->resolverPorQr($this->empresa(), $data['payload']);

        return response()->json([
            'data' => $this->enderecos->toOut($end),
        ]);
    }

    public function guardar(Request $request): JsonResponse
    {
        if (! $request->user()->can('estoque.escrever')) {
            abort(403);
        }

        $data = $request->validate([
            'volume_qr' => ['required', 'string', 'max:120'],
            'endereco_qr' => ['required', 'string', 'max:120'],
        ]);

        return response()->json([
            'data' => $this->volumes->guardarPorQr(
                $this->empresa(),
                $data['volume_qr'],
                $data['endereco_qr'],
            ),
        ]);
    }

    public function vincularEndereco(Request $request, EstoqueLote $estoqueLote): JsonResponse
    {
        if (! $request->user()->can('estoque.escrever')) {
            abort(403);
        }

        $data = $request->validate([
            'endereco_id' => ['nullable', 'integer', 'exists:estoque_enderecos,id'],
            'endereco_qr' => ['nullable', 'string', 'max:120'],
        ]);

        if (empty($data['endereco_id']) && empty($data['endereco_qr'])) {
            return response()->json([
                'message' => 'Informe endereco_id ou endereco_qr.',
                'errors' => ['endereco_id' => ['Informe endereco_id ou endereco_qr.']],
            ], 422);
        }

        $empresa = $this->empresa();
        $enderecoId = isset($data['endereco_id']) ? (int) $data['endereco_id'] : null;
        if ($enderecoId === null || $enderecoId === 0) {
            $end = $this->enderecos->resolverPorQr($empresa, (string) $data['endereco_qr']);
            $enderecoId = (int) $end->id;
        }

        return response()->json([
            'data' => $this->volumes->vincularEndereco($empresa, $estoqueLote, $enderecoId),
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
