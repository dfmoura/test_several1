<?php

/**
 * Ensaio local: PED PRODUZIDO + OP CONCLUIDA + embalagem PA confirmada
 * para testar NF-e ROLO/ETIQUETA com infAdProd detalhado
 * (medida · material · cores · modelo · bobinas/comp) — ADR_PA_EMBALAGEM_BOBINA_CAIXA.
 *
 * Não mexe em OP-2026-00001 nem inventa saldo de estoque.
 * Usa PED-2026-EMBNF02 (ensaio fresco; EMBNF01 pode já ter FAT antiga).
 */

use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\Faturamento;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\OrdemProducao;
use App\Models\PaEmbalagem;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Services\Cadastros\ParceiroFiscalRules;
use App\Services\Financeiro\AdiantamentoService;
use App\Services\Producao\PaEmbalagemService;

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
    $par = Parceiro::query()->where('empresa_id', $emp->id)->where('codigo', 'PAR-NFHML01')->first();
}
if ($par === null) {
    fwrite(STDERR, "Parceiro apto NF-e ausente — rode preparar_ped_nfe_pa.php antes.\n");
    exit(1);
}

$codigoPed = 'PED-2026-EMBNF02';
$codigoOp = 'OP-2026-EMBNF02';
$qtde = '5000.0000';

$especItem = [
    'medida' => '100X50',
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
$descItem = '100X50 · Couchê Brilho · 4 cor(es) · Verniz UV · Q 5000';

$ped = Pedido::query()->where('empresa_id', $emp->id)->where('codigo', $codigoPed)->first();
if ($ped === null) {
    $numero = 99052;
    while (Orcamento::query()->where('empresa_id', $emp->id)->where('ano', 2026)->where('numero', $numero)->exists()) {
        $numero++;
    }

    $orc = Orcamento::query()->create([
        'empresa_id' => $emp->id,
        'ano' => 2026,
        'numero' => $numero,
        'codigo' => 'ORC-2026-EMBNF02',
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
            'medida' => '100X50',
            'papel' => 'Couchê Brilho',
            'cores' => 4,
            'acabamento' => 'Verniz UV',
            'etiq_por_rolo' => 1000,
            'tubete' => '3"',
            'saida_etiqueta' => 'ESQUERDA',
            'modelos_composicao' => $especItem['modelos_composicao'],
        ],
        'result_snapshot' => ['faixas' => [[
            'quantidade' => 5000,
            'valor_etiqueta' => '1750.00',
            'valor_matriz' => '0.00',
            'valor_total' => '1750.00',
            'rolos' => 5,
            'qtde_caixas' => 1,
            'rolos_por_caixa' => 12,
            'caixa_medida' => '500x300',
        ]]],
        'prazo_entrega_dias' => 10,
        'validade_dias' => 7,
        'tolerancia_qtd_pct' => 20,
        'observacao' => 'Ensaio embalagem PA → NF ROLO + infAdProd detalhado.',
    ]);

    $ped = Pedido::query()->create([
        'empresa_id' => $emp->id,
        'codigo' => $codigoPed,
        'orcamento_id' => $orc->id,
        'parceiro_id' => $par->id,
        'status' => Pedido::STATUS_PRODUZIDO,
        'faixa_index' => 0,
        'tolerancia_qtd_pct' => '20',
        'prazo_entrega_dias' => 10,
        'observacao' => 'Ensaio: embalar → faturar (modo ROLO) → conferir med/modelo/comp na NF.',
        'snapshot' => [
            'input' => [
                'condicao_pagamento' => '28 DDL',
                'forma_pagamento' => 'PIX',
                'modo_entrega' => 'RETIRAR',
                'medida' => '100X50',
                'papel' => 'Couchê Brilho',
                'cores' => 4,
                'acabamento' => 'Verniz UV',
                'etiq_por_rolo' => 1000,
                'tubete' => '3"',
                'saida_etiqueta' => 'ESQUERDA',
                'modelos_composicao' => $especItem['modelos_composicao'],
            ],
            'faixa' => [
                'quantidade' => 5000,
                'valor_etiqueta' => '1750.00',
                'valor_matriz' => '0.00',
                'valor_total' => '1750.00',
                'rolos' => 5,
                'qtde_caixas' => 1,
                'rolos_por_caixa' => 12,
                'caixa_medida' => '500x300',
            ],
        ],
    ]);

    PedidoItem::query()->create([
        'empresa_id' => $emp->id,
        'pedido_id' => $ped->id,
        'ordem' => 1,
        'necessidade' => PedidoItem::NEC_PRODUCAO,
        'familia_fiscal' => 'PA-ETQ',
        'descricao' => $descItem,
        'qtde_pedida' => $qtde,
        'qtde_produzida' => $qtde,
        'qtde_faturavel' => $qtde,
        'unidade' => 'UN',
        'preco_unitario' => '0.350000',
        'valor_total' => '1750.00',
        'status' => PedidoItem::STATUS_PRODUZIDO,
        'especificacao' => $especItem,
    ]);
}

