<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('parceiro_contatos', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parceiro_id')->constrained('parceiros')->cascadeOnDelete();
            $table->string('nome');
            $table->string('funcao')->nullable();
            $table->string('telefone', 32)->nullable();
            $table->string('whatsapp', 32)->nullable();
            $table->string('email')->nullable();
            $table->boolean('principal')->default(false);
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();

            $table->index(['parceiro_id', 'principal']);
        });

        Schema::create('parceiro_contas_bancarias', function (Blueprint $table) {
            $table->id();
            $table->foreignId('parceiro_id')->constrained('parceiros')->cascadeOnDelete();
            $table->string('banco_codigo', 8)->nullable();
            $table->string('banco_nome')->nullable();
            $table->string('agencia', 16)->nullable();
            $table->string('conta', 32)->nullable();
            $table->string('pix_chave')->nullable();
            $table->string('tipo_conta', 16)->nullable(); // CORRENTE|POUPANCA|PAGAMENTO
            $table->boolean('principal')->default(false);
            $table->unsignedSmallInteger('ordem')->default(0);
            $table->timestamps();

            $table->index(['parceiro_id', 'principal']);
        });

        $this->migrateLegacyData();
    }

    public function down(): void
    {
        Schema::dropIfExists('parceiro_contas_bancarias');
        Schema::dropIfExists('parceiro_contatos');
    }

    private function migrateLegacyData(): void
    {
        $parceiros = DB::table('parceiros')->select([
            'id',
            'contato_nome',
            'contato_funcao',
            'telefone',
            'whatsapp',
            'email',
            'banco_codigo',
            'banco_nome',
            'agencia',
            'conta',
            'pix_chave',
            'created_at',
            'updated_at',
        ])->get();

        $now = now();

        foreach ($parceiros as $p) {
            $hasContato = filled($p->contato_nome)
                || filled($p->contato_funcao)
                || filled($p->telefone)
                || filled($p->whatsapp)
                || filled($p->email);

            if ($hasContato) {
                DB::table('parceiro_contatos')->insert([
                    'parceiro_id' => $p->id,
                    'nome' => filled($p->contato_nome) ? $p->contato_nome : 'Contato principal',
                    'funcao' => $p->contato_funcao,
                    'telefone' => $p->telefone,
                    'whatsapp' => $p->whatsapp,
                    'email' => $p->email,
                    'principal' => true,
                    'ordem' => 0,
                    'created_at' => $p->created_at ?? $now,
                    'updated_at' => $p->updated_at ?? $now,
                ]);
            }

            $hasBanco = filled($p->banco_codigo)
                || filled($p->banco_nome)
                || filled($p->agencia)
                || filled($p->conta)
                || filled($p->pix_chave);

            if ($hasBanco) {
                DB::table('parceiro_contas_bancarias')->insert([
                    'parceiro_id' => $p->id,
                    'banco_codigo' => $p->banco_codigo,
                    'banco_nome' => $p->banco_nome,
                    'agencia' => $p->agencia,
                    'conta' => $p->conta,
                    'pix_chave' => $p->pix_chave,
                    'tipo_conta' => null,
                    'principal' => true,
                    'ordem' => 0,
                    'created_at' => $p->created_at ?? $now,
                    'updated_at' => $p->updated_at ?? $now,
                ]);
            }
        }
    }
};
