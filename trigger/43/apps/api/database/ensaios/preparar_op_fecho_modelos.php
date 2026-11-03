<?php

/**
 * Ensaio local: PED + OP aberta com saída de papel e 3 modelos nomeados
 * para testar /ordens-producao/{id}/fechar (ADR_PRODUCAO_APONTAMENTO 2026-11-03).
 *
 * Idempotente em PED-2026-FECHO01 / OP-2026-FECHO01.
 * Saldo de ensaio só no MP-FLM-003 (lab) — não inventa SKU.
 */

use App\Models\Empresa;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueLote;
use App\Models\EstoqueSaldo;
use App\Models\Orcamento;
use App\Models\OrdemProducao;
use App\Models\OrdemProducaoMaterial;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Services\Financeiro\AdiantamentoService;
use App\Services\Producao\OrdemProducaoService;
use App\Support\PadraoDecimal;

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

$mp = Produto::query()
    ->where('empresa_id', $emp->id)
    ->where('codigo', 'MP-FLM-003')
    ->where('situacao', 'ATIVO')
    ->first();
if ($mp === null) {
    fwrite(STDERR, "MP-FLM-003 ausente — rode seed de produtos.\n");
    exit(1);
}

$pa = Produto::query()
    ->where('empresa_id', $emp->id)
    ->where('codigo', 'like', 'PA-ETQ%')
    ->where('situacao', 'ATIVO')
    ->orderBy('codigo')
    ->first();
if ($pa === null) {
    fwrite(STDERR, "PA-ETQ ausente.\n");
    exit(1);
}

$codigoPed = 'PED-2026-FECHO01';
$codigoOp = 'OP-2026-FECHO01';
$codigoOrc = 'ORC-2026-FECHO01';
$qtde = '10000.0000';

$modelos = [
    ['ordem' => 1, 'nome' => 'Maçã verde', 'percentual' => 50, 'valor_arte' => 0, 'tintas' => ['Verde']],
    ['ordem' => 2, 'nome' => 'Abacate', 'percentual' => 30, 'valor_arte' => 0, 'tintas' => ['Verde']],
    ['ordem' => 3, 'nome' => 'Limão', 'percentual' => 20, 'valor_arte' => 0, 'tintas' => ['Amarelo']],
];
$qs = [5000, 3000, 2000];

$faixa = [
    'quantidade' => 10000,
    'valor_etiqueta' => '3500.00',
    'valor_matriz' => '0.00',
    'valor_total' => '3500.00',
    'comissao' => '0.00',
    'rolos' => 10,
    'etiq_por_rolo' => 1000,
    'metragem' => 500,
    'm2' => '50',
];

$input = [
    'condicao_pagamento' => '28 DDL',
    'forma_pagamento' => 'PIX',
    'modo_entrega' => 'RETIRAR',
    'medida' => '100X50',
    'largura_cm' => 10,
    'puxada_cm' => 5,
    'colunas' => 2,
    'coluna_rebobinacao' => 1,
    'papel' => 'BOPP BRILHO',
    'papel_produto_id' => $mp->id,
    'papel_produto_codigo' => $mp->codigo,
    'cores' => 4,
    'acabamento' => 'SEM ACABAMENTO',
    'tubete' => '3"',
    'etiq_por_rolo' => 1000,
    'saida_etiqueta' => 'ESQUERDA',
    'modelos' => 3,
    'modelos_composicao' => $modelos,
];

$espec = [
    'medida' => '100X50',
    'largura_cm' => 10,
    'puxada_cm' => 5,
    'colunas' => 2,
    'coluna_rebobinacao' => 1,
    'papel' => 'BOPP BRILHO',
    'papel_produto_id' => $mp->id,
    'papel_produto_codigo' => $mp->codigo,
    'cores' => 4,
    'acabamento' => 'SEM ACABAMENTO',
    'tubete' => '3"',
    'etiq_por_rolo' => 1000,
    'saida_etiqueta' => 'ESQUERDA',
    'modelos' => 3,
    'modelos_composicao' => $modelos,
    'modelos_composicao_quantidades' => [$qs],
    'faixa' => $faixa,
    'faixa_index' => 0,
];

// Bobina lab (volume inteiro FEFO) + saldo agregado — suficiente para a OP.
$end = EstoqueEndereco::query()
    ->where('empresa_id', $emp->id)
    ->where('ativo', true)
    ->orderBy('id')
    ->first();
