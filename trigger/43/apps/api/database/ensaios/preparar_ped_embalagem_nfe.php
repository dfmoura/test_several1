<?php

/**
 * Ensaio local: PED PRODUZIDO + OP CONCLUIDA + embalagem PA confirmada
 * para testar NF-e com bobinas em infAdProd (ADR_PA_EMBALAGEM_BOBINA_CAIXA emenda 2026-09-28).
 *
 * Não mexe em OP-2026-00001 nem inventa saldo de estoque.
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

$codigoPed = 'PED-2026-EMBNF01';
$codigoOp = 'OP-2026-EMBNF01';
$qtde = '5000.0000';

$ped = Pedido::query()->where('empresa_id', $emp->id)->where('codigo', $codigoPed)->first();
if ($ped === null) {
    $numero = 99051;
    while (Orcamento::query()->where('empresa_id', $emp->id)->where('ano', 2026)->where('numero', $numero)->exists()) {
        $numero++;
    }

    $orc = Orcamento::query()->create([
        'empresa_id' => $emp->id,
        'ano' => 2026,
        'numero' => $numero,
        'codigo' => 'ORC-2026-EMBNF01',
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
            'saida_etiqueta' => 'ESQUERDA',
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
        'observacao' => 'Ensaio embalagem PA → NF bobinas em infAdProd.',
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
        'observacao' => 'Ensaio: embalar (já confirmado) → faturar → conferir BOB/comp na NF.',
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
        'descricao' => 'Etiqueta ensaio embalagem NF (bobinas)',
        'qtde_pedida' => $qtde,
        'qtde_produzida' => $qtde,
        'qtde_faturavel' => $qtde,
        'unidade' => 'UN',
        'preco_unitario' => '0.350000',
        'valor_total' => '1750.00',
        'status' => PedidoItem::STATUS_PRODUZIDO,
        'especificacao' => [
            'tubete' => '3"',
            'etiq_por_rolo' => 1000,
        ],
    ]);
}

$ped->load('itens');
$item = $ped->itens->first();
if ($item === null) {
    fwrite(STDERR, "PED sem item\n");
    exit(1);
}

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

$texto = $embSvc->textoFiscal($emb?->load('bobinas'));
echo 'PED '.$ped->codigo.' '.$ped->status.' id='.$ped->id."\n";
echo 'URL /pedidos/'.$ped->id."\n";
echo 'OP '.$op->codigo.' '.$op->status.' boa='.$op->qtde_boa."\n";
echo 'URL /ordens-producao/'.$op->id."\n";
if ($texto) {
    echo 'infAdProd esperado: '.$texto."\n";
}
if ($fat) {
    echo 'FAT '.$fat->codigo.' — já faturado; abra a prévia/DANFE do DFS.'."\n";
    echo 'URL /faturamentos/'.$fat->id."\n";
} else {
    echo "FAT pendente — faturar no PED e abrir prévia NF-e (bobinas em obs. do item).\n";
}
echo "OP-2026-00001 intocada\n";
