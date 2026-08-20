<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Alinha NUMERIC(p,s) ao PADRAO_DECIMAL_CALCULOS (DOC-13 / trigger/32).
 *
 *  - fator_conversao .... NUMERIC(19,10)
 *  - preco_tabela ....... NUMERIC(19,6)
 *  - custo_medio ........ NUMERIC(19,6)
 *  - comissao_percentual  NUMERIC(7,4)
 *
 * MySQL: ALTER MODIFY. SQLite (testes): create migration já traz escalas corretas;
 * precisão DECIMAL é irrelevante no SQLite — skip.
 */
return new class extends Migration
{
    public function up(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE produtos MODIFY fator_conversao DECIMAL(19,10) NOT NULL DEFAULT 1');
        DB::statement('ALTER TABLE produtos MODIFY preco_tabela DECIMAL(19,6) NULL');
        DB::statement('ALTER TABLE produtos MODIFY custo_medio DECIMAL(19,6) NOT NULL DEFAULT 0');
        DB::statement('ALTER TABLE parceiros MODIFY comissao_percentual DECIMAL(7,4) NULL');
    }

    public function down(): void
    {
        if (Schema::getConnection()->getDriverName() === 'sqlite') {
            return;
        }

        DB::statement('ALTER TABLE produtos MODIFY fator_conversao DECIMAL(18,6) NOT NULL DEFAULT 1');
        DB::statement('ALTER TABLE produtos MODIFY preco_tabela DECIMAL(15,4) NULL');
        DB::statement('ALTER TABLE produtos MODIFY custo_medio DECIMAL(15,6) NOT NULL DEFAULT 0');
        DB::statement('ALTER TABLE parceiros MODIFY comissao_percentual DECIMAL(5,2) NULL');
    }
};
