<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Local do SKU sem volume (ADR_CADASTRO_INSUMO_VOLUME, emenda 2026-10-07).
 * Nome livre no endereço; um endereco_id no saldo. Malha da bobina permanece.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('estoque_enderecos', function (Blueprint $table) {
            $table->string('nome', 80)->nullable()->after('codigo');
        });

        $this->malhaOpcional(true);

        Schema::table('estoque_saldos', function (Blueprint $table) {
            $table->foreignId('endereco_id')->nullable()->after('produto_id')
                ->constrained('estoque_enderecos')->nullOnDelete();
        });
    }

    public function down(): void
    {
        Schema::table('estoque_saldos', function (Blueprint $table) {
            $table->dropConstrainedForeignId('endereco_id');
        });

        DB::table('estoque_enderecos')->whereNull('prateleira')->update(['prateleira' => 0]);
        DB::table('estoque_enderecos')->whereNull('coluna')->update(['coluna' => 0]);
        DB::table('estoque_enderecos')->whereNull('vao')->update(['vao' => 0]);
        $this->malhaOpcional(false);

        Schema::table('estoque_enderecos', function (Blueprint $table) {
            $table->dropColumn('nome');
        });
    }

    private function malhaOpcional(bool $nulo): void
    {
        $null = $nulo ? 'NULL' : 'NOT NULL';
        $driver = Schema::getConnection()->getDriverName();

        if ($driver === 'mysql') {
            DB::statement("ALTER TABLE estoque_enderecos MODIFY prateleira TINYINT UNSIGNED {$null}");
            DB::statement("ALTER TABLE estoque_enderecos MODIFY coluna TINYINT UNSIGNED {$null}");
            DB::statement("ALTER TABLE estoque_enderecos MODIFY vao TINYINT UNSIGNED {$null}");

            return;
        }

        Schema::table('estoque_enderecos', function (Blueprint $table) use ($nulo) {
            foreach (['prateleira', 'coluna', 'vao'] as $coluna) {
                $col = $table->unsignedTinyInteger($coluna);
                if ($nulo) {
                    $col->nullable();
                }
                $col->change();
            }
        });
    }
};
