<?php

/**
 * Ensaio local: PED com 3 modelos (qtde desigual) para testar Ficha planilha.
 * Matriz/faca/comissão/frete/desconto/artes — só apresentação; não inventa saldo.
 */

use App\Models\Empresa;
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

$par = Parceiro::query()
    ->where('empresa_id', $emp->id)
    ->where('papel_cliente', true)
    ->where('situacao', 'ATIVO')
    ->orderBy('id')
    ->first();
if ($par === null) {
    fwrite(STDERR, "Parceiro cliente ausente nesta empresa.\n");
    exit(1);
}

$codigoPed = 'PED-2026-PLAN01';
$qtde = '10000.0000';
$valorEtiqueta = '3500.00';
$valorMatriz = '340.00';
$valorFaca = '180.00';
$comissao = '175.00';
$valorArtes = '150.00'; // 80 + 50 + 20
$valorComercial = '4170.00'; // etiqueta + matriz + faca + artes
$desconto = '50.00';
$frete = '120.00';

$modelos = [
    ['ordem' => 1, 'nome' => 'Maçã verde', 'percentual' => 50, 'valor_arte' => 80, 'tintas' => ['Pantone 7488 C']],
    ['ordem' => 2, 'nome' => 'Abacate', 'percentual' => 30, 'valor_arte' => 50, 'tintas' => ['Verde']],
    ['ordem' => 3, 'nome' => 'Limão', 'percentual' => 20, 'valor_arte' => 20, 'tintas' => ['Amarelo']],
];
// 5000 + 3000 + 2000 = 10000
$qs = [5000, 3000, 2000];

$faixa = [
    'quantidade' => 10000,
    'valor_etiqueta' => $valorEtiqueta,
    'valor_matriz' => $valorMatriz,
    'valor_faca_nova' => $valorFaca,
    'valor_total' => $valorComercial,
    'comissao' => $comissao,
    'rolos' => 10,
    'etiq_por_rolo' => 1000,
    'metragem' => 500,
    'm2' => '50',
];

$input = [
    'condicao_pagamento' => '28 DDL',
    'forma_pagamento' => 'PIX',
    'modo_entrega' => 'CIF',
    'valor_frete' => $frete,
    'valor_desconto' => $desconto,
    'etiq_por_rolo' => 1000,
    'tubete' => '3"',
    'saida_etiqueta' => 'ESQUERDA',
    'modelos' => 3,
    'modelos_composicao' => $modelos,
];

$espec = [
    'medida' => '100X50',
    'largura_cm' => 10,
    'puxada_cm' => 5,
    'papel' => 'Couchê Brilho',
    'cores' => 4,
    'acabamento' => 'Verniz UV',
    'tubete' => '3"',
    'etiq_por_rolo' => 1000,
    'saida_etiqueta' => 'ESQUERDA',
    'faca_nova' => true,
    'valor_faca_nova' => $valorFaca,
    'modelos' => 3,
    'modelos_composicao' => $modelos,
    'modelos_composicao_quantidades' => [$qs],
    'faixa' => $faixa,
    'faixa_index' => 0,
];

$codigoOrc = 'ORC-2026-PLAN01';
$ped = Pedido::query()->where('empresa_id', $emp->id)->where('codigo', $codigoPed)->first();

