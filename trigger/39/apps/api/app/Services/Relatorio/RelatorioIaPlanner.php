<?php

namespace App\Services\Relatorio;

use App\Models\Empresa;
use App\Models\RelatorioExecucao;
use App\Services\Ia\IaClient;
use Carbon\Carbon;
use Illuminate\Support\Facades\Cache;
use InvalidArgumentException;
use RuntimeException;

class RelatorioIaPlanner
{
    public function __construct(
        private readonly IaClient $ia,
        private readonly RelatorioCatalogo $catalogo,
        private readonly RelatorioProgramaValidator $validator,
    ) {}

    /**
     * @param  array<string, mixed>  $flags
     * @param  array{empresa?: ?Empresa, usuario_id?: ?int, relatorio_id?: ?int, planejamento_id?: ?int}  $ctx
     * @return array{programa: array<string, mixed>, provedor_id: int, tentativas: int, avisos: list<string>}
     */
    public function planejar(string $prompt, array $flags, ?string $tituloSugerido = null, array $ctx = []): array
    {
        $cacheSec = (int) config('erp.relatorio_ia_planejar_cache_sec', 600);
        $empresaId = $ctx['empresa']->id ?? 0;
        $cacheKey = 'relatorio_ia_plan:'.hash('sha256', $empresaId.'|'.$prompt.'|'.json_encode($flags).'|'.(string) $tituloSugerido);
        if ($cacheSec > 0) {
            $cached = Cache::get($cacheKey);
            if (is_array($cached) && isset($cached['programa'], $cached['provedor_id'])) {
                return $cached + ['tentativas' => 0, 'avisos' => ['Reutilizado planejamento em cache (prompt idêntico).']];
            }
        }

        $compact = $this->catalogo->compactoParaPrompt($prompt, $flags);
        $system = $this->buildSystemPrompt($compact['catalogo'], $flags, $ctx['empresa'] ?? null);
        $user = "Pedido do usuário:\n".$prompt;
        if (filled($tituloSugerido)) {
            $user .= "\n\nTítulo sugerido pelo usuário (pode ajustar): ".$tituloSugerido;
        }

        $messages = [
            ['role' => 'system', 'content' => $system],
            ['role' => 'user', 'content' => $user],
        ];

        $maxTentativas = config('erp.relatorio_ia_autocorrecao', true) ? 3 : 1;
        $avisos = [];
        $ultimoErro = null;
        $provedorId = null;
        $modelo = null;
        $ultimaResposta = '';

        for ($tentativa = 1; $tentativa <= $maxTentativas; $tentativa++) {
            $started = hrtime(true);
            try {
                $resp = $this->ia->chat($messages, null, [
                    'json_mode' => (bool) config('erp.relatorio_ia_json_mode', true),
                    'temperature' => 0.0,
                    'max_tokens' => 4096,
                ]);
                $ultimaResposta = $resp['texto'];
                $provedorId = (int) $resp['provedor_id'];
                $modelo = $resp['modelo'] ?? null;
                $latencia = (int) ((hrtime(true) - $started) / 1_000_000);

                $programa = $this->parseJsonPrograma($resp['texto']);
                $normalizado = $this->normalizarTolerante($programa, $flags, $avisos);
                $validado = $this->validator->validate($normalizado, $flags);

                $this->logExecucao([
                    'relatorio_id' => $ctx['relatorio_id'] ?? null,
                    'planejamento_id' => $ctx['planejamento_id'] ?? null,
                    'empresa_id' => $empresaId ?: null,
                    'usuario_id' => $ctx['usuario_id'] ?? null,
                    'etapa' => 'planejar',
                    'provedor_ia_id' => $provedorId,
                    'modelo' => $modelo,
                    'tentativa' => $tentativa,
                    'prompt_hash' => hash('sha256', $prompt),
                    'prompt_texto' => config('erp.relatorio_ia_log_prompt') ? mb_substr($prompt, 0, 4000) : null,
                    'latencia_ms' => $latencia,
                    'sucesso' => true,
                    'erro' => null,
                    'spec_resultante' => $validado,
                ]);

                $out = [
                    'programa' => $validado,
                    'provedor_id' => $provedorId,
                    'tentativas' => $tentativa,
                    'avisos' => $avisos,
                ];

                if ($cacheSec > 0) {
                    Cache::put($cacheKey, [
                        'programa' => $validado,
                        'provedor_id' => $provedorId,
                    ], $cacheSec);
                }

                return $out;
            } catch (\Throwable $e) {
                $ultimoErro = $e;
                $latencia = (int) ((hrtime(true) - $started) / 1_000_000);
                $this->logExecucao([
                    'relatorio_id' => $ctx['relatorio_id'] ?? null,
                    'planejamento_id' => $ctx['planejamento_id'] ?? null,
                    'empresa_id' => $empresaId ?: null,
                    'usuario_id' => $ctx['usuario_id'] ?? null,
                    'etapa' => 'planejar',
                    'provedor_ia_id' => $provedorId,
                    'modelo' => $modelo,
                    'tentativa' => $tentativa,
                    'prompt_hash' => hash('sha256', $prompt),
                    'prompt_texto' => config('erp.relatorio_ia_log_prompt') ? mb_substr($prompt, 0, 4000) : null,
                    'latencia_ms' => $latencia,
                    'sucesso' => false,
                    'erro' => mb_substr($e->getMessage(), 0, 1000),
                    'spec_resultante' => null,
                ]);

                if ($tentativa >= $maxTentativas) {
                    break;
                }

                $camposHint = $this->camposHintParaErro($e, $flags);
                if ($ultimaResposta !== '') {
                    $messages[] = ['role' => 'assistant', 'content' => $ultimaResposta];
                }
                $messages[] = [
                    'role' => 'user',
                    'content' => "Sua resposta foi rejeitada pelo validador com o erro:\n{$e->getMessage()}\n"
                        .($camposHint !== '' ? "Campos válidos: {$camposHint}\n" : '')
                        ."Corrija e reenvie APENAS o JSON.",
                ];
            }
        }

        $msg = 'Não consegui montar um relatório válido para este pedido.';
        if ($ultimoErro) {
            $msg .= ' '.$ultimoErro->getMessage();
        }
        $msg .= ' Sugestão: tente ser específico sobre a fonte (orçamentos, parceiros, produtos ou facas) e as colunas desejadas.';

        throw new RuntimeException($msg);
    }

