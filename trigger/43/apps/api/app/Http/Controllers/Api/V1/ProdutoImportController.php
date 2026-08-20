<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Cadastros\ProdutoImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ProdutoImportController extends Controller
{
    public function __construct(private readonly ProdutoImportService $importService) {}

    public function template(Request $request): StreamedResponse
    {
        $this->authorizeWrite($request);

        $csv = $this->importService->templateCsv();

        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, 'produtos_modelo.csv', [
            'Content-Type' => 'text/csv; charset=UTF-8',
        ]);
    }

    public function preview(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $request->validate([
            'file' => ['required', 'file', 'max:5120'],
        ]);

        $file = $request->file('file');
        $ext = strtolower((string) $file->getClientOriginalExtension());
        if (! in_array($ext, ['csv', 'txt'], true)) {
            return response()->json([
                'message' => 'Envie um arquivo CSV (.csv).',
                'errors' => ['file' => ['Envie um arquivo CSV (.csv).']],
            ], 422);
        }

        $report = $this->importService->preview(app('empresa'), $file);

        return response()->json(['data' => $report]);
    }

    public function commit(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $validated = $request->validate([
            'rows' => ['required', 'array', 'min:1', 'max:'.ProdutoImportService::MAX_ROWS],
            'rows.*.line' => ['nullable', 'integer', 'min:1'],
            'rows.*.data' => ['required', 'array'],
        ]);

        $result = $this->importService->commit(app('empresa'), $validated['rows']);

        return response()->json(['data' => $result]);
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('produto.escrever')) {
            abort(403);
        }
    }
}
