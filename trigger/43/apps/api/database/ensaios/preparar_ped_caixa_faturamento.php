<?php

/**
 * Ensaio local: OP concluída, sem embalagem, para escolher a caixa e faturar.
 * A NF oficial simulada baixa EMB-CX-ENSAIO pelo custo médio e mantém o preço do pedido.
 *
 * Não mexe em OP-2026-00001 nem no saldo de outras caixas.
 */

use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\EstoqueSaldo;
use App\Models\Faturamento;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\OrdemProducao;
use App\Models\PaEmbalagem;
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

$cfin = EmpresaContaFinanceira::query()->where('empresa_id', $emp->id)->where('ativa', true)->exists();
$nat = NaturezaGerencial::query()->where('codigo', '1.01.01')->exists();
if (! $cfin || ! $nat) {
    fwrite(STDERR, 'Pré-requisito: '.(! $cfin ? 'CFIN ativa ' : '').(! $nat ? 'natureza 1.01.01' : '')."\n");
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
$pa = Produto::query()->firstOrCreate(
    ['empresa_id' => $emp->id, 'codigo' => 'PA-ETQ-ENSAIO-CX'],
    [
        'familia' => 'PA',
        'descricao_fiscal' => 'ETIQUETA ENSAIO CAIXA',
        'unidade_comercial' => 'UN',
        'unidade_interna' => 'UN',
        'fator_conversao' => '1',
        'situacao' => 'ATIVO',
        'controla_lote' => false,
        'custo_medio' => '0.120000',
    ]
);

$codigoPed = 'PED-2026-CXFAT';
$codigoOp = 'OP-2026-CXFAT';
$qtde = '5000.0000';
$ped = Pedido::query()->where('empresa_id', $emp->id)->where('codigo', $codigoPed)->first();
$fat = $ped
    ? Faturamento::query()->where('empresa_id', $emp->id)->where('pedido_id', $ped->id)->first()
    : null;

if ($fat !== null) {
    $saldoCx = EstoqueSaldo::query()->where('empresa_id', $emp->id)->where('produto_id', $caixa->id)->value('qtde');
    echo "PED {$codigoPed} já faturado ({$fat->codigo}). Saldo atual de {$caixa->codigo}: {$saldoCx}.\n";
    echo "URL /faturamentos/{$fat->id}\n";
    echo "Para repetir o ensaio, use outro pedido — este não foi desfeito.\n";
    exit(0);
}

foreach ([$caixa, $pa] as $produto) {
    $saldoAlvo = $produto->id === $caixa->id ? '12.0000' : $qtde;
    $custo = $produto->id === $caixa->id ? '2.500000' : '0.120000';
    $saldo = EstoqueSaldo::query()->firstOrNew([
        'empresa_id' => $emp->id,
        'produto_id' => $produto->id,
    ]);
    $saldo->qtde = $saldoAlvo;
    $saldo->unidade = 'UN';
    $saldo->custo_medio = $custo;
    $saldo->save();
    $produto->custo_medio = $custo;
    $produto->situacao = 'ATIVO';
    $produto->save();
}

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
    'modelos_composicao' => [
        ['nome' => 'Frente A'],
        ['nome' => 'Verso B'],
    ],
];

