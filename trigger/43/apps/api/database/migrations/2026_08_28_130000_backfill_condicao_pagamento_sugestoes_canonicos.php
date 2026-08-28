<?php

use App\Models\Empresa;
use App\Services\Cadastros\CondicaoPagamentoSugestaoService;
use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\Schema;

/**
 * Lista canônica de condições de pagamento em todas as EMPs existentes (idempotente).
 */
return new class extends Migration
{
    public function up(): void
    {
        if (! Schema::hasTable('condicao_pagamento_sugestoes') || ! Schema::hasTable('empresas')) {
            return;
        }

        $service = app(CondicaoPagamentoSugestaoService::class);
        Empresa::query()->orderBy('id')->each(function (Empresa $empresa) use ($service) {
            $service->ensureCanonicos($empresa);
        });
    }

    public function down(): void
    {
        // Dados operacionais — não remove sugestões já usadas.
    }
};
