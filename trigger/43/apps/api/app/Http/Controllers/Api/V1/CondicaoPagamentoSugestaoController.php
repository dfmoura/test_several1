<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\CondicaoPagamentoSugestao;
use App\Models\Empresa;
use App\Services\Cadastros\CondicaoPagamentoSugestaoService;
use App\Support\CondicaoPagamentoSugestaoValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CondicaoPagamentoSugestaoController extends Controller
{
    public function __construct(private readonly CondicaoPagamentoSugestaoService $service) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'ativos' => ['nullable', 'boolean'],
        ]);

        $somenteAtivos = array_key_exists('ativos', $validated)
            ? (bool) $validated['ativos']
            : null;

        $data = $this->service->list(
            $this->empresa(),
            $validated['q'] ?? null,
            $somenteAtivos,
        );

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $request->validate(CondicaoPagamentoSugestaoValidationRules::rules(false));
        $row = $this->service->create($this->empresa(), $data);

        return response()->json(['data' => $row], 201);
    }

    public function seedCanonicos(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $result = $this->service->seedCanonicos($this->empresa());

        return response()->json([
            'data' => $result,
            'sugestoes' => $this->service->list($this->empresa()),
        ]);
    }

    public function show(Request $request, CondicaoPagamentoSugestao $condicaoPagamentoSugestao): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($condicaoPagamentoSugestao);

        return response()->json(['data' => $this->service->show($condicaoPagamentoSugestao)]);
    }

    public function update(Request $request, CondicaoPagamentoSugestao $condicaoPagamentoSugestao): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($condicaoPagamentoSugestao);

        $data = $request->validate(CondicaoPagamentoSugestaoValidationRules::rules(true));

        return response()->json([
            'data' => $this->service->update($condicaoPagamentoSugestao, $data),
        ]);
    }

    public function destroy(Request $request, CondicaoPagamentoSugestao $condicaoPagamentoSugestao): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($condicaoPagamentoSugestao);

        $id = $condicaoPagamentoSugestao->id;
        $this->service->softDelete($condicaoPagamentoSugestao);

        return response()->json(['ok' => true, 'id' => $id]);
    }

    private function authorizeRead(Request $request): void
    {
        $user = $request->user();
        if ($user->can('condicao_pagamento.ler')) {
            return;
        }
        foreach (['parceiro.ler', 'orcamento.ler', 'compras.ler', 'financeiro.ler'] as $perm) {
            if ($user->can($perm)) {
                return;
            }
        }
        abort(403);
    }

    private function authorizeWrite(Request $request): void
    {
        $user = $request->user();
        if ($user->can('condicao_pagamento.escrever')) {
            return;
        }
        foreach (['parceiro.escrever', 'compras.escrever'] as $perm) {
            if ($user->can($perm)) {
                return;
            }
        }
        abort(403);
    }

    private function empresa(): Empresa
    {
        $empresa = app('empresa');
        if (! $empresa instanceof Empresa) {
            abort(400, 'Empresa não selecionada.');
        }

        return $empresa;
    }

    private function assertEmpresa(CondicaoPagamentoSugestao $sugestao): void
    {
        if ($sugestao->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