if ($end === null) {
    fwrite(STDERR, "Endereço de estoque ausente — rode erp:seed-estoque-enderecos.\n");
    exit(1);
}

$loteCodigo = 'VOL-FECHO-FLM003';
$larguraMm = '210.000';
$comprimentoM = '1000.000';
// m² = (L mm / 1000) × C m
$qtdeBobina = PadraoDecimal::roundHalfUp(
    bcmul(bcdiv($larguraMm, '1000', 8), $comprimentoM, PadraoDecimal::SCALE_QTY + 4),
    PadraoDecimal::SCALE_QTY
);

$lote = EstoqueLote::query()->firstOrNew([
    'empresa_id' => $emp->id,
    'produto_id' => $mp->id,
    'codigo' => $loteCodigo,
]);
$lote->qtde = $qtdeBobina;
$lote->unidade = $mp->unidade_interna ?? 'M2';
$lote->data_entrada = $lote->data_entrada ?? now()->toDateString();
$lote->origem_tipo = $lote->origem_tipo ?: EstoqueLote::ORIGEM_VIRADA;
$lote->largura_mm = $larguraMm;
$lote->comprimento_m = $comprimentoM;
$lote->endereco_id = $end->id;
if (! $lote->qr_token) {
    $lote->qr_token = bin2hex(random_bytes(8));
}
$lote->save();

$saldo = EstoqueSaldo::query()->firstOrNew([
    'empresa_id' => $emp->id,
    'produto_id' => $mp->id,
]);
$saldo->qtde = $qtdeBobina;
$saldo->unidade = $mp->unidade_interna ?? 'M2';
$saldo->custo_medio = $saldo->custo_medio ?: '10.000000';
$saldo->save();

$opExistente = OrdemProducao::query()
    ->where('empresa_id', $emp->id)
    ->where('codigo', $codigoOp)
    ->first();

if ($opExistente && in_array($opExistente->status, OrdemProducao::STATUSES_ABERTOS, true)) {
    $saiu = OrdemProducaoMaterial::query()
        ->where('ordem_producao_id', $opExistente->id)
        ->whereNotNull('saida_movimento_id')
        ->exists();
    if ($saiu) {
        echo 'OP '.$opExistente->codigo.' já pronta id='.$opExistente->id."\n";
        echo 'URL /ordens-producao/'.$opExistente->id."\n";
        echo 'Fechar /ordens-producao/'.$opExistente->id."/fechar\n";
        echo "Modelos: Maçã 5000 · Abacate 3000 · Limão 2000\n";

        return;
    }
}

// Se OP antiga concluída/cancelada, gera código fresco para não colidir.
if ($opExistente && ! in_array($opExistente->status, OrdemProducao::STATUSES_ABERTOS, true)) {
    $codigoOp = 'OP-2026-FECHO'.str_pad((string) random_int(10, 99), 2, '0', STR_PAD_LEFT);
}

$ped = Pedido::query()->where('empresa_id', $emp->id)->where('codigo', $codigoPed)->first();
if ($ped === null) {
    $numero = 99130;
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
        'cobra_matriz' => false,
        'valor_matriz' => '0.00',
        'input_snapshot' => $input,
        'result_snapshot' => ['faixas' => [$faixa]],
        'prazo_entrega_dias' => 10,
        'validade_dias' => 7,
        'tolerancia_qtd_pct' => 20,
        'observacao' => 'Ensaio fecho por modelo.',
    ]);

    $ped = Pedido::query()->create([
        'empresa_id' => $emp->id,
        'codigo' => $codigoPed,
        'orcamento_id' => $orc->id,
        'parceiro_id' => $par->id,
        'status' => Pedido::STATUS_LIBERADO,
        'faixa_index' => 0,
        'tolerancia_qtd_pct' => '20',
        'prazo_entrega_dias' => 10,
        'observacao' => 'Ensaio fecho por modelo — Maçã/Abacate/Limão.',
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
        'descricao' => '100X50 · BOPP BRILHO · 3 modelos · Q 10000',
        'qtde_pedida' => $qtde,
        'qtde_produzida' => '0.0000',
        'qtde_faturavel' => '0.0000',
        'unidade' => 'UN',
        'preco_unitario' => '0.350000',
        'valor_total' => '3500.00',
        'status' => PedidoItem::STATUS_PENDENTE,
        'produto_pa_id' => $pa->id,
        'especificacao' => $espec,
    ]);
} else {
    $ped->status = Pedido::STATUS_LIBERADO;
    $ped->parceiro_id = $par->id;
    $ped->snapshot = [
        'input' => $input,
        'faixa' => $faixa,
        'orcamento_codigo' => $codigoOrc,
        'orcamento_versao' => 1,
    ];
    $ped->observacao = 'Ensaio fecho por modelo — Maçã/Abacate/Limão.';
    $ped->save();

    $item = PedidoItem::query()->where('pedido_id', $ped->id)->orderBy('ordem')->first();
    if ($item === null) {
        fwrite(STDERR, "PED sem item\n");
        exit(1);
    }
    // Só reabre item se não há OP aberta neste pedido.
    $opAbertaNoPed = OrdemProducao::query()
        ->where('pedido_id', $ped->id)
        ->whereIn('status', OrdemProducao::STATUSES_ABERTOS)
        ->exists();
    if (! $opAbertaNoPed) {
        $item->status = PedidoItem::STATUS_PENDENTE;
        $item->qtde_produzida = '0.0000';
        $item->qtde_faturavel = '0.0000';
    }
    $item->qtde_pedida = $qtde;
    $item->produto_pa_id = $pa->id;
    $item->especificacao = $espec;
    $item->descricao = '100X50 · BOPP BRILHO · 3 modelos · Q 10000';
    $item->save();
}

