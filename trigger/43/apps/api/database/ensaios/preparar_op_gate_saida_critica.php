<?php

/**
 * Ensaio local: OP aberta com papel + acabamento SEM SKU e caixa COM saldo.
 * Serve para validar o gate: Confirmar saída bloqueada até escolher papel/acabamento.
 *
 * Idempotente em PED-2026-GATE01 / OP-2026-GATE01.
 * Não inventa SKU — usa MP-FLM-003, EMB-CX-001 e grupos do catálogo.
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
use App\Models\ProdutoGrupo;
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

$grupoFilme = ProdutoGrupo::query()->where('codigo', 'MP-FLM')->first();
if ($grupoFilme === null) {
    fwrite(STDERR, "Grupo MP-FLM ausente.\n");
    exit(1);
}
if ((int) $mp->grupo_id !== (int) $grupoFilme->id) {
    $mp->grupo_id = $grupoFilme->id;
    $mp->save();
}

$caixa = Produto::query()
    ->where('empresa_id', $emp->id)
    ->where('codigo', 'EMB-CX-001')
    ->where('situacao', 'ATIVO')
    ->first();
if ($caixa === null) {
    fwrite(STDERR, "EMB-CX-001 ausente.\n");
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

$codigoPed = 'PED-2026-GATE01';
$codigoOp = 'OP-2026-GATE01';
$codigoOrc = 'ORC-2026-GATE01';
$qtde = '2000.0000';

$faixa = [
    'quantidade' => 2000,
    'valor_etiqueta' => '700.00',
    'valor_matriz' => '0.00',
    'valor_total' => '700.00',
    'comissao' => '0.00',
    'rolos' => 2,
    'etiq_por_rolo' => 1000,
    'metragem' => 100,
    'm2' => '20',
    'caixas' => 2,
    'caixa_medida' => '400X300X200',
];

// Sem papel_produto_id / acabamento_produto_id → kit nasce com escolher_produto.
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
    'cores' => 4,
    'acabamento' => 'LAMINAÇÃO',
    'tubete' => '3"',
    'etiq_por_rolo' => 1000,
    'saida_etiqueta' => 'ESQUERDA',
    'modelos' => 1,
];

$espec = [
    'medida' => '100X50',
    'largura_cm' => 10,
    'puxada_cm' => 5,
    'colunas' => 2,
    'coluna_rebobinacao' => 1,
    'papel' => 'BOPP BRILHO',
    'cores' => 4,
    'acabamento' => 'LAMINAÇÃO',
    'tubete' => '3"',
    'etiq_por_rolo' => 1000,
    'saida_etiqueta' => 'ESQUERDA',
    'modelos' => 1,
    'faixa' => $faixa,
    'faixa_index' => 0,
];

$end = EstoqueEndereco::query()
    ->where('empresa_id', $emp->id)
    ->where('ativo', true)
    ->orderBy('id')
    ->first();
if ($end === null) {
    fwrite(STDERR, "Endereço de estoque ausente — rode: make seed-estoque-enderecos\n");
    exit(1);
}

// Bobina lab (volume inteiro) — mesma largura do papel da OP (10 cm × 2 col = 200 mm).
$loteCodigo = 'VOL-GATE-FLM003';
$larguraMm = '200.000';
$comprimentoM = '1000.000';
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

$saldoMp = EstoqueSaldo::query()->firstOrNew([
    'empresa_id' => $emp->id,
    'produto_id' => $mp->id,
]);
$saldoMp->qtde = $qtdeBobina;
$saldoMp->unidade = $mp->unidade_interna ?? 'M2';
$saldoMp->custo_medio = $saldoMp->custo_medio ?: '10.000000';
$saldoMp->save();

$saldoCx = EstoqueSaldo::query()->firstOrNew([
    'empresa_id' => $emp->id,
    'produto_id' => $caixa->id,
]);
$saldoCx->qtde = '20.0000';
$saldoCx->unidade = $caixa->unidade_interna ?? 'UN';
$saldoCx->custo_medio = $saldoCx->custo_medio ?: '1.000000';
$saldoCx->save();

$opExistente = OrdemProducao::query()
    ->where('empresa_id', $emp->id)
    ->where('codigo', $codigoOp)
    ->first();

if ($opExistente && ! in_array($opExistente->status, OrdemProducao::STATUSES_ABERTOS, true)) {
    $codigoOp = 'OP-2026-GATE'.str_pad((string) random_int(10, 99), 2, '0', STR_PAD_LEFT);
}

$ped = Pedido::query()->where('empresa_id', $emp->id)->where('codigo', $codigoPed)->first();
if ($ped === null) {
    $orc = Orcamento::query()
        ->where('empresa_id', $emp->id)
        ->where('codigo', $codigoOrc)
        ->first();
    if ($orc === null) {
        $numero = 99140;
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
            'observacao' => 'Ensaio gate saída crítica (papel/acabamento).',
        ]);
    } else {
        $orc->status = Orcamento::STATUS_APROVADO;
        $orc->financeiro_status = AdiantamentoService::FIN_LIBERADO;
        $orc->input_snapshot = $input;
        $orc->result_snapshot = ['faixas' => [$faixa]];
        $orc->parceiro_id = $par->id;
        $orc->cliente_nome = $par->razao_social;
        $orc->observacao = 'Ensaio gate saída crítica (papel/acabamento).';
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
        'observacao' => 'Ensaio gate — Confirmar saída bloqueada sem papel/acabamento.',
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
        'descricao' => '100X50 · BOPP · Laminação · gate saída',
        'qtde_pedida' => $qtde,
        'qtde_produzida' => '0.0000',
        'qtde_faturavel' => '0.0000',
        'unidade' => 'UN',
        'preco_unitario' => '0.350000',
        'valor_total' => '700.00',
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
    $ped->observacao = 'Ensaio gate — Confirmar saída bloqueada sem papel/acabamento.';
    $ped->save();

    $item = PedidoItem::query()->where('pedido_id', $ped->id)->orderBy('ordem')->firstOrFail();
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
    $item->descricao = '100X50 · BOPP · Laminação · gate saída';
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
    $op = OrdemProducao::query()->findOrFail((int) ($out['id'] ?? 0));
    if (! OrdemProducao::query()
        ->where('empresa_id', $emp->id)
        ->where('codigo', $codigoOp)
        ->where('id', '!=', $op->id)
        ->exists()) {
        $op->codigo = $codigoOp;
        $op->save();
    }
}

$show = $svc->show($op->fresh());
$materiais = collect($show['materiais'] ?? []);

// Garante estado do ensaio: papel/acabamento sem SKU; caixa com SKU e sem saída.
foreach (['PAPEL', 'ACABAMENTO'] as $comp) {
    $linha = OrdemProducaoMaterial::query()
        ->where('ordem_producao_id', $op->id)
        ->where('componente', $comp)
        ->orderBy('ordem')
        ->first();
    if ($linha === null) {
        $linha = OrdemProducaoMaterial::query()->create([
            'empresa_id' => $emp->id,
            'ordem_producao_id' => $op->id,
            'produto_id' => null,
            'grupo_id' => $grupoFilme->id,
            'qtde_planejada' => $comp === 'PAPEL' ? '20.0000' : '10.0000',
            'qtde_requisitada' => '0',
            'qtde_consumida' => '0',
            'qtde_retorno' => '0',
            'qtde_perda' => '0',
            'unidade' => 'M2',
            'componente' => $comp,
            'origem_texto' => $comp === 'PAPEL' ? 'BOPP BRILHO' : 'LAMINAÇÃO',
            'ordem' => $comp === 'PAPEL' ? 1 : 3,
        ]);
    } else {
        if ($linha->saida_movimento_id !== null) {
            fwrite(STDERR, "OP já tem {$comp} saído — cancele a OP ou use outro código.\n");
            exit(1);
        }
        $linha->produto_id = null;
        $linha->grupo_id = $grupoFilme->id;
        $linha->qtde_requisitada = '0';
        if (bccomp((string) $linha->qtde_planejada, '0', 4) <= 0) {
            $linha->qtde_planejada = $comp === 'PAPEL' ? '20.0000' : '10.0000';
        }
        $linha->save();
    }
}

$matCaixa = OrdemProducaoMaterial::query()
    ->where('ordem_producao_id', $op->id)
    ->where('componente', 'CAIXA')
    ->orderBy('ordem')
    ->first();
if ($matCaixa === null) {
    $matCaixa = OrdemProducaoMaterial::query()->create([
        'empresa_id' => $emp->id,
        'ordem_producao_id' => $op->id,
        'produto_id' => $caixa->id,
        'qtde_planejada' => '2.0000',
        'qtde_requisitada' => '0',
        'qtde_consumida' => '0',
        'qtde_retorno' => '0',
        'qtde_perda' => '0',
        'unidade' => 'UN',
        'componente' => 'CAIXA',
        'origem_texto' => '400X300X200',
        'ordem' => 2,
    ]);
} else {
    if ($matCaixa->saida_movimento_id !== null) {
        fwrite(STDERR, "OP já tem CAIXA saída — cancele a OP ou use outro código.\n");
        exit(1);
    }
    $matCaixa->produto_id = $caixa->id;
    $matCaixa->qtde_requisitada = '0';
    if (bccomp((string) $matCaixa->qtde_planejada, '0', 4) <= 0) {
        $matCaixa->qtde_planejada = '2.0000';
    }
    $matCaixa->save();
}

$show = $svc->show($op->fresh());
$papel = collect($show['materiais'] ?? [])->firstWhere('componente', 'PAPEL');
$acab = collect($show['materiais'] ?? [])->firstWhere('componente', 'ACABAMENTO');
$cx = collect($show['materiais'] ?? [])->firstWhere('componente', 'CAIXA');

echo 'PED '.$ped->codigo.' id='.$ped->id." status={$ped->status}\n";
echo 'OP '.$op->fresh()->codigo.' id='.$op->id.' status='.$op->fresh()->status."\n";
echo 'URL /ordens-producao/'.$op->id."\n";
echo 'A buscar /estoque/retiradas/'.$op->id."\n";
echo 'Papel escolher='.(empty($papel['escolher_produto']) ? 'nao' : 'sim')
    .' · Acabamento escolher='.(empty($acab['escolher_produto']) ? 'nao' : 'sim')
    .' · Caixa pendente='.(empty($cx['pendente']) ? 'nao' : 'sim')."\n";
echo "Esperado: Confirmar saída desabilitado até escolher papel e acabamento.\n";
echo "SKU de ensaio para escolha: {$mp->codigo} (grupo MP-FLM) · caixa {$caixa->codigo}\n";
