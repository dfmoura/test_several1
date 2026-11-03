<?php

/**
 * Ensaio local: PED com 2 embalagens PA confirmadas + FAT, pronto para o kit
 * de etiquetas na expedição (contrato multipla → embalagens[] com id).
 *
 * Código: PED-2026-EMBKIT · OP-2026-EMBKIT-A / OP-2026-EMBKIT-B
 * Não mexe em OP-2026-00001.
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
use App\Services\Financeiro\FaturamentoService;
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

$codigoPed = 'PED-2026-EMBKIT';
$opsDef = [
    [
        'codigo' => 'OP-2026-EMBKIT-A',
        'ordem' => 1,
        'qtde' => '3000.0000',
        'valor' => '1050.00',
        'preco' => '0.350000',
        'desc' => '100X50 · item A · Q 3000',
        'espec' => [
            'medida' => '100X50',
            'papel' => 'Couchê Brilho',
            'cores' => 4,
            'tubete' => '3"',
            'etiq_por_rolo' => 1000,
            'saida_etiqueta' => 'ESQUERDA',
        ],
        'bobinas' => 3,
        'caixas' => 1,
    ],
    [
        'codigo' => 'OP-2026-EMBKIT-B',
        'ordem' => 2,
        'qtde' => '2000.0000',
        'valor' => '700.00',
        'preco' => '0.350000',
        'desc' => '80X40 · item B · Q 2000',
        'espec' => [
            'medida' => '80X40',
            'papel' => 'Couchê Fosco',
            'cores' => 1,
            'tubete' => '3"',
            'etiq_por_rolo' => 1000,
            'saida_etiqueta' => 'DIREITA',
        ],
        'bobinas' => 2,
        'caixas' => 1,
    ],
];

$ped = Pedido::query()->where('empresa_id', $emp->id)->where('codigo', $codigoPed)->first();
$fat = $ped
    ? Faturamento::query()->where('empresa_id', $emp->id)->where('pedido_id', $ped->id)->whereNull('deleted_at')->first()
    : null;

if ($ped === null) {
    $numero = 99061;
    while (Orcamento::query()->where('empresa_id', $emp->id)->where('ano', 2026)->where('numero', $numero)->exists()) {
        $numero++;
    }

    $orc = Orcamento::query()->create([
        'empresa_id' => $emp->id,
        'ano' => 2026,
        'numero' => $numero,
        'codigo' => 'ORC-2026-EMBKIT',
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
            'qtde_caixas' => 2,
            'rolos_por_caixa' => 12,
            'caixa_medida' => '500x300',
        ]]],
        'prazo_entrega_dias' => 10,
        'validade_dias' => 7,
        'tolerancia_qtd_pct' => 20,
        'observacao' => 'Ensaio kit expedição: 2 embalagens → etiquetas BOB/CX.',
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
        'observacao' => 'Ensaio: 2 OPs embaladas → faturar → kit etiquetas na expedição.',
        'snapshot' => [
            'input' => [
                'condicao_pagamento' => '28 DDL',
                'forma_pagamento' => 'PIX',
                'modo_entrega' => 'RETIRAR',
                'etiq_por_rolo' => 1000,
                'tubete' => '3"',
            ],
            'faixa' => [
                'quantidade' => 5000,
                'valor_etiqueta' => '1750.00',
                'valor_matriz' => '0.00',
                'valor_total' => '1750.00',
                'rolos' => 5,
                'qtde_caixas' => 2,
                'rolos_por_caixa' => 12,
                'caixa_medida' => '500x300',
            ],
        ],
    ]);
}

if ($fat === null && $ped->status !== Pedido::STATUS_PRODUZIDO && $ped->status !== Pedido::STATUS_FATURADO) {
    $ped->status = Pedido::STATUS_PRODUZIDO;
    $ped->save();
}

$embSvc = app(PaEmbalagemService::class);

foreach ($opsDef as $def) {
    $item = PedidoItem::query()
        ->where('empresa_id', $emp->id)
        ->where('pedido_id', $ped->id)
        ->where('ordem', $def['ordem'])
        ->first();

    if ($item === null) {
        $item = PedidoItem::query()->create([
            'empresa_id' => $emp->id,
            'pedido_id' => $ped->id,
            'ordem' => $def['ordem'],
            'necessidade' => PedidoItem::NEC_PRODUCAO,
            'familia_fiscal' => 'PA-ETQ',
            'descricao' => $def['desc'],
            'qtde_pedida' => $def['qtde'],
            'qtde_produzida' => $def['qtde'],
            'qtde_faturavel' => $def['qtde'],
            'unidade' => 'UN',
            'preco_unitario' => $def['preco'],
            'valor_total' => $def['valor'],
            'status' => PedidoItem::STATUS_PRODUZIDO,
            'especificacao' => $def['espec'],
        ]);
    } elseif ($fat === null) {
        $item->descricao = $def['desc'];
        $item->especificacao = $def['espec'];
        $item->qtde_produzida = $def['qtde'];
        $item->qtde_faturavel = $def['qtde'];
        $item->preco_unitario = $def['preco'];
        $item->valor_total = $def['valor'];
        $item->status = PedidoItem::STATUS_PRODUZIDO;
        $item->save();
    }

    $op = OrdemProducao::query()->where('empresa_id', $emp->id)->where('codigo', $def['codigo'])->first();
    if ($op === null) {
        $op = OrdemProducao::query()->create([
            'empresa_id' => $emp->id,
            'codigo' => $def['codigo'],
            'pedido_id' => $ped->id,
            'pedido_item_id' => $item->id,
            'status' => OrdemProducao::STATUS_CONCLUIDA,
            'qtde_planejada' => $def['qtde'],
            'qtde_boa' => $def['qtde'],
            'qtde_refugo' => '0.0000',
            'concluida_em' => now(),
        ]);
    } elseif ($fat === null) {
        $op->status = OrdemProducao::STATUS_CONCLUIDA;
        $op->qtde_boa = $def['qtde'];
        $op->qtde_refugo = '0.0000';
        $op->concluida_em = $op->concluida_em ?? now();
        $op->pedido_item_id = $item->id;
        $op->save();
    }

    $emb = $embSvc->vigenteDaOp($emp, $op->fresh());
    if ($emb === null || $emb->status !== PaEmbalagem::STATUS_CONFIRMADA) {
        $out = $embSvc->confirmar($emp, $op->fresh(['pedido', 'pedidoItem']), [
            'qtde_bobinas' => $def['bobinas'],
            'qtde_caixas' => $def['caixas'],
        ]);
        echo 'EMB '.$def['codigo'].': '.($out['codigo'] ?? 'ok')."\n";
    } else {
        echo 'EMB '.$def['codigo'].' já: '.$emb->codigo."\n";
    }
}

$resumo = $embSvc->resumoPedido($emp, $ped->fresh());
if (! is_array($resumo) || empty($resumo['multipla']) || count($resumo['embalagens'] ?? []) < 2) {
    fwrite(STDERR, "Falha: resumo multipla sem 2 embalagens imprimíveis\n");
    exit(1);
}
foreach ($resumo['embalagens'] as $linha) {
    if ((int) ($linha['id'] ?? 0) < 1) {
        fwrite(STDERR, "Falha: embalagem sem id no resumo\n");
        exit(1);
    }
}

$ped = $ped->fresh();
if ($fat === null && $ped->status === Pedido::STATUS_PRODUZIDO) {
    try {
        $out = app(FaturamentoService::class)->faturar($emp, $ped, []);
        $fatId = $out['id'] ?? null;
        echo 'FAT '.($out['codigo'] ?? $fatId)."\n";
        $ped = $ped->fresh();
    } catch (Throwable $e) {
        fwrite(STDERR, 'Faturar: '.$e->getMessage()."\n");
        echo "PED permanece PRODUZIDO — fature na UI e abra a expedição.\n";
    }
}

$ped = $ped->fresh();
echo 'PED '.$ped->codigo.' '.$ped->status.' id='.$ped->id."\n";
echo 'Resumo: '.$resumo['resumo']."\n";
echo 'Embalagens imprimíveis: '.implode(', ', array_map(
    static fn (array $e) => $e['codigo'].'#'.$e['id'],
    $resumo['embalagens']
))."\n";
echo 'URL /expedicao/pedido/'.$ped->id."\n";
if ($ped->status === Pedido::STATUS_FATURADO) {
    echo "Kit: 1 botão «Etiquetas da embalagem» → lote com as 2 faces (sem undefined).\n";
} else {
    echo "Fature o PED e abra a expedição para ver o kit.\n";
}
echo "OP-2026-00001 intocada\n";
