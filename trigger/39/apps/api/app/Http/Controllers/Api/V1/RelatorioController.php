<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Models\Relatorio;
use App\Models\RelatorioPlanejamento;
use App\Services\Relatorio\RelatorioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Symfony\Component\HttpFoundation\BinaryFileResponse;

class RelatorioController extends Controller
{
    public function __construct(private readonly RelatorioService $service) {}

    public function catalogo(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        return response()->json([
            'data' => $this->service->catalogoMeta($request->user()),
        ]);
    }

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);
        $empresa = $this->empresa();

        $items = $this->service->list($empresa, [
            'q' => $request->query('q'),
            'status' => $request->query('status'),
        ]);

        return response()->json(['data' => $items]);
    }

    /**
     * Planejamento assíncrono (fila) — polling em showPlanejamento.
     */
    public function planejar(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);
        $empresa = $this->empresa();

        $data = $request->validate([
            'prompt' => ['required', 'string', 'min:8', 'max:4000'],
            'orientacao' => ['required', 'string', Rule::in(Relatorio::ORIENTACOES)],
            'titulo' => ['nullable', 'string', 'max:200'],
        ]);

        $out = $this->service->iniciarPlanejamento($empresa, $request->user(), $data);

        return response()->json(['data' => $out], 202);
    }

    public function showPlanejamento(Request $request, RelatorioPlanejamento $planejamento): JsonResponse
    {
        $this->authorizeWrite($request);
        if ($planejamento->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
        if ($planejamento->usuario_id !== $request->user()->id
            && ! $request->user()->can('relatorio.escrever')) {
            abort(404);
        }

        return response()->json(['data' => $this->service->showPlanejamento($planejamento)]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);
        $empresa = $this->empresa();

        $data = $request->validate([
            'prompt' => ['required', 'string', 'min:8', 'max:4000'],
            'orientacao' => ['required', 'string', Rule::in(Relatorio::ORIENTACOES)],
            'titulo' => ['nullable', 'string', 'max:200'],
            'spec' => ['nullable', 'array'],
        ]);

        $out = $this->service->create($empresa, $request->user(), $data);

        return response()->json(['data' => $out], 201);
    }

    public function show(Request $request, Relatorio $relatorio): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($relatorio);

        return response()->json(['data' => $this->service->show($relatorio)]);
    }

    public function reprocessar(Request $request, Relatorio $relatorio): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($relatorio);

        return response()->json([
            'data' => $this->service->reprocessar($relatorio, $request->user()),
        ]);
    }

    public function replanejar(Request $request, Relatorio $relatorio): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($relatorio);

        return response()->json([
            'data' => $this->service->replanejar($relatorio, $request->user()),
        ]);
    }

    public function destroy(Request $request, Relatorio $relatorio): JsonResponse
    {
        $this->authorizeWrite($request);
        $this->assertEmpresa($relatorio);

        $this->service->delete($relatorio);

        return response()->json(['message' => 'Relatório excluído.']);
    }

    public function download(Request $request, Relatorio $relatorio): BinaryFileResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($relatorio);

        $path = $this->service->absolutePath($relatorio);
        $filename = ($relatorio->codigo).'.pdf';

        return response()->download($path, $filename, [
            'Content-Type' => 'application/pdf',
        ]);
    }

    private function empresa(): Empresa
    {
        /** @var Empresa $empresa */
        $empresa = app('empresa');

        return $empresa;
    }

    private function assertEmpresa(Relatorio $relatorio): void
    {
        if ($relatorio->empresa_id !== $this->empresa()->id) {
            abort(404);
        }
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('relatorio.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('relatorio.escrever')) {
            abort(403);
        }
    }
}
