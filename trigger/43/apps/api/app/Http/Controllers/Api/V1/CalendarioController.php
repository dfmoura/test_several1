<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Services\Calendario\DiasUteisService;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class CalendarioController extends Controller
{
    public function __construct(private readonly DiasUteisService $diasUteis) {}

    public function previsaoEntrega(Request $request): JsonResponse
    {
        $empresa = app('empresa');
        if (! $empresa instanceof Empresa) {
            abort(400, 'Empresa não selecionada.');
        }

        $validated = $request->validate([
            'dias' => ['required', 'integer', 'min:0', 'max:365'],
            'prazo_faca_dias' => ['nullable', 'integer', 'min:0', 'max:365'],
            'faca_nova' => ['nullable', 'boolean'],
            'referencia' => ['nullable', 'date'],
        ]);

        $referencia = isset($validated['referencia'])
            ? Carbon::parse($validated['referencia'])->startOfDay()
            : now()->startOfDay();

        $facaNova = (bool) ($validated['faca_nova'] ?? false);
        $prazoFaca = isset($validated['prazo_faca_dias']) ? (int) $validated['prazo_faca_dias'] : null;

        $data = $this->diasUteis->previsaoEntrega(
            $empresa,
            (int) $validated['dias'],
            $referencia,
            $facaNova,
            $prazoFaca,
        );

        return response()->json(['data' => $data]);
    }
}
