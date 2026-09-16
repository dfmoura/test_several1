<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueAjuste;
use App\Models\EstoqueEndereco;
use App\Models\EstoqueInventarioItem;
use App\Models\EstoqueLote;
use App\Models\EstoqueMovimento;
use App\Models\EstoqueMovimentoItem;
use App\Models\EstoqueSaldo;
use App\Models\Produto;
use App\Models\User;
use App\Services\Codigo\CodigoGenerator;
use App\Support\NfeExactDimensoes;
use App\Support\OcPedidoDetalhe;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Contagem → AJU PENDENTE → alçada SoD → MOV AJUSTE (BL-036 / BL-042 / estudo 32).
 */
class EstoqueAjusteService
{
    public function __construct(
        private readonly CodigoGenerator $codigos,
        private readonly EstoqueSaldoWriter $saldos,
        private readonly EstoqueEntradaService $entrada,
        private readonly EstoqueAjusteAlcada $alcadaCalc,
        private readonly EstoqueCongelamento $congelamento,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(
        Empresa $empresa,
        ?string $status = null,
        ?string $q = null,
        ?string $de = null,
        ?string $ate = null,
    ): array {
        $query = EstoqueAjuste::query()
            ->with([
                'produto:id,codigo,descricao_fiscal,familia,unidade_interna',
                'solicitadoPorUser:id,name',
                'aprovadoPorUser:id,name',
                'movimento:id,codigo,tipo',
                'inventarioItem:id,inventario_id',
                ...EstoqueAjuste::userStampWith(),
            ])
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('id');

        if ($status) {
            $query->where('status', $status);
        }

        if ($de) {
            $query->whereDate('created_at', '>=', $de);
        }
        if ($ate) {
            $query->whereDate('created_at', '<=', $ate);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($inner) use ($like) {
                $inner->where('codigo', 'like', $like)
                    ->orWhere('motivo_codigo', 'like', $like)
                    ->orWhereHas('produto', function ($pq) use ($like) {
                        $pq->where('codigo', 'like', $like)
                            ->orWhere('descricao_fiscal', 'like', $like);
                    });
            });
        }

        return $query->get()->map(fn (EstoqueAjuste $a) => $this->toOut($a))->all();
    }