    private function buildSystemPrompt(array $catalog, array $flags, ?Empresa $empresa): string
    {
        $tz = config('app.timezone', 'America/Sao_Paulo');
        $agora = Carbon::now($tz);
        $dias = ['domingo', 'segunda-feira', 'terça-feira', 'quarta-feira', 'quinta-feira', 'sexta-feira', 'sábado'];
        $credito = ! empty($flags['incluir_credito']) ? 'inclui dados de crédito' : 'sem dados de crédito';
        $empresaNome = $empresa?->nome_fantasia ?: ($empresa?->razao_social ?? 'empresa atual');
        $empresaCodigo = $empresa?->codigo ?? '—';
        $catalogJson = json_encode($catalog, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
        $limiteFacasDesenho = RelatorioCatalogo::LIMITE_FACAS_COM_DESENHO;
        $limiteFacas = RelatorioCatalogo::LIMITE_FACAS;
        $limiteMax = RelatorioCatalogo::LIMITE_MAX;

        $exemploDetalhe = json_encode([
            'titulo' => 'Parceiros ativos',
            'fonte' => 'parceiros',
            'colunas' => ['codigo', 'razao_social', 'uf', 'situacao'],
            'filtros' => [['campo' => 'situacao', 'op' => 'eq', 'valor' => 'ATIVO']],
            'ordenacao' => [['campo' => 'razao_social', 'dir' => 'asc']],
            'limite' => 200,
            'totais' => [],
        ], JSON_UNESCAPED_UNICODE);

        $exemploValor = json_encode([
            'titulo' => 'Top orçamentos por valor',
            'fonte' => 'orcamentos',
            'colunas' => ['codigo', 'parceiro_nome', 'status', 'total', 'created_at'],
            'filtros' => [['campo' => 'status', 'op' => 'eq', 'valor' => 'CALCULADO']],
            'ordenacao' => [['campo' => 'total', 'dir' => 'desc']],
            'limite' => 10,
            'totais' => [['campo' => 'total', 'fn' => 'sum']],
        ], JSON_UNESCAPED_UNICODE);

        $exemploPeriodo = json_encode([
            'titulo' => 'Orçamentos dos últimos 30 dias',
            'fonte' => 'orcamentos',
            'colunas' => ['codigo', 'parceiro_nome', 'status', 'total', 'created_at'],
            'filtros' => [[
                'campo' => 'created_at',
                'op' => 'gte',
                'valor' => $agora->copy()->subDays(30)->startOfDay()->toDateString(),
            ]],
            'ordenacao' => [['campo' => 'created_at', 'dir' => 'desc']],
            'limite' => 200,
            'totais' => [['campo' => 'total', 'fn' => 'sum']],
        ], JSON_UNESCAPED_UNICODE);

        $exemploFacas = json_encode([
            'titulo' => 'Mapa de facas com desenho',
            'fonte' => 'facas',
            'colunas' => ['desenho', 'medida', 'formato', 'maquina_catalogo', 'repeticao'],
            'filtros' => [],
            'ordenacao' => [['campo' => 'repeticao', 'dir' => 'desc']],
            'limite' => 40,
            'totais' => [],
        ], JSON_UNESCAPED_UNICODE);

        return <<<SYS
Você é o planejador de relatórios do ERP RLP (TRIGGER). Traduza o pedido do usuário em um ReportSpec JSON. Você NÃO consulta dados e NÃO calcula números: quem executa é o sistema.

CONTEXTO DE EXECUÇÃO
  Hoje: {$agora->toDateString()} ({$dias[$agora->dayOfWeek]}) · Fuso: {$tz}
  Empresa: {$empresaNome} ({$empresaCodigo})
  Permissões do solicitante: {$credito}
  Limite máximo de linhas: {$limiteMax} · Facas com desenho: {$limiteFacasDesenho} · Facas sem desenho: {$limiteFacas}

CONTRATO DE SAÍDA (JSON)
{
  "titulo": "string curta",
  "fonte": "orcamentos|parceiros|produtos|facas",
  "colunas": ["campo1","campo2"],
  "filtros": [{"campo":"...","op":"eq|neq|in|like|gte|lte|gt|lt|between","valor":"..."}],
  "ordenacao": [{"campo":"...","dir":"asc|desc"}],
  "limite": 100,
  "totais": [{"campo":"...","fn":"sum|avg|min|max|count|count_distinct"}]
}

CATÁLOGO DISPONÍVEL
{$catalogJson}

REGRAS DE DECISÃO
R1 Pedido com listar/relação/quais/exportar → detalhe: preencha colunas.
R2 Pedido com top/maior/ranking/total/soma → ordene no campo adequado e use totais quando fizer sentido.
R3 Se a fonte tem campo de data e o pedido menciona tempo (mesmo implícito: recentes, deste mês, últimos N dias), preencha filtro de data com valor ABSOLUTO no fuso informado (Y-m-d). Nunca invente outra data de referência.
R4 "total" em orçamentos é valor da 1ª faixa (preço de proposta), NÃO faturamento.
R5 Máx. 7 colunas em retrato, 10 em paisagem.
R6 Use SOMENTE campos do catálogo. Não invente SQL, PHP, tabela ou nome de campo.
R7 Facas com desenho: limite ≤ {$limiteFacasDesenho}; prefira filtros de formato/máquina.
R8 Pedido ambíguo: escolha a leitura mais comum. Nunca peça esclarecimento.
R9 Totais só com fn permitida; count_distinct para contagem distinta de um campo.
R10 Responda APENAS com o JSON.

EXEMPLOS
Pedido: "liste parceiros ativos" → {$exemploDetalhe}
Pedido: "top 10 orçamentos por valor" → {$exemploValor}
Pedido: "orçamentos dos últimos 30 dias" → {$exemploPeriodo}
Pedido: "mapa de facas com desenho" → {$exemploFacas}
SYS;
    }

    /**
     * Normaliza acentos/sinônimos antes de validar (segurança: destino sempre allowlist).
     *
     * @param  array<string, mixed>  $programa
     * @param  list<string>  $avisos
     * @return array<string, mixed>
     */
    private function normalizarTolerante(array $programa, array $flags, array &$avisos): array
    {
        $fonte = (string) ($programa['fonte'] ?? '');
        $fontes = array_keys($this->catalogo->forFlags($flags)['fontes']);
        if ($fonte !== '' && ! in_array($fonte, $fontes, true)) {
            $resolved = null;
            foreach ($fontes as $f) {
                if ($this->catalogo->normalizeKey($f) === $this->catalogo->normalizeKey($fonte)) {
                    $resolved = $f;
                    break;
                }
            }
            if ($resolved) {
                $avisos[] = "Fonte '{$fonte}' corrigida para '{$resolved}'.";
                $programa['fonte'] = $resolved;
                $fonte = $resolved;
            }
        }

        if ($fonte === '' || ! in_array($fonte, $fontes, true)) {
            return $programa;
        }

        foreach (['colunas'] as $listaKey) {
            if (! isset($programa[$listaKey]) || ! is_array($programa[$listaKey])) {
                continue;
            }
            $novas = [];
            foreach ($programa[$listaKey] as $col) {
                $c = (string) $col;
                $r = $this->catalogo->resolverCampo($fonte, $c, $flags);
                if ($r && $r !== $c) {
                    $avisos[] = "Coluna '{$c}' normalizada para '{$r}'.";
                }
                $novas[] = $r ?? $c;
            }
            $programa[$listaKey] = $novas;
        }

        foreach (['filtros', 'ordenacao', 'totais'] as $listaKey) {
            if (! isset($programa[$listaKey]) || ! is_array($programa[$listaKey])) {
                continue;
            }
            foreach ($programa[$listaKey] as $i => $item) {
                if (! is_array($item) || ! isset($item['campo'])) {
                    continue;
                }
                $c = (string) $item['campo'];
                $r = $this->catalogo->resolverCampo($fonte, $c, $flags);
                if ($r && $r !== $c) {
                    $avisos[] = "Campo '{$c}' em {$listaKey} normalizado para '{$r}'.";
                    $programa[$listaKey][$i]['campo'] = $r;
                }
            }
        }

        return $programa;
    }

    private function camposHintParaErro(\Throwable $e, array $flags): string
    {
        if (! str_contains($e->getMessage(), 'não permit') && ! str_contains($e->getMessage(), 'Fonte')) {
            return '';
        }
        // Lista curta de campos da primeira fonte do catálogo completo
        $fontes = $this->catalogo->forFlags($flags)['fontes'];
        $parts = [];
        foreach ($fontes as $id => $def) {
            $campos = implode(', ', array_keys($def['campos'] ?? []));
            $parts[] = "{$id}: {$campos}";
        }

        return implode(' | ', $parts);
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function logExecucao(array $data): void
    {
        if (empty($data['empresa_id'])) {
            return;
        }
        try {
            RelatorioExecucao::query()->create([
                ...$data,
                'created_at' => now(),
            ]);
        } catch (\Throwable) {
            // auditoria nunca derruba o pipeline
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function parseJsonPrograma(string $texto): array
    {
        $raw = trim($texto);
        if (preg_match('/```(?:json)?\s*(\{.*?\})\s*```/s', $raw, $m) === 1) {
            $raw = $m[1];
        } else {
            $start = strpos($raw, '{');
            $end = strrpos($raw, '}');
            if ($start === false || $end === false || $end < $start) {
                throw new RuntimeException('A IA não retornou um programa JSON válido.');
            }
            $raw = substr($raw, $start, $end - $start + 1);
        }

        try {
            /** @var mixed $decoded */
            $decoded = json_decode($raw, true, 512, JSON_THROW_ON_ERROR);
        } catch (\JsonException $e) {
            throw new RuntimeException('Falha ao interpretar programa da IA: '.$e->getMessage());
        }

        if (! is_array($decoded)) {
            throw new InvalidArgumentException('Programa da IA não é um objeto JSON.');
        }

        return $decoded;
    }
}
