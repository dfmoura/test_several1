<?php

namespace App\Services\Producao;

use App\Models\Empresa;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueMovimentoItem;
use App\Models\EstoqueSaldo;
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
        private readonly PaEmbalagemService $embalagem,
        private readonly ProducaoColetaService $coleta,
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
            'materiais.produto:id,codigo,descricao_fiscal,unidade_interna,familia,controla_lote',
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
     * @param  array{produto_id?: int, material_id?: int, qtde?: string|number, complementar?: bool, volumes?: list<array{lote_id?: int, qtde?: string}>, volumes_motivo?: string}  $data
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
        $complementar = (bool) ($data['complementar'] ?? false);

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
            if ($matPendente->saida_movimento_id && ! $complementar) {
                throw ValidationException::withMessages([
                    'material_id' => ['Material já requisitado. Use requisição complementar para o mesmo SKU.'],
                ]);
            }
            if ($complementar && ! $matPendente->saida_movimento_id) {
                throw ValidationException::withMessages([
                    'complementar' => ['Requisite a saída planejada antes de complementar.'],
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

        $volumes = is_array($data['volumes'] ?? null) ? array_values($data['volumes']) : [];
        $volumesMotivo = isset($data['volumes_motivo']) ? trim((string) $data['volumes_motivo']) : '';
        if ($volumes !== []) {
            $this->coleta->validarOverride($empresa, $produto, $qtde, $volumes, $volumesMotivo);
        }
        $override = $volumes !== []
            && $produto->controla_lote
            && ! $this->saldos->alocacoesIguais(
                $this->saldos->sugerirAlocacaoSaida($empresa, $produto, $qtde),
                $volumes
            );

        $op = DB::transaction(function () use (
            $empresa, $op, $produto, $qtde, $matPendente, $complementar, $volumes, $volumesMotivo, $override
        ) {
            $op = OrdemProducao::query()->lockForUpdate()->findOrFail($op->id);

            $mat = $matPendente
                ? OrdemProducaoMaterial::query()->lockForUpdate()->findOrFail($matPendente->id)
                : OrdemProducaoMaterial::query()
                    ->where('ordem_producao_id', $op->id)
                    ->where('produto_id', $produto->id)
                    ->lockForUpdate()
                    ->first();

            $mesmoSkuJaBaixado = $mat && $mat->saida_movimento_id;
            if ($mesmoSkuJaBaixado && ! $complementar && $matPendente) {
                throw ValidationException::withMessages([
                    'produto_id' => ['Material já requisitado nesta OP. Use requisição complementar para o mesmo SKU.'],
                ]);
            }
            $fazerComplementar = $mesmoSkuJaBaixado && ($complementar || ! $matPendente);

            $ano = (int) now()->year;
            $codigoMov = $this->codigos->nextCode($empresa->id, 'MOV-'.$ano, 5);
            $aplicado = $this->saldos->aplicarSaida(
                $empresa,
                $produto,
                $qtde,
                null,
                $volumes !== [] ? $volumes : null
            );

            $obs = ($fazerComplementar ? 'Complemento para ' : 'Saída para ').$op->codigo;
            if ($override && $volumesMotivo !== '') {
                $obs .= ' · Volume fora da sugestão FEFO: '.$volumesMotivo;
            }

            $mov = EstoqueMovimento::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigoMov,
                'tipo' => EstoqueMovimento::TIPO_SAIDA_PRODUCAO,
                'pedido_id' => $op->pedido_id,
                'ordem_producao_id' => $op->id,
                'conferido_em' => now(),
                'conferido_por' => Auth::id(),
                'observacao' => $obs,
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
            } elseif ($fazerComplementar) {
                $mat->qtde_requisitada = PadraoDecimal::roundHalfUp(
                    bcadd((string) $mat->qtde_requisitada, $qtde, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
                $mat->unidade = $produto->unidade_interna ?? 'UN';
                $mat->save();
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
            }
            if ($op->insumos_entregues_em !== null) {
                $op->insumos_entregues_em = null;
                $op->insumos_entregues_por = null;
                $op->insumos_recebidos_nome = null;
            }
            if ($op->isDirty()) {
                $op->save();
            }

            return $op;
        });

        return $this->show($op->fresh());
    }

    /**
     * Requisita todas as linhas pendentes (qtde_planejada).
     * Pré-checa saldo de todas as linhas — não baixa parcialmente se alguma faltar.
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
            ->with('produto:id,codigo')
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

        $this->assertSaldoSuficienteParaPendentes($empresa, $pendentes);

        foreach ($pendentes as $mat) {
            $this->requisitarMaterial($empresa, $op->fresh(), [
                'material_id' => $mat->id,
                'qtde' => (string) $mat->qtde_planejada,
            ]);
        }

        return $this->show($op->fresh());
    }

    /**
     * @param  \Illuminate\Support\Collection<int, OrdemProducaoMaterial>  $pendentes
     */
    private function assertSaldoSuficienteParaPendentes(Empresa $empresa, $pendentes): void
    {
        $produtoIds = $pendentes->pluck('produto_id')->map(fn ($id) => (int) $id)->unique()->values()->all();
        $saldos = EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('produto_id', $produtoIds)
            ->get(['produto_id', 'qtde'])
            ->keyBy('produto_id');

        // Soma necessidade por SKU (várias linhas do mesmo produto).
        $necessidadePorSku = [];
        foreach ($pendentes as $mat) {
            $pid = (int) $mat->produto_id;
            $necessidadePorSku[$pid] = isset($necessidadePorSku[$pid])
                ? bcadd($necessidadePorSku[$pid], (string) $mat->qtde_planejada, PadraoDecimal::SCALE_QTY)
                : PadraoDecimal::roundHalfUp((string) $mat->qtde_planejada, PadraoDecimal::SCALE_QTY);
        }

        $faltas = [];
        foreach ($pendentes as $mat) {
            $pid = (int) $mat->produto_id;
            $disponivel = $saldos->get($pid)
                ? PadraoDecimal::roundHalfUp((string) $saldos->get($pid)->qtde, PadraoDecimal::SCALE_QTY)
                : PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);
            $necessidade = $necessidadePorSku[$pid];
            if (bccomp($disponivel, $necessidade, PadraoDecimal::SCALE_QTY) < 0) {
                $codigo = $mat->produto?->codigo ?? (string) $pid;
                $faltante = PadraoDecimal::roundHalfUp(
                    bcsub($necessidade, $disponivel, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
                $faltas[$pid] = "{$codigo}: precisa {$necessidade}, disponível {$disponivel} (falta {$faltante})";
            }
        }

        if ($faltas !== []) {
            throw ValidationException::withMessages([
                'materiais' => [
                    'Saldo insuficiente para requisitar todas as saídas — nenhuma baixa foi feita. '
                    .implode('; ', array_values($faltas))
                    .'. Abasteça o estoque (Compras) e tente de novo.',
                ],
            ]);
        }
    }

    /**
     * Avaria na separação: material já baixado, danificado antes da máquina.
     * Não escreve saldo (já saiu em SAIDA_PRODUCAO). Não é perda de processo.
     *
     * @param  array{material_id?: int, qtde?: mixed, motivo?: string}  $data
     * @return array<string, mixed>
     */
    public function registrarAvaria(Empresa $empresa, OrdemProducao $op, array $data): array
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
        $qtde = PadraoDecimal::parseStrict((string) ($data['qtde'] ?? ''), PadraoDecimal::SCALE_QTY);
        $motivo = trim((string) ($data['motivo'] ?? ''));

        if ($materialId <= 0 || $qtde === null || bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) < 0) {
            throw ValidationException::withMessages([
                'qtde' => ['Informe a linha e a quantidade de avaria (zero limpa o apontamento).'],
            ]);
        }

        if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) > 0 && mb_strlen($motivo) < 3) {
            throw ValidationException::withMessages([
                'motivo' => ['Informe o motivo da avaria (mínimo 3 caracteres).'],
            ]);
        }

        $op = DB::transaction(function () use ($empresa, $op, $materialId, $qtde, $motivo) {
            $op = OrdemProducao::query()->lockForUpdate()->findOrFail($op->id);
            if ($op->empresa_id !== $empresa->id) {
                abort(404);
            }

            $mat = OrdemProducaoMaterial::query()
                ->where('ordem_producao_id', $op->id)
                ->where('id', $materialId)
                ->lockForUpdate()
                ->first();
            if (! $mat) {
                throw ValidationException::withMessages([
                    'material_id' => ['Material não pertence a esta OP.'],
                ]);
            }
            if (! $mat->saida_movimento_id) {
                throw ValidationException::withMessages([
                    'material_id' => ['Requisite a saída antes de apontar avaria — o material precisa ter saído do estoque.'],
                ]);
            }

            $req = (string) $mat->qtde_requisitada;
            if (bccomp($qtde, $req, PadraoDecimal::SCALE_QTY) > 0) {
                throw ValidationException::withMessages([
                    'qtde' => ["Avaria ({$qtde}) não pode exceder o requisitado ({$req})."],
                ]);
            }

            $mat->qtde_avaria = $qtde;
            if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                $mat->motivo_avaria = null;
                $mat->avaria_em = null;
                $mat->avaria_por = null;
            } else {
                $mat->motivo_avaria = $motivo;
                $mat->avaria_em = now();
                $mat->avaria_por = Auth::id();
            }
            $mat->save();

            return $op;
        });

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

            /** @var list<array{mat: OrdemProducaoMaterial, retorno: string, perda: string, consumida: string, custo_unit: string, qtde_custo: string, custo_linha: string}> $destinos */
            $destinos = [];
            $temConsumo = false;
            $temMpBaixado = false;
            $temConsumoMp = false;

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
                $avaria = PadraoDecimal::roundHalfUp((string) ($mat->qtde_avaria ?? '0'), PadraoDecimal::SCALE_QTY);
                $paraProcesso = PadraoDecimal::roundHalfUp(
                    bcsub($req, $avaria, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
                if (bccomp($paraProcesso, '0', PadraoDecimal::SCALE_QTY) < 0) {
                    $paraProcesso = '0.0000';
                }

                $soma = bcadd($retorno, $perda, PadraoDecimal::SCALE_QTY + 4);
                if (bccomp($soma, $paraProcesso, PadraoDecimal::SCALE_QTY) > 0) {
                    throw ValidationException::withMessages([
                        'materiais' => [
                            "Retorno+perda de processo ({$soma}) excedem o papel da máquina ({$paraProcesso}) no SKU {$mat->produto?->codigo} (requisitado {$req} − avaria {$avaria}).",
                        ],
                    ]);
                }

                $consumida = PadraoDecimal::roundHalfUp(
                    bcsub($paraProcesso, $soma, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
                if (bccomp($consumida, '0', PadraoDecimal::SCALE_QTY) > 0) {
                    $temConsumo = true;
                }

                $familia = strtoupper((string) ($mat->produto?->familia ?? ''));
                $componente = strtoupper((string) ($mat->componente ?? ''));
                $ehMp = $familia === 'MP' || $componente === 'PAPEL';
                if ($ehMp) {
                    $temMpBaixado = true;
                    if (bccomp($consumida, '0', PadraoDecimal::SCALE_QTY) > 0) {
                        $temConsumoMp = true;
                    }
                }

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

                $destinos[] = [
                    'mat' => $mat,
                    'retorno' => $retorno,
                    'perda' => $perda,
                    'consumida' => $consumida,
                    'custo_unit' => $custoUnit,
                    'qtde_custo' => $qtdeCusto,
                    'custo_linha' => $custoLinha,
                ];
            }

            // Sem material para produzir: consumo zero total OU substrato (MP/PAPEL) zerado.
            if ($materiaisBaixados->isNotEmpty() && ! $temConsumo) {
                throw ValidationException::withMessages([
                    'materiais' => [
                        'Consumo zero em todos os materiais baixados — sem material consumido não há produção a concluir. Ajuste retorno/perda para deixar consumo > 0 em ao menos um SKU, ou devolva a OP ao pedido se a ordem não segue.',
                    ],
                ]);
            }
            if ($temMpBaixado && ! $temConsumoMp) {
                throw ValidationException::withMessages([
                    'materiais' => [
                        'Sem consumo de material de produção (MP/papel) — perda/retorno cobriram 100% do substrato. Sem material para produzir não é possível concluir a OP. Ajuste o apontamento do papel ou devolva a OP ao pedido.',
                    ],
                ]);
            }

            $this->assertPapelSuficienteParaQtdeBoa(
                $destinos,
                (string) $op->qtde_planejada,
                $qtdeBoa,
                $tolPct,
            );

            foreach ($destinos as $dest) {
                /** @var OrdemProducaoMaterial $mat */
                $mat = $dest['mat'];
                $retorno = $dest['retorno'];
                $perda = $dest['perda'];
                $consumida = $dest['consumida'];
                $custoUnit = $dest['custo_unit'];

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
     * Papel/MP consumido tem de cobrir a quantidade boa (rendimento do empenho).
     * Sem isso dá para apontar perda alta e ainda registrar PA — etiqueta sem substrato.
     * Faixa mínima = necessário × (1 − tol%), a mesma tolerância do PED.
     *
     * @param  list<array{mat: OrdemProducaoMaterial, consumida: string}>  $destinos
     */
    private function assertPapelSuficienteParaQtdeBoa(
        array $destinos,
        string $qtdePlanejadaOp,
        string $qtdeBoa,
        string $tolPct,
    ): void {
        if (bccomp($qtdePlanejadaOp, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            return;
        }

        $papeis = [];
        foreach ($destinos as $dest) {
            $mat = $dest['mat'];
            $componente = strtoupper((string) ($mat->componente ?? ''));
            if ($componente === 'PAPEL') {
                $papeis[] = $dest;
            }
        }
        if ($papeis === []) {
            foreach ($destinos as $dest) {
                $familia = strtoupper((string) ($dest['mat']->produto?->familia ?? ''));
                if ($familia === 'MP') {
                    $papeis[] = $dest;
                }
            }
        }
        if ($papeis === []) {
            return;
        }

        $empenhoSoma = '0';
        $consSoma = '0';
        foreach ($papeis as $dest) {
            $planejadaLinha = (string) $dest['mat']->qtde_planejada;
            $baseLinha = bccomp($planejadaLinha, '0', PadraoDecimal::SCALE_QTY) > 0
                ? $planejadaLinha
                : (string) $dest['mat']->qtde_requisitada;
            $empenhoSoma = bcadd($empenhoSoma, $baseLinha, PadraoDecimal::SCALE_QTY + 4);
            $consSoma = bcadd($consSoma, (string) $dest['consumida'], PadraoDecimal::SCALE_QTY + 4);
        }
        $empenhoSoma = PadraoDecimal::roundHalfUp($empenhoSoma, PadraoDecimal::SCALE_QTY);
        $consSoma = PadraoDecimal::roundHalfUp($consSoma, PadraoDecimal::SCALE_QTY);
        if (bccomp($empenhoSoma, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            return;
        }

        $fracaoBoa = bcdiv($qtdeBoa, $qtdePlanejadaOp, 8);
        $necessario = PadraoDecimal::roundHalfUp(
            bcmul($empenhoSoma, $fracaoBoa, PadraoDecimal::SCALE_QTY + 4),
            PadraoDecimal::SCALE_QTY
        );
        $tolFrac = bcdiv($tolPct, '100', 8);
        $minimo = PadraoDecimal::roundHalfUp(
            bcmul($necessario, bcsub('1', $tolFrac, 8), PadraoDecimal::SCALE_QTY + 4),
            PadraoDecimal::SCALE_QTY
        );
        if (bccomp($minimo, '0', PadraoDecimal::SCALE_QTY) < 0) {
            $minimo = '0';
        }

        if (bccomp($consSoma, $minimo, PadraoDecimal::SCALE_QTY) < 0) {
            throw ValidationException::withMessages([
                'materiais' => [
                    "Papel insuficiente para a quantidade boa: consumido {$consSoma}, necessário pelo menos {$minimo} (rendimento da OP ±{$tolPct}%). Avaria da separação não entra no consumo de processo. Sem substrato correspondente não há etiqueta a concluir. Requisite papel complementar, reduza a quantidade boa ou ajuste retorno/perda de processo.",
                ],
            ]);
        }
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
            $emp = Empresa::query()->findOrFail($o->empresa_id);
            $dispon = $this->disponibilidadeMateriais($emp, $o);
            $out['materiais'] = $dispon['materiais'];
            $out['disponibilidade'] = $dispon['resumo'];
            $out['rastreio'] = $this->rastreio->paraOp($emp, $o);
            $emb = $this->embalagem->vigenteDaOp($emp, $o);
            $out['embalagem'] = $emb
                ? $this->embalagem->toOut($emb->load(['bobinas', 'caixas']))
                : null;
            $out['pode_embalar'] = $o->status === OrdemProducao::STATUS_CONCLUIDA;
            $out['handoff'] = $this->coleta->handoffToOut($o);
            $out['pode_entregar_insumos'] = in_array($o->status, OrdemProducao::STATUSES_ABERTOS, true)
                && $o->insumos_entregues_em === null
                && $o->materiais->contains(fn (OrdemProducaoMaterial $m) => $m->saida_movimento_id !== null);
        }

        return $out;
    }

    /**
     * Transparência de saldo na OP (leitura) — não reserva nem cria NEC.
     *
     * @return array{
     *   materiais: list<array<string, mixed>>,
     *   resumo: array{
     *     aguardando_material: bool,
     *     linhas_com_faltante: int,
     *     componentes_nao_casados: list<array{componente: string, origem_texto: string, motivo: string}>
     *   }
     * }
     */
    private function disponibilidadeMateriais(Empresa $empresa, OrdemProducao $o): array
    {
        $produtoIds = $o->materiais
            ->pluck('produto_id')
            ->map(fn ($id) => (int) $id)
            ->unique()
            ->values()
            ->all();

        $saldos = $produtoIds === []
            ? collect()
            : EstoqueSaldo::query()
                ->where('empresa_id', $empresa->id)
                ->whereIn('produto_id', $produtoIds)
                ->get(['produto_id', 'qtde'])
                ->keyBy('produto_id');

        $linhasComFaltante = 0;
        $materiais = $o->materiais->map(function (OrdemProducaoMaterial $m) use ($empresa, $o, $saldos, &$linhasComFaltante) {
            $pendente = $m->saida_movimento_id === null;
            $disponivel = $saldos->get((int) $m->produto_id)
                ? PadraoDecimal::roundHalfUp((string) $saldos->get((int) $m->produto_id)->qtde, PadraoDecimal::SCALE_QTY)
                : PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);
            $planejada = PadraoDecimal::roundHalfUp((string) $m->qtde_planejada, PadraoDecimal::SCALE_QTY);
            $faltante = '0.0000';
            if ($pendente && bccomp($planejada, '0', PadraoDecimal::SCALE_QTY) > 0) {
                $faltante = bccomp($disponivel, $planejada, PadraoDecimal::SCALE_QTY) < 0
                    ? PadraoDecimal::roundHalfUp(
                        bcsub($planejada, $disponivel, PadraoDecimal::SCALE_QTY + 4),
                        PadraoDecimal::SCALE_QTY
                    )
                    : PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);
            }
            $aguardando = $pendente && bccomp($faltante, '0', PadraoDecimal::SCALE_QTY) > 0;
            if ($aguardando) {
                $linhasComFaltante++;
            }

            return [
                'id' => $m->id,
                'produto' => $m->produto ? [
                    'id' => $m->produto->id,
                    'codigo' => $m->produto->codigo,
                    'descricao_fiscal' => $m->produto->descricao_fiscal,
                    'unidade_interna' => $m->produto->unidade_interna,
                    'familia' => $m->produto->familia,
                    'controla_lote' => (bool) $m->produto->controla_lote,
                ] : null,
                'componente' => $m->componente,
                'origem_texto' => $m->origem_texto,
                'qtde_planejada' => (string) $m->qtde_planejada,
                'qtde_requisitada' => (string) $m->qtde_requisitada,
                'qtde_avaria' => (string) ($m->qtde_avaria ?? '0'),
                'motivo_avaria' => $m->motivo_avaria,
                'avaria_em' => optional($m->avaria_em)?->toIso8601String(),
                'qtde_consumida' => (string) $m->qtde_consumida,
                'qtde_retorno' => (string) $m->qtde_retorno,
                'qtde_perda' => (string) $m->qtde_perda,
                'unidade' => $m->unidade,
                'pendente' => $pendente,
                'qtde_disponivel' => $disponivel,
                'qtde_faltante' => $faltante,
                'aguardando_material' => $aguardando,
                'saida_movimento_id' => $m->saida_movimento_id,
                'retorno_movimento_id' => $m->retorno_movimento_id,
                'retirada' => $m->produto ? $this->coleta->daLinha($empresa, $o, $m) : null,
            ];
        })->all();

        $naoCasados = [];
        if ($o->pedido && $o->pedidoItem
            && in_array($o->status, OrdemProducao::STATUSES_ABERTOS, true)
        ) {
            $naoCasados = $this->bom->naoCasados($empresa, $o->pedido, $o->pedidoItem);
        }

        return [
            'materiais' => $materiais,
            'resumo' => [
                'aguardando_material' => $linhasComFaltante > 0,
                'linhas_com_faltante' => $linhasComFaltante,
                'componentes_nao_casados' => $naoCasados,
            ],
        ];
    }

    /**
     * Fila do almoxarifado (leitura) — ADR coleta dirigida Fase B.
     *
     * @return array<string, mixed>
     */
    public function filaRetiradas(Empresa $empresa): array
    {
        return $this->coleta->fila($empresa);
    }

    /**
     * Material já baixado chega na máquina (Fase C). Sem segundo MOV.
     *
     * @param  array{recebido_por: string}  $data
     * @return array<string, mixed>
     */
    public function entregarInsumos(Empresa $empresa, OrdemProducao $op, array $data): array
    {
        if ($op->empresa_id !== $empresa->id) {
            abort(404);
        }
        if (! in_array($op->status, OrdemProducao::STATUSES_ABERTOS, true)) {
            throw ValidationException::withMessages([
                'status' => ['OP deve estar ABERTA ou EM_ANDAMENTO.'],
            ]);
        }

        $nome = trim((string) ($data['recebido_por'] ?? ''));
        if (mb_strlen($nome) < 2) {
            throw ValidationException::withMessages([
                'recebido_por' => ['Informe quem recebeu na produção (mínimo 2 caracteres).'],
            ]);
        }

        $op = DB::transaction(function () use ($op, $nome) {
            $op = OrdemProducao::query()->lockForUpdate()->findOrFail($op->id);
            $temSaida = OrdemProducaoMaterial::query()
                ->where('ordem_producao_id', $op->id)
                ->whereNotNull('saida_movimento_id')
                ->exists();
            if (! $temSaida) {
                throw ValidationException::withMessages([
                    'materiais' => ['Não há saída requisitada para entregar na produção.'],
                ]);
            }
            if ($op->insumos_entregues_em !== null) {
                throw ValidationException::withMessages([
                    'handoff' => ['Esta retirada já foi entregue na produção.'],
                ]);
            }
            $op->insumos_entregues_em = now();
            $op->insumos_entregues_por = Auth::id();
            $op->insumos_recebidos_nome = $nome;
            $op->save();

            return $op;
        });

        return $this->show($op->fresh());
    }

    /**
     * Preview da retirada (qtde custom — complementar / extra).
     *
     * @return array<string, mixed>
     */
    public function previewRetirada(
        Empresa $empresa,
        OrdemProducao $op,
        array $data,
    ): array {
        if ($op->empresa_id !== $empresa->id) {
            abort(404);
        }

        $materialId = isset($data['material_id']) ? (int) $data['material_id'] : 0;
        $produtoId = isset($data['produto_id']) ? (int) $data['produto_id'] : 0;
        $qtdeRaw = $data['qtde'] ?? null;

        if ($materialId > 0) {
            $mat = OrdemProducaoMaterial::query()
                ->with('produto')
                ->where('ordem_producao_id', $op->id)
                ->where('id', $materialId)
                ->first();
            if (! $mat) {
                throw ValidationException::withMessages([
                    'material_id' => ['Material não pertence a esta OP.'],
                ]);
            }

            return $this->coleta->daLinha(
                $empresa,
                $op,
                $mat,
                $qtdeRaw !== null && $qtdeRaw !== '' ? (string) $qtdeRaw : null,
            );
        }

        if ($produtoId <= 0) {
            throw ValidationException::withMessages([
                'material_id' => ['Informe material_id ou produto_id.'],
            ]);
        }

        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $produtoId)
            ->first();
        if (! $produto) {
            throw ValidationException::withMessages([
                'produto_id' => ['Produto não encontrado nesta empresa.'],
            ]);
        }

        $qtde = PadraoDecimal::parseStrict((string) ($qtdeRaw ?? ''), PadraoDecimal::SCALE_QTY);
        if ($qtde === null || bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'qtde' => ['Informe a quantidade da retirada.'],
            ]);
        }

        $out = $this->coleta->preview($empresa, $produto, $qtde);
        $out['volumes_baixados'] = $this->coleta->volumesBaixados($empresa, $op, $produto->id);

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
