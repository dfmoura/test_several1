<?php

namespace App\Services\Ia;

use App\Models\IaProvedor;
use Illuminate\Http\Client\ConnectionException;
use Illuminate\Http\Client\RequestException;
use Illuminate\Support\Facades\Http;
use RuntimeException;

/**
 * Cliente de IA com protocolos OpenAI-compat / Anthropic / Gemini.
 * Features futuras devem preferir chat() com rotação; o CRUD usa testarConexao().
 */
class IaClient
{
    /** @var list<int> */
    private const STATUS_RECUPERAVEIS = [401, 402, 403, 408, 429, 500, 502, 503, 504];

    /** @var array<string, string> */
    private const URLS_PADRAO = [
        'openai' => 'https://api.openai.com/v1',
        'openai_compatible' => 'https://api.openai.com/v1',
        'gemini' => 'https://generativelanguage.googleapis.com/v1beta',
        'anthropic' => 'https://api.anthropic.com/v1',
        'deepseek' => 'https://api.deepseek.com/v1',
        'groq' => 'https://api.groq.com/openai/v1',
        'mistral' => 'https://api.mistral.ai/v1',
        'xai' => 'https://api.x.ai/v1',
        'openrouter' => 'https://openrouter.ai/api/v1',
        'together' => 'https://api.together.xyz/v1',
        'perplexity' => 'https://api.perplexity.ai',
    ];

    /** @var array<string, string> */
    private const MODELOS_PADRAO = [
        'openai' => 'gpt-4o-mini',
        'openai_compatible' => 'gpt-4o-mini',
        'gemini' => 'gemini-2.0-flash',
        'anthropic' => 'claude-haiku-4-5',
        'deepseek' => 'deepseek-chat',
        'groq' => 'llama-3.3-70b-versatile',
        'mistral' => 'mistral-small-latest',
        'xai' => 'grok-2-latest',
        'openrouter' => 'openai/gpt-4o-mini',
        'together' => 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
        'perplexity' => 'sonar',
    ];

    /** @var list<string> */
    private const OPENAI_COMPAT = [
        'openai',
        'openai_compatible',
        'deepseek',
        'groq',
        'mistral',
        'xai',
        'openrouter',
        'together',
        'perplexity',
    ];

    public function __construct(private readonly IaCrypto $crypto) {}

    /**
     * @return array{ok: bool, mensagem: string, status?: int, recuperavel?: bool}
     */
    public function testarConexao(IaProvedor $provedor, ?float $timeout = null): array
    {
        $to = $timeout ?? min((float) config('erp.ia_http_timeout_sec', 45), 20.0);
        $runtime = $this->runtimeFromModel($provedor);
        $messages = [['role' => 'user', 'content' => 'Responda apenas com a palavra OK.']];

        try {
            $texto = $this->dispararChat($runtime, $messages, $to);

            return [
                'ok' => true,
                'mensagem' => 'Conexão OK · resposta: '.mb_substr($texto, 0, 80),
            ];
        } catch (RequestException $e) {
            $status = $e->response?->status() ?? 0;
            $corpo = (string) ($e->response?->body() ?? '');

            return [
                'ok' => false,
                'mensagem' => $this->mensagemErroHttp($status, $corpo),
                'status' => $status,
                'recuperavel' => in_array($status, self::STATUS_RECUPERAVEIS, true),
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'mensagem' => $e::class.': '.$e->getMessage(),
                'recuperavel' => $e instanceof ConnectionException,
            ];
        }
    }

    /**
     * @return array{id: ?int, nome: string, provedor: string, base_url: ?string, modelo: ?string, api_key: string, prioridade: int}
     */
    public function runtimeFromModel(IaProvedor $row): array
    {
        return [
            'id' => $row->id,
            'nome' => $row->nome,
            'provedor' => $row->provedor,
            'base_url' => $row->base_url,
            'modelo' => $row->modelo,
            'api_key' => $this->crypto->descriptografar($row->api_key_criptografada),
            'prioridade' => (int) $row->prioridade,
        ];
    }

