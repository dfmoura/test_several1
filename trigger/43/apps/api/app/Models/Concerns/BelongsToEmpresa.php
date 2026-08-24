<?php

namespace App\Models\Concerns;

use Illuminate\Database\Eloquent\Builder;

/**
 * Escopo operacional por EMP do contexto (SetEmpresaContext).
 * Não aplica global scope — catálogos com template (empresa_id nulo) ficam de fora.
 *
 * @see docs/MODELO_INSTALACAO_MULTI_EMPRESA.md §5
 */
trait BelongsToEmpresa
{
    public static function bootBelongsToEmpresa(): void
    {
        static::creating(function ($model): void {
            if ($model->getAttribute('empresa_id')) {
                return;
            }
            $id = static::resolveEmpresaContextId();
            if ($id !== null) {
                $model->setAttribute('empresa_id', $id);
            }
        });
    }

    public static function resolveEmpresaContextId(): ?int
    {
        if (! app()->bound('empresa')) {
            return null;
        }
        $empresa = app('empresa');

        return $empresa && isset($empresa->id) ? (int) $empresa->id : null;
    }

    /**
     * @param  Builder<static>  $query
     * @return Builder<static>
     */
    public function scopeForEmpresa(Builder $query, ?int $empresaId = null): Builder
    {
        $id = $empresaId ?? static::resolveEmpresaContextId();
        if ($id === null) {
            return $query;
        }

        return $query->where($this->getTable().'.empresa_id', $id);
    }
}
