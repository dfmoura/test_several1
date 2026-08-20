<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * FK departamento_id no colaborador + backfill a partir do texto livre.
 * Coluna string `departamento` permanece como espelho denormalizado do nome.
 */
return new class extends Migration
{
    /** @var list<string> */
    private const CANONICOS = [
        'Comercial',
        'Produção',
        'Expedição',
        'Financeiro',
        'Fiscal',
        'Administrativo',
        'Operacional',
    ];

    public function up(): void
    {
        Schema::table('parceiros', function (Blueprint $table) {
            $table->foreignId('departamento_id')
                ->nullable()
                ->after('departamento')
                ->constrained('departamentos')
                ->nullOnDelete();
        });

        if (! Schema::hasTable('departamentos') || ! Schema::hasTable('empresas')) {
            return;
        }

        $empresas = DB::table('empresas')->orderBy('id')->pluck('id');
        foreach ($empresas as $empresaId) {
            $seq = 0;
            $byNorm = [];

            foreach (self::CANONICOS as $nome) {
                $seq++;
                $id = $this->ensureDepartamento((int) $empresaId, $nome, $seq);
                $byNorm[$this->norm($nome)] = $id;
            }

            $legacy = DB::table('parceiros')
                ->where('empresa_id', $empresaId)
                ->whereNotNull('departamento')
                ->where('departamento', '!=', '')
                ->distinct()
                ->pluck('departamento');

            foreach ($legacy as $nomeRaw) {
                $nome = trim((string) $nomeRaw);
                if ($nome === '') {
                    continue;
                }
                $key = $this->norm($nome);
                if (! isset($byNorm[$key])) {
                    $seq++;
                    $byNorm[$key] = $this->ensureDepartamento((int) $empresaId, $nome, $seq);
                }
            }

            foreach ($byNorm as $norm => $depId) {
                $parceiros = DB::table('parceiros')
                    ->where('empresa_id', $empresaId)
                    ->whereNotNull('departamento')
                    ->where('departamento', '!=', '')
                    ->get(['id', 'departamento']);

                foreach ($parceiros as $p) {
                    if ($this->norm((string) $p->departamento) === $norm) {
                        DB::table('parceiros')->where('id', $p->id)->update([
                            'departamento_id' => $depId,
                            'departamento' => DB::table('departamentos')->where('id', $depId)->value('nome'),
                        ]);
                    }
                }
            }

            $this->syncCodigoSequence((int) $empresaId, $seq);
        }
    }

    public function down(): void
    {
        Schema::table('parceiros', function (Blueprint $table) {
            $table->dropConstrainedForeignId('departamento_id');
        });
    }

    private function ensureDepartamento(int $empresaId, string $nome, int $seq): int
    {
        $existing = DB::table('departamentos')
            ->where('empresa_id', $empresaId)
            ->whereNull('deleted_at')
            ->whereRaw('LOWER(nome) = ?', [$this->norm($nome)])
            ->first();

        if ($existing) {
            return (int) $existing->id;
        }

        $codigo = sprintf('DEP-%s', str_pad((string) $seq, 5, '0', STR_PAD_LEFT));
        while (DB::table('departamentos')->where('empresa_id', $empresaId)->where('codigo', $codigo)->exists()) {
            $seq++;
            $codigo = sprintf('DEP-%s', str_pad((string) $seq, 5, '0', STR_PAD_LEFT));
        }

        return (int) DB::table('departamentos')->insertGetId([
            'empresa_id' => $empresaId,
            'codigo' => $codigo,
            'nome' => $nome,
            'ativo' => true,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function syncCodigoSequence(int $empresaId, int $lastSeq): void
    {
        if (! Schema::hasTable('codigo_sequences')) {
            return;
        }

        $proximo = max(1, $lastSeq + 1);
        $row = DB::table('codigo_sequences')
            ->where('empresa_id', $empresaId)
            ->where('prefixo', 'DEP')
            ->first();

        if ($row) {
            if ((int) $row->proximo < $proximo) {
                DB::table('codigo_sequences')->where('id', $row->id)->update([
                    'proximo' => $proximo,
                    'updated_at' => now(),
                ]);
            }

            return;
        }

        DB::table('codigo_sequences')->insert([
            'empresa_id' => $empresaId,
            'prefixo' => 'DEP',
            'proximo' => $proximo,
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    private function norm(string $nome): string
    {
        return mb_strtolower(trim($nome));
    }
};
