<?php

namespace App\Services\Codigo;

use App\Models\CodigoSequence;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CodigoGenerator
{
    /**
     * Tabelas-fonte para alinhar a sequência ao maior código já existente
     * (seed, import ou create com código explícito sem passar pelo gerador).
     *
     * @var array<string, array{table: string, column: string, scoped: bool}>
     */
    private const SOURCES = [
        'PAR' => ['table' => 'parceiros', 'column' => 'codigo', 'scoped' => true],
        'USR' => ['table' => 'users', 'column' => 'codigo', 'scoped' => false],
        'EMP' => ['table' => 'empresas', 'column' => 'codigo', 'scoped' => false],
        'HUB' => ['table' => 'fiscal_hubs', 'column' => 'codigo', 'scoped' => true],
    ];

    public function nextCode(?int $empresaId, string $prefix, int $pad = 5): string
    {
        $seq = DB::transaction(function () use ($empresaId, $prefix) {
            $query = CodigoSequence::query()
                ->where('prefixo', $prefix)
                ->lockForUpdate();

            if ($empresaId === null) {
                $query->whereNull('empresa_id');
            } else {
                $query->where('empresa_id', $empresaId);
            }

            $row = $query->first();
            $floor = $this->maxExistingNumber($empresaId, $prefix) + 1;

            if ($row === null) {
                $current = max(1, $floor);
                CodigoSequence::query()->create([
                    'empresa_id' => $empresaId,
                    'prefixo' => $prefix,
                    'proximo' => $current + 1,
                ]);

                return $current;
            }

            $current = max((int) $row->proximo, $floor);
            $row->update(['proximo' => $current + 1]);

            return $current;
        });

        return sprintf('%s-%s', $prefix, str_pad((string) $seq, $pad, '0', STR_PAD_LEFT));
    }

    /**
     * Maior sufixo numérico já usado para o prefixo (inclui soft-deleted via query sem Eloquent).
     */
    private function maxExistingNumber(?int $empresaId, string $prefix): int
    {
        $source = $this->resolveSource($prefix);
        if ($source === null || ! Schema::hasTable($source['table'])) {
            return 0;
        }

        if ($source['scoped'] && $empresaId === null) {
            return 0;
        }

        $column = $source['column'];
        $like = $prefix.'-%';
        // SUBSTRING/SUBSTR são 1-based; dígitos começam após "{prefix}-"
        $offset = strlen($prefix) + 2;

        $query = DB::table($source['table'])->where($column, 'like', $like);
        if ($source['scoped']) {
            $query->where('empresa_id', $empresaId);
        }

        $driver = DB::getDriverName();
        if ($driver === 'sqlite') {
            $max = $query->selectRaw(
                "MAX(CAST(SUBSTR({$column}, ?) AS INTEGER)) as max_n",
                [$offset]
            )->value('max_n');
        } else {
            $max = $query->selectRaw(
                "MAX(CAST(SUBSTRING({$column}, ?) AS UNSIGNED)) as max_n",
                [$offset]
            )->value('max_n');
        }

        return (int) ($max ?? 0);
    }

    /**
     * @return array{table: string, column: string, scoped: bool}|null
     */
    private function resolveSource(string $prefix): ?array
    {
        if (isset(self::SOURCES[$prefix])) {
            return self::SOURCES[$prefix];
        }

        if (preg_match('/^ORC-\d{4}$/', $prefix) === 1) {
            return ['table' => 'orcamentos', 'column' => 'codigo', 'scoped' => true];
        }

        if (preg_match('/^REL-\d{4}$/', $prefix) === 1) {
            return ['table' => 'relatorios', 'column' => 'codigo', 'scoped' => true];
        }

        // Prefixos de produto (MP-PAP, PA-ETQ, SVC, FAC-RETA, …)
        if (preg_match('/^[A-Z0-9]+(?:-[A-Z0-9]+)*$/', $prefix) === 1) {
            return ['table' => 'produtos', 'column' => 'codigo', 'scoped' => true];
        }

        return null;
    }
}
