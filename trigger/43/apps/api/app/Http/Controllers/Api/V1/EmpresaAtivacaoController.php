<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\User;
use App\Services\Plataforma\EmpresaAtivacaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmpresaAtivacaoController extends Controller
{
    public function __construct(private readonly EmpresaAtivacaoService $ativacao) {}

    public function show(Request $request): JsonResponse
    {
        $this->ativacao->prepararContaParaLeitura($this->usuario($request));

        return response()->json(['data' => $this->resolverDto($request)]);
    }

    public function iniciarPagamento(Request $request): JsonResponse
    {
        // Mensalidade é da conta FLEXORC (ADR_ATIVACAO_EMPRESA), não da EMP do contexto.
        $user = $this->usuario($request);
        $data = $this->ativacao->iniciarPagamentoConta($user);
        $empresa = $this->empresaOuNull();
        if ($empresa instanceof Empresa) {
            // dto(..., $user) já lê a ContaAtivacao do pagador logado (PIX da mensalidade).
            return response()->json(['data' => $this->ativacao->dto($empresa, $user)]);
        }

        return response()->json(['data' => $data]);
    }

    public function confirmarPagamentoDemo(Request $request): JsonResponse
    {
        $user = $this->usuario($request);
        $data = $this->ativacao->confirmarPagamentoDemoConta($user);
        $empresa = $this->empresaOuNull();
        if ($empresa instanceof Empresa) {
            return response()->json(['data' => $this->ativacao->dto($empresa, $user)]);
        }

        return response()->json(['data' => $data]);
    }

    public function recebimento(Request $request): JsonResponse
    {
        $data = $request->validate([
            'pix_chave' => ['required', 'string', 'max:255'],
        ]);

        return response()->json(['data' => $this->ativacao->registrarRecebimento($this->exigirEmpresa(), $data['pix_chave'])]);
    }

    public function conferirCatalogo(): JsonResponse
    {
        return response()->json(['data' => $this->ativacao->conferirCatalogo($this->exigirEmpresa())]);
    }

    /**
     * @return array<string, mixed>
     */
    private function resolverDto(Request $request): array
    {
        $user = $this->usuario($request);
        $empresa = $this->empresaOuNull();
        if ($empresa instanceof Empresa) {
            return $this->ativacao->dto($empresa, $user);
        }

        return $this->ativacao->dtoDaConta($user);
    }

    private function usuario(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();

        return $user;
    }

    private function empresaOuNull(): ?Empresa
    {
        $empresa = app()->bound('empresa') ? app('empresa') : null;

        return $empresa instanceof Empresa ? $empresa : null;
    }

    private function exigirEmpresa(): Empresa
    {
        $empresa = $this->empresaOuNull();
        if (! $empresa instanceof Empresa) {
            abort(400, 'Empresa não selecionada.');
        }

        return $empresa;
    }
}
