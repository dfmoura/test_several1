<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\NaturezaGerencial;
use App\Services\Cadastros\NaturezaGerencialService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class NaturezaGerencialController extends Controller
{
    public function __construct(private readonly NaturezaGerencialService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate([
            'grupo' => ['nullable', 'integer', 'min:1', 'max:5'],
            'folhas' => ['nullable', 'boolean'],
            'ativos' => ['nullable', 'boolean'],
            'q' => ['nullable', 'string', 'max:120'],
            'formato' => ['nullable', 'string', 'in:lista,arvore'],
        ]);

        $grupo = isset($validated['grupo']) ? (int) $validated['grupo'] : null;
        $somenteAtivos = (bool) ($validated['ativos'] ?? false);
        $q = $validated['q'] ?? null;
        $formato = $validated['formato'] ?? 'arvore';

        if ($formato === 'lista') {
            $folhas = array_key_exists('folhas', $validated) ? (bool) $validated['folhas'] : null;
            $data = $this->service->list($grupo, $folhas, $somenteAtivos, $q)
                ->map(fn (NaturezaGerencial $n) => $this->service->toArray($n))
                ->values()
                ->all();
        } else {
            $data = $this->service->tree($grupo, $somenteAtivos, $q);
        }

        return response()->json([
            'data' => $data,
            'meta' => [
                'grupos' => NaturezaGerencial::GRUPO_NOMES,
            ],
        ]);
    }

    public function show(Request $request, NaturezaGerencial $naturezaGerencial): JsonResponse
    {
        $this->authorizeRead($request);

        return response()->json(['data' => $this->service->show($naturezaGerencial)]);
    }

    public function update(Request $request, NaturezaGerencial $naturezaGerencial): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $request->validate([
            'nome' => ['sometimes', 'string', 'max:255'],
            'descricao' => ['sometimes', 'nullable', 'string', 'max:2000'],
            'ativo' => ['sometimes', 'boolean'],
        ]);

        return response()->json(['data' => $this->service->update($naturezaGerencial, $data)]);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('natureza_gerencial.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('natureza_gerencial.escrever')) {
            abort(403);
        }
    }
}
