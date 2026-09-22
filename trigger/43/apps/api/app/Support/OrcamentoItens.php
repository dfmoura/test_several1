<?php

namespace App\Support;

use App\Models\Orcamento;
use App\Models\OrcamentoItem;
use Illuminate\Validation\ValidationException;

/**
 * Cabeçalho × itens — ADR_ORC_ITENS.
 *
 * Fase 1: dual-write N=1 (paridade flat).
 * Fase 2: syncJobs para 1..N posições; flat = item ordem 1.
 */
final class OrcamentoItens
{
    /** @var list<string> */
    public const HEADER_KEYS = [
        'tipo_operacao',
        'parceiro_id',
        'prazo_entrega_dias',
        'validade_dias',
        'tolerancia_qtd_pct',
        'observacao',
        'url_arte',
        'condicao_pagamento',
        'forma_pagamento',
        'vendedor_parceiro_id',
        'modo_entrega',
        'valor_frete_manual',
        'mod_frete',
        'transportador_id',
        'necessidade',
    ];

    /**
     * Espelha o job único nos snapshots do documento.
     * Remove posições > 1 (fase 1 / compat legado).
     *
     * @param  array<string, mixed>  $inputSnapshot
     * @param  array<string, mixed>  $resultSnapshot
     */
    public static function syncUnicoJob(
        Orcamento $orcamento,
        array $inputSnapshot,
        array $resultSnapshot,
        ?string $rotulo = null,
    ): OrcamentoItem {
        return self::syncJobs($orcamento, [[
            'rotulo' => $rotulo,
            'input' => $inputSnapshot,
            'result' => $resultSnapshot,
        ]])[0];
    }

    /**
     * Substitui todas as posições do ORC pelos jobs informados (1..N).
     *
     * @param  list<array{rotulo?: string|null, input: array<string, mixed>, result: array<string, mixed>}>  $jobs
     * @return list<OrcamentoItem>
     */
    public static function syncJobs(Orcamento $orcamento, array $jobs): array
    {
        if ($jobs === []) {
            throw ValidationException::withMessages([
                'itens' => ['Informe ao menos uma posição no orçamento.'],
            ]);
        }

        $ordens = [];
        $out = [];

        foreach (array_values($jobs) as $i => $job) {
            $ordem = $i + 1;
            $ordens[] = $ordem;

            $out[] = OrcamentoItem::query()->updateOrCreate(
                [
                    'orcamento_id' => $orcamento->id,
                    'ordem' => $ordem,
                ],
                [
                    'empresa_id' => $orcamento->empresa_id,
                    'rotulo' => $job['rotulo'] ?? null,
                    'input_snapshot' => $job['input'],
                    'result_snapshot' => $job['result'],
                ],
            );
        }

        OrcamentoItem::query()
            ->where('orcamento_id', $orcamento->id)
            ->whereNotIn('ordem', $ordens)
            ->delete();

        return $out;
    }

    /**
     * Normaliza payload: cabeçalho + jobs (flat vira 1 job).
     *
     * @param  array<string, mixed>  $data
     * @return array{
     *   header: array<string, mixed>,
     *   jobs: list<array{rotulo: string|null, data: array<string, mixed>}>
     * }
     */
    public static function expandPayload(array $data): array
    {
        $rawItens = $data['itens'] ?? null;
        if (is_array($rawItens) && $rawItens !== []) {
            $header = self::extractHeader($data);
            $tipo = TipoOperacaoSaida::fromInput($header['tipo_operacao'] ?? $header['necessidade'] ?? null);
            $jobs = [];
            foreach (array_values($rawItens) as $row) {
                if (! is_array($row)) {
                    continue;
                }
                $rotulo = isset($row['rotulo']) ? trim((string) $row['rotulo']) : '';
                unset($row['rotulo']);
                $job = self::mergeHeaderIntoJob($header, $row, $tipo);
                $jobs[] = [
                    'rotulo' => $rotulo !== '' ? $rotulo : null,
                    'data' => $job,
                ];
            }
            if ($jobs === []) {
                throw ValidationException::withMessages([
                    'itens' => ['Informe ao menos uma posição válida.'],
                ]);
            }

            return ['header' => $header, 'jobs' => $jobs];
        }

        $header = self::extractHeader($data);
        $tipo = TipoOperacaoSaida::fromInput($header['tipo_operacao'] ?? $header['necessidade'] ?? null);
        $jobData = self::mergeHeaderIntoJob($header, self::extractJob($data), $tipo);

        return [
            'header' => $header,
            'jobs' => [['rotulo' => null, 'data' => $jobData]],
        ];
    }

