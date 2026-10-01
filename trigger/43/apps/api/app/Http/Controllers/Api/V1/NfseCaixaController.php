<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\NfseTomada;
use App\Services\Compras\NfseCaixaService;
use App\Services\Compras\NfseTomadaFinanceiroService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\Response;

/**
 * Caixa de NFS-e tomadas e vínculo com contas a pagar.
 */
class NfseCaixaController extends Controller
{
    public function __construct(
        private readonly NfseCaixaService $caixa,
        private readonly NfseTomadaFinanceiroService $financeiro,
    ) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'situacao' => ['nullable', 'string', Rule::in(NfseTomada::SITUACOES)],
            'ano' => ['nullable', 'integer', 'min:2000', 'max:2100'],
        ]);

        return response()->json($this->caixa->listar(
            $this->empresa(),
            $validated['q'] ?? null,
            $validated['situacao'] ?? null,
            isset($validated['ano']) ? (int) $validated['ano'] : null,
        ));
    }

    public function show(Request $request, NfseTomada $nfseTomada): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($nfseTomada);

        return response()->json(['data' => $this->caixa->show($this->empresa(), $nfseTomada)]);
    }

    public function xml(Request $request, NfseTomada $nfseTomada): Response
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($nfseTomada);
        if (! is_string($nfseTomada->xml) || $nfseTomada->xml === '') {
            abort(404, 'XML ainda não está na caixa.');
        }

        return response($nfseTomada->xml, 200, [
            'Content-Type' => 'application/xml; charset=UTF-8',
        ]);
    }

    public function syncEstado(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        return response()->json(['data' => $this->caixa->syncEstado($this->empresa())]);
    }

    public function enfileirarSync(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->caixa->enfileirar($this->empresa());

        return response()->json(['data' => $this->caixa->syncEstado($this->empresa())]);
    }

    public function lancar(Request $request, NfseTomada $nfseTomada): JsonResponse
    {
        $this->authorizeFinanceiro($request);
        $this->assertEmpresa($nfseTomada);
        $validated = $request->validate([
            'natureza_id' => ['required', 'integer'],
            'parceiro_id' => ['required', 'integer'],
            'vencimento' => ['nullable', 'date'],
            'valor' => ['nullable', 'numeric', 'min:0'],
            'parcelas' => ['nullable', 'array'],
            'parcelas.*.vencimento' => ['required_with:parcelas', 'date'],
            'parcelas.*.valor' => ['required_with:parcelas', 'numeric', 'min:0.01'],
        ]);
        $result = $this->financeiro->lancar($this->empresa(), $nfseTomada, $validated);

        return response()->json([
            'data' => [
                'nota' => $this->caixa->show($this->empresa(), $result['nota']),
                'aviso' => $result['aviso'],
            ],
        ]);
    }

    public function desfazer(Request $request, NfseTomada $nfseTomada): JsonResponse
    {
        $this->authorizeFinanceiro($request);
        $this->assertEmpresa($nfseTomada);
        $nota = $this->financeiro->desfazer($this->empresa(), $nfseTomada);

        return response()->json(['data' => $this->caixa->show($this->empresa(), $nota)]);
    }

    public function semInteresse(Request $request, NfseTomada $nfseTomada): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($nfseTomada);
        $this->caixa->semInteresse($this->empresa(), $nfseTomada);

        return response()->json(['data' => $this->caixa->show($this->empresa(), $nfseTomada->fresh())]);
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('compras.ler')) {
            abort(403, 'Sem permissão para consultar a caixa de NFS-e.');
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('compras.escrever')) {
            abort(403, 'Sem permissão para atualizar a caixa de NFS-e.');
        }
    }

    private function authorizeFinanceiro(Request $request): void
    {
        if (! $request->user()->can('financeiro.escrever')) {
            abort(403, 'Sem permissão para organizar o contas a pagar desta NFS-e.');
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

    private function assertEmpresa(NfseTomada $nota): void
    {
        if ($nota->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }
}
