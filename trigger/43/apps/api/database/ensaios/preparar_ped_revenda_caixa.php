<?php

/**
 * Ensaio local: revenda em A separar, sem caixa, para escolher o SKU e a quantidade antes de faturar.
 * Não desfaz pedido já faturado. Não mexe em PED-2026-CXFAT.
 */

use App\Models\Empresa;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueLote;
use App\Models\EstoqueSaldo;
use App\Models\Faturamento;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Services\Cadastros\ParceiroFiscalRules;
use App\Services\Financeiro\AdiantamentoService;

$emp = Empresa::query()->where('codigo', 'EMP-00001')->first();
if ($emp === null) {
    fwrite(STDERR, "EMP-00001 ausente\n");
    exit(1);
}

$par = null;
foreach (Parceiro::query()->where('empresa_id', $emp->id)->where('papel_cliente', true)->where('situacao', 'ATIVO')->orderBy('id')->get() as $cand) {
    $eval = ParceiroFiscalRules::evaluate($cand->attributesToFiscalArray());
    if (! empty($eval['apto_emissao_nfe'])) {
        $par = $cand;
        break;
    }
}
if ($par === null) {
    fwrite(STDERR, "Parceiro apto para NF-e ausente nesta empresa.\n");
    exit(1);
}

$caixa = Produto::query()->firstOrCreate(
    ['empresa_id' => $emp->id, 'codigo' => 'EMB-CX-ENSAIO'],
    [
        'familia' => 'EMB',
        'descricao_fiscal' => 'CAIXA PAPELAO ENSAIO 400X300X200',
        'descricao_comercial' => 'Caixa ensaio 400x300x200',
        'unidade_comercial' => 'UN',
        'unidade_interna' => 'UN',
        'fator_conversao' => '1',
        'situacao' => 'ATIVO',
        'controla_lote' => false,
        'preco_tabela' => '99.000000',
        'custo_medio' => '2.500000',
        'atributos' => ['comp_mm' => '400', 'larg_mm' => '300', 'alt_mm' => '200'],
    ]
);
$caixa->familia = 'EMB';
$caixa->situacao = 'ATIVO';
$caixa->save();

$saldoCx = EstoqueSaldo::query()->firstOrNew([
    'empresa_id' => $emp->id,
    'produto_id' => $caixa->id,
]);
if (bccomp((string) ($saldoCx->qtde ?? '0'), '1', 4) < 0) {
    $saldoCx->qtde = '12.0000';
}
$saldoCx->unidade = 'UN';
$saldoCx->custo_medio = $saldoCx->custo_medio ?: '2.500000';
$saldoCx->save();

$rev = Produto::query()->firstOrCreate(
    ['empresa_id' => $emp->id, 'codigo' => 'REV-ENSAIO-CX'],
    [
        'familia' => 'REV',
        'descricao_fiscal' => 'RIBBON ENSAIO CAIXA',
        'descricao_comercial' => 'Ribbon ensaio caixa',
        'unidade_comercial' => 'UN',
        'unidade_interna' => 'UN',
        'fator_conversao' => '1',
        'situacao' => 'ATIVO',
        'controla_lote' => true,
        'preco_tabela' => '37.500000',
        'custo_medio' => '12.000000',
    ]
);
$rev->familia = 'REV';
$rev->situacao = 'ATIVO';
$rev->controla_lote = true;
$rev->save();

$saldoRev = EstoqueSaldo::query()->firstOrNew([
    'empresa_id' => $emp->id,
    'produto_id' => $rev->id,
]);
$saldoRev->qtde = '8.0000';
$saldoRev->unidade = 'UN';
$saldoRev->custo_medio = '12.000000';
$saldoRev->save();

$end = EstoqueEndereco::query()
    ->where('empresa_id', $emp->id)
    ->where('ativo', true)
    ->orderBy('id')
    ->first();
if ($end === null) {
    $end = EstoqueEndereco::query()->create([
        'empresa_id' => $emp->id,
        'codigo' => 'L-ENSAIO-REV',
        'nome' => 'Ensaio revenda',
        'largura_m' => EstoqueEndereco::LARGURA_M,
        'profundidade_m' => EstoqueEndereco::PROFUNDIDADE_M,
        'altura_m' => EstoqueEndereco::ALTURA_M,
        'ativo' => true,
    ]);
}

$lote = EstoqueLote::query()->firstOrNew([
    'empresa_id' => $emp->id,
    'codigo' => 'VOL-REV-CX',
]);
$lote->produto_id = $rev->id;
$lote->qtde = '8.0000';
$lote->unidade = 'UN';
$lote->data_entrada = $lote->data_entrada ?? '2026-10-19';
$lote->origem_tipo = $lote->origem_tipo ?: EstoqueLote::ORIGEM_VIRADA;
$lote->endereco_id = $end->id;
$lote->save();

$codigoPed = 'PED-2026-REVCX';
$ped = Pedido::query()->where('empresa_id', $emp->id)->where('codigo', $codigoPed)->first();
$fat = $ped
    ? Faturamento::query()->where('empresa_id', $emp->id)->where('pedido_id', $ped->id)->where('status', Faturamento::STATUS_CONFIRMADO)->first()
    : null;
if ($fat !== null) {
    echo "PED {$codigoPed} já faturado ({$fat->codigo}). Não foi desfeito.\n";
    echo "URL /pedidos/{$ped->id}\n";
    echo "URL /faturamentos/{$fat->id}\n";
    exit(0);
}

