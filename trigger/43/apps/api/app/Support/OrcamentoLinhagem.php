<?php

namespace App\Support;

use App\Models\Orcamento;
use App\Models\PedidoItem;

/**
 * Linhagem comercial do ORC — ADR_ORC_LINHAGEM_COMERCIAL.
 * Fingerprint = identidade da etiqueta/serviço (não prazo/obs/frete/gordura).
 */
final class OrcamentoLinhagem
{
    public const NOVO = 'NOVO';

    public const REPETICAO = 'REPETICAO';

    public const REPETICAO_ALTERADA = 'REPETICAO_ALTERADA';

    /** @var list<string> */
    public const TODOS = [
        self::NOVO,
        self::REPETICAO,
        self::REPETICAO_ALTERADA,
    ];

    public static function fingerprint(Orcamento $orcamento): string
    {
        $canon = self::canonico($orcamento);

        return hash('sha256', json_encode($canon, JSON_UNESCAPED_UNICODE | JSON_THROW_ON_ERROR));
    }

    public static function mesmoFingerprint(Orcamento $a, Orcamento $b): bool
    {
        return self::fingerprint($a) === self::fingerprint($b);
    }

    /**
     * @return array{parceiro_id: int|null, tipo_operacao: string, jobs: list<array<string, mixed>>}
     */
    public static function canonico(Orcamento $orcamento): array
    {
        $orcamento->loadMissing('itens');
        $snapDoc = is_array($orcamento->input_snapshot) ? $orcamento->input_snapshot : [];
        $itens = $orcamento->itens->sortBy('ordem')->values();

        $jobs = [];
        if ($itens->count() <= 1) {
            $snap = is_array($itens->first()?->input_snapshot) ? $itens->first()->input_snapshot : $snapDoc;
            $jobs[] = self::jobCanonico($snap, $itens->first()?->rotulo);
        } else {
            foreach ($itens as $item) {
                $snap = is_array($item->input_snapshot) ? $item->input_snapshot : [];
                $jobs[] = self::jobCanonico($snap, $item->rotulo);
            }
        }

        return [
            'parceiro_id' => $orcamento->parceiro_id !== null ? (int) $orcamento->parceiro_id : null,
            'tipo_operacao' => TipoOperacaoSaida::fromInput(
                $snapDoc['tipo_operacao'] ?? $snapDoc['necessidade'] ?? null
            ),
            'jobs' => $jobs,
        ];
    }

    /**
     * @param  array<string, mixed>  $snap
     * @return array<string, mixed>
     */
    private static function jobCanonico(array $snap, mixed $rotulo = null): array
    {
        $necessidade = strtoupper(trim((string) ($snap['necessidade'] ?? '')));
        $tipo = TipoOperacaoSaida::fromInput($snap['tipo_operacao'] ?? $necessidade);
        $out = [
            'rotulo' => self::normStr($rotulo),
            'necessidade' => $necessidade !== '' ? $necessidade : (
                $tipo === TipoOperacaoSaida::SERVICO ? 'SERVICO' : 'PRODUCAO'
            ),
        ];

        if ($tipo === TipoOperacaoSaida::SERVICO || $necessidade === 'SERVICO') {
            $out['necessidade'] = 'SERVICO';
            $out += self::pick($snap, [
                'tipo_servico',
                'descricao_servico',
                'material_cliente',
                'unidade',
                'horas_maquina',
                'maquina',
                'cessao_bem_id',
            ]);
            $out['faixas'] = self::faixasCanonicas($snap['faixas'] ?? null, true);

            return self::ordenar($out);
        }

        if (PedidoItem::isRevenda($necessidade)) {
            $out['necessidade'] = PedidoItem::NEC_REVENDA;
            $out += self::pick($snap, [
                'produto_id',
                'unidade',
            ]);
            $desc = trim((string) ($snap['produto_descricao'] ?? $snap['descricao_comercial'] ?? ''));
            if ($desc !== '') {
                $out['descricao_comercial'] = $desc;
            }
            $out['faixas'] = self::faixasCanonicas($snap['faixas'] ?? null, true);

            return self::ordenar($out);
        }

        $out['necessidade'] = 'PRODUCAO';
        $out += self::pick($snap, [
            'medida',
            'largura_cm',
            'puxada_cm',
            'cores',
            'papel',
            'papel_tarifa',
            'papel_produto_id',
            'papel_produto_codigo',
            'acabamento',
            'acabamento_tarifa',
            'acabamento_tarifa_composta',
            'acabamento_complemento',
            'acabamento_produto_id',
            'acabamento_produto_codigo',
            'modelos',
            'colunas',
            'etiq_por_rolo',
            'tubete',
            'tubete_rotulo',
            'tubete_produto_id',
            'tubete_produto_codigo',
            'caixa_medida',
            'z',
            'maquina',
            'maquina_roda_servico',
            'imposto_pct',
            'matriz',
            'coluna_rebobinacao',
            'saida_etiqueta',
            'tipo_troca_produto',
            'rpm',
            'overrides',
            'facas',
            'faca_nova',
            'formato_faca',
            'valor_faca_nova',
            'prazo_faca_dias',
            'faca_colunas_mapa',
            'faca_posicao',
            'faca_contorno_svg',
            'faca_diametro_cm',
            'faca_tamanho_raw',
            'faca_tamanho_tipo',
        ]);
        $comp = self::composicaoCanonica($snap['modelos_composicao'] ?? null);
        if ($comp !== null) {
            $out['modelos_composicao'] = $comp;
            if (array_key_exists('modelos_composicao_quantidades', $snap)) {
                $out['modelos_composicao_quantidades'] = $snap['modelos_composicao_quantidades'];
            }
        }
        $out['faixas'] = self::faixasCanonicas($snap['faixas'] ?? null, false);

        return self::ordenar($out);
    }

