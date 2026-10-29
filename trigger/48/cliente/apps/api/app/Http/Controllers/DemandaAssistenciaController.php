<?php

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Domain\Demanda\AssistenciaClient;
use App\Domain\Empresa\EmpresaAtual;
use App\Domain\RegraNegocio;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\RateLimiter;

class DemandaAssistenciaController extends Controller
{
    public function abrir(EmpresaAtual $atual, AssistenciaClient $client): JsonResponse
    {
        $atual->exigir('demanda.abrir');
        if ($bloqueio = $this->limite('abrir', 30)) {
            return $bloqueio;
        }

        return $this->json(fn () => $client->abrirSessao());
    }

    public function mensagem(Request $request, EmpresaAtual $atual, AssistenciaClient $client): JsonResponse
    {
        $atual->exigir('demanda.abrir');
        if ($bloqueio = $this->limite('mensagem', 60)) {
            return $bloqueio;
        }
        $dados = $request->validate([
            'session_id' => ['required', 'string', 'max:100'],
            'message' => ['required', 'string', 'max:4000'],
        ], [
            'required' => 'Preencha :attribute.',
            'max.string' => ':attribute passou do limite.',
        ], [
            'session_id' => 'a conversa',
            'message' => 'a mensagem',
        ]);

        return $this->json(fn () => $client->enviarMensagem($dados['session_id'], trim($dados['message'])));
    }

    public function finalizar(Request $request, EmpresaAtual $atual, AssistenciaClient $client): JsonResponse
    {
        $atual->exigir('demanda.abrir');
        if ($bloqueio = $this->limite('finalizar', 30)) {
            return $bloqueio;
        }
        $dados = $request->validate([
            'session_id' => ['required', 'string', 'max:100'],
        ], [
            'required' => 'Preencha :attribute.',
        ], [
            'session_id' => 'a conversa',
        ]);

        try {
            $resultado = $client->comporDescricao($dados['session_id']);
        } catch (RegraNegocio $e) {
            return response()->json(['erro' => $e->getMessage()], 503);
        }

        $descricao = trim($resultado['descricao']);
        if ($descricao === '' || mb_strlen($descricao) > 5000) {
            return response()->json([
                'erro' => 'Não foi possível montar a descrição. Continue no formulário.',
            ], 422);
        }

        return response()->json([
            'session_id' => $resultado['session_id'],
            'descricao' => $descricao,
        ]);
    }

    private function limite(string $acao, int $maximo): ?JsonResponse
    {
        $chave = 'assistencia:'.$acao.':'.(string) auth('web')->id();
        if (RateLimiter::tooManyAttempts($chave, $maximo)) {
            return response()->json([
                'erro' => 'Muitas tentativas. Espere um minuto e tente de novo.',
            ], 429);
        }
        RateLimiter::hit($chave, 60);

        return null;
    }

    /**
     * @param  callable(): array<string, mixed>  $acao
     */
    private function json(callable $acao): JsonResponse
    {
        try {
            return response()->json($acao());
        } catch (RegraNegocio $e) {
            return response()->json(['erro' => $e->getMessage()], 503);
        }
    }
}
