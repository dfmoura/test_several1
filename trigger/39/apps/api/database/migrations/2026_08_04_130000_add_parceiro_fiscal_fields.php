<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('parceiros', function (Blueprint $table) {
            $table->string('finalidade', 32)->nullable()->after('consumidor_final');
            $table->string('suframa', 16)->nullable()->after('im');
            $table->boolean('area_incentivada')->default(false)->after('suframa');
            $table->string('ie_status', 24)->default('NAO_VERIFICADA')->after('ind_ie_dest');
            $table->timestamp('ie_consultado_em')->nullable()->after('ie_status');
            $table->date('regime_desde')->nullable()->after('regime');
            $table->boolean('emite_documento_fiscal')->default(true)->after('cadastro_fiscal_completo');
        });

        Schema::create('parceiro_fiscal_historicos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parceiro_id')->constrained('parceiros')->cascadeOnDelete();
            $table->date('vigencia_inicio');
            $table->date('vigencia_fim')->nullable();
            $table->string('ie', 32)->nullable();
            $table->string('im', 32)->nullable();
            $table->unsignedTinyInteger('ind_ie_dest')->nullable();
            $table->string('ie_status', 24)->nullable();
            $table->string('regime', 32)->nullable();
            $table->string('finalidade', 32)->nullable();
            $table->boolean('consumidor_final')->default(false);
            $table->string('suframa', 16)->nullable();
            $table->boolean('area_incentivada')->default(false);
            $table->string('motivo', 255)->nullable();
            $table->foreignId('alterado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['parceiro_id', 'vigencia_inicio']);
            $table->index(['parceiro_id', 'vigencia_fim']);
        });

        // Snapshot inicial para parceiros já existentes (vigência aberta).
        if (Schema::hasTable('parceiros')) {
            $hoje = now()->toDateString();
            $rows = DB::table('parceiros')->select([
                'id', 'ie', 'im', 'ind_ie_dest', 'regime', 'consumidor_final',
            ])->get();

            foreach ($rows as $row) {
                DB::table('parceiro_fiscal_historicos')->insert([
                    'parceiro_id' => $row->id,
                    'vigencia_inicio' => $hoje,
                    'vigencia_fim' => null,
                    'ie' => $row->ie,
                    'im' => $row->im,
                    'ind_ie_dest' => $row->ind_ie_dest,
                    'ie_status' => 'NAO_VERIFICADA',
                    'regime' => $row->regime,
                    'finalidade' => null,
                    'consumidor_final' => (bool) $row->consumidor_final,
                    'suframa' => null,
                    'area_incentivada' => false,
                    'motivo' => 'Carga inicial da vigência fiscal',
                    'alterado_por' => null,
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('parceiro_fiscal_historicos');

        Schema::table('parceiros', function (Blueprint $table) {
            $table->dropColumn([
                'finalidade',
                'suframa',
                'area_incentivada',
                'ie_status',
                'ie_consultado_em',
                'regime_desde',
                'emite_documento_fiscal',
            ]);
        });
    }
};
