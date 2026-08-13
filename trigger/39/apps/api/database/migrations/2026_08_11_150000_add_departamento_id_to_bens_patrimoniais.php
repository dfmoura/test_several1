<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Local do patrimônio = Departamento da EMP (ADR-039-DEP-001 emenda).
 * `local` permanece como espelho denormalizado do nome do DEP.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('bens_patrimoniais', function (Blueprint $table) {
            $table->foreignId('departamento_id')
                ->nullable()
                ->after('local')
                ->constrained('departamentos')
                ->nullOnDelete();
        });

        if (! Schema::hasTable('departamentos') || ! Schema::hasTable('bens_patrimoniais')) {
            return;
        }

        $empresas = DB::table('empresas')->orderBy('id')->pluck('id');
        foreach ($empresas as $empresaId) {
            $empresaId = (int) $empresaId;

            $legacy = DB::table('bens_patrimoniais')
                ->where('empresa_id', $empresaId)
                ->whereNotNull('local')
                ->where('local', '!=', '')
                ->distinct()
                ->pluck('local');

            $byNorm = [];
            foreach ($legacy as $nomeRaw) {
                $nome = trim((string) $nomeRaw);
                if ($nome === '') {
                    continue;
                }
                $key = mb_strtolower($nome);
                if (! isset($byNorm[$key])) {
                    $byNorm[$key] = $this->resolveOrCreateDepartamento($empresaId, $nome);
                }
            }

            foreach ($byNorm as $norm => $depId) {
                $nomeCanon = DB::table('departamentos')->where('id', $depId)->value('nome');
                $bens = DB::table('bens_patrimoniais')
                    ->where('empresa_id', $empresaId)
                    ->whereNotNull('local')
                    ->where('local', '!=', '')
                    ->get(['id', 'local']);

                foreach ($bens as $bem) {
                    if (mb_strtolower(trim((string) $bem->local)) === $norm) {
                        DB::table('bens_patrimoniais')->where('id', $bem->id)->update([
                            'departamento_id' => $depId,
                            'local' => $nomeCanon,
                        ]);
                    }
                }
            }
        }
    }

    public function down(): void
    {
        Schema::table('bens_patrimoniais', function (Blueprint $table) {
            $table->dropConstrainedForeignId('departamento_id');
        });
    }

    private function resolveOrCreateDepartamento(int $empresaId, string $nome): int
    {
        $existing = DB::table('departamentos')
            ->where('empresa_id', $empresaId)
            ->whereNull('deleted_at')
            ->whereRaw('LOWER(nome) = ?', [mb_strtolower($nome)])
            ->first();

        if ($existing) {
            return (int) $existing->id;
        }

        $max = 0;
        $codes = DB::table('departamentos')
            ->where('empresa_id', $empresaId)
            ->pluck('codigo');
        foreach ($codes as $codigo) {
            if (preg_match('/^DEP-(\d+)$/', (string) $codigo, $m)) {
                $max = max($max, (int) $m[1]);
            }
        }

        $seq = $max + 1;
        $codigo = sprintf('DEP-%s', str_pad((string) $seq, 5, '0', STR_PAD_LEFT));

        $id = (int) DB::table('departamentos')->insertGetId([
            'empresa_id' => $empresaId,
            'codigo' => $codigo,
            'nome' => $nome,
            'ativo' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        if (Schema::hasTable('codigo_sequences')) {
            $row = DB::table('codigo_sequences')
                ->where('empresa_id', $empresaId)
                ->where('prefixo', 'DEP')
                ->first();
            $proximo = $seq + 1;
            if ($row) {
                if ((int) $row->proximo < $proximo) {
                    DB::table('codigo_sequences')->where('id', $row->id)->update([
                        'proximo' => $proximo,
                        'updated_at' => now(),
                    ]);
                }
            } else {
                DB::table('codigo_sequences')->insert([
                    'empresa_id' => $empresaId,
                    'prefixo' => 'DEP',
                    'proximo' => $proximo,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }

        return $id;
    }
};