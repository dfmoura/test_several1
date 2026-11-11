<?php

/**
 * Ensaio local: OP com 2 bobinas da medida do papel já baixadas (Passa multi-volume).
 *
 * Esperado em «O que volta»:
 *   · 155 mm × ~735,41 m  (1º volume, parcial)
 *   · 155 mm × 1.000 m    (2º volume, C_u=0 — inteiro)
 *
 * Idempotente em PED-2026-PASS2 / OP-2026-PASS2.
 * SKU: MP-FLM-003 (M2) · 2× (155 mm × 1000 m) — mesma geometria do caso vivo.
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
use App\Models\User;
use App\Services\Financeiro\AdiantamentoService;
use App\Services\Producao\OrdemProducaoService;
use App\Support\PadraoDecimal;
use App\Support\VolumeGeometria;
use Illuminate\Support\Facades\Auth;

$emp = Empresa::query()->where('codigo', 'EMP-00001')->first();
if ($emp === null) {
    fwrite(STDERR, "EMP-00001 ausente\n");
    exit(1);
}

$admin = User::query()->where('email', 'admin@retaetiquetas.com.br')->first();
if ($admin === null) {
    fwrite(STDERR, "Usuário admin@retaetiquetas.com.br ausente\n");
    exit(1);
}
Auth::login($admin);

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

// Preferir SKU M2 (BOM do papel é m²). FLM-001 é M e distorce o balanço Precisa·Saiu·Passa.
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

$codigoPed = 'PED-2026-PASS2';
$codigoOp = 'OP-2026-PASS2';
$codigoOrc = 'ORC-2026-PASS2';
$qtde = '2000.0000';

// Papel 15,5 cm × 1 col = 155 mm (medida exata das bobinas).
// Necessidade ~41,01 m² → ~264,59 m lineares (caso vivo do kit).
$larguraMm = '155.00';
$comprimentoBobina = '1000.00';
$metrosNeed = '264.59';
$geoNeed = VolumeGeometria::fechar($larguraMm, $metrosNeed, null, 'M2');
if ($geoNeed['status'] !== VolumeGeometria::STATUS_FECHADO || $geoNeed['qtde'] === null) {
    fwrite(STDERR, "Geometria da necessidade não fecha.\n");
    exit(1);
}
$areaNeed = PadraoDecimal::roundHalfUp((string) $geoNeed['qtde'], PadraoDecimal::SCALE_QTY);
$unMp = strtoupper(str_replace('²', '2', (string) ($mp->unidade_interna ?? 'M2')));
$qtdeBobina = in_array($unMp, ['M', 'MT', 'ML'], true)
    ? PadraoDecimal::roundHalfUp($comprimentoBobina, PadraoDecimal::SCALE_QTY)
    : PadraoDecimal::roundHalfUp(
        bcmul(bcdiv($larguraMm, '1000', 8), $comprimentoBobina, PadraoDecimal::SCALE_QTY + 4),
        PadraoDecimal::SCALE_QTY
    );

$faixa = [
    'quantidade' => 2000,
    'valor_etiqueta' => '700.00',
    'valor_matriz' => '0.00',
    'valor_total' => '700.00',
    'comissao' => '0.00',
    'rolos' => 2,
    'etiq_por_rolo' => 1000,
    'metragem' => (float) $metrosNeed,
    'm2' => $areaNeed,
    'caixas' => 2,
    'caixa_medida' => '400X300X200',
];

$input = [
    'condicao_pagamento' => '28 DDL',
    'forma_pagamento' => 'PIX',
    'modo_entrega' => 'RETIRAR',
    'medida' => '155X50',
    'largura_cm' => 15.5,
    'puxada_cm' => 5,
    'colunas' => 1,
    'coluna_rebobinacao' => 1,
    'papel' => 'BOPP BRILHO COLACRIL AC TC',
    'cores' => 4,
    'acabamento' => 'LAMINAÇÃO',
    'tubete' => '3"',
    'etiq_por_rolo' => 1000,
    'saida_etiqueta' => 'ESQUERDA',
    'modelos' => 1,
    'papel_produto_id' => $mp->id,
];

$espec = [
    'medida' => '155X50',
    'largura_cm' => 15.5,
    'puxada_cm' => 5,
    'colunas' => 1,
    'coluna_rebobinacao' => 1,
    'papel' => 'BOPP BRILHO COLACRIL AC TC',
    'cores' => 4,
    'acabamento' => 'LAMINAÇÃO',
    'tubete' => '3"',
    'etiq_por_rolo' => 1000,
    'saida_etiqueta' => 'ESQUERDA',
    'modelos' => 1,
    'faixa' => $faixa,
    'faixa_index' => 0,
    'papel_produto_id' => $mp->id,
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

$sufixoRun = '';
$opExistente = OrdemProducao::query()
    ->where('empresa_id', $emp->id)
    ->where('codigo', $codigoOp)
    ->first();
$precisaNovo = false;
if ($opExistente && ! in_array($opExistente->status, OrdemProducao::STATUSES_ABERTOS, true)) {
    $precisaNovo = true;
}
// OP aberta sem plano Passa (ensaio antigo / bug) → nova OP limpa para o teste.
if ($opExistente && in_array($opExistente->status, OrdemProducao::STATUSES_ABERTOS, true)) {
    $matChk = OrdemProducaoMaterial::query()
        ->where('ordem_producao_id', $opExistente->id)
        ->where('componente', 'PAPEL')
        ->first();
    $pendChk = collect(is_array($matChk?->partida_prevista) ? $matChk->partida_prevista : [])
        ->where('status', 'pendente')
        ->count();
    if ($matChk && bccomp((string) $matChk->qtde_requisitada, '0', 4) > 0 && $pendChk < 2) {
        $precisaNovo = true;
    }
}
if ($precisaNovo) {
    $sufixoRun = str_pad((string) random_int(10, 99), 2, '0', STR_PAD_LEFT);
    $codigoOp = 'OP-2026-PASS2'.$sufixoRun;
    $codigoPed = 'PED-2026-PASS2'.$sufixoRun;
    $codigoOrc = 'ORC-2026-PASS2'.$sufixoRun;
}

$lotes = [];
foreach ([1, 2] as $i) {
    $cod = 'VOL-PASS2-FLM003-'.$i.($sufixoRun !== '' ? '-'.$sufixoRun : '');
    $lote = EstoqueLote::query()->firstOrNew([
        'empresa_id' => $emp->id,
        'produto_id' => $mp->id,
        'codigo' => $cod,
    ]);
    $lote->qtde = $qtdeBobina;
    $lote->unidade = $mp->unidade_interna ?? 'M2';
    $lote->data_entrada = $lote->data_entrada ?? now()->toDateString();
    $lote->origem_tipo = $lote->origem_tipo ?: EstoqueLote::ORIGEM_VIRADA;
    $lote->largura_mm = $larguraMm;
    $lote->comprimento_m = $comprimentoBobina;
    $lote->endereco_id = $end->id;
    if (! $lote->qr_token) {
        $lote->qr_token = bin2hex(random_bytes(8));
    }
    $lote->save();
    $lotes[] = $lote;
}

$saldoMp = EstoqueSaldo::query()->firstOrNew([
    'empresa_id' => $emp->id,
    'produto_id' => $mp->id,
]);
$preciso = bcmul($qtdeBobina, '2', PadraoDecimal::SCALE_QTY + 2);
$saldoAtual = PadraoDecimal::roundHalfUp((string) ($saldoMp->qtde ?? '0'), PadraoDecimal::SCALE_QTY);
if (bccomp($saldoAtual, $preciso, PadraoDecimal::SCALE_QTY) < 0) {
    $saldoMp->qtde = PadraoDecimal::roundHalfUp($preciso, PadraoDecimal::SCALE_QTY);
}
$saldoMp->unidade = $mp->unidade_interna ?? 'M2';
$saldoMp->custo_medio = $saldoMp->custo_medio ?: '10.000000';
$saldoMp->save();

$saldoCx = EstoqueSaldo::query()->firstOrNew([
    'empresa_id' => $emp->id,
    'produto_id' => $caixa->id,
]);
if (bccomp((string) ($saldoCx->qtde ?? '0'), '2', 4) < 0) {
    $saldoCx->qtde = '20.0000';
}
$saldoCx->unidade = $caixa->unidade_interna ?? 'UN';
$saldoCx->custo_medio = $saldoCx->custo_medio ?: '1.000000';
$saldoCx->save();

$ped = Pedido::query()->where('empresa_id', $emp->id)->where('codigo', $codigoPed)->first();
if ($ped === null) {
    $orc = Orcamento::query()
        ->where('empresa_id', $emp->id)
        ->where('codigo', $codigoOrc)
        ->first();
    if ($orc === null) {
        $numero = 99280;
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
            'observacao' => 'Ensaio Passa 2 bobinas medida exata.',
        ]);
    } else {
        $orc->status = Orcamento::STATUS_APROVADO;
        $orc->financeiro_status = AdiantamentoService::FIN_LIBERADO;
        $orc->input_snapshot = $input;
        $orc->result_snapshot = ['faixas' => [$faixa]];
        $orc->parceiro_id = $par->id;
        $orc->cliente_nome = $par->razao_social;
        $orc->observacao = 'Ensaio Passa 2 bobinas medida exata.';
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
        'observacao' => 'Ensaio Passa — 2 bobinas 155×1000.',
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
        'descricao' => '155X50 · BOPP · Passa 2 bobinas',
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
    $ped->observacao = 'Ensaio Passa — 2 bobinas 155×1000.';
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
    $item->descricao = '155X50 · BOPP · Passa 2 bobinas';
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

$matPapel = OrdemProducaoMaterial::query()
    ->where('ordem_producao_id', $op->id)
    ->where('componente', 'PAPEL')
    ->orderBy('ordem')
    ->first();
if ($matPapel === null) {
    $matPapel = OrdemProducaoMaterial::query()->create([
        'empresa_id' => $emp->id,
        'ordem_producao_id' => $op->id,
        'produto_id' => $mp->id,
        'grupo_id' => $grupoFilme->id,
        'qtde_planejada' => $areaNeed,
        'qtde_requisitada' => '0',
        'qtde_consumida' => '0',
        'qtde_retorno' => '0',
        'qtde_perda' => '0',
        'unidade' => 'M2',
        'componente' => 'PAPEL',
        'origem_texto' => 'BOPP BRILHO COLACRIL AC TC',
        'ordem' => 1,
    ]);
} else {
    $matPapel->produto_id = $mp->id;
    $matPapel->grupo_id = $grupoFilme->id;
    $matPapel->qtde_planejada = $areaNeed;
    $matPapel->unidade = 'M2';
    $matPapel->origem_texto = 'BOPP BRILHO COLACRIL AC TC';
    $matPapel->save();
}

$matCaixa = OrdemProducaoMaterial::query()
    ->where('ordem_producao_id', $op->id)
    ->where('componente', 'CAIXA')
    ->orderBy('ordem')
    ->first();
if ($matCaixa === null) {
    OrdemProducaoMaterial::query()->create([
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
}

$matPapel->refresh();
$jaSaiu = $matPapel->saida_movimento_id !== null
    && bccomp((string) $matPapel->qtde_requisitada, '0', 4) > 0;

if (! $jaSaiu) {
    foreach ($lotes as $lote) {
        $lote->refresh();
        if (bccomp((string) $lote->qtde, '0', 4) <= 0) {
            $lote->qtde = $qtdeBobina;
            $lote->largura_mm = $larguraMm;
            $lote->comprimento_m = $comprimentoBobina;
            $lote->endereco_id = $end->id;
            $lote->save();
        }
    }
    $saldoMp->refresh();
    $saldoLive = PadraoDecimal::roundHalfUp((string) ($saldoMp->qtde ?? '0'), PadraoDecimal::SCALE_QTY);
    if (bccomp($saldoLive, $preciso, PadraoDecimal::SCALE_QTY) < 0) {
        $saldoMp->qtde = PadraoDecimal::roundHalfUp($preciso, PadraoDecimal::SCALE_QTY);
        $saldoMp->save();
    }

    $svc->requisitarMaterial($emp, $op->fresh(), [
        'material_id' => $matPapel->id,
        'volumes' => [
            ['lote_id' => $lotes[0]->id, 'qtde' => $qtdeBobina],
            ['lote_id' => $lotes[1]->id, 'qtde' => $qtdeBobina],
        ],
        'volumes_motivo' => 'Ensaio Passa — 2 bobinas medida exata',
    ]);
}

$show = $svc->show($op->fresh());
$papel = collect($show['materiais'] ?? [])->firstWhere('componente', 'PAPEL');
$planos = $papel['partida_prevista'] ?? [];
$pend = collect($planos)->where('status', 'pendente')->values();
$bobinas = $pend->flatMap(fn ($p) => $p['bobinas'] ?? [])->values();
$baixados = $papel['retirada']['volumes_baixados'] ?? [];

echo 'PED '.$ped->codigo.' id='.$ped->id." status={$ped->status}\n";
echo 'OP '.$op->fresh()->codigo.' id='.$op->id.' status='.$op->fresh()->status."\n";
echo 'URL /ordens-producao/'.$op->id."\n";
echo 'SKU '.$mp->codigo.' · 2× ('.$larguraMm.' mm × '.$comprimentoBobina." m)\n";
echo 'Precisa '.$areaNeed.' m² · '.$metrosNeed." m\n";
echo 'Planos pendentes='.$pend->count().' · bobinas='.$bobinas->count()."\n";
foreach ($bobinas as $b) {
    echo '  - '.$b['tipo'].' '.$b['largura_mm'].' mm × '.$b['comprimento_m']." m (qtde ".$b['qtde'].")\n";
}
echo 'Baixados medida:'."\n";
foreach ($baixados as $v) {
    echo '  - lote '.($v['codigo'] ?? $v['lote_id']).' · '
        .($v['largura_mm'] ?? '?').' mm × '.($v['comprimento_m'] ?? '?')." m\n";
}
echo "Esperado: 2 linhas «O que volta» (≈735,41 m + 1.000 m) · baixados sem × 0 m.\n";
