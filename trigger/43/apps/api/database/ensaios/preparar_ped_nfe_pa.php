<?php

/**
 * Ensaio local: PED PRODUZIDO com matriz para testar NF-e = PA (BL-112).
 * Não mexe em OP-2026-00001 nem inventa saldo.
 */

use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\Faturamento;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Services\Financeiro\AdiantamentoService;

$emp = Empresa::query()->where('codigo', 'EMP-00001')->first();
if ($emp === null) {
    fwrite(STDERR, "EMP-00001 ausente\n");
    exit(1);
}

$cfin = EmpresaContaFinanceira::query()->where('empresa_id', $emp->id)->where('ativa', true)->exists();
$nat = NaturezaGerencial::query()->where('codigo', '1.01.01')->exists();
if (! $cfin || ! $nat) {
    fwrite(STDERR, 'Pré-requisito: '.(! $cfin ? 'CFIN ativa ' : '').(! $nat ? 'natureza 1.01.01' : '')."\n");
    exit(1);
}

$par = Parceiro::query()
    ->where('empresa_id', $emp->id)
    ->where('papel_cliente', true)
    ->where('situacao', 'ATIVO')
    ->orderBy('id')
    ->first();
if ($par === null) {
    fwrite(STDERR, "Sem parceiro cliente ativo\n");
    exit(1);
}

$ped = Pedido::query()->where('empresa_id', $emp->id)->where('codigo', 'PED-2026-NFPA01')->first();
if ($ped === null) {
    $numero = 99001;
    while (Orcamento::query()->where('empresa_id', $emp->id)->where('ano', 2026)->where('numero', $numero)->exists()) {
        $numero++;
    }

    $orc = Orcamento::query()->create([
        'empresa_id' => $emp->id,
        'ano' => 2026,
        'numero' => $numero,
        'codigo' => 'ORC-2026-NFPA01',
        'versao' => 1,
        'parceiro_id' => $par->id,
        'cliente_nome' => $par->razao_social,
        'status' => Orcamento::STATUS_APROVADO,
        'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
        'cobra_matriz' => true,
        'valor_matriz' => '340.00',
        'input_snapshot' => [
            'condicao_pagamento' => '28 DDL',
            'forma_pagamento' => 'PIX',
            'modo_entrega' => 'RETIRAR',
        ],
        'result_snapshot' => ['faixas' => [[
            'quantidade' => 10000,
            'valor_etiqueta' => '3500.00',
            'valor_matriz' => '340.00',
            'valor_total' => '3840.00',
        ]]],
        'prazo_entrega_dias' => 10,
        'validade_dias' => 7,
        'tolerancia_qtd_pct' => 20,
        'observacao' => 'Ensaio BL-112 — NF-e só PA; setup no unitário.',
    ]);

    $ped = Pedido::query()->create([
        'empresa_id' => $emp->id,
        'codigo' => 'PED-2026-NFPA01',
        'orcamento_id' => $orc->id,
        'parceiro_id' => $par->id,
        'status' => Pedido::STATUS_PRODUZIDO,
        'faixa_index' => 0,
        'tolerancia_qtd_pct' => '20',
        'prazo_entrega_dias' => 10,
        'observacao' => 'Ensaio BL-112 — faturar e abrir DANFE.',
        'snapshot' => [
            'input' => [
                'condicao_pagamento' => '28 DDL',
                'forma_pagamento' => 'PIX',
                'modo_entrega' => 'RETIRAR',
            ],
            'faixa' => [
                'quantidade' => 10000,
                'valor_etiqueta' => '3500.00',
                'valor_matriz' => '340.00',
                'valor_total' => '3840.00',
            ],
        ],
    ]);

    PedidoItem::query()->create([
        'empresa_id' => $emp->id,
        'pedido_id' => $ped->id,
        'ordem' => 1,
        'necessidade' => PedidoItem::NEC_PRODUCAO,
        'familia_fiscal' => 'PA-ETQ',
        'descricao' => 'Etiqueta promocional (ensaio NF-e PA)',
        'qtde_pedida' => '10000.0000',
        'qtde_produzida' => '10000.0000',
        'qtde_faturavel' => '10000.0000',
        'unidade' => 'MIL',
        'preco_unitario' => '0.350000',
        'valor_total' => '3500.00',
        'status' => PedidoItem::STATUS_PRODUZIDO,
    ]);
}

$fat = Faturamento::query()->where('empresa_id', $emp->id)->where('pedido_id', $ped->id)->first();

echo 'PED '.$ped->codigo.' '.$ped->status.' id='.$ped->id."\n";
echo 'URL /pedidos/'.$ped->id."\n";
if ($fat) {
    echo 'FAT '.$fat->codigo.' id='.$fat->id."\n";
    echo 'URL /financeiro/faturamentos/'.$fat->id."\n";
} else {
    echo "FAT pendente — faturar no PED (matriz 340 + etiquetas 3500 = 3840)\n";
}
echo "OP-2026-00001 intocada\n";