if ($ped === null) {
    $orc = Orcamento::query()
        ->where('empresa_id', $emp->id)
        ->where('codigo', 'ORC-2026-CXFAT')
        ->first();
    if ($orc === null) {
    $numero = 99110;
    while (Orcamento::query()->where('empresa_id', $emp->id)->where('ano', 2026)->where('numero', $numero)->exists()) {
        $numero++;
    }
    $orc = Orcamento::query()->create([
        'empresa_id' => $emp->id,
        'ano' => 2026,
        'numero' => $numero,
        'codigo' => 'ORC-2026-CXFAT',
        'versao' => 1,
        'parceiro_id' => $par->id,
        'cliente_nome' => $par->razao_social,
        'status' => Orcamento::STATUS_APROVADO,
        'financeiro_status' => AdiantamentoService::FIN_LIBERADO,
        'cobra_matriz' => false,
        'valor_matriz' => '0.00',
        'input_snapshot' => [
            'condicao_pagamento' => '28 DDL',
            'forma_pagamento' => 'PIX',
            'modo_entrega' => 'RETIRAR',
            'etiq_por_rolo' => 1000,
            'tubete' => '3"',
        ],
        'result_snapshot' => ['faixas' => [[
            'quantidade' => 5000,
            'valor_etiqueta' => '1750.00',
            'valor_matriz' => '0.00',
            'valor_total' => '1750.00',
            'rolos' => 5,
            'qtde_caixas' => 0,
        ]]],
        'prazo_entrega_dias' => 10,
        'validade_dias' => 7,
        'tolerancia_qtd_pct' => 20,
        'observacao' => 'Ensaio: escolher a caixa antes de faturar.',
    ]);
    }
    $ped = Pedido::query()->create([
        'empresa_id' => $emp->id,
        'codigo' => $codigoPed,
        'orcamento_id' => $orc->id,
        'parceiro_id' => $par->id,
        'status' => Pedido::STATUS_PRODUZIDO,
        'faixa_index' => 0,
        'tolerancia_qtd_pct' => '20',
        'prazo_entrega_dias' => 10,
        'observacao' => 'Ensaio caixa: escolher EMB-CX-ENSAIO, faturar, conferir saldo.',
        'snapshot' => [
            'input' => [
                'condicao_pagamento' => '28 DDL',
                'forma_pagamento' => 'PIX',
                'modo_entrega' => 'RETIRAR',
                'etiq_por_rolo' => 1000,
                'tubete' => '3"',
                'saida_etiqueta' => 'ESQUERDA',
            ],
            'faixa' => [
                'quantidade' => 5000,
                'valor_etiqueta' => '1750.00',
                'valor_matriz' => '0.00',
                'valor_total' => '1750.00',
                'rolos' => 5,
                'qtde_caixas' => 0,
                'm2' => '25',
            ],
        ],
    ]);
    PedidoItem::query()->create([
        'empresa_id' => $emp->id,
        'pedido_id' => $ped->id,
        'ordem' => 1,
        'necessidade' => PedidoItem::NEC_PRODUCAO,
        'familia_fiscal' => 'PA-ETQ',
        'descricao' => '100X50 · Couchê Brilho · 4 cor(es) · Verniz UV · Q 5000',
        'qtde_pedida' => $qtde,
        'qtde_produzida' => $qtde,
        'qtde_faturavel' => $qtde,
        'unidade' => 'UN',
        'preco_unitario' => '0.350000',
        'valor_total' => '1750.00',
        'status' => PedidoItem::STATUS_PRODUZIDO,
        'produto_pa_id' => $pa->id,
        'especificacao' => array_merge($espec, [
            'faixa' => [
                'quantidade' => 5000,
                'm2' => '25',
            ],
        ]),
    ]);
}

$ped->status = Pedido::STATUS_PRODUZIDO;
$ped->save();
$item = PedidoItem::query()->where('pedido_id', $ped->id)->orderBy('ordem')->first();
if ($item === null) {
    fwrite(STDERR, "PED sem item\n");
    exit(1);
}
$item->produto_pa_id = $pa->id;
$item->qtde_faturavel = $qtde;
$item->qtde_produzida = $qtde;
$item->status = PedidoItem::STATUS_PRODUZIDO;
$item->preco_unitario = '0.350000';
$item->valor_total = '1750.00';
$item->especificacao = $espec;
$item->save();

$op = OrdemProducao::query()->where('empresa_id', $emp->id)->where('codigo', $codigoOp)->first();
if ($op === null) {
    $op = OrdemProducao::query()->create([
        'empresa_id' => $emp->id,
        'codigo' => $codigoOp,
        'pedido_id' => $ped->id,
        'pedido_item_id' => $item->id,
        'status' => OrdemProducao::STATUS_CONCLUIDA,
        'qtde_planejada' => $qtde,
        'qtde_boa' => $qtde,
        'qtde_refugo' => '0.0000',
        'concluida_em' => now(),
    ]);
} else {
    $op->status = OrdemProducao::STATUS_CONCLUIDA;
    $op->pedido_id = $ped->id;
    $op->pedido_item_id = $item->id;
    $op->qtde_boa = $qtde;
    $op->concluida_em = $op->concluida_em ?? now();
    $op->save();
}

$embs = PaEmbalagem::query()
    ->where('empresa_id', $emp->id)
    ->where('ordem_producao_id', $op->id)
    ->get();
foreach ($embs as $emb) {
    $emb->bobinas()->delete();
    $emb->caixas()->delete();
    $emb->delete();
}

echo "PED {$ped->codigo} id={$ped->id} status={$ped->status}\n";
echo "URL /pedidos/{$ped->id}\n";
echo "OP {$op->codigo} id={$op->id}\n";
echo "URL /ordens-producao/{$op->id}\n";
echo "Caixa {$caixa->codigo} saldo=12 custo_medio=2.50 preco_tabela=99\n";
echo "Valor oficial do pedido=1750.00\n";
echo "OP-2026-00001 intocada\n";
