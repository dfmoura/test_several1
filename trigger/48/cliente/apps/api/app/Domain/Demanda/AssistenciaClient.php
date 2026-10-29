<?php

declare(strict_types=1);

namespace App\Domain\Demanda;

use App\Domain\RegraNegocio;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Support\Facades\Http;

class AssistenciaClient
{
    public function configurado(): bool
    {
        return config('assistencia.url') !== ''
            && config('assistencia.api_key') !== '';
    }

    public function ativa(): bool
    {
        return (bool) config('assistencia.habilitada') && $this->configurado();
    }

    /**
     * @return array{session_id: string, reply: string}
     */
    public function abrirSessao(): array
    {
        $dados = $this->pedir('post', '/v1/sessions', ['contexto' => 'formular_demanda'], exigirAtiva: true);

        return [
            'session_id' => (string) ($dados['session_id'] ?? ''),
            'reply' => (string) ($dados['reply'] ?? ''),
        ];
    }

    /**
     * @return array{session_id: string, reply: string}
     */
    public function enviarMensagem(string $sessionId, string $message): array
    {
        $dados = $this->pedir('post', '/v1/sessions/'.$sessionId.'/messages', [
            'message' => $message,
        ], exigirAtiva: true);

        return [
            'session_id' => (string) ($dados['session_id'] ?? $sessionId),
            'reply' => (string) ($dados['reply'] ?? ''),
        ];
    }

    /**
     * Monta a descrição sem encerrar a conversa no serviço.
     *
     * @return array{session_id: string, descricao: string}
     */
    public function comporDescricao(string $sessionId): array
    {
        $dados = $this->pedir('post', '/v1/sessions/'.$sessionId.'/compose', exigirAtiva: true);

        return [
            'session_id' => (string) ($dados['session_id'] ?? $sessionId),
            'descricao' => (string) ($dados['descricao'] ?? ''),
        ];
    }

    /**
     * Rascunho operacional de proposta a partir da demanda (sem inventar preço nem prazo).
     *
     * @param  array{
     *   codigo?: string|null,
     *   titulo?: string|null,
     *   descricao?: string|null,
     *   objetivo?: string|null,
     *   sistema_atual?: string|null,
     *   mensagens?: list<array{autor?: string, corpo?: string}>
     * }  $demanda
     * @return array{
     *   descricao_funcional: string,
     *   incluso: string,
     *   nao_incluso: string,
     *   criterios_aceite: string,
     *   etapas: list<array<string, mixed>>
     * }
     */
    public function desdobrarProposta(array $demanda): array
    {
        $dados = $this->pedir('post', '/v1/desdobrar', [
            'codigo' => (string) ($demanda['codigo'] ?? ''),
            'titulo' => (string) ($demanda['titulo'] ?? ''),
            'descricao' => (string) ($demanda['descricao'] ?? ''),
            'objetivo' => (string) ($demanda['objetivo'] ?? ''),
            'sistema_atual' => (string) ($demanda['sistema_atual'] ?? ''),
            'mensagens' => $demanda['mensagens'] ?? [],
        ], exigirAtiva: true);

        return [
            'descricao_funcional' => (string) ($dados['descricao_funcional'] ?? ''),
            'incluso' => (string) ($dados['incluso'] ?? ''),
            'nao_incluso' => (string) ($dados['nao_incluso'] ?? ''),
            'criterios_aceite' => (string) ($dados['criterios_aceite'] ?? ''),
            'etapas' => is_array($dados['etapas'] ?? null) ? $dados['etapas'] : [],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function obterLlm(): array
    {
        return $this->pedir('get', '/v1/admin/llm', exigirAtiva: false);
    }

    /**
     * @param  array{mode: string, model: string, base_url: string, api_key?: string|null}  $dados
     * @return array<string, mixed>
     */
    public function salvarLlm(array $dados): array
    {
        return $this->pedir('put', '/v1/admin/llm', $dados, exigirAtiva: false);
    }

    /**
     * @return array<string, mixed>
     */
    public function testarLlm(): array
    {
        return $this->pedir('post', '/v1/admin/llm/test', exigirAtiva: false);
    }

    /**
     * @param  array<string, mixed>  $corpo
     * @return array<string, mixed>
     */
    private function pedir(string $metodo, string $caminho, array $corpo = [], bool $exigirAtiva = true): array
    {
        if ($exigirAtiva && ! $this->ativa()) {
            throw new RegraNegocio('A assistência à demanda está desligada neste ambiente.');
        }
        if (! $this->configurado()) {
            throw new RegraNegocio('A assistência não está configurada (URL e chave do serviço).');
        }

        $url = (string) config('assistencia.url').$caminho;

        try {
            $pendente = Http::timeout((int) config('assistencia.timeout'))
                ->acceptJson()
                ->withHeaders([
                    'X-API-Key' => (string) config('assistencia.api_key'),
                ]);
            $resposta = match ($metodo) {
                'get' => $pendente->get($url),
                'put' => $pendente->put($url, $corpo),
                default => $pendente->post($url, $corpo),
            };
        } catch (ConnectionException) {
            throw new RegraNegocio('A assistência está indisponível agora.');
        } catch (\Throwable) {
            throw new RegraNegocio('A assistência falhou.');
        }

        if ($resposta->status() === 401) {
            throw new RegraNegocio('A assistência recusou a chave de acesso.');
        }
        if ($resposta->status() === 404) {
            throw new RegraNegocio('A conversa expirou. Abra a assistência de novo.');
        }
        if (! $resposta->successful()) {
            throw new RegraNegocio('A assistência não respondeu.');
        }

        $dados = $resposta->json();

        return is_array($dados) ? $dados : [];
    }
}
