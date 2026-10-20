<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder as EloquentBuilder;
use Illuminate\Database\Query\Builder as QueryBuilder;

/**
 * Intervalo de datas nas listagens (`de` / `ate`) — mesmo contrato do Estoque Ajustes.
 * Sem default de mês no backend: quem omite vê o comportamento anterior da API.
 */
final class ListPeriodo
{
    /**
     * @return array<string, list<string>>
     */
    public static function rules(): array
    {
        return [
            'de' => ['nullable', 'date'],
            'ate' => ['nullable', 'date'],
        ];
    }

    public static function filled(?string $de, ?string $ate): bool
    {
        return self::value($de) !== null || self::value($ate) !== null;
    }

    public static function value(?string $raw): ?string
    {
        if ($raw === null) {
            return null;
        }
        $trim = trim($raw);

        return $trim === '' ? null : $trim;
    }

    /**
     * @param  EloquentBuilder<\Illuminate\Database\Eloquent\Model>|QueryBuilder  $query
     */
    public static function apply(
        EloquentBuilder|QueryBuilder $query,
        string $column,
        ?string $de,
        ?string $ate,
        bool $includeNull = false,
    ): void {
        $de = self::value($de);
        $ate = self::value($ate);
        if ($de === null && $ate === null) {
            return;
        }

        if ($includeNull) {
            $query->where(function ($outer) use ($column, $de, $ate) {
                $outer->where(function ($inner) use ($column, $de, $ate) {
                    if ($de !== null) {
                        $inner->whereDate($column, '>=', $de);
                    }
                    if ($ate !== null) {
                        $inner->whereDate($column, '<=', $ate);
                    }
                })->orWhereNull($column);
            });

            return;
        }

        if ($de !== null) {
            $query->whereDate($column, '>=', $de);
        }
        if ($ate !== null) {
            $query->whereDate($column, '<=', $ate);
        }
    }
}
