<?php

namespace App\Support;

use Illuminate\Database\Eloquent\Builder;

/**
 * Isola catálogo ORC / mapa de facas por EMP (SaaS self-service).
 * Sem linhas da EMP: o motor cai no template (empresa_id nulo) e depois no JSON.
 */
final class CatalogoOrcEmpresa
{
    public static function id(): ?int
    {
        if (! app()->bound('empresa')) {
            return null;
        }
        $empresa = app('empresa');

        return $empresa && isset($empresa->id) ? (int) $empresa->id : null;
    }

    /**
     * @template T of Builder
     * @param  T  $query
     * @return T
     */
    public static function apply(Builder $query, ?int $empresaId, bool $fallbackTemplate = false): Builder
    {
        if ($empresaId !== null) {
            $owned = $query->clone()->where('empresa_id', $empresaId);
            if (! $fallbackTemplate || $owned->exists()) {
                return $owned;
            }

            return $query->whereNull('empresa_id');
        }

        return $query->whereNull('empresa_id');
    }
}