    /**
     * Lista de itens para API: persistidos ou 1 implícito a partir do flat.
     *
     * @return list<array<string, mixed>>
     */
    public static function toOut(Orcamento $orcamento): array
    {
        $orcamento->loadMissing('itens');

        if ($orcamento->itens->isNotEmpty()) {
            return $orcamento->itens
                ->sortBy('ordem')
                ->values()
                ->map(static fn (OrcamentoItem $i) => self::itemOut($i, legado: false))
                ->all();
        }

        if (! is_array($orcamento->input_snapshot) && ! is_array($orcamento->result_snapshot)) {
            return [];
        }

        return [[
            'id' => null,
            'ordem' => 1,
            'rotulo' => null,
            'input_snapshot' => $orcamento->input_snapshot,
            'result_snapshot' => $orcamento->result_snapshot,
            'legado' => true,
        ]];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private static function extractHeader(array $data): array
    {
        $header = [];
        foreach (self::HEADER_KEYS as $key) {
            if (array_key_exists($key, $data)) {
                $header[$key] = $data[$key];
            }
        }

        return $header;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private static function extractJob(array $data): array
    {
        $job = $data;
        unset($job['itens']);
        foreach (self::HEADER_KEYS as $key) {
            unset($job[$key]);
        }

        return $job;
    }

    /**
     * @param  array<string, mixed>  $header
     * @param  array<string, mixed>  $job
     * @return array<string, mixed>
     */
    private static function mergeHeaderIntoJob(array $header, array $job, string $tipo): array
    {
        $merged = array_merge($job, $header);
        if ($tipo === TipoOperacaoSaida::SERVICO) {
            $merged['tipo_operacao'] = TipoOperacaoSaida::SERVICO;
            $merged['necessidade'] = 'SERVICO';
        } elseif ($tipo === TipoOperacaoSaida::INDUSTRIALIZACAO) {
            $merged['tipo_operacao'] = TipoOperacaoSaida::INDUSTRIALIZACAO;
            if (! isset($merged['necessidade']) || $merged['necessidade'] === '') {
                $merged['necessidade'] = 'PRODUCAO';
            }
        }

        return $merged;
    }

    /**
     * Anexa preview multi-item + totais do documento ao result flat (posição 1).
     *
     * @param  array<string, mixed>  $flatResult
     * @param  list<array{rotulo: string|null, input?: array<string, mixed>, result: array<string, mixed>}>  $jobs
     * @return array<string, mixed>
     */
    public static function anexarTotaisDocumento(array $flatResult, array $jobs): array
    {
        if (count($jobs) <= 1) {
            unset($flatResult['itens'], $flatResult['totais']);

            return $flatResult;
        }

        $itens = [];
        $soma = 0.0;
        foreach (array_values($jobs) as $i => $job) {
            $result = is_array($job['result'] ?? null) ? $job['result'] : [];
            $itens[] = [
                'ordem' => $i + 1,
                'rotulo' => $job['rotulo'] ?? null,
                'result' => $result,
            ];
            $fx = $result['faixas'][0] ?? null;
            if (is_array($fx)) {
                $soma += (float) \App\Services\Comercial\Orcamento\OrcamentoFreteEstimadoService::totalPropostaFaixa($fx);
            }
        }

        $flatResult['itens'] = $itens;
        $flatResult['totais'] = [
            'soma_primeira_faixa_proposta' => round($soma, 2),
            'n_itens' => count($itens),
        ];

        return $flatResult;
    }

    /**
     * Monta jobs a partir das linhas persistidas (show / reedição).
     *
     * @param  iterable<OrcamentoItem>  $itens
     * @return list<array{rotulo: string|null, result: array<string, mixed>}>
     */
    public static function jobsFromModels(iterable $itens): array
    {
        $jobs = [];
        foreach ($itens as $item) {
            $jobs[] = [
                'rotulo' => $item->rotulo,
                'result' => is_array($item->result_snapshot) ? $item->result_snapshot : [],
            ];
        }

        return $jobs;
    }

    /** @return array<string, mixed> */
    private static function itemOut(OrcamentoItem $item, bool $legado): array
    {
        return [
            'id' => $item->id,
            'ordem' => $item->ordem,
            'rotulo' => $item->rotulo,
            'input_snapshot' => $item->input_snapshot,
            'result_snapshot' => $item->result_snapshot,
            'legado' => $legado,
        ];
    }
}
