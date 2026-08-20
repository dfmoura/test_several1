<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Cadastros\ParceiroImportService;
use App\Services\Cadastros\ParceiroXmlImportService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Symfony\Component\HttpFoundation\StreamedResponse;

class ParceiroImportController extends Controller
{
    public function __construct(
        private readonly ParceiroImportService $importService,
        private readonly ParceiroXmlImportService $xmlImportService,
    ) {}

    public function template(Request $request): StreamedResponse
    {
        $this->authorizeWrite($request);

        $csv = $this->importService->templateCsv();

        return response()->streamDownload(function () use ($csv) {
            echo $csv;
        }, 'parceiros_modelo.csv', [
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
            'rows' => ['required', 'array', 'min:1', 'max:'.ParceiroImportService::MAX_ROWS],
            'rows.*.line' => ['nullable', 'integer', 'min:1'],
            'rows.*.data' => ['required', 'array'],
        ]);

        $result = $this->importService->commit(app('empresa'), $validated['rows']);

        return response()->json(['data' => $result]);
    }

    public function xmlPreview(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $request->validate([
            'file' => ['nullable', 'file', 'max:'.ParceiroXmlImportService::MAX_FILE_KB],
            'files' => ['nullable', 'array', 'min:1', 'max:'.ParceiroXmlImportService::MAX_FILES],
            'files.*' => ['file', 'max:'.ParceiroXmlImportService::MAX_FILE_KB],
        ]);

        $files = $this->collectUploadedFiles($request);
        if ($files === []) {
            return response()->json([
                'message' => 'Envie ao menos um arquivo XML ou ZIP.',
                'errors' => ['files' => ['Envie ao menos um arquivo XML ou ZIP.']],
            ], 422);
        }

        $report = $this->xmlImportService->preview(app('empresa'), $files);

        return response()->json(['data' => $report]);
    }

    public function xmlCommit(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $validated = $request->validate([
            'rows' => ['required', 'array', 'min:1', 'max:'.ParceiroXmlImportService::MAX_FILES],
            'rows.*.line' => ['nullable', 'integer', 'min:1'],
            'rows.*.acao' => ['required', 'string', 'in:criar,adicionar_papel'],
            'rows.*.parceiro_id' => ['nullable', 'integer', 'min:1'],
            'rows.*.data' => ['required', 'array'],
        ]);

        $result = $this->xmlImportService->commit(app('empresa'), $validated['rows']);

        return response()->json(['data' => $result]);
    }

    /**
     * @return list<UploadedFile>
     */
    private function collectUploadedFiles(Request $request): array
    {
        $files = [];

        $multi = $request->file('files');
        if (is_array($multi)) {
            foreach ($multi as $file) {
                if ($file instanceof UploadedFile) {
                    $files[] = $file;
                }
            }
        } elseif ($multi instanceof UploadedFile) {
            $files[] = $multi;
        }

        $single = $request->file('file');
        if ($single instanceof UploadedFile) {
            $files[] = $single;
        }

        return $files;
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('parceiro.escrever')) {
            abort(403);
        }
    }
}