if ($ped === null) {
    $orc = Orcamento::query()
        ->where('empresa_id', $emp->id)
        ->where('codigo', $codigoOrc)
        ->first();
    if ($orc === null) {
        $numero = 99120;
        while (Orcamento::query()->where('empresa_id', $emp->id)->where('ano', 2026)->where('numero', $numero)->exists()) {
            $numero++;
        }
        $orc = Orcamento::query()->create([
            'empresa_id' => $emp->id,
            'ano' => 2026,
            'numero' => $numero,
            'codigo' => $codigoOrc,
            'versao' => 1,
            'parceiro_id' => $par->id,
            'cliente_nome' => $par->razao_social,
            'status' => Orcamento::STATUS_APROVADO,
            'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
            'cobra_matriz' => true,
            'valor_matriz' => $valorMatriz,
            'input_snapshot' => $input,
            'result_snapshot' => [
                'faixas' => [$faixa],
                'valor_artes' => $valorArtes,
                'valor_faca_nova' => $valorFaca,
            ],
            'prazo_entrega_dias' => 10,
            'validade_dias' => 7,
            'tolerancia_qtd_pct' => 20,
            'observacao' => 'Ensaio Ficha planilha — 3 modelos.',
        ]);
    } else {
        $orc->parceiro_id = $par->id;
        $orc->cliente_nome = $par->razao_social;
        $orc->status = Orcamento::STATUS_APROVADO;
        $orc->financeiro_status = AdiantamentoService::FIN_LIBERADO;
        $orc->cobra_matriz = true;
        $orc->valor_matriz = $valorMatriz;
        $orc->input_snapshot = $input;
        $orc->result_snapshot = [
            'faixas' => [$faixa],
            'valor_artes' => $valorArtes,
            'valor_faca_nova' => $valorFaca,
        ];
        $orc->observacao = 'Ensaio Ficha planilha — 3 modelos.';
        $orc->save();
    }

    $ped = Pedido::query()->create([
        'empresa_id' => $emp->id,
        'codigo' => $codigoPed,
        'orcamento_id' => $orc->id,
        'parceiro_id' => $par->id,
        'status' => Pedido::STATUS_LIBERADO,
        'faixa_index' => 0,
        'tolerancia_qtd_pct' => '20',
        'prazo_entrega_dias' => 10,
        'observacao' => 'Ensaio Ficha planilha — conferir qtde/comissão por modelo.',
        'snapshot' => [
            'input' => $input,
            'faixa' => $faixa,
            'orcamento_codigo' => $codigoOrc,
            'orcamento_versao' => 1,
        ],
    ]);

    PedidoItem::query()->create([
        'empresa_id' => $emp->id,
        'pedido_id' => $ped->id,
        'ordem' => 1,
        'necessidade' => PedidoItem::NEC_PRODUCAO,
        'familia_fiscal' => 'PA-ETQ',
        'descricao' => '100X50 · Couchê Brilho · 3 modelos · Q 10000',
        'qtde_pedida' => $qtde,
        'qtde_produzida' => '0.0000',
        'qtde_faturavel' => '0.0000',
        'unidade' => 'MIL',
        'preco_unitario' => '0.350000',
        'valor_total' => $valorComercial,
        'status' => PedidoItem::STATUS_PENDENTE,
        'especificacao' => $espec,
    ]);
} else {
    $ped->status = Pedido::STATUS_LIBERADO;
    $ped->parceiro_id = $par->id;
    $ped->observacao = 'Ensaio Ficha planilha — conferir qtde/comissão por modelo.';
    $ped->snapshot = [
        'input' => $input,
        'faixa' => $faixa,
        'orcamento_codigo' => $codigoOrc,
        'orcamento_versao' => 1,
    ];
    $ped->save();

    $orc = Orcamento::query()->find($ped->orcamento_id)
        ?? Orcamento::query()->where('empresa_id', $emp->id)->where('codigo', $codigoOrc)->first();
    if ($orc !== null) {
        $orc->input_snapshot = $input;
        $orc->result_snapshot = [
            'faixas' => [$faixa],
            'valor_artes' => $valorArtes,
            'valor_faca_nova' => $valorFaca,
        ];
        $orc->valor_matriz = $valorMatriz;
        $orc->observacao = 'Ensaio Ficha planilha — 3 modelos.';
        $orc->save();
        if ((int) $ped->orcamento_id !== (int) $orc->id) {
            $ped->orcamento_id = $orc->id;
            $ped->save();
        }
    }

    $item = PedidoItem::query()->where('pedido_id', $ped->id)->orderBy('ordem')->first();
    if ($item === null) {
        fwrite(STDERR, "PED sem item\n");
        exit(1);
    }
    $item->qtde_pedida = $qtde;
    $item->preco_unitario = '0.350000';
    $item->valor_total = $valorComercial;
    $item->especificacao = $espec;
    $item->status = PedidoItem::STATUS_PENDENTE;
    $item->save();
}

echo 'PED '.$ped->codigo.' id='.$ped->id." status={$ped->status}\n";
echo 'URL /pedidos/'.$ped->id."\n";
echo 'Ficha planilha /pedidos/'.$ped->id."/ficha-planilha\n";
echo "Modelos: Maçã 5000 · Abacate 3000 · Limão 2000\n";
echo "Etiquetas={$valorEtiqueta} matriz={$valorMatriz} faca={$valorFaca} artes={$valorArtes} comercial={$valorComercial}\n";
echo "Comissão={$comissao} frete={$frete} desconto={$desconto}\n";
