<?php

namespace App\Services\Producao;

use App\Models\Empresa;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueMovimentoItem;
use App\Models\OrdemProducao;
use App\Models\OrdemProducaoMaterial;
use App\Models\OrdemServico;
use App\Models\Pedido;
use App\Models\PedidoItem;
use App\Models\Produto;
use App\Services\Codigo\CodigoGenerator;
use App\Services\Estoque\EstoqueCongelamento;
use App\Services\Estoque\EstoqueSaldoWriter;
use App\Services\Producao\RastreioInsumosService;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * OP + saída/retorno/PA (estudo 32 PRODUCAO / ESTOQUE_FLUXO / CONCLUSAO).
 */
class OrdemProducaoService
{
    public function __construct(
        private readonly CodigoGenerator $codigos,
        private readonly EstoqueSaldoWriter $saldos,
        private readonly EstoqueCongelamento $congelamento,
        private readonly OpBomDeriver $bom,
        private readonly RastreioInsumosService $rastreio,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $q = null, ?string $status = null): array
    {
        $query = OrdemProducao::query()
            ->where('empresa_id', $empresa->id)
            ->with(['pedido:id,codigo,status', 'pedidoItem:id,descricao,necessidade'])
            ->orderByDesc('id');

        if ($status) {
            $query->where('status', $status);
        }
        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($w) use ($like) {
                $w->where('codigo', 'like', $like)
                    ->orWhereHas('pedido', fn ($p) => $p->where('codigo', 'like', $like));
            });
        }

        return $query->limit(200)->get()->map(fn (OrdemProducao $o) => $this->toOut($o))->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function show(OrdemProducao $op): array
    {
        // OPs abertas sem materiais: deriva BOM do PED (idempotente).
        if (in_array($op->status, OrdemProducao::STATUSES_ABERTOS, true)
            && ! $op->materiais()->exists()
        ) {
            $op->loadMissing(['pedido', 'pedidoItem']);
            if ($op->pedido && $op->pedidoItem) {
                $this->empenharMateriaisDoPedido(
                    Empresa::query()->findOrFail($op->empresa_id),
                    $op,
                    $op->pedido,
                    $op->pedidoItem,
                );
            }
        }

        $op->load([
            'pedido.parceiro:id,codigo,razao_social',
            'pedido.orcamento:id,codigo,tolerancia_qtd_pct',
            'pedidoItem.produtoPa:id,codigo,descricao_fiscal',
            'materiais.produto:id,codigo,descricao_fiscal,unidade_interna,familia',
            'paMovimento:id,codigo,tipo',
        ]);

        return $this->toOut($op, true);
    }

    /**
     * @return array<string, mixed>
     */
    public function abrir(Empresa $empresa, Pedido $pedido, PedidoItem $item): array
    {
        if ($pedido->empresa_id !== $empresa->id || $item->pedido_id !== $pedido->id) {
            abort(404);
        }

        if (! in_array($pedido->status, Pedido::STATUSES_ABRE_ORDEM, true)) {
            throw ValidationException::withMessages([
                'pedido' => ['Pedido deve estar LIBERADO ou EM_PRODUCAO.'],
            ]);
        }

        if ($item->necessidade !== PedidoItem::NEC_PRODUCAO) {
            throw ValidationException::withMessages([
                'pedido_item_id' => ['Item não é de PRODUCAO — use OS.'],
            ]);
        }

        $ativa = OrdemProducao::query()
            ->where('pedido_item_id', $item->id)
            ->whereIn('status', OrdemProducao::STATUSES_ABERTOS)
            ->exists();
        if ($ativa) {
            throw ValidationException::withMessages([
                'pedido_item_id' => ['Já existe OP aberta para este item.'],
            ]);
        }

        $op = DB::transaction(function () use ($empresa, $pedido, $item) {
            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'OP-'.$ano, 5);

            $op = OrdemProducao::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'pedido_id' => $pedido->id,
                'pedido_item_id' => $item->id,
                'status' => OrdemProducao::STATUS_ABERTA,
                'qtde_planejada' => $item->qtde_pedida,
                'qtde_refugo' => '0',
            ]);

            $this->empenharMateriaisDoPedido($empresa, $op, $pedido, $item);

            $item->status = PedidoItem::STATUS_EM_PRODUCAO;
            $item->save();

            if ($pedido->status === Pedido::STATUS_LIBERADO) {
                $pedido->status = Pedido::STATUS_EM_PRODUCAO;
                $pedido->save();
            }

            return $op;
        });

        return $this->show($op->fresh());
    }

    /**
     * Empenho leve: linhas planejadas sem baixar estoque (estudo 32 §2.2).
     */
    public function empenharMateriaisDoPedido(
        Empresa $empresa,
        OrdemProducao $op,
        Pedido $pedido,
        PedidoItem $item,
    ): void {
        $linhas = $this->bom->derivar($empresa, $pedido, $item);
        $ordem = (int) OrdemProducaoMaterial::query()
            ->where('ordem_producao_id', $op->id)
            ->max('ordem');

        foreach ($linhas as $linha) {
            $exists = OrdemProducaoMaterial::query()
                ->where('ordem_producao_id', $op->id)
                ->where('produto_id', $linha['produto_id'])
                ->exists();
            if ($exists) {
                continue;
            }

            $ordem++;
            OrdemProducaoMaterial::query()->create([
                'empresa_id' => $empresa->id,
                'ordem_producao_id' => $op->id,
                'produto_id' => $linha['produto_id'],
                'qtde_planejada' => $linha['qtde'],
                'qtde_requisitada' => '0',
                'qtde_consumida' => '0',
                'qtde_retorno' => '0',
                'qtde_perda' => '0',
                'unidade' => $linha['unidade'],
                'componente' => $linha['componente'],
                'origem_texto' => $linha['origem_texto'],
                'ordem' => $ordem,
            ]);
        }
    }

    /**
     * Requisição de MP/EMB → SAIDA_PRODUCAO.
     *
     * @param  array{produto_id?: int, material_id?: int, qtde?: string|number}  $data
     * @return array<string, mixed>
     */
    public function requisitarMaterial(Empresa $empresa, OrdemProducao $op, array $data): array
    {
        if ($op->empresa_id !== $empresa->id) {
            abort(404);
        }
        if (! in_array($op->status, OrdemProducao::STATUSES_ABERTOS, true)) {
            throw ValidationException::withMessages([
                'status' => ['OP deve estar ABERTA ou EM_ANDAMENTO.'],
            ]);
        }

        $materialId = isset($data['material_id']) ? (int) $data['material_id'] : 0;
        $produtoId = isset($data['produto_id']) ? (int) $data['produto_id'] : 0;

        /** @var OrdemProducaoMaterial|null $matPendente */
        $matPendente = null;
        if ($materialId > 0) {
            $matPendente = OrdemProducaoMaterial::query()
                ->where('ordem_producao_id', $op->id)
                ->where('id', $materialId)
                ->first();
            if (! $matPendente) {
                throw ValidationException::withMessages([
                    'material_id' => ['Material não pertence a esta OP.'],
                ]);
            }
            if ($matPendente->saida_movimento_id) {
                throw ValidationException::withMessages([
                    'material_id' => ['Material já requisitado.'],
                ]);
            }
            $produtoId = (int) $matPendente->produto_id;
        }

        $qtdeRaw = $data['qtde'] ?? null;
        if (($qtdeRaw === null || $qtdeRaw === '') && $matPendente) {
            $qtdeRaw = (string) $matPendente->qtde_planejada;
        }

        $qtde = PadraoDecimal::parseStrict((string) ($qtdeRaw ?? ''), PadraoDecimal::SCALE_QTY);
        if ($produtoId <= 0 || $qtde === null || bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde' => ['Informe produto e quantidade válidos.'],
            ]);
        }

        /** @var Produto|null $produto */
        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $produtoId)
            ->first();
        if (! $produto) {
            throw ValidationException::withMessages([
                'produto_id' => ['Produto não encontrado nesta empresa.'],
            ]);
        }

        $this->congelamento->assertProdutoLivre($empresa, $produto->id, 'saída para produção');

        $op = DB::transaction(function () use ($empresa, $op, $produto, $qtde, $matPendente) {
            $op = OrdemProducao::query()->lockForUpdate()->findOrFail($op->id);

            $mat = $matPendente
                ? OrdemProducaoMaterial::query()->lockForUpdate()->findOrFail($matPendente->id)
                : OrdemProducaoMaterial::query()
                    ->where('ordem_producao_id', $op->id)
                    ->where('produto_id', $produto->id)
                    ->lockForUpdate()
                    ->first();

            if ($mat && $mat->saida_movimento_id) {
                throw ValidationException::withMessages([
                    'produto_id' => ['Material já requisitado nesta OP. Conclua ou use outro SKU.'],
                ]);
            }

            $ano = (int) now()->year;
            $codigoMov = $this->codigos->nextCode($empresa->id, 'MOV-'.$ano, 5);
            $aplicado = $this->saldos->aplicarSaida($empresa, $produto, $qtde);

            $mov = EstoqueMovimento::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigoMov,
                'tipo' => EstoqueMovimento::TIPO_SAIDA_PRODUCAO,
                'pedido_id' => $op->pedido_id,
                'ordem_producao_id' => $op->id,
                'conferido_em' => now(),
                'conferido_por' => Auth::id(),
                'observacao' => 'Saída para '.$op->codigo,
            ]);

            $ordemItem = 1;
            foreach ($aplicado['alocacoes'] as $aloc) {
                $qtdeLinha = (string) $aloc['qtde'];
                $valorLinha = PadraoDecimal::roundHalfUp(
                    bcmul($qtdeLinha, $aplicado['valor_unitario'], PadraoDecimal::SCALE_UNIT_PRICE + 4),
                    PadraoDecimal::SCALE_MONEY
                );
                EstoqueMovimentoItem::query()->create([
                    'movimento_id' => $mov->id,
                    'produto_id' => $produto->id,
                    'lote_id' => $aloc['lote_id'] ?? null,
                    'qtde' => $qtdeLinha,
                    'unidade' => $produto->unidade_interna ?? 'UN',
                    'valor_unitario' => $aplicado['valor_unitario'],
                    'valor_total' => $valorLinha,
                    'custo_medio_apos' => $aplicado['custo_medio_apos'],
                    'ordem' => $ordemItem,
                ]);
                $ordemItem++;
            }

            if (! $mat) {
                $ordem = (int) OrdemProducaoMaterial::query()
                    ->where('ordem_producao_id', $op->id)
                    ->max('ordem') + 1;
                OrdemProducaoMaterial::query()->create([
                    'empresa_id' => $empresa->id,
                    'ordem_producao_id' => $op->id,
                    'produto_id' => $produto->id,
                    'qtde_planejada' => $qtde,
                    'qtde_requisitada' => $qtde,
                    'qtde_consumida' => '0',
                    'qtde_retorno' => '0',
                    'qtde_perda' => '0',
                    'unidade' => $produto->unidade_interna ?? 'UN',
                    'componente' => 'MANUAL',
                    'saida_movimento_id' => $mov->id,
                    'ordem' => max(1, $ordem),
                ]);
            } else {
                if (bccomp((string) $mat->qtde_planejada, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                    $mat->qtde_planejada = $qtde;
                }
                $mat->qtde_requisitada = $qtde;
                $mat->saida_movimento_id = $mov->id;
                $mat->unidade = $produto->unidade_interna ?? 'UN';
                $mat->save();
            }

            if ($op->status === OrdemProducao::STATUS_ABERTA) {
                $op->status = OrdemProducao::STATUS_EM_ANDAMENTO;
                $op->iniciada_em = $op->iniciada_em ?? now();
                $op->save();
            }

            return $op;
        });

        return $this->show($op->fresh());
    }

    /**
     * Requisita todas as linhas pendentes (qtde_planejada).
     *
     * @return array<string, mixed>
     */
    public function requisitarPendentes(Empresa $empresa, OrdemProducao $op): array
    {
        if ($op->empresa_id !== $empresa->id) {
            abort(404);
        }
        if (! in_array($op->status, OrdemProducao::STATUSES_ABERTOS, true)) {
            throw ValidationException::withMessages([
                'status' => ['OP deve estar ABERTA ou EM_ANDAMENTO.'],
            ]);
        }

        $pendentes = OrdemProducaoMaterial::query()
            ->where('ordem_producao_id', $op->id)
            ->whereNull('saida_movimento_id')
            ->where('qtde_planejada', '>', 0)
            ->orderBy('ordem')
            ->get();

        if ($pendentes->isEmpty()) {
            throw ValidationException::withMessages([
                'materiais' => ['Não há materiais pendentes para requisitar.'],
            ]);
        }

        foreach ($pendentes as $mat) {
            $this->requisitarMaterial($empresa, $op->fresh(), [
                'material_id' => $mat->id,
                'qtde' => (string) $mat->qtde_planejada,
            ]);
        }

        return $this->show($op->fresh());
    }

    /**
     * OP sem saída de estoque volta ao PED (estudo 32 UC-PRD-004 EX2 / GERACAO_PEDIDO §7).
     * Não apaga a OP. Não estorna saldo. Com MOV → bloqueio.
     *
     * @return array<string, mixed>
     */
    public function devolverAoPedido(Empresa $empresa, OrdemProducao $op, string $motivo): array
    {
        if ($op->empresa_id !== $empresa->id) {
            abort(404);
        }

        $motivo = trim($motivo);
        if (mb_strlen($motivo) < 3) {
            throw ValidationException::withMessages([
                'motivo' => ['Informe o motivo (mínimo 3 caracteres).'],
            ]);
        }

        $op = DB::transaction(function () use ($empresa, $op, $motivo) {
            $op = OrdemProducao::query()
                ->with(['pedido', 'pedidoItem'])
                ->lockForUpdate()
                ->findOrFail($op->id);

            if ($op->empresa_id !== $empresa->id) {
                abort(404);
            }

            if ($op->status === OrdemProducao::STATUS_CANCELADA) {
                throw ValidationException::withMessages([
                    'status' => ['Esta OP já foi devolvida ao pedido.'],
                ]);
            }

            if (! in_array($op->status, OrdemProducao::STATUSES_ABERTOS, true)) {
                throw ValidationException::withMessages([
                    'status' => ['Só é possível devolver OP aberta, ainda sem saída de material.'],
                ]);
            }

            if ($this->temMovimentoEstoque($op)) {
                throw ValidationException::withMessages([
                    'materiais' => [
                        'Já houve saída para produção nesta OP. Não é possível devolver ao pedido sem tratar o estoque.',
                    ],
                ]);
            }

            $item = $op->pedidoItem;
            $pedido = $op->pedido;

            $op->status = OrdemProducao::STATUS_CANCELADA;
            $op->motivo_cancelamento = $motivo;
            $op->cancelada_em = now();
            $op->cancelada_por = Auth::id();
            $op->save();

            if ($item && $item->status === PedidoItem::STATUS_EM_PRODUCAO) {
                $item->status = PedidoItem::STATUS_PENDENTE;
                $item->save();
            }

            if ($pedido && $pedido->status === Pedido::STATUS_EM_PRODUCAO) {
                $outrasOp = OrdemProducao::query()
                    ->where('pedido_id', $pedido->id)
                    ->where('id', '!=', $op->id)
                    ->whereIn('status', OrdemProducao::STATUSES_ABERTOS)
                    ->exists();
                $outrasOs = OrdemServico::query()
                    ->where('pedido_id', $pedido->id)
                    ->whereIn('status', OrdemServico::STATUSES_ABERTOS)
                    ->exists();
                if (! $outrasOp && ! $outrasOs) {
                    $pedido->status = Pedido::STATUS_LIBERADO;
                    $pedido->save();
                }
            }

            if ($pedido) {
                $snap = is_array($pedido->snapshot) ? $pedido->snapshot : [];
                $hist = is_array($snap['historico_ops'] ?? null) ? $snap['historico_ops'] : [];
                $hist[] = [
                    'acao' => 'DEVOLVIDA_AO_PEDIDO',
                    'op_codigo' => $op->codigo,
                    'motivo' => $motivo,
                    'em' => now()->toIso8601String(),
                    'por' => Auth::id(),
                ];
                $snap['historico_ops'] = $hist;
                $pedido->snapshot = $snap;
                $pedido->save();
            }

            return $op;
        });

        return $this->show($op->fresh());
    }

    /**
     * Conclusão: destino de materiais + ENTRADA_PA + readequação ±tol.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function concluir(Empresa $empresa, OrdemProducao $op, array $data): array
    {
        if ($op->empresa_id !== $empresa->id) {
            abort(404);
        }
        if (! in_array($op->status, OrdemProducao::STATUSES_ABERTOS, true)) {
            throw ValidationException::withMessages([
                'status' => ['OP já encerrada.'],
            ]);
        }

        $qtdeBoa = PadraoDecimal::parseStrict((string) ($data['qtde_boa'] ?? ''), PadraoDecimal::SCALE_QTY);
        if ($qtdeBoa === null || bccomp($qtdeBoa, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde_boa' => ['Informe a quantidade boa produzida.'],
            ]);
        }

        $qtdeRefugo = PadraoDecimal::parseStrict((string) ($data['qtde_refugo'] ?? '0'), PadraoDecimal::SCALE_QTY) ?? '0';
        if (bccomp($qtdeRefugo, '0', PadraoDecimal::SCALE_QTY) < 0) {
            throw ValidationException::withMessages([
                'qtde_refugo' => ['Refugo não pode ser negativo.'],
            ]);
        }

        $aceitarFora = (bool) ($data['aceitar_fora_tolerancia'] ?? false);
        $motivoFora = isset($data['motivo_fora_tolerancia'])
            ? trim((string) $data['motivo_fora_tolerancia'])
            : '';

        /** @var list<array{material_id?: int, produto_id?: int, qtde_retorno?: mixed, qtde_perda?: mixed}> $materiaisIn */
        $materiaisIn = is_array($data['materiais'] ?? null) ? $data['materiais'] : [];

        $op = DB::transaction(function () use (
            $empresa,
            $op,
            $qtdeBoa,
            $qtdeRefugo,
            $aceitarFora,
            $motivoFora,
            $materiaisIn,
            $data,
        ) {
            $op = OrdemProducao::query()
                ->with(['materiais.produto', 'pedidoItem.produtoPa', 'pedido'])
                ->lockForUpdate()
                ->findOrFail($op->id);

            $pedido = $op->pedido;
            $item = $op->pedidoItem;
            $tolPct = (string) ($pedido->tolerancia_qtd_pct ?? '20');
            $pedida = (string) $item->qtde_pedida;

            $tolFrac = bcdiv($tolPct, '100', 8);
            $delta = bcmul($pedida, $tolFrac, PadraoDecimal::SCALE_QTY + 4);
            $min = PadraoDecimal::roundHalfUp(bcsub($pedida, $delta, PadraoDecimal::SCALE_QTY + 4), PadraoDecimal::SCALE_QTY);
            $max = PadraoDecimal::roundHalfUp(bcadd($pedida, $delta, PadraoDecimal::SCALE_QTY + 4), PadraoDecimal::SCALE_QTY);
            if (bccomp($min, '0', PadraoDecimal::SCALE_QTY) < 0) {
                $min = '0';
            }

            $fora = bccomp($qtdeBoa, $min, PadraoDecimal::SCALE_QTY) < 0
                || bccomp($qtdeBoa, $max, PadraoDecimal::SCALE_QTY) > 0;

            if ($fora && ! $aceitarFora) {
                throw ValidationException::withMessages([
                    'qtde_boa' => [
                        "Quantidade fora da tolerância ±{$tolPct}% (faixa {$min}–{$max}). Confirme override com motivo.",
                    ],
                ]);
            }
            if ($fora && $motivoFora === '') {
                throw ValidationException::withMessages([
                    'motivo_fora_tolerancia' => ['Informe o motivo do desvio fora da tolerância.'],
                ]);
            }

            $custoMateriais = '0.00';
            $materiaisBaixados = $op->materiais->filter(fn (OrdemProducaoMaterial $m) => $m->saida_movimento_id !== null);
            $produtoIds = $materiaisBaixados->pluck('produto_id')->map(fn ($id) => (int) $id)->all();
            $this->congelamento->assertProdutosLivres($empresa, $produtoIds, 'conclusão de OP');

            foreach ($materiaisBaixados as $mat) {
                $in = $this->findMaterialInput($materiaisIn, (int) $mat->id, (int) $mat->produto_id);
                $retorno = PadraoDecimal::parseStrict((string) ($in['qtde_retorno'] ?? '0'), PadraoDecimal::SCALE_QTY) ?? '0';
                $perda = PadraoDecimal::parseStrict((string) ($in['qtde_perda'] ?? '0'), PadraoDecimal::SCALE_QTY) ?? '0';
                if (bccomp($retorno, '0', PadraoDecimal::SCALE_QTY) < 0 || bccomp($perda, '0', PadraoDecimal::SCALE_QTY) < 0) {
                    throw ValidationException::withMessages([
                        'materiais' => ['Retorno/perda não podem ser negativos.'],
                    ]);
                }

                $req = (string) $mat->qtde_requisitada;
                $soma = bcadd($retorno, $perda, PadraoDecimal::SCALE_QTY + 4);
                if (bccomp($soma, $req, PadraoDecimal::SCALE_QTY) > 0) {
                    throw ValidationException::withMessages([
                        'materiais' => [
                            "Retorno+perda ({$soma}) excedem requisitado ({$req}) no SKU {$mat->produto?->codigo}.",
                        ],
                    ]);
                }

                $consumida = PadraoDecimal::roundHalfUp(
                    bcsub($req, $soma, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );

                // Custo do consumo = (requisitado − retorno) × CM da saída (aprox. CM atual)
                $custoUnit = $mat->produto ? (string) ($mat->produto->custo_medio ?? '0') : '0';
                if ($mat->saidaMovimento) {
                    $mat->loadMissing('saidaMovimento.itens');
                    $linhaSaida = $mat->saidaMovimento->itens->first();
                    if ($linhaSaida) {
                        $custoUnit = (string) $linhaSaida->valor_unitario;
                    }
                }
                $qtdeCusto = PadraoDecimal::roundHalfUp(
                    bcsub($req, $retorno, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
                $custoLinha = PadraoDecimal::roundHalfUp(
                    bcmul($qtdeCusto, $custoUnit, PadraoDecimal::SCALE_UNIT_PRICE + 4),
                    PadraoDecimal::SCALE_MONEY
                );
                $custoMateriais = PadraoDecimal::roundHalfUp(
                    bcadd($custoMateriais, $custoLinha, PadraoDecimal::SCALE_MONEY + 2),
                    PadraoDecimal::SCALE_MONEY
                );

                $retornoMovId = null;
                if (bccomp($retorno, '0', PadraoDecimal::SCALE_QTY) > 0) {
                    $produto = $mat->produto;
                    $ano = (int) now()->year;
                    $codigoMov = $this->codigos->nextCode($empresa->id, 'MOV-'.$ano, 5);
                    $aplicado = $this->saldos->aplicarEntradaUnitario(
                        $empresa,
                        $produto,
                        $retorno,
                        $custoUnit,
                        $this->loteRefDaSaida($mat)
                    );

                    $movRet = EstoqueMovimento::query()->create([
                        'empresa_id' => $empresa->id,
                        'codigo' => $codigoMov,
                        'tipo' => EstoqueMovimento::TIPO_ENTRADA_SOBRA,
                        'pedido_id' => $op->pedido_id,
                        'ordem_producao_id' => $op->id,
                        'conferido_em' => now(),
                        'conferido_por' => Auth::id(),
                        'observacao' => 'Retorno sobra '.$op->codigo,
                    ]);
                    EstoqueMovimentoItem::query()->create([
                        'movimento_id' => $movRet->id,
                        'produto_id' => $produto->id,
                        'lote_id' => $aplicado['lote_id'] ?? null,
                        'qtde' => $retorno,
                        'unidade' => $mat->unidade,
                        'valor_unitario' => $aplicado['valor_unitario'],
                        'valor_total' => $aplicado['valor_total'],
                        'custo_medio_apos' => $aplicado['custo_medio_apos'],
                        'ordem' => 1,
                    ]);
                    $retornoMovId = $movRet->id;
                }

                $mat->qtde_retorno = $retorno;
                $mat->qtde_perda = $perda;
                $mat->qtde_consumida = $consumida;
                $mat->retorno_movimento_id = $retornoMovId;
                $mat->save();
            }

            // Sem material requisitado: ainda permite concluir (serviço industrial leve / só PA)
            $paProduto = $item->produtoPa;
            if (! $paProduto) {
                $paProduto = Produto::query()
                    ->where('empresa_id', $empresa->id)
                    ->where('codigo', 'like', 'PA-ETQ%')
                    ->where('situacao', 'ATIVO')
                    ->orderBy('codigo')
                    ->first();
            }
            if (! $paProduto) {
                throw ValidationException::withMessages([
                    'produto_pa' => ['Cadastre um produto família PA-ETQ para entrada de acabado.'],
                ]);
            }

            $this->congelamento->assertProdutoLivre($empresa, (int) $paProduto->id, 'entrada de PA');

            $custoUnitPa = bccomp($qtdeBoa, '0', PadraoDecimal::SCALE_QTY) > 0
                ? PadraoDecimal::roundHalfUp(
                    bcdiv($custoMateriais, $qtdeBoa, PadraoDecimal::SCALE_UNIT_PRICE + 6),
                    PadraoDecimal::SCALE_UNIT_PRICE
                )
                : '0';

            $ano = (int) now()->year;
            $codigoPa = $this->codigos->nextCode($empresa->id, 'MOV-'.$ano, 5);
            $aplicadoPa = $this->saldos->aplicarEntradaUnitario($empresa, $paProduto, $qtdeBoa, $custoUnitPa);

            $movPa = EstoqueMovimento::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigoPa,
                'tipo' => EstoqueMovimento::TIPO_ENTRADA_PA,
                'pedido_id' => $op->pedido_id,
                'ordem_producao_id' => $op->id,
                'conferido_em' => now(),
                'conferido_por' => Auth::id(),
                'observacao' => 'PA '.$op->codigo.' · '.$item->descricao,
            ]);
            EstoqueMovimentoItem::query()->create([
                'movimento_id' => $movPa->id,
                'produto_id' => $paProduto->id,
                'qtde' => $qtdeBoa,
                'unidade' => $paProduto->unidade_interna ?? 'UN',
                'valor_unitario' => $aplicadoPa['valor_unitario'],
                'valor_total' => $aplicadoPa['valor_total'],
                'custo_medio_apos' => $aplicadoPa['custo_medio_apos'],
                'ordem' => 1,
            ]);

            $op->qtde_boa = $qtdeBoa;
            $op->qtde_refugo = $qtdeRefugo;
            $op->fora_tolerancia = $fora;
            $op->motivo_fora_tolerancia = $fora ? $motivoFora : null;
            $op->custo_materiais = $custoMateriais;
            $op->pa_movimento_id = $movPa->id;
            $op->status = OrdemProducao::STATUS_CONCLUIDA;
            $op->concluida_em = now();
            $op->concluida_por = Auth::id();
            if (! empty($data['observacao'])) {
                $op->observacao = trim((string) $data['observacao']);
            }
            $op->save();

            $item->qtde_produzida = $qtdeBoa;
            $item->qtde_faturavel = $qtdeBoa;
            $item->status = PedidoItem::STATUS_PRODUZIDO;
            if (! $item->produto_pa_id) {
                $item->produto_pa_id = $paProduto->id;
            }
            $item->save();

            $pedido->refresh();
            $pendentes = $pedido->itens()
                ->whereNotIn('status', [PedidoItem::STATUS_PRODUZIDO, PedidoItem::STATUS_CANCELADO])
                ->exists();
            if (! $pendentes) {
                $pedido->status = Pedido::STATUS_PRODUZIDO;
                $pedido->save();
            }

            // Readequação registrada no snapshot do PED (não recalcula ORC comercial).
            $snap = is_array($pedido->snapshot) ? $pedido->snapshot : [];
            $snap['readequacao'] = [
                'op_codigo' => $op->codigo,
                'qtde_pedida' => $pedida,
                'qtde_boa' => $qtdeBoa,
                'tolerancia_qtd_pct' => $tolPct,
                'fora_tolerancia' => $fora,
                'motivo' => $fora ? $motivoFora : null,
                'em' => now()->toIso8601String(),
            ];
            $pedido->snapshot = $snap;
            $pedido->save();

            return $op;
        });

        return $this->show($op->fresh());
    }

    /**
     * @param  list<array<string, mixed>>  $materiaisIn
     * @return array<string, mixed>
     */
    private function findMaterialInput(array $materiaisIn, int $materialId, int $produtoId): array
    {
        foreach ($materiaisIn as $row) {
            if (! is_array($row)) {
                continue;
            }
            if (isset($row['material_id']) && (int) $row['material_id'] === $materialId) {
                return $row;
            }
            if (isset($row['produto_id']) && (int) $row['produto_id'] === $produtoId) {
                return $row;
            }
        }

        return ['qtde_retorno' => '0', 'qtde_perda' => '0'];
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(OrdemProducao $o, bool $detalhe = false): array
    {
        $out = [
            'id' => $o->id,
            'codigo' => $o->codigo,
            'status' => $o->status,
            'qtde_planejada' => (string) $o->qtde_planejada,
            'qtde_boa' => $o->qtde_boa !== null ? (string) $o->qtde_boa : null,
            'qtde_refugo' => (string) $o->qtde_refugo,
            'fora_tolerancia' => (bool) $o->fora_tolerancia,
            'motivo_fora_tolerancia' => $o->motivo_fora_tolerancia,
            'custo_materiais' => $o->custo_materiais !== null ? (string) $o->custo_materiais : null,
            'pedido' => $o->pedido ? [
                'id' => $o->pedido->id,
                'codigo' => $o->pedido->codigo,
                'status' => $o->pedido->status,
                'tolerancia_qtd_pct' => isset($o->pedido->tolerancia_qtd_pct)
                    ? (string) $o->pedido->tolerancia_qtd_pct
                    : null,
            ] : null,
            'pedido_item' => $o->pedidoItem ? [
                'id' => $o->pedidoItem->id,
                'descricao' => $o->pedidoItem->descricao,
                'necessidade' => $o->pedidoItem->necessidade,
                'qtde_pedida' => (string) $o->pedidoItem->qtde_pedida,
            ] : null,
            'iniciada_em' => optional($o->iniciada_em)?->toIso8601String(),
            'concluida_em' => optional($o->concluida_em)?->toIso8601String(),
            'cancelada_em' => optional($o->cancelada_em)?->toIso8601String(),
            'motivo_cancelamento' => $o->motivo_cancelamento,
            'created_at' => optional($o->created_at)?->toIso8601String(),
        ];

        if ($detalhe) {
            $out['observacao'] = $o->observacao;
            $out['pode_devolver_ao_pedido'] = $this->podeDevolverAoPedido($o);
            $out['pa_movimento'] = $o->paMovimento ? [
                'id' => $o->paMovimento->id,
                'codigo' => $o->paMovimento->codigo,
                'tipo' => $o->paMovimento->tipo,
            ] : null;
            $out['parceiro'] = $o->pedido?->parceiro ? [
                'id' => $o->pedido->parceiro->id,
                'codigo' => $o->pedido->parceiro->codigo,
                'razao_social' => $o->pedido->parceiro->razao_social,
            ] : null;
            $out['materiais'] = $o->materiais->map(fn (OrdemProducaoMaterial $m) => [
                'id' => $m->id,
                'produto' => $m->produto ? [
                    'id' => $m->produto->id,
                    'codigo' => $m->produto->codigo,
                    'descricao_fiscal' => $m->produto->descricao_fiscal,
                    'unidade_interna' => $m->produto->unidade_interna,
                    'familia' => $m->produto->familia,
                ] : null,
                'componente' => $m->componente,
                'origem_texto' => $m->origem_texto,
                'qtde_planejada' => (string) $m->qtde_planejada,
                'qtde_requisitada' => (string) $m->qtde_requisitada,
                'qtde_consumida' => (string) $m->qtde_consumida,
                'qtde_retorno' => (string) $m->qtde_retorno,
                'qtde_perda' => (string) $m->qtde_perda,
                'unidade' => $m->unidade,
                'pendente' => $m->saida_movimento_id === null,
                'saida_movimento_id' => $m->saida_movimento_id,
                'retorno_movimento_id' => $m->retorno_movimento_id,
            ])->all();
            $out['rastreio'] = $this->rastreio->paraOp(
                Empresa::query()->findOrFail($o->empresa_id),
                $o
            );
        }

        return $out;
    }

    /**
     * Sobra volta ao lote da saída (primeiro FEFO). SKU sem lote → null.
     *
     * @return array<string, mixed>|null
     */
    private function loteRefDaSaida(OrdemProducaoMaterial $mat): ?array
    {
        if (! $mat->produto?->controla_lote) {
            return null;
        }

        $mat->loadMissing('saidaMovimento.itens.lote');
        $linha = $mat->saidaMovimento?->itens?->first(fn ($item) => $item->lote_id);
        $lote = $linha?->lote;
        if (! $lote) {
            return null;
        }

        return [
            'lote_id' => $lote->id,
            'codigo' => $lote->codigo,
            'data_entrada' => optional($lote->data_entrada)?->format('Y-m-d'),
            'data_validade' => optional($lote->data_validade)?->format('Y-m-d'),
            'data_fabricacao' => optional($lote->data_fabricacao)?->format('Y-m-d'),
            'origem_tipo' => \App\Models\EstoqueLote::ORIGEM_PRODUCAO,
        ];
    }

    /**
     * Sem MOV e sem quantidade já requisitada — único caso seguro para devolver.
     */
    private function podeDevolverAoPedido(OrdemProducao $op): bool
    {
        if (! in_array($op->status, OrdemProducao::STATUSES_ABERTOS, true)) {
            return false;
        }

        return ! $this->temMovimentoEstoque($op);
    }

    private function temMovimentoEstoque(OrdemProducao $op): bool
    {
        if ($op->pa_movimento_id) {
            return true;
        }

        $temRequisicao = OrdemProducaoMaterial::query()
            ->where('ordem_producao_id', $op->id)
            ->where(function ($q) {
                $q->whereNotNull('saida_movimento_id')
                    ->orWhere('qtde_requisitada', '>', 0);
            })
            ->exists();
        if ($temRequisicao) {
            return true;
        }

        return EstoqueMovimento::query()
            ->where('ordem_producao_id', $op->id)
            ->exists();
    }
}