    /**
     * Contagem avulsa (bloqueada se SKU congelado por INV).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Empresa $empresa, array $data): array
    {
        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', (int) $data['produto_id'])
            ->first();

        if (! $produto) {
            throw ValidationException::withMessages([
                'produto_id' => ['Produto inválido para a empresa.'],
            ]);
        }

        $this->congelamento->assertProdutoLivre($empresa, $produto->id, 'solicitação de ajuste');

        $origem = $data['origem'] ?? EstoqueAjuste::ORIGEM_CONTAGEM_AVULSA;
        if ($origem !== EstoqueAjuste::ORIGEM_CONTAGEM_AVULSA) {
            throw ValidationException::withMessages([
                'origem' => ['Use inventário para origens INV_*/VIRADA.'],
            ]);
        }

        if (! ($data['checklist_confirmado'] ?? false)) {
            throw ValidationException::withMessages([
                'checklist_confirmado' => [
                    'Confirme o checklist (NF pendente, OP, sobra, endereço) antes de solicitar ajuste.',
                ],
            ]);
        }

        $motivo = $this->assertMotivo($data);
        $qtdeContada = $this->parseQtdeContada($data['qtde_contada'] ?? null);

        $saldo = EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->first();

        $qtdeSistema = $saldo
            ? PadraoDecimal::roundHalfUp((string) $saldo->qtde, PadraoDecimal::SCALE_QTY)
            : PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);

        $diferenca = PadraoDecimal::roundHalfUp(
            bcsub($qtdeContada, $qtdeSistema, PadraoDecimal::SCALE_QTY + 4),
            PadraoDecimal::SCALE_QTY
        );

        if (bccomp($diferenca, '0', PadraoDecimal::SCALE_QTY) === 0) {
            throw ValidationException::withMessages([
                'qtde_contada' => ['Contagem igual ao saldo — ajuste desnecessário.'],
            ]);
        }

        $meta = $this->alcadaCalc->calcular($empresa, $produto, $qtdeSistema, $diferenca, $origem);

        $lotePayload = $this->normalizarLotePayloadVirada(
            $produto,
            isset($data['lote_payload']) && is_array($data['lote_payload']) ? $data['lote_payload'] : null,
            $motivo['codigo'],
            $origem,
            $diferenca
        );

        $usaPayload = $lotePayload !== null && $lotePayload !== [];

        $contagemEvidencia = $this->normalizarContagemEvidencia(
            $empresa,
            $produto,
            isset($data['contagem_evidencia']) && is_array($data['contagem_evidencia'])
                ? $data['contagem_evidencia']
                : null,
            $motivo['codigo'],
            $qtdeContada,
            $usaPayload
        );

        $ajuste = DB::transaction(function () use (
            $empresa,
            $produto,
            $origem,
            $motivo,
            $data,
            $qtdeSistema,
            $qtdeContada,
            $diferenca,
            $meta,
            $lotePayload,
            $usaPayload,
            $contagemEvidencia
        ) {
            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'AJU-'.$ano, 5);

            return EstoqueAjuste::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'produto_id' => $produto->id,
                'lote_id' => $usaPayload ? null : (isset($data['lote_id']) ? (int) $data['lote_id'] : null),
                'lote_codigo' => $usaPayload ? null : $this->nullIfEmpty($data['lote_codigo'] ?? null),
                'lote_data_entrada' => $usaPayload ? null : ($data['lote_data_entrada'] ?? null),
                'lote_data_fabricacao' => $usaPayload ? null : ($data['lote_data_fabricacao'] ?? null),
                'lote_data_validade' => $usaPayload ? null : ($data['lote_data_validade'] ?? null),
                'lote_payload' => $lotePayload,
                'contagem_evidencia' => $contagemEvidencia,
                'inventario_item_id' => null,
                'origem' => $origem,
                'motivo_codigo' => $motivo['codigo'],
                'motivo_complemento' => $motivo['complemento'],
                'qtde_sistema' => $qtdeSistema,
                'qtde_contada' => $qtdeContada,
                'qtde_diferenca' => $diferenca,
                'valor_ajuste' => $meta['valor_ajuste'],
                'alcada' => $meta['alcada'],
                'unidade' => $produto->unidade_interna ?? 'UN',
                'checklist_confirmado' => true,
                'status' => EstoqueAjuste::STATUS_PENDENTE,
                'solicitado_por' => Auth::id(),
                'observacao' => $this->nullIfEmpty($data['observacao'] ?? null),
                'causa_raiz' => $this->nullIfEmpty($data['causa_raiz'] ?? null),
                'divergencia_relevante' => $meta['divergencia_relevante'],
                'ciencia_diretoria' => false,
                'ciencia_contabilidade' => false,
            ]);
        });

        return $this->toOut($ajuste->fresh());
    }

    /**
     * AJU gerado a partir de item de inventário (sem checar congelamento).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function createFromInventario(Empresa $empresa, EstoqueInventarioItem $item, array $data): array
    {
        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $item->produto_id)
            ->firstOrFail();

        $motivo = $this->assertMotivo($data);
        $origem = (string) $data['origem'];
        $qtdeSistema = PadraoDecimal::roundHalfUp((string) $data['qtde_sistema'], PadraoDecimal::SCALE_QTY);
        $qtdeContada = PadraoDecimal::roundHalfUp((string) $data['qtde_contada'], PadraoDecimal::SCALE_QTY);
        $diferenca = PadraoDecimal::roundHalfUp(
            bcsub($qtdeContada, $qtdeSistema, PadraoDecimal::SCALE_QTY + 4),
            PadraoDecimal::SCALE_QTY
        );

        if (bccomp($diferenca, '0', PadraoDecimal::SCALE_QTY) === 0) {
            throw ValidationException::withMessages([
                'qtde_contada' => ['Contagem igual ao saldo — ajuste desnecessário.'],
            ]);
        }

        $meta = $this->alcadaCalc->calcular($empresa, $produto, $qtdeSistema, $diferenca, $origem);

        $lotePayload = $this->normalizarLotePayloadVirada(
            $produto,
            isset($data['lote_payload']) && is_array($data['lote_payload']) ? $data['lote_payload'] : null,
            $motivo['codigo'],
            $origem,
            $diferenca
        );

        $ajuste = DB::transaction(function () use (
            $empresa,
            $produto,
            $item,
            $origem,
            $motivo,
            $data,
            $qtdeSistema,
            $qtdeContada,
            $diferenca,
            $meta,
            $lotePayload
        ) {
            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'AJU-'.$ano, 5);

            return EstoqueAjuste::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'produto_id' => $produto->id,
                'inventario_item_id' => $item->id,
                'origem' => $origem,
                'motivo_codigo' => $motivo['codigo'],
                'motivo_complemento' => $motivo['complemento'],
                'qtde_sistema' => $qtdeSistema,
                'qtde_contada' => $qtdeContada,
                'qtde_diferenca' => $diferenca,
                'valor_ajuste' => $meta['valor_ajuste'],
                'alcada' => $meta['alcada'],
                'unidade' => $produto->unidade_interna ?? 'UN',
                'checklist_confirmado' => true,
                'status' => EstoqueAjuste::STATUS_PENDENTE,
                'solicitado_por' => Auth::id(),
                'observacao' => $this->nullIfEmpty($data['observacao'] ?? null),
                'causa_raiz' => $this->nullIfEmpty($data['causa_raiz'] ?? null),
                'divergencia_relevante' => $meta['divergencia_relevante'],
                'ciencia_diretoria' => false,
                'ciencia_contabilidade' => false,
                'lote_payload' => $lotePayload,
            ]);
        });

        return $this->toOut($ajuste->fresh());
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function aprovar(Empresa $empresa, EstoqueAjuste $ajuste, User $aprovador, array $data = []): array
    {
        $this->assertEmpresa($empresa, $ajuste);

        if ($ajuste->status !== EstoqueAjuste::STATUS_PENDENTE) {
            throw ValidationException::withMessages([
                'status' => ['Somente ajuste PENDENTE pode ser aprovado.'],
            ]);
        }

        if ($ajuste->solicitado_por && (int) $ajuste->solicitado_por === (int) $aprovador->id) {
            throw ValidationException::withMessages([
                'aprovador' => ['Quem solicitou o ajuste não pode aprová-lo (SoD).'],
            ]);
        }

        $this->assertContadoresNaoAprovam($ajuste, $aprovador);
        $this->assertAlcada($ajuste, $aprovador, $data);

        if ($ajuste->divergencia_relevante) {
            $causa = $this->nullIfEmpty($data['causa_raiz'] ?? $ajuste->causa_raiz);
            if ($causa === null) {
                throw ValidationException::withMessages([
                    'causa_raiz' => ['Divergência relevante exige registro de causa raiz antes de aprovar.'],
                ]);
            }
            $ajuste->causa_raiz = $causa;
        }

        if (($data['ciencia_diretoria'] ?? false) || $ajuste->ciencia_diretoria) {
            $ajuste->ciencia_diretoria = true;
        }
        if (($data['ciencia_contabilidade'] ?? false) || $ajuste->ciencia_contabilidade) {
            $ajuste->ciencia_contabilidade = true;
        }

        if ($ajuste->alcada === EstoqueAjuste::ALCADA_DIRECAO) {
            if (! $ajuste->ciencia_diretoria || ! $ajuste->ciencia_contabilidade) {
                throw ValidationException::withMessages([
                    'ciencia' => [
                        'Alçada DIREÇÃO exige ciência da diretoria e da contabilidade.',
                    ],
                ]);
            }
        }

        $movimento = DB::transaction(function () use ($empresa, $ajuste, $aprovador) {
            $ajuste = EstoqueAjuste::query()->lockForUpdate()->findOrFail($ajuste->id);
            $produto = Produto::query()->lockForUpdate()->findOrFail($ajuste->produto_id);

            $delta = (string) $ajuste->qtde_diferenca;
            $loteRef = $this->loteRefFromAjuste($ajuste);
            $aplicado = $this->saldos->aplicarAjuste(
                $empresa,
                $produto,
                $delta,
                $loteRef,
                is_array($ajuste->lote_payload) && $ajuste->lote_payload !== []
                    ? $ajuste->lote_payload
                    : null
            );

            $ano = (int) now()->year;
            $codigoMov = $this->codigos->nextCode($empresa->id, 'MOV-'.$ano, 5);

            $movimento = EstoqueMovimento::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigoMov,
                'tipo' => EstoqueMovimento::TIPO_AJUSTE,
                'ordem_compra_id' => null,
                'fornecedor_id' => null,
                'nf_chave' => null,
                'nf_numero' => null,
                'nf_data' => null,
                'conferido_em' => now(),
                'conferido_por' => $aprovador->id,
                'observacao' => sprintf(
                    'AJU %s · %s · Δ %s %s · R$ %s',
                    $ajuste->codigo,
                    $ajuste->motivo_codigo,
                    $delta,
                    $ajuste->unidade,
                    $ajuste->valor_ajuste ?? '0.00'
                ),
                'motivo_codigo' => $ajuste->motivo_codigo,
                'ajuste_id' => $ajuste->id,
            ]);

            $alocacoes = $aplicado['alocacoes'] ?? [['lote_id' => null, 'qtde' => $aplicado['valor_total']]];
            $ordem = 1;
            $n = count($alocacoes);
            $valorRestante = $aplicado['valor_total'];
            foreach ($alocacoes as $i => $aloc) {
                $qtdeLinha = (string) $aloc['qtde'];
                if ($i === $n - 1) {
                    $valorLinha = $valorRestante;
                } else {
                    $valorLinha = PadraoDecimal::roundHalfUp(
                        bcmul($qtdeLinha, $aplicado['valor_unitario'], PadraoDecimal::SCALE_UNIT_PRICE + 4),
                        PadraoDecimal::SCALE_MONEY
                    );
                    $valorRestante = PadraoDecimal::roundHalfUp(
                        bcsub($valorRestante, $valorLinha, PadraoDecimal::SCALE_MONEY + 2),
                        PadraoDecimal::SCALE_MONEY
                    );
                }

                EstoqueMovimentoItem::query()->create([
                    'movimento_id' => $movimento->id,
                    'ordem_compra_item_id' => null,
                    'produto_id' => $produto->id,
                    'lote_id' => $aloc['lote_id'] ?? null,
                    'qtde' => $qtdeLinha,
                    'unidade' => $ajuste->unidade,
                    'valor_unitario' => $aplicado['valor_unitario'],
                    'valor_total' => $valorLinha,
                    'custo_medio_apos' => $aplicado['custo_medio_apos'],
                    'ordem' => $ordem,
                ]);
                $ordem++;
            }

            if (! $ajuste->lote_id && isset($alocacoes[0]['lote_id'])) {
                $ajuste->lote_id = $alocacoes[0]['lote_id'];
            }

            $ajuste->status = EstoqueAjuste::STATUS_APROVADO;
            $ajuste->aprovado_por = $aprovador->id;
            $ajuste->aprovado_em = now();
            $ajuste->movimento_id = $movimento->id;
            $ajuste->save();

            return $movimento;
        });

        return [
            'ajuste' => $this->toOut($ajuste->fresh()),
            'movimento' => $this->entrada->toOut($movimento->fresh()),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function rejeitar(Empresa $empresa, EstoqueAjuste $ajuste, User $aprovador, ?string $observacao = null): array
    {
        $this->assertEmpresa($empresa, $ajuste);

        if ($ajuste->status !== EstoqueAjuste::STATUS_PENDENTE) {
            throw ValidationException::withMessages([
                'status' => ['Somente ajuste PENDENTE pode ser rejeitado.'],
            ]);
        }

        if ($ajuste->solicitado_por && (int) $ajuste->solicitado_por === (int) $aprovador->id) {
            throw ValidationException::withMessages([
                'aprovador' => ['Quem solicitou o ajuste não pode rejeitá-lo (SoD).'],
            ]);
        }

        $ajuste->status = EstoqueAjuste::STATUS_REJEITADO;
        $ajuste->aprovado_por = $aprovador->id;
        $ajuste->aprovado_em = now();
        if ($observacao) {
            $ajuste->observacao = trim(
                ($ajuste->observacao ? $ajuste->observacao.' · ' : '').'Rejeição: '.$observacao
            );
        }
        $ajuste->save();

        return $this->toOut($ajuste->fresh());
    }

    /**
     * Retira solicitação ainda PENDENTE (sem MOV). Quem solicitou ou ADMIN com estoque.escrever.
     * Não é exclusão física: permanece no histórico como CANCELADO.
     *
     * @return array<string, mixed>
     */
    public function cancelar(Empresa $empresa, EstoqueAjuste $ajuste, User $user, ?string $observacao = null): array
    {
        $this->assertEmpresa($empresa, $ajuste);

        if ($ajuste->status !== EstoqueAjuste::STATUS_PENDENTE) {
            throw ValidationException::withMessages([
                'status' => ['Somente ajuste PENDENTE pode ser cancelado. Aprovado/rejeitado permanece no histórico.'],
            ]);
        }

        if ($ajuste->movimento_id) {
            throw ValidationException::withMessages([
                'movimento' => ['Ajuste com movimento não pode ser cancelado.'],
            ]);
        }

        $isSolicitante = $ajuste->solicitado_por && (int) $ajuste->solicitado_por === (int) $user->id;
        if (! $isSolicitante && ! $user->can('estoque.aprovar')) {
            throw ValidationException::withMessages([
                'autorizacao' => ['Apenas quem solicitou (ou quem aprova estoque) pode cancelar a solicitação.'],
            ]);
        }

        return DB::transaction(function () use ($ajuste, $user, $observacao) {
            $ajuste = EstoqueAjuste::query()->lockForUpdate()->findOrFail($ajuste->id);

            if ($ajuste->status !== EstoqueAjuste::STATUS_PENDENTE) {
                throw ValidationException::withMessages([
                    'status' => ['Somente ajuste PENDENTE pode ser cancelado.'],
                ]);
            }

            $ajuste->status = EstoqueAjuste::STATUS_CANCELADO;
            if ($observacao) {
                $ajuste->observacao = trim(
                    ($ajuste->observacao ? $ajuste->observacao.' · ' : '').'Cancelamento: '.$observacao
                );
            } else {
                $ajuste->observacao = trim(
                    ($ajuste->observacao ? $ajuste->observacao.' · ' : '').
                    'Cancelado por '.$user->name.' antes da aprovação.'
                );
            }
            $ajuste->save();

            // INV: libera o item para gerar novo AJU (volta a RECONTADO).
            if ($ajuste->inventario_item_id) {
                $item = EstoqueInventarioItem::query()->lockForUpdate()->find($ajuste->inventario_item_id);
                if ($item && (int) $item->ajuste_id === (int) $ajuste->id) {
                    $item->ajuste_id = null;
                    $item->checklist_confirmado = false;
                    $item->status = EstoqueInventarioItem::STATUS_RECONTADO;
                    $item->save();
                }
            }

            return $this->toOut($ajuste->fresh());
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(EstoqueAjuste $ajuste): array
    {
        $ajuste->loadMissing([
            'produto:id,codigo,descricao_fiscal,familia,unidade_interna',
            'solicitadoPorUser:id,name',
            'aprovadoPorUser:id,name',
            'movimento:id,codigo,tipo',
            'inventarioItem:id,inventario_id',
            ...EstoqueAjuste::userStampWith(),
        ]);

        $avisoFiscal = in_array($ajuste->motivo_codigo, ['A04', 'A06', 'A09'], true)
            ? 'Pode exigir NF-e de baixa (CFOP 5.927) — validar com a contabilidade. O ERP não emite a nota pelo ajuste.'
            : null;

        return [
            'id' => $ajuste->id,
            'empresa_id' => $ajuste->empresa_id,
            'codigo' => $ajuste->codigo,
            'produto_id' => $ajuste->produto_id,
            'produto' => $ajuste->produto ? [
                'id' => $ajuste->produto->id,
                'codigo' => $ajuste->produto->codigo,
                'descricao_fiscal' => $ajuste->produto->descricao_fiscal,
                'familia' => $ajuste->produto->familia,
                'unidade_interna' => $ajuste->produto->unidade_interna,
            ] : null,
            'inventario_item_id' => $ajuste->inventario_item_id,
            'inventario_id' => $ajuste->inventarioItem?->inventario_id,
            'origem' => $ajuste->origem,
            'motivo_codigo' => $ajuste->motivo_codigo,
            'motivo_nome' => EstoqueAjuste::MOTIVOS[$ajuste->motivo_codigo] ?? null,
            'motivo_complemento' => $ajuste->motivo_complemento,
            'qtde_sistema' => (string) $ajuste->qtde_sistema,
            'qtde_contada' => (string) $ajuste->qtde_contada,
            'qtde_diferenca' => (string) $ajuste->qtde_diferenca,
            'valor_ajuste' => $ajuste->valor_ajuste !== null ? (string) $ajuste->valor_ajuste : null,
            'alcada' => $ajuste->alcada,
            'unidade' => $ajuste->unidade,
            'checklist_confirmado' => (bool) $ajuste->checklist_confirmado,
            'status' => $ajuste->status,
            'solicitado_por' => $ajuste->solicitadoPorUser
                ? ['id' => $ajuste->solicitadoPorUser->id, 'name' => $ajuste->solicitadoPorUser->name]
                : null,
            'aprovado_por' => $ajuste->aprovadoPorUser
                ? ['id' => $ajuste->aprovadoPorUser->id, 'name' => $ajuste->aprovadoPorUser->name]
                : null,
            'aprovado_em' => optional($ajuste->aprovado_em)?->toIso8601String(),
            'movimento_id' => $ajuste->movimento_id,
            'movimento' => $ajuste->movimento ? [
                'id' => $ajuste->movimento->id,
                'codigo' => $ajuste->movimento->codigo,
                'tipo' => $ajuste->movimento->tipo,
            ] : null,
            'observacao' => $ajuste->observacao,
            'causa_raiz' => $ajuste->causa_raiz,
            'ciencia_diretoria' => (bool) $ajuste->ciencia_diretoria,
            'ciencia_contabilidade' => (bool) $ajuste->ciencia_contabilidade,
            'divergencia_relevante' => (bool) $ajuste->divergencia_relevante,
            'aviso_fiscal' => $avisoFiscal,
            'lote_id' => $ajuste->lote_id,
            'lote_codigo' => $ajuste->lote_codigo,
            'lote_data_entrada' => optional($ajuste->lote_data_entrada)?->format('Y-m-d'),
            'lote_data_validade' => optional($ajuste->lote_data_validade)?->format('Y-m-d'),
            'lote_payload' => is_array($ajuste->lote_payload) ? $ajuste->lote_payload : null,
            'contagem_evidencia' => is_array($ajuste->contagem_evidencia) ? $ajuste->contagem_evidencia : null,
            'created_at' => optional($ajuste->created_at)?->toIso8601String(),
            'criado_por' => EstoqueAjuste::userStampFrom($ajuste->criador),
            'atualizado_por' => EstoqueAjuste::userStampFrom($ajuste->atualizador),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function meta(): array
    {
        return [
            'origens' => EstoqueAjuste::ORIGENS,
            'statuses' => EstoqueAjuste::STATUSES,
            'alcadas' => [
                EstoqueAjuste::ALCADA_LIDER,
                EstoqueAjuste::ALCADA_GESTOR,
                EstoqueAjuste::ALCADA_DIRECAO,
            ],
            'faixas' => [
                'lider_ate' => EstoqueAjusteAlcada::FAIXA_LIDER,
                'gestor_ate' => EstoqueAjusteAlcada::FAIXA_GESTOR,
            ],
            'motivos' => collect(EstoqueAjuste::MOTIVOS)
                ->map(fn (string $nome, string $codigo) => ['codigo' => $codigo, 'nome' => $nome])
                ->values()
                ->all(),
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{codigo: string, complemento: ?string}
     */
    private function assertMotivo(array $data): array
    {
        $motivo = strtoupper(trim((string) $data['motivo_codigo']));
        if (! array_key_exists($motivo, EstoqueAjuste::MOTIVOS)) {
            throw ValidationException::withMessages([
                'motivo_codigo' => ['Motivo de ajuste inválido (use A01–A11).'],
            ]);
        }

        $complemento = $this->nullIfEmpty($data['motivo_complemento'] ?? null);
        if (in_array($motivo, ['A04', 'A06', 'A07', 'A09'], true) && $complemento === null) {
            throw ValidationException::withMessages([
                'motivo_complemento' => ['Este motivo exige complemento/evidência.'],
            ]);
        }

        return ['codigo' => $motivo, 'complemento' => $complemento];
    }

    private function parseQtdeContada(mixed $raw): string
    {
        $qtdeContada = PadraoDecimal::parseStrict($raw, PadraoDecimal::SCALE_QTY);
        if ($qtdeContada === null || bccomp($qtdeContada, '0', PadraoDecimal::SCALE_QTY) < 0) {
            throw ValidationException::withMessages([
                'qtde_contada' => ['Quantidade contada deve ser zero ou positiva.'],
            ]);
        }

        return $qtdeContada;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function assertAlcada(EstoqueAjuste $ajuste, User $aprovador, array $data): void
    {
        $alcada = $ajuste->alcada ?? EstoqueAjuste::ALCADA_LIDER;

        if ($alcada === EstoqueAjuste::ALCADA_LIDER) {
            if (! $aprovador->can('estoque.aprovar')) {
                throw ValidationException::withMessages([
                    'aprovador' => ['Permissão estoque.aprovar necessária.'],
                ]);
            }

            return;
        }

        if (! $aprovador->can('estoque.aprovar_gestor')) {
            throw ValidationException::withMessages([
                'aprovador' => [
                    'Alçada '.$alcada.' exige permissão estoque.aprovar_gestor.',
                ],
            ]);
        }

        if (! $aprovador->can('estoque.aprovar')) {
            throw ValidationException::withMessages([
                'aprovador' => ['Permissão estoque.aprovar necessária.'],
            ]);
        }
    }

    private function assertContadoresNaoAprovam(EstoqueAjuste $ajuste, User $aprovador): void
    {
        if (! $ajuste->inventario_item_id) {
            return;
        }

        $item = EstoqueInventarioItem::query()->find($ajuste->inventario_item_id);
        if (! $item) {
            return;
        }

        $ids = array_filter([(int) $item->contado_por_1, (int) $item->contado_por_2]);
        if (in_array((int) $aprovador->id, $ids, true)) {
            throw ValidationException::withMessages([
                'aprovador' => ['Quem contou o item no inventário não pode aprovar o ajuste (SoD).'],
            ]);
        }
    }

    /**
     * Evidência de contagem por QR (volume + local) na avulsa.
     * Auditoria / conferência — não altera Writer nem cria volumes.
     *
     * @param  array<string, mixed>|null  $raw
     * @return array<string, mixed>|null
     */
    private function normalizarContagemEvidencia(
        Empresa $empresa,
        Produto $produto,
        ?array $raw,
        string $motivo,
        string $qtdeContada,
        bool $usaLotePayloadVirada
    ): ?array {
        if ($raw === null || $raw === []) {
            return null;
        }

        if ($usaLotePayloadVirada || $motivo === 'A03') {
            throw ValidationException::withMessages([
                'contagem_evidencia' => [
                    'Contagem por QR de volumes existentes não se aplica ao saldo inicial (A03). Use volumes de abertura.',
                ],
            ]);
        }

        if (! $produto->controla_lote) {
            throw ValidationException::withMessages([
                'contagem_evidencia' => ['Produto não controla lote/volume — remova a evidência QR.'],
            ]);
        }

        $modo = (string) ($raw['modo'] ?? '');
        if ($modo !== 'QR_VOLUME_LOCAL') {
            throw ValidationException::withMessages([
                'contagem_evidencia.modo' => ['Modo de contagem QR inválido.'],
            ]);
        }

        $endRaw = is_array($raw['endereco'] ?? null) ? $raw['endereco'] : null;
        $endId = $endRaw !== null ? (int) ($endRaw['id'] ?? 0) : 0;
        $endCodigo = $endRaw !== null ? trim((string) ($endRaw['codigo'] ?? '')) : '';
        if ($endId <= 0 || $endCodigo === '') {
            throw ValidationException::withMessages([
                'contagem_evidencia.endereco' => ['Informe o local (END) da contagem.'],
            ]);
        }

        $endereco = EstoqueEndereco::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $endId)
            ->first();
        if (! $endereco) {
            throw ValidationException::withMessages([
                'contagem_evidencia.endereco' => ['Local inválido para a empresa.'],
            ]);
        }

        $volumesRaw = is_array($raw['volumes'] ?? null) ? $raw['volumes'] : [];
        if ($volumesRaw === []) {
            throw ValidationException::withMessages([
                'contagem_evidencia.volumes' => ['Inclua ao menos 1 volume na evidência QR.'],
            ]);
        }

        $statusOk = ['ENCONTRADO', 'LOCAL_ERRADO', 'SEM_LOCAL'];
        $volumes = [];
        $soma = '0';
        $vistos = [];

        foreach (array_values($volumesRaw) as $idx => $linha) {
            if (! is_array($linha)) {
                throw ValidationException::withMessages([
                    "contagem_evidencia.volumes.{$idx}" => ['Volume inválido.'],
                ]);
            }

            $loteId = (int) ($linha['lote_id'] ?? 0);
            if ($loteId <= 0 || isset($vistos[$loteId])) {
                throw ValidationException::withMessages([
                    "contagem_evidencia.volumes.{$idx}.lote_id" => ['Volume duplicado ou inválido.'],
                ]);
            }
            $vistos[$loteId] = true;

            $lote = EstoqueLote::query()
                ->where('empresa_id', $empresa->id)
                ->where('produto_id', $produto->id)
                ->where('id', $loteId)
                ->first();
            if (! $lote) {
                throw ValidationException::withMessages([
                    "contagem_evidencia.volumes.{$idx}.lote_id" => [
                        'Volume não pertence a este produto/empresa.',
                    ],
                ]);
            }

            $qtde = PadraoDecimal::roundHalfUp((string) ($linha['qtde'] ?? '0'), PadraoDecimal::SCALE_QTY);
            if (bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                throw ValidationException::withMessages([
                    "contagem_evidencia.volumes.{$idx}.qtde" => ['Quantidade do volume deve ser maior que zero.'],
                ]);
            }

            $status = (string) ($linha['status'] ?? 'SEM_LOCAL');
            if (! in_array($status, $statusOk, true)) {
                throw ValidationException::withMessages([
                    "contagem_evidencia.volumes.{$idx}.status" => ['Status de leitura inválido.'],
                ]);
            }

            $volumes[] = [
                'lote_id' => (int) $lote->id,
                'codigo' => mb_substr((string) ($linha['codigo'] ?? $lote->codigo), 0, 60),
                'qtde' => $qtde,
                'unidade' => mb_substr((string) ($linha['unidade'] ?? $produto->unidade_interna ?? 'UN'), 0, 10),
                'status' => $status,
                'endereco_atual' => $this->nullIfEmpty($linha['endereco_atual'] ?? null),
            ];
            $soma = bcadd($soma, $qtde, PadraoDecimal::SCALE_QTY);
        }

        $soma = PadraoDecimal::roundHalfUp($soma, PadraoDecimal::SCALE_QTY);
        $somaInformada = isset($raw['qtde_soma'])
            ? PadraoDecimal::roundHalfUp((string) $raw['qtde_soma'], PadraoDecimal::SCALE_QTY)
            : $soma;

        if (bccomp($somaInformada, $soma, PadraoDecimal::SCALE_QTY) !== 0) {
            throw ValidationException::withMessages([
                'contagem_evidencia.qtde_soma' => [
                    "Soma informada ({$somaInformada}) diverge da soma dos volumes ({$soma}).",
                ],
            ]);
        }

        if (bccomp($soma, $qtdeContada, PadraoDecimal::SCALE_QTY) !== 0) {
            throw ValidationException::withMessages([
                'qtde_contada' => [
                    "Com contagem por QR, a qtde contada ({$qtdeContada}) deve igualar a soma dos volumes ({$soma}).",
                ],
            ]);
        }

        return [
            'modo' => 'QR_VOLUME_LOCAL',
            'endereco' => [
                'id' => (int) $endereco->id,
                'codigo' => (string) $endereco->codigo,
            ],
            'volumes' => $volumes,
            'qtde_soma' => $soma,
        ];
    }

    /**
     * Volumes de abertura (A03 / origem VIRADA): soma das qtdes = |Δ| positiva.
     * L×C opcional; em M2/bobina, se ambos informados, deriva/valida área.
     *
     * @param  list<array<string, mixed>>|null  $raw
     * @return list<array<string, mixed>>|null
     */
    private function normalizarLotePayloadVirada(
        Produto $produto,
        ?array $raw,
        string $motivo,
        string $origem,
        string $diferenca
    ): ?array {
        if ($raw === null || $raw === []) {
            return null;
        }

        $permite = $motivo === 'A03' || $origem === EstoqueAjuste::ORIGEM_VIRADA;
        if (! $permite) {
            throw ValidationException::withMessages([
                'lote_payload' => [
                    'Volumes (lote_payload) só são permitidos no saldo inicial (A03) ou inventário VIRADA.',
                ],
            ]);
        }

        if (! $produto->controla_lote) {
            throw ValidationException::withMessages([
                'lote_payload' => ['Produto não controla lote/volume — remova os volumes.'],
            ]);
        }

        if (bccomp($diferenca, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'lote_payload' => ['Volumes de abertura só se aplicam a diferença positiva (entrada de saldo).'],
            ]);
        }

        $qtdeAbs = $diferenca;
        $usaArea = strtoupper((string) ($produto->unidade_interna ?? 'UN')) === 'M2'
            || OcPedidoDetalhe::permiteParaProduto($produto);

        $linhas = [];
        $soma = '0';

        foreach (array_values($raw) as $idx => $linha) {
            if (! is_array($linha)) {
                throw ValidationException::withMessages([
                    "lote_payload.{$idx}" => ['Volume inválido.'],
                ]);
            }

            $codigo = trim((string) ($linha['codigo'] ?? $linha['lote_codigo'] ?? ''));
            $largura = $this->nullIfEmpty($linha['largura_mm'] ?? null);
            $comprimento = $this->nullIfEmpty($linha['comprimento_m'] ?? null);
            $largura = $largura !== null
                ? PadraoDecimal::roundHalfUp((string) $largura, PadraoDecimal::SCALE_DIM)
                : null;
            $comprimento = $comprimento !== null
                ? PadraoDecimal::roundHalfUp((string) $comprimento, PadraoDecimal::SCALE_DIM)
                : null;

            $qtdeRaw = $this->nullIfEmpty($linha['qtde'] ?? null);
            $qtde = $qtdeRaw !== null
                ? PadraoDecimal::roundHalfUp((string) $qtdeRaw, PadraoDecimal::SCALE_QTY)
                : null;

            if ($usaArea && $largura !== null && $comprimento !== null
                && bccomp($largura, '0', PadraoDecimal::SCALE_DIM) > 0
                && bccomp($comprimento, '0', PadraoDecimal::SCALE_DIM) > 0) {
                $area = NfeExactDimensoes::areaM2($largura, $comprimento);
                if ($qtde === null) {
                    $qtde = $area;
                } elseif (bccomp($qtde, $area, PadraoDecimal::SCALE_QTY) !== 0) {
                    throw ValidationException::withMessages([
                        "lote_payload.{$idx}.qtde" => [
                            "Quantidade ({$qtde}) deve igualar a área L×C ({$area} M2).",
                        ],
                    ]);
                }
            }

            if ($qtde === null || bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
                throw ValidationException::withMessages([
                    "lote_payload.{$idx}.qtde" => ['Informe a quantidade do volume (maior que zero).'],
                ]);
            }

            if ($codigo === '') {
                $codigo = 'VIR-'.$produto->codigo.'-'.($idx + 1);
            }

            $entrada = $this->nullIfEmpty($linha['data_entrada'] ?? $linha['lote_data_entrada'] ?? null)
                ?? now()->toDateString();
            $fab = $this->nullIfEmpty($linha['data_fabricacao'] ?? $linha['lote_data_fabricacao'] ?? null);
            $val = $this->nullIfEmpty($linha['data_validade'] ?? $linha['lote_data_validade'] ?? null);

            $linhas[] = [
                'codigo' => mb_substr($codigo, 0, 60),
                'qtde' => $qtde,
                'data_entrada' => (string) $entrada,
                'data_fabricacao' => $fab !== null ? (string) $fab : null,
                'data_validade' => $val !== null ? (string) $val : null,
                'largura_mm' => $largura,
                'comprimento_m' => $comprimento,
                'origem_tipo' => EstoqueLote::ORIGEM_VIRADA,
                'volume_novo' => true,
            ];
            $soma = bcadd($soma, $qtde, PadraoDecimal::SCALE_QTY);
        }

        $soma = PadraoDecimal::roundHalfUp($soma, PadraoDecimal::SCALE_QTY);
        if (bccomp($soma, $qtdeAbs, PadraoDecimal::SCALE_QTY) !== 0) {
            throw ValidationException::withMessages([
                'lote_payload' => [
                    "Soma dos volumes ({$soma}) deve igualar a diferença do ajuste ({$qtdeAbs}).",
                ],
            ]);
        }

        return $linhas;
    }

    private function assertEmpresa(Empresa $empresa, EstoqueAjuste $ajuste): void
    {
        if ($ajuste->empresa_id !== $empresa->id) {
            abort(404);
        }
    }

    /**
     * @return array<string, mixed>|null
     */
    private function loteRefFromAjuste(EstoqueAjuste $ajuste): ?array
    {
        if ($ajuste->lote_id || $ajuste->lote_codigo || $ajuste->lote_data_entrada || $ajuste->lote_data_validade) {
            return [
                'lote_id' => $ajuste->lote_id,
                'codigo' => $ajuste->lote_codigo,
                'data_entrada' => optional($ajuste->lote_data_entrada)?->format('Y-m-d'),
                'data_fabricacao' => optional($ajuste->lote_data_fabricacao)?->format('Y-m-d'),
                'data_validade' => optional($ajuste->lote_data_validade)?->format('Y-m-d'),
                'origem_tipo' => EstoqueLote::ORIGEM_AJUSTE,
                'origem_id' => $ajuste->id,
            ];
        }

        return [
            'origem_tipo' => EstoqueLote::ORIGEM_AJUSTE,
            'origem_id' => $ajuste->id,
        ];
    }

    private function nullIfEmpty(mixed $value): mixed
    {
        if ($value === null) {
            return null;
        }

        if (is_string($value) && trim($value) === '') {
            return null;
        }

        return $value;
    }
}
