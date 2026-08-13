<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Destinatário oficial do aceite (estudo 32 §1.4 / §3.4):
 * envio só para contato do cadastro autorizado a aprovar.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parceiro_contatos', function (Blueprint $table) {
            $table->boolean('autorizado_aprovar')->default(false)->after('principal');
        });

        // Contato principal já cadastrado = autorizado (sem surpresa operacional).
        DB::table('parceiro_contatos')->where('principal', true)->update(['autorizado_aprovar' => true]);

        Schema::table('orcamento_links_aprovacao', function (Blueprint $table) {
            $table->foreignId('parceiro_contato_id')
                ->nullable()
                ->after('orcamento_id')
                ->constrained('parceiro_contatos')
                ->nullOnDelete();
            $table->string('destino_nome', 160)->nullable()->after('destino_envio');
            $table->string('destino_funcao', 120)->nullable()->after('destino_nome');
        });
    }

    public function down(): void
    {
        Schema::table('orcamento_links_aprovacao', function (Blueprint $table) {
            $table->dropConstrainedForeignId('parceiro_contato_id');
            $table->dropColumn(['destino_nome', 'destino_funcao']);
        });

        Schema::table('parceiro_contatos', function (Blueprint $table) {
            $table->dropColumn('autorizado_aprovar');
        });
    }
};