    /**
     * @return list<array<string, mixed>>|null
     */
    private static function composicaoCanonica(mixed $raw): ?array
    {
        if (! is_array($raw) || $raw === []) {
            return null;
        }

        $out = [];
        foreach (array_values($raw) as $row) {
            if (! is_array($row)) {
                continue;
            }
            $out[] = self::ordenar([
                'ordem' => $row['ordem'] ?? null,
                'nome' => self::normStr($row['nome'] ?? ''),
                'percentual' => self::normNum($row['percentual'] ?? 0),
                'arte_url' => self::normStr($row['arte_url'] ?? null),
                'tintas' => is_array($row['tintas'] ?? null)
                    ? array_values(array_map(fn ($t) => self::normStr($t) ?? '', $row['tintas']))
                    : [],
            ]);
        }

        return $out === [] ? null : $out;
    }

    /**
     * @return list<array<string, mixed>>
     */
    private static function faixasCanonicas(mixed $raw, bool $comValor): array
    {
        if (! is_array($raw)) {
            return [];
        }

        $out = [];
        foreach ($raw as $faixa) {
            if (! is_array($faixa)) {
                continue;
            }
            $row = [
                'quantidade' => self::normNum($faixa['quantidade'] ?? null),
            ];
            if ($comValor) {
                $row['valor_unitario'] = self::normNum($faixa['valor_unitario'] ?? null);
            }
            $out[] = $row;
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $snap
     * @param  list<string>  $keys
     * @return array<string, mixed>
     */
    private static function pick(array $snap, array $keys): array
    {
        $out = [];
        foreach ($keys as $key) {
            if (! array_key_exists($key, $snap)) {
                continue;
            }
            $out[$key] = self::normValue($snap[$key]);
        }

        return $out;
    }

    private static function normValue(mixed $value): mixed
    {
        if (is_array($value)) {
            $mapped = [];
            foreach ($value as $k => $v) {
                $mapped[$k] = self::normValue($v);
            }

            return self::ordenar($mapped);
        }
        if (is_bool($value) || $value === null) {
            return $value;
        }
        if (is_int($value) || is_float($value) || (is_string($value) && is_numeric($value))) {
            return self::normNum($value);
        }
        if (is_string($value)) {
            return self::normStr($value);
        }

        return $value;
    }

    private static function normNum(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (! is_numeric($value)) {
            return null;
        }

        return rtrim(rtrim(sprintf('%.6F', (float) $value), '0'), '.') ?: '0';
    }

    private static function normStr(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);

        return $s === '' ? null : $s;
    }

    /**
     * @param  array<string, mixed>  $row
     * @return array<string, mixed>
     */
    private static function ordenar(array $row): array
    {
        ksort($row);

        return $row;
    }
}
