<?php

use App\Models\Empresa;
use App\Services\Comercial\Orcamento\OrcamentoCatalogoAdminService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Preço comercial de papel e acabamento passa a ser por SKU da empresa.
 * As linhas antigas (nome, sem produto) continuam para orçamento legado e coeficientes.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('orc_catalogo_papeis', function (Blueprint $table) {
            $table->foreignId('produto_id')->nullable()->after('empresa_id')->constrained('produtos')->nullOnDelete();
            $table->unique(['empresa_id', 'produto_id']);
        });
        Schema::table('orc_catalogo_acabamentos', function (Blueprint $table) {
            $table->foreignId('produto_id')->nullable()->after('empresa_id')->constrained('produtos')->nullOnDelete();
            $table->decimal('preco_cola_m2', 12, 4)->nullable()->after('preco_m2');
            $table->unique(['empresa_id', 'produto_id']);
        });

        if (in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE orc_catalogo_papeis MODIFY preco_m2 DECIMAL(12,4) NULL');
            DB::statement('ALTER TABLE orc_catalogo_acabamentos MODIFY preco_m2 DECIMAL(12,4) NULL');
        }

        $service = app(OrcamentoCatalogoAdminService::class);
        foreach (Empresa::query()->pluck('id') as $empresaId) {
            $service->garantirPapeisSku((int) $empresaId);
            $service->garantirAcabamentosSku((int) $empresaId);
        }
    }

    public function down(): void
    {
        DB::table('orc_catalogo_papeis')->whereNull('preco_m2')->update(['preco_m2' => 0]);
        DB::table('orc_catalogo_acabamentos')->whereNull('preco_m2')->update(['preco_m2' => 0]);
        if (in_array(Schema::getConnection()->getDriverName(), ['mysql', 'mariadb'], true)) {
            DB::statement('ALTER TABLE orc_catalogo_papeis MODIFY preco_m2 DECIMAL(12,4) NOT NULL');
            DB::statement('ALTER TABLE orc_catalogo_acabamentos MODIFY preco_m2 DECIMAL(12,4) NOT NULL');
        }

        Schema::table('orc_catalogo_papeis', function (Blueprint $table) {
            $table->dropUnique(['empresa_id', 'produto_id']);
            $table->dropConstrainedForeignId('produto_id');
        });
        Schema::table('orc_catalogo_acabamentos', function (Blueprint $table) {
            $table->dropUnique(['empresa_id', 'produto_id']);
            $table->dropConstrainedForeignId('produto_id');
            $table->dropColumn('preco_cola_m2');
        });
    }
};
