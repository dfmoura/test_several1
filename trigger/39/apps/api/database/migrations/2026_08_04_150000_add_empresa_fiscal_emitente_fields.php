<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Campos fiscais do emitente (EMP) alinhados ao estudo trigger/32:
 * IE + status SINTEGRA, IEST, regime_desde (virada Simples→Lucro Real),
 * CNAEs secundários e histórico de vigência — pré-requisitos da NF-e.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('empresas', function (Blueprint $table) {
            $table->string('ie_status', 24)->default('NAO_VERIFICADA')->after('ie');
            $table->timestamp('ie_consultado_em')->nullable()->after('ie_status');
            $table->string('iest', 32)->nullable()->after('im');
            $table->date('regime_desde')->nullable()->after('crt');
            $table->boolean('cadastro_fiscal_completo')->default(false)->after('situacao');
            $table->json('cnaes_secundarios')->nullable()->after('cnae');
        });

        Schema::create('empresa_fiscal_historicos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('empresa_id')->constrained('empresas')->cascadeOnDelete();
            $table->date('vigencia_inicio');
            $table->date('vigencia_fim')->nullable();
            $table->string('ie', 32)->nullable();
            $table->string('im', 32)->nullable();
            $table->string('iest', 32)->nullable();
            $table->string('ie_status', 24)->nullable();
            $table->string('regime', 32)->nullable();
            $table->unsignedTinyInteger('crt')->nullable();
            $table->string('motivo', 255)->nullable();
            $table->foreignId('alterado_por')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();

            $table->index(['empresa_id', 'vigencia_inicio']);
            $table->index(['empresa_id', 'vigencia_fim']);
        });

        $hoje = now()->toDateString();
        $rows = DB::table('empresas')->select([
            'id', 'ie', 'im', 'iest', 'ie_status', 'regime', 'crt', 'cnpj',
            'razao_social', 'cnae', 'logradouro', 'numero', 'bairro', 'municipio',
            'uf', 'cep', 'ibge', 'situacao', 'venda_ativa',
        ])->get();

        foreach ($rows as $row) {
            $ieStatus = ($row->cnpj === '01423183000110' && ($row->ie ?? '') !== '')
                ? 'OK'
                : 'NAO_VERIFICADA';

            $completo = $this->isCompletoEmitente((array) $row, $ieStatus);

            DB::table('empresas')->where('id', $row->id)->update([
                'ie_status' => $ieStatus,
                'ie_consultado_em' => $ieStatus === 'OK' ? now() : null,
                'regime_desde' => $hoje,
                'cadastro_fiscal_completo' => $completo,
            ]);

            DB::table('empresa_fiscal_historicos')->insert([
                'empresa_id' => $row->id,
                'vigencia_inicio' => $hoje,
                'vigencia_fim' => null,
                'ie' => $row->ie,
                'im' => $row->im,
                'iest' => null,
                'ie_status' => $ieStatus,
                'regime' => $row->regime,
                'crt' => $row->crt,
                'motivo' => 'Carga inicial da vigência fiscal do emitente',
                'alterado_por' => null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('empresa_fiscal_historicos');

        Schema::table('empresas', function (Blueprint $table) {
            $table->dropColumn([
                'ie_status',
                'ie_consultado_em',
                'iest',
                'regime_desde',
                'cadastro_fiscal_completo',
                'cnaes_secundarios',
            ]);
        });
    }

    /**
     * @param  array<string, mixed>  $row
     */
    private function isCompletoEmitente(array $row, string $ieStatus): bool
    {
        $cnpj = preg_replace('/\D/', '', (string) ($row['cnpj'] ?? '')) ?? '';
        $ie = trim((string) ($row['ie'] ?? ''));
        $ibge = preg_replace('/\D/', '', (string) ($row['ibge'] ?? '')) ?? '';
        $cep = preg_replace('/\D/', '', (string) ($row['cep'] ?? '')) ?? '';

        return strlen($cnpj) === 14
            && trim((string) ($row['razao_social'] ?? '')) !== ''
            && $ie !== ''
            && preg_match('/\d/', $ie)
            && (int) ($row['crt'] ?? 0) >= 1
            && trim((string) ($row['regime'] ?? '')) !== ''
            && trim((string) ($row['cnae'] ?? '')) !== ''
            && trim((string) ($row['logradouro'] ?? '')) !== ''
            && trim((string) ($row['numero'] ?? '')) !== ''
            && trim((string) ($row['bairro'] ?? '')) !== ''
            && trim((string) ($row['municipio'] ?? '')) !== ''
            && strlen((string) ($row['uf'] ?? '')) === 2
            && strlen($cep) === 8
            && strlen($ibge) === 7;
    }
};