$ped->refresh();
$item = PedidoItem::query()->where('pedido_id', $ped->id)->orderBy('ordem')->firstOrFail();

$svc = app(OrdemProducaoService::class);

$op = OrdemProducao::query()
    ->where('empresa_id', $emp->id)
    ->whereIn('status', OrdemProducao::STATUSES_ABERTOS)
    ->where('pedido_item_id', $item->id)
    ->orderByDesc('id')
    ->first();

if ($op === null) {
    if ($item->status !== PedidoItem::STATUS_PENDENTE
        && $item->status !== PedidoItem::STATUS_EM_PRODUCAO
    ) {
        $item->status = PedidoItem::STATUS_PENDENTE;
        $item->save();
    }
    $out = $svc->abrir($emp, $ped->fresh(), $item->fresh());
    $opId = (int) ($out['id'] ?? 0);
    $op = OrdemProducao::query()->findOrFail($opId);
    // Código estável no ensaio (se ainda livre).
    if (! OrdemProducao::query()->where('empresa_id', $emp->id)->where('codigo', $codigoOp)->where('id', '!=', $op->id)->exists()) {
        $op->codigo = $codigoOp;
        $op->save();
    }
}

// Garante linha PAPEL apontando ao MP com saldo.
$papel = OrdemProducaoMaterial::query()
    ->where('ordem_producao_id', $op->id)
    ->where('componente', 'PAPEL')
    ->orderBy('ordem')
    ->first();
if ($papel === null) {
    // Força rederivação no show.
    $svc->show($op->fresh());
    $papel = OrdemProducaoMaterial::query()
        ->where('ordem_producao_id', $op->id)
        ->where('componente', 'PAPEL')
        ->orderBy('ordem')
        ->first();
}
if ($papel === null) {
    fwrite(STDERR, "OP sem linha PAPEL — verifique snapshot m2/papel.\n");
    exit(1);
}

if ((int) $papel->produto_id !== (int) $mp->id) {
    $papel->produto_id = $mp->id;
    $papel->save();
}

if ($papel->saida_movimento_id === null) {
    $qtdePlan = PadraoDecimal::roundHalfUp((string) $papel->qtde_planejada, PadraoDecimal::SCALE_QTY);
    if (bccomp($qtdePlan, '0', PadraoDecimal::SCALE_QTY) <= 0) {
        $papel->qtde_planejada = '50.0000';
        $papel->save();
    }
    $svc->requisitarMaterial($emp, $op->fresh(), [
        'material_id' => (int) $papel->id,
        'produto_id' => (int) $mp->id,
    ]);
}

$op = $op->fresh();
echo 'PED '.$ped->codigo.' id='.$ped->id." status={$ped->status}\n";
echo 'OP '.$op->codigo.' id='.$op->id." status={$op->status}\n";
echo 'URL /ordens-producao/'.$op->id."\n";
echo 'Fechar /ordens-producao/'.$op->id."/fechar\n";
echo "Modelos: Maçã 5000 · Abacate 3000 · Limão 2000\n";
echo "Papel {$mp->codigo} saiu — CTA Fechar pronto\n";