// Snapshot comercial completo — Duplicar / create exigem SKU + faixas (ADR_ORC_ITEM_REVENDA).
$orcInput = [
    'necessidade' => PedidoItem::NEC_REVENDA,
    'produto_id' => $rev->id,
    'produto_codigo' => $rev->codigo,
    'produto_descricao' => 'Ribbon ensaio caixa',
    'descricao_comercial' => 'Ribbon ensaio caixa',
    'unidade' => 'UN',
    'faixas' => [
        ['quantidade' => 4, 'valor_unitario' => 37.5, 'comissao_pct' => 0],
    ],
    'condicao_pagamento' => '28 DDL',
    'forma_pagamento' => 'PIX',
    'modo_entrega' => 'RETIRAR',
];
$orcResult = [
    'necessidade' => PedidoItem::NEC_REVENDA,
    'faixas' => [
        [
            'quantidade' => 4,
            'valor_unitario' => 37.5,
            'valor_total' => 150.0,
            'comissao_pct' => 0,
        ],
    ],
    'chave_matriz' => null,
    'cobra_matriz' => false,
    'valor_matriz' => 0,
];

if ($ped === null) {
    $numero = 99120;
    while (Orcamento::query()->where('empresa_id', $emp->id)->where('ano', 2026)->where('numero', $numero)->exists()) {
        $numero++;
    }
    $orc = Orcamento::query()->create([
        'empresa_id' => $emp->id,
        'ano' => 2026,
        'numero' => $numero,
        'codigo' => 'ORC-2026-REVCX',
        'versao' => 1,
        'parceiro_id' => $par->id,
        'cliente_nome' => $par->razao_social,
        'status' => Orcamento::STATUS_APROVADO,
        'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
        'cobra_matriz' => false,
        'valor_matriz' => '0.00',
        'valor_primeira_faixa' => '150.0000',
        'input_snapshot' => $orcInput,
        'result_snapshot' => $orcResult,
        'prazo_entrega_dias' => 5,
        'validade_dias' => 7,
        'tolerancia_qtd_pct' => 0,
        'observacao' => 'Ensaio: escolher a caixa da revenda antes de faturar.',
    ]);
    $ped = Pedido::query()->create([
        'empresa_id' => $emp->id,
        'codigo' => $codigoPed,
        'orcamento_id' => $orc->id,
        'parceiro_id' => $par->id,
        'status' => Pedido::STATUS_LIBERADO,
        'faixa_index' => 0,
        'tolerancia_qtd_pct' => '0',
        'prazo_entrega_dias' => 5,
        'observacao' => 'Ensaio revenda: A separar, escolher EMB-CX-ENSAIO, depois faturar.',
        'snapshot' => [
            'input' => [
                'condicao_pagamento' => '28 DDL',
                'forma_pagamento' => 'PIX',
                'modo_entrega' => 'RETIRAR',
                'necessidade' => PedidoItem::NEC_REVENDA,
                'produto_id' => $rev->id,
            ],
        ],
    ]);
} else {
    // Reexecução: corrige stub antigo sem SKU/faixas (Duplicar 422 / UX).
    $orc = Orcamento::query()->find($ped->orcamento_id);
    if ($orc !== null) {
        $snap = is_array($orc->input_snapshot) ? $orc->input_snapshot : [];
        if (empty($snap['produto_id']) || empty($snap['faixas'])) {
            $orc->input_snapshot = array_merge($snap, $orcInput);
            $orc->result_snapshot = $orcResult;
            $orc->valor_primeira_faixa = '150.0000';
            $orc->save();
        }
    }
}

$snap = is_array($ped->snapshot) ? $ped->snapshot : [];
unset($snap['separacao_revenda'], $snap['separacoes_revenda']);
$ped->status = Pedido::STATUS_LIBERADO;
$ped->parceiro_id = $par->id;
$ped->snapshot = $snap;
$ped->save();

$item = PedidoItem::query()->where('pedido_id', $ped->id)->orderBy('ordem')->first();
if ($item === null) {
    $item = new PedidoItem([
        'empresa_id' => $emp->id,
        'pedido_id' => $ped->id,
        'ordem' => 1,
    ]);
}
$item->empresa_id = $emp->id;
$item->pedido_id = $ped->id;
$item->ordem = 1;
$item->necessidade = PedidoItem::NEC_REVENDA;
$item->familia_fiscal = 'REV';
$item->descricao = 'Ribbon ensaio caixa';
$item->qtde_pedida = '4.0000';
$item->qtde_produzida = '0.0000';
$item->qtde_faturavel = '0.0000';
$item->unidade = 'UN';
$item->preco_unitario = '37.500000';
$item->valor_total = '150.00';
$item->status = PedidoItem::STATUS_PENDENTE;
$item->produto_pa_id = $rev->id;
$item->save();

$nat = NaturezaGerencial::query()->where('codigo', '1.01.02')->exists();

echo "PED {$ped->codigo} id={$ped->id} status={$ped->status}\n";
echo "URL /pedidos/{$ped->id}\n";
echo "Item {$item->id} PENDENTE\n";
echo "URL /estoque/separacoes/{$item->id}\n";
echo "Fila /estoque/separacoes\n";
echo "Volume {$lote->codigo} local {$end->codigo} qtde=8\n";
echo "Caixa {$caixa->codigo} saldo={$saldoCx->qtde}\n";
echo $nat ? "Natureza 1.01.02 presente.\n" : "AVISO: natureza 1.01.02 ausente — o faturar da revenda pode recusar.\n";
echo "PED-2026-CXFAT intocado.\n";
