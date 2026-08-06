<?php

namespace App\Services\Relatorio;

use InvalidArgumentException;

class RelatorioProgramaValidator
{
    public function __construct(private readonly RelatorioCatalogo $catalogo) {}

    /**
     * @param  array<string, mixed>  $programa
     * @param  array<string, mixed>  $flags
     * @return array{
     *   titulo: string,
     *   fonte: string,
     *   colunas: list<string>,
     *   filtros: list<array{campo: string, op: string, valor: mixed}>,
     *   ordenacao: list<array{campo: string, dir: string}>,
     *   limite: int,
     *   totais: list<array{campo: string, fn: string}>
     * }
     */
    public function validate(array $programa, array $flags): array
    {
        $catalog = $this->catalogo->forFlags($flags);
        $fonte = (string) ($programa['fonte'] ?? '');
        if ($fonte === '' || ! isset($catalog['fontes'][$fonte])) {
            throw new InvalidArgumentException('Fonte de dados inválida ou ausente no programa.');
        }

        $campos = $catalog['fontes'][$fonte]['campos'];
        $titulo = trim((string) ($programa['titulo'] ?? 'Relatório'));
        if ($titulo === '') {
            $titulo = 'Relatório';
        }
        if (mb_strlen($titulo) > 200) {
            $titulo = mb_substr($titulo, 0, 200);
        }

        $colunasRaw = $programa['colunas'] ?? [];
        if (! is_array($colunasRaw) || $colunasRaw === []) {
            throw new InvalidArgumentException('Programa sem colunas.');
        }
        $colunas = [];
        foreach ($colunasRaw as $col) {
            $c = (string) $col;
            if (! isset($campos[$c])) {
                throw new InvalidArgumentException("Coluna não permitida: {$c}");
            }
            $colunas[] = $c;
        }
        $colunas = array_values(array_unique($colunas));

        $filtros = [];
        foreach ($programa['filtros'] ?? [] as $f) {
            if (! is_array($f)) {
                continue;
            }
            $campo = (string) ($f['campo'] ?? '');
            $op = strtolower((string) ($f['op'] ?? 'eq'));
            if (! isset($campos[$campo])) {
                throw new InvalidArgumentException("Filtro em campo não permitido: {$campo}");
            }
            if (! ($campos[$campo]['filtravel'] ?? true) && ($campos[$campo]['tipo'] ?? '') === 'svg') {
                throw new InvalidArgumentException("Campo não filtrável: {$campo}");
            }
            if (! in_array($op, RelatorioCatalogo::OPS, true)) {
                throw new InvalidArgumentException("Operador de filtro inválido: {$op}");
            }
            if (! array_key_exists('valor', $f)) {
                throw new InvalidArgumentException("Filtro sem valor: {$campo}");
            }
            $valor = $this->normalizeFilterValue($campo, $campos[$campo], $op, $f['valor']);
            // Date-only com eq vira between [início, fim do dia].
            if (
                $op === 'eq'
                && is_array($valor)
                && count($valor) === 2
                && in_array(($campos[$campo]['tipo'] ?? ''), ['date', 'datetime'], true)
            ) {
                $filtros[] = [
                    'campo' => $campo,
                    'op' => 'between',
                    'valor' => $valor,
                ];

                continue;
            }
            $filtros[] = [
                'campo' => $campo,
                'op' => $op,
                'valor' => $valor,
            ];
        }

        $ordenacao = [];
        foreach ($programa['ordenacao'] ?? [] as $o) {
            if (! is_array($o)) {
                continue;
            }
            $campo = (string) ($o['campo'] ?? '');
            $dir = strtolower((string) ($o['dir'] ?? 'asc')) === 'desc' ? 'desc' : 'asc';
            if (! isset($campos[$campo])) {
                throw new InvalidArgumentException("Ordenação em campo não permitido: {$campo}");
            }
            if (($campos[$campo]['ordenavel'] ?? true) === false) {
                throw new InvalidArgumentException("Campo não ordenável: {$campo}");
            }
            $ordenacao[] = ['campo' => $campo, 'dir' => $dir];
        }

        $limite = (int) ($programa['limite'] ?? RelatorioCatalogo::LIMITE_PADRAO);
        if ($limite < 1) {
            $limite = RelatorioCatalogo::LIMITE_PADRAO;
        }
        if ($limite > RelatorioCatalogo::LIMITE_MAX) {
            $limite = RelatorioCatalogo::LIMITE_MAX;
        }

        // R4 — teto por células renderizadas (antes do DomPDF), não só por linhas.
        $limite = min($limite, RelatorioCatalogo::limitePorCelulas(count($colunas)));

        if ($fonte === 'facas') {
            $comDesenho = in_array('desenho', $colunas, true);
            $teto = $comDesenho
                ? RelatorioCatalogo::LIMITE_FACAS_COM_DESENHO
                : RelatorioCatalogo::LIMITE_FACAS;
            $limite = min($limite, $teto);
        }

        $totais = [];
        foreach ($programa['totais'] ?? [] as $t) {
            if (! is_array($t)) {
                continue;
            }
            $campo = (string) ($t['campo'] ?? '');
            $fn = strtolower((string) ($t['fn'] ?? 'sum'));
            if (! isset($campos[$campo])) {
                throw new InvalidArgumentException("Total em campo não permitido: {$campo}");
            }
            if (! in_array($fn, ['sum', 'avg', 'min', 'max', 'count', 'count_distinct'], true)) {
                throw new InvalidArgumentException("Função de total inválida: {$fn}");
            }
            // count / count_distinct aceitam qualquer campo; demais exigem agregável.
            if (! in_array($fn, ['count', 'count_distinct'], true) && empty($campos[$campo]['agregavel'])) {
                throw new InvalidArgumentException("Total em campo não agregável: {$campo}");
            }
            $totais[] = ['campo' => $campo, 'fn' => $fn];
        }

        return [
            'titulo' => $titulo,
            'fonte' => $fonte,
            'colunas' => $colunas,
            'filtros' => $filtros,
            'ordenacao' => $ordenacao,
            'limite' => $limite,
            'totais' => $totais,
        ];
    }

