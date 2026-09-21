<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Comercial\OrcArteModeloService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\StreamedResponse;

class OrcArteModeloController extends Controller
{
    public function __construct(private readonly OrcArteModeloService $artes) {}

    public function store(Request $request): JsonResponse
    {
        if (! $request->user()->can('orcamento.escrever')) {
            abort(403);
        }

        $request->validate([
            'file' => [
                'required',
                'file',
                'max:'.OrcArteModeloService::MAX_KB,
            ],
        ]);

        $data = $this->artes->store(app('empresa'), $request->file('file'));

        return response()->json(['data' => $data], 201);
    }

    /** Stream autenticado (SPA carrega com Bearer → blob). */
    public function show(Request $request, int $empresa, string $arquivo): StreamedResponse
    {
        if (! $request->user()->can('orcamento.ler') && ! $request->user()->can('orcamento.escrever')) {
            abort(403);
        }

        return $this->artes->streamForEmpresa(app('empresa'), $empresa, $arquivo);
    }
}
