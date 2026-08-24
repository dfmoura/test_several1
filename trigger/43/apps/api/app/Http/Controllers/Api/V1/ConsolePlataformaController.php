<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Plataforma\ConsolePlataformaService;
use App\Support\PlatformRbac;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;
use Illuminate\Validation\ValidationException;

class ConsolePlataformaController extends Controller
{
    public function __construct(private readonly ConsolePlataformaService $console) {}

    public function metricas(Request $request): JsonResponse
    {
        $this->exigir($request, 'plataforma.contas.ler');

        return response()->json(['data' => $this->console->metricas()]);
    }

    public function contas(Request $request): JsonResponse
    {
        $this->exigir($request, 'plataforma.contas.ler');

        $page = $this->console->listarContas(
            $request->query('status'),
            $request->query('saude'),
            $request->query('q'),
            min(100, max(1, (int) $request->query('per_page', 25))),
        );

        return response()->json([
            'data' => collect($page->items())->map(fn ($row) => $this->console->apresentarConta($row))->values()->all(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    public function criarConta(Request $request): JsonResponse
    {
        $this->exigir($request, 'plataforma.contas.provisionar');

        $data = $request->validate([
            'name' => ['required', 'string', 'max:120'],
            'email' => ['required', 'email', 'max:190'],
            'password' => ['nullable', 'string', Password::min(8)->mixedCase()->numbers()],
            'cortesia_dias' => ['nullable', 'integer', 'min:0', 'max:3660'],
            'cortesia_motivo' => ['nullable', 'string', 'max:255'],
        ]);

        try {
            $out = $this->console->provisionarConta([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => $data['password'] ?? null,
                'cortesia_dias' => $data['cortesia_dias'] ?? null,
                'cortesia_motivo' => $data['cortesia_motivo'] ?? null,
            ], $request->user());
        } catch (ValidationException $e) {
            throw $e;
        }

        $payload = $this->console->apresentarConta($out['conta']);
        if ($out['senha_temporaria'] !== null) {
            $payload['senha_temporaria'] = $out['senha_temporaria'];
        }

        return response()->json(['data' => $payload], 201);
    }

    public function conta(Request $request, int $conta): JsonResponse
    {
        $this->exigir($request, 'plataforma.contas.ler');
        $row = $this->console->encontrarConta($conta);

        return response()->json(['data' => $this->console->detalheConta($row)]);
    }

    public function bonificar(Request $request, int $conta): JsonResponse
    {
        $this->exigir($request, 'plataforma.contas.bonificar');
        $row = $this->console->encontrarConta($conta);

        $data = $request->validate([
            'dias' => ['nullable', 'integer', 'min:1', 'max:3660'],
            'ate' => ['nullable', 'date'],
            'motivo' => ['nullable', 'string', 'max:255'],
            'encerrar' => ['sometimes', 'boolean'],
            'revogar' => ['sometimes', 'boolean'],
        ]);

        $atualizado = $this->console->bonificarConta($row, $data, $request->user());

        return response()->json(['data' => $this->console->apresentarConta($atualizado)]);
    }

    public function auditoria(Request $request): JsonResponse
    {
        $this->exigir($request, 'plataforma.auditoria.ler');

        $page = $this->console->auditoria(min(100, max(1, (int) $request->query('per_page', 40))));

        return response()->json([
            'data' => collect($page->items())->map(fn ($log) => $this->console->apresentarAuditoria($log))->values()->all(),
            'meta' => [
                'current_page' => $page->currentPage(),
                'last_page' => $page->lastPage(),
                'per_page' => $page->perPage(),
                'total' => $page->total(),
            ],
        ]);
    }

    /**
     * Papel PLATAFORMA = pacote completo do console (ADR).
     * Evita 403 em permissões novas quando o cache Spatie do worker ainda está velho.
     */
    private function exigir(Request $request, string $permission): void
    {
        $user = $request->user();
        if ($user === null) {
            abort(403, 'Sem permissão para esta operação da plataforma.');
        }

        if ($user->hasRole(PlatformRbac::ROLE)) {
            return;
        }

        if ($user->can($permission)) {
            return;
        }

        abort(403, 'Sem permissão para esta operação da plataforma.');
    }
}
