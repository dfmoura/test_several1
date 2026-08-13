<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * BL-044b — empenho leve: qtde planejada + componente na linha da OP.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->decimal('qtde_planejada', 15, 4)->default(0)->after('produto_id');
            $table->string('componente', 24)->nullable()->after('unidade'); // PAPEL|TUBETE|CAIXA|MANUAL
            $table->string('origem_texto', 120)->nullable()->after('componente'); // nome ORC casado
        });
    }

    public function down(): void
    {
        Schema::table('ordem_producao_materiais', function (Blueprint $table) {
            $table->dropColumn(['qtde_planejada', 'componente', 'origem_texto']);
        });
    }
};