    /**
     * Normaliza valores de filtro: date-only em gte → início do dia; lte/between fim → fim do dia.
     *
     * @param  array<string, mixed>  $meta
     */
    private function normalizeFilterValue(string $campo, array $meta, string $op, mixed $valor): mixed
    {
        $tipo = (string) ($meta['tipo'] ?? 'string');
        if (! in_array($tipo, ['date', 'datetime'], true)) {
            return $valor;
        }

        $tz = $this->appTimezone();

        if ($op === 'between' && is_array($valor) && count($valor) >= 2) {
            return [
                $this->normalizeDateBound((string) $valor[0], 'start', $tz),
                $this->normalizeDateBound((string) $valor[1], 'end', $tz),
            ];
        }

        if (! is_scalar($valor)) {
            return $valor;
        }

        $raw = (string) $valor;
        if (in_array($op, ['gte', 'gt'], true)) {
            return $this->normalizeDateBound($raw, 'start', $tz);
        }
        if (in_array($op, ['lte', 'lt'], true)) {
            return $this->normalizeDateBound($raw, 'end', $tz);
        }
        if ($op === 'eq' && $this->isDateOnly($raw)) {
            return [
                $this->normalizeDateBound($raw, 'start', $tz),
                $this->normalizeDateBound($raw, 'end', $tz),
            ];
        }

        return $valor;
    }

    private function isDateOnly(string $valor): bool
    {
        return (bool) preg_match('/^\d{4}-\d{2}-\d{2}$/', trim($valor));
    }

    private function normalizeDateBound(string $valor, string $bound, string $tz): string
    {
        $valor = trim($valor);
        try {
            if ($this->isDateOnly($valor)) {
                $dt = \Carbon\Carbon::createFromFormat('Y-m-d', $valor, $tz);
                if ($dt === false) {
                    return $valor;
                }

                return $bound === 'end'
                    ? $dt->endOfDay()->format('Y-m-d H:i:s')
                    : $dt->startOfDay()->format('Y-m-d H:i:s');
            }

            return $valor;
        } catch (\Throwable) {
            return $valor;
        }
    }

    private function appTimezone(): string
    {
        if (function_exists('config')) {
            return (string) config('app.timezone', 'America/Sao_Paulo');
        }

        return 'America/Sao_Paulo';
    }
}