    /**
     * Chat com rotação por prioridade entre provedores ativos.
     * Em falhas recuperáveis (rede, 401/429/5xx), tenta o próximo.
     *
     * @param  list<array{role: string, content: string}>  $messages
     * @param  array{json_mode?: bool, temperature?: float, max_tokens?: int}  $opts
     * @return array{texto: string, provedor_id: int, provedor_nome: string, provedor: string, modelo: ?string}
     */
    public function chat(array $messages, ?float $timeout = null, array $opts = []): array
    {
        $to = $timeout ?? (float) config('erp.ia_http_timeout_sec', 45);
        $provedores = IaProvedor::query()
            ->where('ativo', true)
            ->orderBy('prioridade')
            ->orderBy('id')
            ->get();

        if ($provedores->isEmpty()) {
            throw new RuntimeException('Nenhum provedor de IA ativo. Cadastre e ative em Administração → Provedores de IA.');
        }

        $ultimoErro = null;
        foreach ($provedores as $row) {
            $runtime = $this->runtimeFromModel($row);
            try {
                $texto = $this->dispararChat($runtime, $messages, $to, $opts);

                return [
                    'texto' => $texto,
                    'provedor_id' => (int) $row->id,
                    'provedor_nome' => $row->nome,
                    'provedor' => $row->provedor,
                    'modelo' => $row->modelo,
                ];
            } catch (RequestException $e) {
                $status = $e->response?->status() ?? 0;
                $ultimoErro = $this->mensagemErroHttp($status, (string) ($e->response?->body() ?? ''));
                // JSON mode rejeitado → retry sem json_mode no mesmo provedor antes de rotacionar.
                if (
                    ! empty($opts['json_mode'])
                    && in_array($status, [400, 404, 422], true)
                ) {
                    try {
                        $optsSemJson = $opts;
                        unset($optsSemJson['json_mode']);
                        $texto = $this->dispararChat($runtime, $messages, $to, $optsSemJson);

                        return [
                            'texto' => $texto,
                            'provedor_id' => (int) $row->id,
                            'provedor_nome' => $row->nome,
                            'provedor' => $row->provedor,
                            'modelo' => $row->modelo,
                        ];
                    } catch (\Throwable) {
                        // cai na rotação
                    }
                }
                if (! in_array($status, self::STATUS_RECUPERAVEIS, true) && ! in_array($status, [400, 404, 422], true)) {
                    throw new RuntimeException("Provedor {$row->nome}: {$ultimoErro}");
                }
            } catch (ConnectionException $e) {
                $ultimoErro = 'Falha de conexão: '.$e->getMessage();
            } catch (\Throwable $e) {
                $ultimoErro = $e->getMessage();
            }
        }

        throw new RuntimeException('Todos os provedores de IA falharam. Último erro: '.($ultimoErro ?? 'desconhecido'));
    }

    /**
     * @param  array{id: ?int, nome: string, provedor: string, base_url: ?string, modelo: ?string, api_key: string, prioridade: int}  $p
     * @param  list<array{role: string, content: string}>  $messages
     * @param  array{json_mode?: bool, temperature?: float, max_tokens?: int}  $opts
     */
    public function dispararChat(array $p, array $messages, float $timeout, array $opts = []): string
    {
        if (in_array($p['provedor'], self::OPENAI_COMPAT, true)) {
            return $this->chatOpenaiCompatible($p, $messages, $timeout, $opts);
        }
        if ($p['provedor'] === 'anthropic') {
            return $this->chatAnthropic($p, $messages, $timeout, $opts);
        }
        if ($p['provedor'] === 'gemini') {
            return $this->chatGemini($p, $messages, $timeout, $opts);
        }

        throw new RuntimeException('Provedor não suportado: '.$p['provedor']);
    }

    /** @param  array{provedor: string, base_url: ?string}  $p */
    private function baseUrl(array $p): string
    {
        $custom = trim((string) ($p['base_url'] ?? ''));
        if ($custom !== '') {
            return rtrim($custom, '/');
        }

        return self::URLS_PADRAO[$p['provedor']] ?? self::URLS_PADRAO['openai'];
    }

    /** @param  array{provedor: string, modelo: ?string}  $p */
    private function modelo(array $p): string
    {
        $custom = trim((string) ($p['modelo'] ?? ''));
        if ($custom !== '') {
            return $custom;
        }

        return self::MODELOS_PADRAO[$p['provedor']] ?? self::MODELOS_PADRAO['openai'];
    }

    /**
     * @param  array{provedor: string, base_url: ?string, modelo: ?string, api_key: string}  $p
     * @param  list<array{role: string, content: string}>  $messages
     * @param  array{json_mode?: bool, temperature?: float, max_tokens?: int}  $opts
     */
    private function chatOpenaiCompatible(array $p, array $messages, float $timeout, array $opts = []): string
    {
        $body = [
            'model' => $this->modelo($p),
            'messages' => $messages,
            'temperature' => array_key_exists('temperature', $opts) ? (float) $opts['temperature'] : 0.2,
        ];
        if (isset($opts['max_tokens'])) {
            $body['max_tokens'] = (int) $opts['max_tokens'];
        }
        if (! empty($opts['json_mode']) && config('erp.relatorio_ia_json_mode', true)) {
            $body['response_format'] = ['type' => 'json_object'];
        }

        $response = Http::timeout($timeout)
            ->withToken($p['api_key'])
            ->acceptJson()
            ->post($this->baseUrl($p).'/chat/completions', $body)
            ->throw();

        $choices = $response->json('choices') ?? [];
        if ($choices === []) {
            throw new RuntimeException('Resposta sem choices do provedor OpenAI-compatible.');
        }
        $texto = trim((string) data_get($choices, '0.message.content', ''));
        if ($texto === '') {
            throw new RuntimeException('Resposta vazia do provedor OpenAI-compatible.');
        }

        return $texto;
    }