$ped->load('itens');
$item = $ped->itens->first();
if ($item === null) {
    fwrite(STDERR, "PED sem item\n");
    exit(1);
}

// Garante espec rica mesmo se o PED já existia com ensaio antigo.
$item->descricao = $descItem;
$item->especificacao = $especItem;
$item->qtde_produzida = $qtde;
$item->qtde_faturavel = $qtde;
$item->status = PedidoItem::STATUS_PRODUZIDO;
$item->save();
$ped->status = Pedido::STATUS_PRODUZIDO;
$ped->save();

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
    $op->qtde_boa = $qtde;
    $op->qtde_refugo = '0.0000';
    $op->concluida_em = $op->concluida_em ?? now();
    $op->pedido_item_id = $item->id;
    $op->save();
}

$fat = Faturamento::query()->where('empresa_id', $emp->id)->where('pedido_id', $ped->id)->first();
$embSvc = app(PaEmbalagemService::class);
$emb = $embSvc->vigenteDaOp($emp, $op);

if ($fat === null && ($emb === null || $emb->status !== PaEmbalagem::STATUS_CONFIRMADA)) {
    $out = $embSvc->confirmar($emp, $op->fresh(['pedido', 'pedidoItem']), []);
    $emb = $embSvc->vigenteDaOp($emp, $op->fresh());
    echo 'EMB confirmada: '.($out['codigo'] ?? $emb?->codigo)."\n";
} elseif ($emb) {
    echo 'EMB já confirmada: '.$emb->codigo."\n";
}

$emb?->load(['bobinas', 'pedidoItem']);
$textoEtq = $embSvc->textoFiscalModo($emb, 'ETIQUETA');
$textoRolo = $embSvc->textoFiscalModo($emb, 'ROLO');
echo 'PED '.$ped->codigo.' '.$ped->status.' id='.$ped->id."\n";
echo 'URL /pedidos/'.$ped->id."\n";
echo 'OP '.$op->codigo.' '.$op->status.' boa='.$op->qtde_boa."\n";
echo 'URL /ordens-producao/'.$op->id."\n";
if ($textoRolo) {
    echo 'infAdProd ROLO: '.$textoRolo."\n";
}
if ($textoEtq) {
    echo 'infAdProd ETIQUETA: '.$textoEtq."\n";
}
if ($fat) {
    echo 'FAT '.$fat->codigo.' modo='.($fat->nfe_qtde_modo ?? '—').' — já faturado; abra a prévia/DANFE do DFS.'."\n";
    echo 'URL /faturamentos/'.$fat->id."\n";
} else {
    echo "FAT pendente — faturar no PED (default ROLO) e abrir prévia NF-e.\n";
}
echo "OP-2026-00001 intocada\n";
