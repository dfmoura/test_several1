<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Referência externa do comprador (PO / OC do cliente) no PED de venda.
 * Não confundir com OrdemCompra (OC- de compras a fornecedor).
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->string('pedido_cliente', 60)
                ->nullable()
                ->after('observacao');
            $table->index(['empresa_id', 'pedido_cliente']);
        });
    }

    public function down(): void
    {
        Schema::table('pedidos', function (Blueprint $table) {
            $table->dropIndex(['empresa_id', 'pedido_cliente']);
            $table->dropColumn('pedido_cliente');
        });
    }
};