    /**
     * @param  array{provedor: string, base_url: ?string, modelo: ?string, api_key: string}  $p
     * @param  list<array{role: string, content: string}>  $messages
     * @param  array{json_mode?: bool, temperature?: float, max_tokens?: int}  $opts
     */
    private function chatAnthropic(array $p, array $messages, float $timeout, array $opts = []): string
    {
        $system = collect($messages)->where('role', 'system')->pluck('content')->implode("\n");
        $userMsgs = array_values(array_filter($messages, fn ($m) => $m['role'] !== 'system'));
        if ($userMsgs === []) {
            $userMsgs = [['role' => 'user', 'content' => '(vazio)']];
        }

        $maxTokens = (int) ($opts['max_tokens'] ?? 2048);
        $body = [
            'model' => $this->modelo($p),
            'max_tokens' => $maxTokens,
            'messages' => $userMsgs,
            'temperature' => array_key_exists('temperature', $opts) ? (float) $opts['temperature'] : 0.2,
        ];
        if ($system !== '') {
            $body['system'] = $system;
        }

        // Structured output via tool forçado quando json_mode.
        if (! empty($opts['json_mode']) && config('erp.relatorio_ia_json_mode', true)) {
            $body['tools'] = [[
                'name' => 'emitir_programa_relatorio',
                'description' => 'Emite o programa JSON do relatório',
                'input_schema' => [
                    'type' => 'object',
                    'additionalProperties' => true,
                ],
            ]];
            $body['tool_choice'] = ['type' => 'tool', 'name' => 'emitir_programa_relatorio'];
        }

        $response = Http::timeout($timeout)
            ->withHeaders([
                'x-api-key' => $p['api_key'],
                'anthropic-version' => '2023-06-01',
            ])
            ->acceptJson()
            ->post($this->baseUrl($p).'/messages', $body)
            ->throw();

        $parts = $response->json('content') ?? [];
        // Prefer tool_use input when present
        foreach ($parts as $part) {
            if (is_array($part) && ($part['type'] ?? null) === 'tool_use' && isset($part['input'])) {
                return json_encode($part['input'], JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) ?: '{}';
            }
        }

        $texto = collect($parts)
            ->filter(fn ($part) => is_array($part) && ($part['type'] ?? null) === 'text')
            ->pluck('text')
            ->filter()
            ->implode("\n");
        $texto = trim($texto);
        if ($texto === '') {
            throw new RuntimeException('Resposta vazia do provedor Anthropic.');
        }

        return $texto;
    }

    /**
     * @param  array{provedor: string, base_url: ?string, modelo: ?string, api_key: string}  $p
     * @param  list<array{role: string, content: string}>  $messages
     * @param  array{json_mode?: bool, temperature?: float, max_tokens?: int}  $opts
     */
    private function chatGemini(array $p, array $messages, float $timeout, array $opts = []): string
    {
        $system = collect($messages)->where('role', 'system')->pluck('content')->implode("\n");
        $contents = [];
        foreach ($messages as $m) {
            if ($m['role'] === 'system') {
                continue;
            }
            $contents[] = [
                'role' => $m['role'] === 'assistant' ? 'model' : 'user',
                'parts' => [['text' => $m['content']]],
            ];
        }
        if ($contents === []) {
            $contents = [['role' => 'user', 'parts' => [['text' => '(vazio)']]]];
        }

        $body = [
            'contents' => $contents,
            'generationConfig' => [
                'temperature' => array_key_exists('temperature', $opts) ? (float) $opts['temperature'] : 0.2,
            ],
        ];
        if (isset($opts['max_tokens'])) {
            $body['generationConfig']['maxOutputTokens'] = (int) $opts['max_tokens'];
        }
        if (! empty($opts['json_mode']) && config('erp.relatorio_ia_json_mode', true)) {
            $body['generationConfig']['responseMimeType'] = 'application/json';
        }
        if ($system !== '') {
            $body['systemInstruction'] = ['parts' => [['text' => $system]]];
        }

        $modelo = $this->modelo($p);
        $url = $this->baseUrl($p).'/models/'.$modelo.':generateContent';

        $response = Http::timeout($timeout)
            ->acceptJson()
            ->withQueryParameters(['key' => $p['api_key']])
            ->post($url, $body)
            ->throw();

        $parts = data_get($response->json(), 'candidates.0.content.parts', []) ?? [];
        $texto = collect($parts)->pluck('text')->filter()->implode("\n");
        $texto = trim($texto);
        if ($texto === '') {
            throw new RuntimeException('Resposta vazia do Gemini.');
        }

        return $texto;
    }

    private function mensagemErroHttp(int $status, string $corpo): string
    {
        $texto = trim($corpo);
        $baixo = mb_strtolower($texto);
        if ($status === 402 || str_contains($baixo, 'insufficient balance') || str_contains($baixo, 'insufficient_quota')) {
            return 'Saldo/crédito insuficiente no provedor. Recarregue a conta ou use outro token ativo.';
        }
        if ($status === 401 || str_contains($baixo, 'invalid api key') || str_contains($baixo, 'incorrect api key')) {
            return 'API key inválida ou revogada. Verifique o token no cadastro.';
        }
        if ($status === 429 || str_contains($baixo, 'rate limit')) {
            return 'Cota ou limite de requisições atingido.';
        }
        $trecho = $texto !== '' ? mb_substr($texto, 0, 180) : "HTTP {$status}";

        return "HTTP {$status}: {$trecho}";
    }
}
