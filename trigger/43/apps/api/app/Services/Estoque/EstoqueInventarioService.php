<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueAjuste;
use App\Models\EstoqueInventario;
use App\Models\EstoqueInventarioItem;
use App\Models\EstoqueInventarioLeitura;
use App\Models\EstoqueLote;
use App\Models\EstoqueSaldo;
use App\Models\Produto;
use App\Models\User;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Inventário cego INV → confrontação → AJU (BL-042 / estudo 32).
 */
class EstoqueInventarioService
{
    public function __construct(
        private readonly CodigoGenerator $codigos,
        private readonly EstoqueAjusteService $ajustes,
        private readonly EstoqueAjusteAlcada $alcada,
        private readonly EstoqueVolumeService $volumes,
        private readonly EstoqueEnderecoService $enderecos,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $status = null, ?string $tipo = null): array
    {
        $query = EstoqueInventario::query()
            ->with([...EstoqueInventario::userStampWith()])
            ->withCount('itens')
            ->withExists(['itens as tem_ajuste' => function ($q) {
                $q->whereNotNull('ajuste_id');
            }])
            ->where('empresa_id', $empresa->id)
            ->orderByDesc('id');

        if ($status) {
            $query->where('status', $status);
        }
        if ($tipo) {
            $query->where('tipo', $tipo);
        }

        return $query->get()->map(fn (EstoqueInventario $inv) => $this->toOut($inv, false, false))->all();
    }

    /**
     * @return array<string, mixed>
     */
    public function show(Empresa $empresa, EstoqueInventario $inv, bool $cego = true): array
    {
        $this->assertEmpresa($empresa, $inv);
        $inv->load([
            'itens.produto:id,codigo,descricao_fiscal,familia,unidade_interna',
            'itens.contadoPor1User:id,name',
            'itens.contadoPor2User:id,name',
            'itens.ajuste:id,codigo,status',
            'leituras' => function ($q) {
                $q->where('resultado', '!=', EstoqueInventarioLeitura::RESULTADO_ANULADA)
                    ->orderByDesc('id');
            },
            'leituras.lote:id,codigo,qtde,unidade',
            'leituras.produto:id,codigo,descricao_fiscal',
            'leituras.enderecoLido:id,codigo',
            'leituras.enderecoEsperado:id,codigo',
            'leituras.lidoPorUser:id,name',
            ...EstoqueInventario::userStampWith(),
        ]);

        return $this->toOut($inv, true, $cego);
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function create(Empresa $empresa, array $data): array
    {
        $tipo = strtoupper(trim((string) $data['tipo']));
        if (! in_array($tipo, EstoqueInventario::TIPOS, true)) {
            throw ValidationException::withMessages([
                'tipo' => ['Tipo de inventário inválido (ROTATIVO|GERAL|VIRADA).'],
            ]);
        }

        $produtoIds = array_values(array_unique(array_map('intval', $data['produto_ids'] ?? [])));
        if ($produtoIds === []) {
            throw ValidationException::withMessages([
                'produto_ids' => ['Informe ao menos um produto para contar.'],
            ]);
        }

        $produtos = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->whereIn('id', $produtoIds)
            ->get()
            ->keyBy('id');

        if ($produtos->count() !== count($produtoIds)) {
            throw ValidationException::withMessages([
                'produto_ids' => ['Um ou mais produtos são inválidos para a empresa.'],
            ]);
        }

        $inv = DB::transaction(function () use ($empresa, $tipo, $produtoIds, $produtos, $data) {
            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'INV-'.$ano, 5);

            $inv = EstoqueInventario::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'tipo' => $tipo,
                'status' => EstoqueInventario::STATUS_ABERTO,
                'iniciado_em' => now(),
                'observacao' => $this->nullIfEmpty($data['observacao'] ?? null),
            ]);

            foreach ($produtoIds as $pid) {
                /** @var Produto $produto */
                $produto = $produtos->get($pid);
                $saldo = EstoqueSaldo::query()
                    ->where('empresa_id', $empresa->id)
                    ->where('produto_id', $pid)
                    ->first();

                $qtdeSistema = $saldo
                    ? PadraoDecimal::roundHalfUp((string) $saldo->qtde, PadraoDecimal::SCALE_QTY)
                    : PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);

                EstoqueInventarioItem::query()->create([
                    'inventario_id' => $inv->id,
                    'empresa_id' => $empresa->id,
                    'produto_id' => $pid,
                    'qtde_sistema_corte' => $qtdeSistema,
                    'unidade' => $produto->unidade_interna ?? 'UN',
                    'status' => EstoqueInventarioItem::STATUS_PENDENTE,
                ]);
            }

            return $inv;
        });

        return $this->show($empresa, $inv->fresh(), false);
    }

    /**
     * Registra leitura física VOL + END na rodada (1ª ou 2ª). Não escreve saldo.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function lerVolume(Empresa $empresa, EstoqueInventario $inv, array $data, User $user): array
    {
        $this->assertEmpresa($empresa, $inv);
        $this->assertInvAberto($inv);

        $rodada = (int) ($data['rodada'] ?? 1);
        if (! in_array($rodada, [1, 2], true)) {
            throw ValidationException::withMessages([
                'rodada' => ['Rodada deve ser 1 ou 2.'],
            ]);
        }

        $volumeQr = trim((string) ($data['volume_qr'] ?? ''));
        $enderecoQr = trim((string) ($data['endereco_qr'] ?? ''));
        if ($volumeQr === '' || $enderecoQr === '') {
            throw ValidationException::withMessages([
                'volume_qr' => ['Informe o QR do volume (VOL:…) e do local (END:…).'],
            ]);
        }

        $lote = $this->volumes->resolverVolumePorQr($empresa, $volumeQr);
        $loteModel = EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', (int) $lote['lote_id'])
            ->firstOrFail();

        if (bccomp((string) $loteModel->qtde, '0', PadraoDecimal::SCALE_QTY) <= 0) {
            throw ValidationException::withMessages([
                'volume_qr' => ['Volume sem saldo — não entra na contagem física.'],
            ]);
        }

        $endereco = $this->enderecos->resolverPorQr($empresa, $enderecoQr);

        $produtoIds = $inv->itens()->pluck('produto_id')->map(fn ($id) => (int) $id)->all();
        $produtoId = (int) $loteModel->produto_id;
        $noEscopo = in_array($produtoId, $produtoIds, true);

        $jaLido = EstoqueInventarioLeitura::query()
            ->where('inventario_id', $inv->id)
            ->where('rodada', $rodada)
            ->where('lote_id', $loteModel->id)
            ->where('resultado', '!=', EstoqueInventarioLeitura::RESULTADO_ANULADA)
            ->exists();

        if ($jaLido) {
            throw ValidationException::withMessages([
                'volume_qr' => ['Este volume já foi lido nesta rodada.'],
            ]);
        }

        if (! $noEscopo) {
            $leitura = EstoqueInventarioLeitura::query()->create([
                'inventario_id' => $inv->id,
                'empresa_id' => $empresa->id,
                'rodada' => $rodada,
                'lote_id' => $loteModel->id,
                'produto_id' => $produtoId,
                'endereco_id_lido' => $endereco->id,
                'endereco_id_esperado' => $loteModel->endereco_id,
                'qtde_volume' => PadraoDecimal::roundHalfUp((string) $loteModel->qtde, PadraoDecimal::SCALE_QTY),
                'unidade' => $loteModel->unidade ?? 'UN',
                'resultado' => EstoqueInventarioLeitura::RESULTADO_FORA_ESCOPO,
                'lido_por' => $user->id,
                'lido_em' => now(),
            ]);

            if ($inv->status === EstoqueInventario::STATUS_ABERTO) {
                $inv->status = EstoqueInventario::STATUS_EM_CONTAGEM;
                $inv->save();
            }

            return $this->leituraOut($leitura->fresh([
                'lote:id,codigo',
                'produto:id,codigo,descricao_fiscal',
                'enderecoLido:id,codigo',
                'enderecoEsperado:id,codigo',
                'lidoPorUser:id,name',
            ]));
        }

        $item = $inv->itens()->where('produto_id', $produtoId)->firstOrFail();
        $this->assertItemAceitaRodada($item, $rodada);

        $esperadoId = $loteModel->endereco_id ? (int) $loteModel->endereco_id : null;
        $lidoId = (int) $endereco->id;
        $resultado = ($esperadoId === null || $esperadoId === $lidoId)
            ? EstoqueInventarioLeitura::RESULTADO_ENCONTRADO
            : EstoqueInventarioLeitura::RESULTADO_LOCAL_ERRADO;

        $leitura = DB::transaction(function () use (
            $empresa, $inv, $rodada, $loteModel, $produtoId, $lidoId, $esperadoId, $resultado, $user, $item
        ) {
            if ($item->status === EstoqueInventarioItem::STATUS_PENDENTE) {
                $item->status = EstoqueInventarioItem::STATUS_EM_CONTAGEM;
                $item->save();
            }

            if ($inv->status === EstoqueInventario::STATUS_ABERTO) {
                $inv->status = EstoqueInventario::STATUS_EM_CONTAGEM;
                $inv->save();
            }

            return EstoqueInventarioLeitura::query()->create([
                'inventario_id' => $inv->id,
                'empresa_id' => $empresa->id,
                'rodada' => $rodada,
                'lote_id' => $loteModel->id,
                'produto_id' => $produtoId,
                'endereco_id_lido' => $lidoId,
                'endereco_id_esperado' => $esperadoId,
                'qtde_volume' => PadraoDecimal::roundHalfUp((string) $loteModel->qtde, PadraoDecimal::SCALE_QTY),
                'unidade' => $loteModel->unidade ?? 'UN',
                'resultado' => $resultado,
                'lido_por' => $user->id,
                'lido_em' => now(),
            ]);
        });

        return $this->leituraOut($leitura->fresh([
            'lote:id,codigo',
            'produto:id,codigo,descricao_fiscal',
            'enderecoLido:id,codigo',
            'enderecoEsperado:id,codigo',
            'lidoPorUser:id,name',
        ]));
    }

    /**
     * Anula leitura ativa (permite reler o mesmo volume).
     *
     * @return array<string, mixed>
     */
    public function anularLeitura(
        Empresa $empresa,
        EstoqueInventario $inv,
        EstoqueInventarioLeitura $leitura,
    ): array {
        $this->assertEmpresa($empresa, $inv);
        $this->assertInvAberto($inv);

        if ($leitura->inventario_id !== $inv->id || $leitura->empresa_id !== $empresa->id) {
            abort(404);
        }

        if ($leitura->resultado === EstoqueInventarioLeitura::RESULTADO_ANULADA) {
            throw ValidationException::withMessages([
                'leitura' => ['Leitura já anulada.'],
            ]);
        }

        if ($leitura->resultado === EstoqueInventarioLeitura::RESULTADO_FALTANTE) {
            throw ValidationException::withMessages([
                'leitura' => ['Faltante gerado no fechamento não se anula avulso — reabra a rodada física com novas leituras.'],
            ]);
        }

        $leitura->resultado = EstoqueInventarioLeitura::RESULTADO_ANULADA;
        $leitura->save();

        return $this->leituraOut($leitura->fresh([
            'lote:id,codigo',
            'produto:id,codigo,descricao_fiscal',
            'enderecoLido:id,codigo',
            'enderecoEsperado:id,codigo',
            'lidoPorUser:id,name',
        ]));
    }

    /**
     * Fecha a rodada física: marca FALTANTE, rollup por SKU e chama contar1/contar2.
     * SKUs sem volume ativo continuam no fluxo decimal manual.
     *
     * @return array<string, mixed>
     */
    public function fecharRodadaFisica(
        Empresa $empresa,
        EstoqueInventario $inv,
        int $rodada,
        User $user,
    ): array {
        $this->assertEmpresa($empresa, $inv);
        $this->assertInvAberto($inv);

        if (! in_array($rodada, [1, 2], true)) {
            throw ValidationException::withMessages([
                'rodada' => ['Rodada deve ser 1 ou 2.'],
            ]);
        }

        return DB::transaction(function () use ($empresa, $inv, $rodada, $user) {
            $inv = EstoqueInventario::query()->lockForUpdate()->findOrFail($inv->id);
            $this->assertEmpresa($empresa, $inv);
            $this->assertInvAberto($inv);

            $itens = $inv->itens()->lockForUpdate()->get()->keyBy('produto_id');
            $produtoIds = $itens->keys()->map(fn ($id) => (int) $id)->all();

            $volumesAtivos = EstoqueLote::query()
                ->where('empresa_id', $empresa->id)
                ->whereIn('produto_id', $produtoIds)
                ->where('qtde', '>', 0)
                ->get();

            $lidos = EstoqueInventarioLeitura::query()
                ->where('inventario_id', $inv->id)
                ->where('rodada', $rodada)
                ->whereIn('resultado', [
                    ...EstoqueInventarioLeitura::RESULTADOS_ENCONTRADOS,
                    EstoqueInventarioLeitura::RESULTADO_FORA_ESCOPO,
                ])
                ->get()
                ->keyBy('lote_id');

            foreach ($volumesAtivos as $lote) {
                if ($lidos->has($lote->id)) {
                    continue;
                }
                // Já marcado faltante nesta rodada?
                $jaFalta = EstoqueInventarioLeitura::query()
                    ->where('inventario_id', $inv->id)
                    ->where('rodada', $rodada)
                    ->where('lote_id', $lote->id)
                    ->where('resultado', EstoqueInventarioLeitura::RESULTADO_FALTANTE)
                    ->exists();
                if ($jaFalta) {
                    continue;
                }

                EstoqueInventarioLeitura::query()->create([
                    'inventario_id' => $inv->id,
                    'empresa_id' => $empresa->id,
                    'rodada' => $rodada,
                    'lote_id' => $lote->id,
                    'produto_id' => $lote->produto_id,
                    'endereco_id_lido' => null,
                    'endereco_id_esperado' => $lote->endereco_id,
                    'qtde_volume' => PadraoDecimal::roundHalfUp((string) $lote->qtde, PadraoDecimal::SCALE_QTY),
                    'unidade' => $lote->unidade ?? 'UN',
                    'resultado' => EstoqueInventarioLeitura::RESULTADO_FALTANTE,
                    'lido_por' => $user->id,
                    'lido_em' => now(),
                ]);
            }

            $somas = [];
            $leiturasRollup = EstoqueInventarioLeitura::query()
                ->where('inventario_id', $inv->id)
                ->where('rodada', $rodada)
                ->whereIn('resultado', EstoqueInventarioLeitura::RESULTADOS_ENCONTRADOS)
                ->get();

            foreach ($leiturasRollup as $leit) {
                $pid = (int) $leit->produto_id;
                if (! isset($somas[$pid])) {
                    $somas[$pid] = '0';
                }
                $somas[$pid] = PadraoDecimal::roundHalfUp(
                    bcadd($somas[$pid], (string) $leit->qtde_volume, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
            }

            $produtoIdsComVolume = $volumesAtivos->pluck('produto_id')->map(fn ($id) => (int) $id)->unique()->all();
            $itensFechados = [];

            foreach ($itens as $produtoId => $item) {
                $produtoId = (int) $produtoId;
                if (! in_array($produtoId, $produtoIdsComVolume, true)) {
                    continue;
                }

                try {
                    $this->assertItemAceitaRodada($item, $rodada);
                } catch (ValidationException) {
                    continue;
                }

                $qtde = $somas[$produtoId] ?? PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);

                if ($rodada === 1) {
                    $itensFechados[] = $this->contar1($empresa, $inv, $item->fresh(), ['qtde' => $qtde], $user);
                } else {
                    $itensFechados[] = $this->contar2($empresa, $inv, $item->fresh(), ['qtde' => $qtde], $user);
                }
            }

            if ($itensFechados === [] && $volumesAtivos->isEmpty()) {
                throw ValidationException::withMessages([
                    'rodada' => [
                        'Nenhum SKU deste inventário tem volume etiquetado. Use a contagem decimal por SKU.',
                    ],
                ]);
            }

            if ($itensFechados === [] && $volumesAtivos->isNotEmpty()) {
                throw ValidationException::withMessages([
                    'rodada' => [
                        'Nenhum item elegível para fechar nesta rodada (já contados ou status incompatível).',
                    ],
                ]);
            }

            return [
                'inventario' => $this->show($empresa, $inv->fresh(), false),
                'itens_fechados' => $itensFechados,
                'locais_errados' => EstoqueInventarioLeitura::query()
                    ->where('inventario_id', $inv->id)
                    ->where('rodada', $rodada)
                    ->where('resultado', EstoqueInventarioLeitura::RESULTADO_LOCAL_ERRADO)
                    ->count(),
                'faltantes' => EstoqueInventarioLeitura::query()
                    ->where('inventario_id', $inv->id)
                    ->where('rodada', $rodada)
                    ->where('resultado', EstoqueInventarioLeitura::RESULTADO_FALTANTE)
                    ->count(),
            ];
        });
    }

    /**
     * 1ª contagem cega.
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function contar1(Empresa $empresa, EstoqueInventario $inv, EstoqueInventarioItem $item, array $data, User $user): array
    {
        $this->assertItemDoInv($empresa, $inv, $item);
        $this->assertInvAberto($inv);

        if (! in_array($item->status, [
            EstoqueInventarioItem::STATUS_PENDENTE,
            EstoqueInventarioItem::STATUS_EM_CONTAGEM,
        ], true)) {
            throw ValidationException::withMessages([
                'status' => ['Item não está disponível para a 1ª contagem.'],
            ]);
        }

        $qtde = $this->parseQtde($data['qtde'] ?? null);

        $item = DB::transaction(function () use ($inv, $item, $qtde, $user) {
            $item = EstoqueInventarioItem::query()->lockForUpdate()->findOrFail($item->id);
            $produto = Produto::query()->findOrFail($item->produto_id);

            $item->qtde_1 = $qtde;
            $item->contado_por_1 = $user->id;
            $item->contado_em_1 = now();
            $item->status = EstoqueInventarioItem::STATUS_CONTADO_1;
            $item->save();

            $sistema = PadraoDecimal::roundHalfUp((string) $item->qtde_sistema_corte, PadraoDecimal::SCALE_QTY);
            if ($this->alcada->dentroTolerancia($produto, $sistema, $qtde)) {
                $item->qtde_final = $qtde;
                $item->qtde_diferenca = PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);
                $item->status = EstoqueInventarioItem::STATUS_OK;
                $item->save();
            } else {
                $diff = PadraoDecimal::roundHalfUp(
                    bcsub($qtde, $sistema, PadraoDecimal::SCALE_QTY + 4),
                    PadraoDecimal::SCALE_QTY
                );
                $item->qtde_diferenca = $diff;
                $item->status = EstoqueInventarioItem::STATUS_DIVERGENTE;
                $item->save();
            }

            if ($inv->status === EstoqueInventario::STATUS_ABERTO) {
                $inv->status = EstoqueInventario::STATUS_EM_CONTAGEM;
                $inv->save();
            }

            return $item;
        });

        return $this->itemOut($item->fresh(), true);
    }

    /**
     * 2ª contagem cega (obrigatória em divergência; pessoa diferente).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function contar2(Empresa $empresa, EstoqueInventario $inv, EstoqueInventarioItem $item, array $data, User $user): array
    {
        $this->assertItemDoInv($empresa, $inv, $item);
        $this->assertInvAberto($inv);

        if ($item->status !== EstoqueInventarioItem::STATUS_DIVERGENTE) {
            throw ValidationException::withMessages([
                'status' => ['2ª contagem só é permitida após divergência na 1ª.'],
            ]);
        }

        if ($item->contado_por_1 && (int) $item->contado_por_1 === (int) $user->id) {
            throw ValidationException::withMessages([
                'contador' => ['A recontagem deve ser feita por pessoa diferente da 1ª contagem (SoD).'],
            ]);
        }

        $qtde = $this->parseQtde($data['qtde'] ?? null);

        $item = DB::transaction(function () use ($item, $qtde, $user) {
            $item = EstoqueInventarioItem::query()->lockForUpdate()->findOrFail($item->id);
            $sistema = PadraoDecimal::roundHalfUp((string) $item->qtde_sistema_corte, PadraoDecimal::SCALE_QTY);
            $diff = PadraoDecimal::roundHalfUp(
                bcsub($qtde, $sistema, PadraoDecimal::SCALE_QTY + 4),
                PadraoDecimal::SCALE_QTY
            );

            $item->qtde_2 = $qtde;
            $item->contado_por_2 = $user->id;
            $item->contado_em_2 = now();
            $item->qtde_final = $qtde;
            $item->qtde_diferenca = $diff;

            $produto = Produto::query()->findOrFail($item->produto_id);
            if ($this->alcada->dentroTolerancia($produto, $sistema, $qtde)) {
                $item->qtde_diferenca = PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);
                $item->status = EstoqueInventarioItem::STATUS_OK;
            } else {
                $item->status = EstoqueInventarioItem::STATUS_RECONTADO;
            }
            $item->save();

            return $item;
        });

        return $this->itemOut($item->fresh(), true);
    }

    /**
     * Gera AJU a partir do item recontado (divergência confirmada).
     *
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function gerarAjuste(Empresa $empresa, EstoqueInventario $inv, EstoqueInventarioItem $item, array $data): array
    {
        $this->assertItemDoInv($empresa, $inv, $item);
        $this->assertInvAberto($inv);

        if ($item->status !== EstoqueInventarioItem::STATUS_RECONTADO) {
            throw ValidationException::withMessages([
                'status' => ['Só itens recontados com divergência geram ajuste.'],
            ]);
        }

        if ($item->ajuste_id) {
            throw ValidationException::withMessages([
                'ajuste' => ['Este item já possui ajuste vinculado.'],
            ]);
        }

        if (! ($data['checklist_confirmado'] ?? false)) {
            throw ValidationException::withMessages([
                'checklist_confirmado' => [
                    'Confirme o checklist (NF pendente, OP, sobra, endereço) antes de gerar o ajuste.',
                ],
            ]);
        }

        $motivo = strtoupper(trim((string) ($data['motivo_codigo'] ?? $inv->motivoPadrao())));
        $qtdeFinal = PadraoDecimal::roundHalfUp((string) $item->qtde_final, PadraoDecimal::SCALE_QTY);

        $aju = $this->ajustes->createFromInventario($empresa, $item, [
            'motivo_codigo' => $motivo,
            'motivo_complemento' => $data['motivo_complemento'] ?? null,
            'qtde_contada' => $qtdeFinal,
            'qtde_sistema' => PadraoDecimal::roundHalfUp((string) $item->qtde_sistema_corte, PadraoDecimal::SCALE_QTY),
            'origem' => $inv->origemAjuste(),
            'checklist_confirmado' => true,
            'observacao' => $data['observacao'] ?? null,
            'causa_raiz' => $data['causa_raiz'] ?? null,
            'lote_payload' => $data['lote_payload'] ?? null,
            'contado_por_ids' => array_values(array_filter([
                $item->contado_por_1,
                $item->contado_por_2,
            ])),
        ]);

        $item->ajuste_id = $aju['id'];
        $item->checklist_confirmado = true;
        $item->status = EstoqueInventarioItem::STATUS_AJU_GERADO;
        $item->save();

        if ($inv->status !== EstoqueInventario::STATUS_CONFRONTADO) {
            $inv->status = EstoqueInventario::STATUS_CONFRONTADO;
            $inv->save();
        }

        return [
            'item' => $this->itemOut($item->fresh(), false),
            'ajuste' => $aju,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function encerrar(Empresa $empresa, EstoqueInventario $inv): array
    {
        $this->assertEmpresa($empresa, $inv);

        if (in_array($inv->status, [
            EstoqueInventario::STATUS_ENCERRADO,
            EstoqueInventario::STATUS_CANCELADO,
        ], true)) {
            throw ValidationException::withMessages([
                'status' => ['Inventário já encerrado ou cancelado.'],
            ]);
        }

        $itens = $inv->itens()->get();
        $pendentes = $itens->filter(function (EstoqueInventarioItem $i) {
            return ! in_array($i->status, [
                EstoqueInventarioItem::STATUS_OK,
                EstoqueInventarioItem::STATUS_AJU_GERADO,
            ], true);
        });

        if ($pendentes->isNotEmpty()) {
            throw ValidationException::withMessages([
                'itens' => [
                    'Há itens pendentes de contagem/recontagem/ajuste. Conclua todos antes de encerrar.',
                ],
            ]);
        }

        $skus = $itens->count();
        $ok = $itens->where('status', EstoqueInventarioItem::STATUS_OK)->count();
        $acuracidade = $skus > 0
            ? PadraoDecimal::roundHalfUp(bcmul(bcdiv((string) $ok, (string) $skus, 8), '100', 8), 4)
            : PadraoDecimal::roundHalfUp('100', 4);

        $inv->status = EstoqueInventario::STATUS_ENCERRADO;
        $inv->encerrado_em = now();
        $inv->skus_contados = $skus;
        $inv->skus_ok = $ok;
        $inv->acuracidade_pct = $acuracidade;
        $inv->save();

        return $this->show($empresa, $inv->fresh(), false);
    }

    /**
     * Aborta inventário ainda sem AJU. Não é exclusão física: permanece CANCELADO
     * no histórico e libera o congelamento dos SKUs (estudo 32 / ADR).
     *
     * @return array<string, mixed>
     */
    public function cancelar(Empresa $empresa, EstoqueInventario $inv): array
    {
        $this->assertEmpresa($empresa, $inv);

        return DB::transaction(function () use ($empresa, $inv) {
            $inv = EstoqueInventario::query()->lockForUpdate()->findOrFail($inv->id);
            $this->assertEmpresa($empresa, $inv);

            if ($inv->status === EstoqueInventario::STATUS_ENCERRADO) {
                throw ValidationException::withMessages([
                    'status' => ['Inventário encerrado não pode ser cancelado.'],
                ]);
            }

            if ($inv->status === EstoqueInventario::STATUS_CANCELADO) {
                throw ValidationException::withMessages([
                    'status' => ['Inventário já cancelado.'],
                ]);
            }

            $comAjuste = $inv->itens()->whereNotNull('ajuste_id')->exists();
            if ($comAjuste) {
                throw ValidationException::withMessages([
                    'status' => ['Inventário com ajuste gerado não pode ser cancelado.'],
                ]);
            }

            $inv->status = EstoqueInventario::STATUS_CANCELADO;
            $inv->save();

            // Libera congelamento mesmo se algum leitor olhar só o status do item.
            $inv->itens()->update(['status' => EstoqueInventarioItem::STATUS_OK]);

            return $this->show($empresa, $inv->fresh(), false);
        });
    }

    /**
     * @return array<string, mixed>
     */
    public function meta(): array
    {
        return [
            'tipos' => EstoqueInventario::TIPOS,
            'statuses' => EstoqueInventario::STATUSES,
            'item_statuses' => EstoqueInventarioItem::STATUSES,
            'leitura_resultados' => EstoqueInventarioLeitura::RESULTADOS,
            'motivos' => collect(EstoqueAjuste::MOTIVOS)
                ->map(fn (string $nome, string $codigo) => ['codigo' => $codigo, 'nome' => $nome])
                ->values()
                ->all(),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function toOut(EstoqueInventario $inv, bool $withItens, bool $cego): array
    {
        $inv->loadMissing([...EstoqueInventario::userStampWith()]);

        $out = [
            'id' => $inv->id,
            'empresa_id' => $inv->empresa_id,
            'codigo' => $inv->codigo,
            'tipo' => $inv->tipo,
            'status' => $inv->status,
            'iniciado_em' => optional($inv->iniciado_em)?->toIso8601String(),
            'encerrado_em' => optional($inv->encerrado_em)?->toIso8601String(),
            'acuracidade_pct' => $inv->acuracidade_pct !== null ? (string) $inv->acuracidade_pct : null,
            'skus_contados' => $inv->skus_contados,
            'skus_ok' => $inv->skus_ok,
            'itens_count' => $inv->itens_count ?? $inv->itens()->count(),
            'pode_cancelar' => $this->podeCancelar($inv),
            'observacao' => $inv->observacao,
            'created_at' => optional($inv->created_at)?->toIso8601String(),
            'criado_por' => EstoqueInventario::userStampFrom($inv->criador),
            'atualizado_por' => EstoqueInventario::userStampFrom($inv->atualizador),
        ];

        if ($withItens) {
            $inv->loadMissing([
                'itens.produto:id,codigo,descricao_fiscal,familia,unidade_interna',
                'itens.contadoPor1User:id,name',
                'itens.contadoPor2User:id,name',
                'itens.ajuste:id,codigo,status',
            ]);

            $volumesPorProduto = $this->volumesAtivosPorProduto(
                (int) $inv->empresa_id,
                $inv->itens->pluck('produto_id')->map(fn ($id) => (int) $id)->all()
            );

            $out['itens'] = $inv->itens->map(
                fn (EstoqueInventarioItem $i) => $this->itemOut($i, $cego, $volumesPorProduto[(int) $i->produto_id] ?? 0)
            )->all();

            $inv->loadMissing([
                'leituras' => function ($q) {
                    $q->where('resultado', '!=', EstoqueInventarioLeitura::RESULTADO_ANULADA)
                        ->orderByDesc('id');
                },
                'leituras.lote:id,codigo',
                'leituras.produto:id,codigo,descricao_fiscal',
                'leituras.enderecoLido:id,codigo',
                'leituras.enderecoEsperado:id,codigo',
                'leituras.lidoPorUser:id,name',
            ]);
            $out['leituras'] = $inv->leituras
                ->map(fn (EstoqueInventarioLeitura $l) => $this->leituraOut($l))
                ->all();
            $out['contagem_fisica'] = [
                'skus_com_volume' => count(array_filter($volumesPorProduto, fn ($n) => $n > 0)),
                'leituras_ativas' => count($out['leituras']),
                'locais_errados' => $inv->leituras
                    ->where('resultado', EstoqueInventarioLeitura::RESULTADO_LOCAL_ERRADO)
                    ->count(),
            ];
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function itemOut(EstoqueInventarioItem $item, bool $cego, ?int $volumesAtivos = null): array
    {
        $item->loadMissing([
            'produto:id,codigo,descricao_fiscal,familia,unidade_interna',
            'contadoPor1User:id,name',
            'contadoPor2User:id,name',
            'ajuste:id,codigo,status',
        ]);

        if ($volumesAtivos === null) {
            $volumesAtivos = $this->volumesAtivosPorProduto(
                (int) $item->empresa_id,
                [(int) $item->produto_id]
            )[(int) $item->produto_id] ?? 0;
        }

        $out = [
            'id' => $item->id,
            'inventario_id' => $item->inventario_id,
            'produto_id' => $item->produto_id,
            'produto' => $item->produto ? [
                'id' => $item->produto->id,
                'codigo' => $item->produto->codigo,
                'descricao_fiscal' => $item->produto->descricao_fiscal,
                'familia' => $item->produto->familia,
                'unidade_interna' => $item->produto->unidade_interna,
            ] : null,
            'unidade' => $item->unidade,
            'modo_contagem' => $volumesAtivos > 0 ? 'VOLUME' : 'SKU',
            'volumes_ativos' => $volumesAtivos,
            'qtde_1' => $item->qtde_1 !== null ? (string) $item->qtde_1 : null,
            'contado_por_1' => $item->contadoPor1User
                ? ['id' => $item->contadoPor1User->id, 'name' => $item->contadoPor1User->name]
                : null,
            'contado_em_1' => optional($item->contado_em_1)?->toIso8601String(),
            'qtde_2' => $item->qtde_2 !== null ? (string) $item->qtde_2 : null,
            'contado_por_2' => $item->contadoPor2User
                ? ['id' => $item->contadoPor2User->id, 'name' => $item->contadoPor2User->name]
                : null,
            'contado_em_2' => optional($item->contado_em_2)?->toIso8601String(),
            'qtde_final' => $item->qtde_final !== null ? (string) $item->qtde_final : null,
            'status' => $item->status,
            'ajuste_id' => $item->ajuste_id,
            'ajuste' => $item->ajuste ? [
                'id' => $item->ajuste->id,
                'codigo' => $item->ajuste->codigo,
                'status' => $item->ajuste->status,
            ] : null,
            'checklist_confirmado' => (bool) $item->checklist_confirmado,
            'observacao' => $item->observacao,
        ];

        // Contagem cega: saldo do sistema só após confrontação (item OK/RECONTADO/AJU_*).
        if (! $cego || in_array($item->status, [
            EstoqueInventarioItem::STATUS_OK,
            EstoqueInventarioItem::STATUS_RECONTADO,
            EstoqueInventarioItem::STATUS_AJU_PENDENTE,
            EstoqueInventarioItem::STATUS_AJU_GERADO,
            EstoqueInventarioItem::STATUS_DIVERGENTE,
            EstoqueInventarioItem::STATUS_CONTADO_1,
        ], true)) {
            // Após 1ª contagem o confrontador/gestor precisa ver sistema × contado.
            // Durante PENDENTE/EM_CONTAGEM (antes de registrar): oculto.
            if (! in_array($item->status, [
                EstoqueInventarioItem::STATUS_PENDENTE,
                EstoqueInventarioItem::STATUS_EM_CONTAGEM,
            ], true) || ! $cego) {
                $out['qtde_sistema_corte'] = (string) $item->qtde_sistema_corte;
                $out['qtde_diferenca'] = $item->qtde_diferenca !== null ? (string) $item->qtde_diferenca : null;
            }
        }

        if ($cego && in_array($item->status, [
            EstoqueInventarioItem::STATUS_PENDENTE,
            EstoqueInventarioItem::STATUS_EM_CONTAGEM,
        ], true)) {
            // Explicitamente sem saldo.
            unset($out['qtde_sistema_corte'], $out['qtde_diferenca']);
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function leituraOut(EstoqueInventarioLeitura $leitura): array
    {
        $leitura->loadMissing([
            'lote:id,codigo',
            'produto:id,codigo,descricao_fiscal',
            'enderecoLido:id,codigo',
            'enderecoEsperado:id,codigo',
            'lidoPorUser:id,name',
        ]);

        return [
            'id' => $leitura->id,
            'inventario_id' => $leitura->inventario_id,
            'rodada' => (int) $leitura->rodada,
            'lote_id' => $leitura->lote_id,
            'lote' => $leitura->lote ? [
                'id' => $leitura->lote->id,
                'codigo' => $leitura->lote->codigo,
            ] : null,
            'produto_id' => $leitura->produto_id,
            'produto' => $leitura->produto ? [
                'id' => $leitura->produto->id,
                'codigo' => $leitura->produto->codigo,
                'descricao_fiscal' => $leitura->produto->descricao_fiscal,
            ] : null,
            'endereco_lido' => $leitura->enderecoLido ? [
                'id' => $leitura->enderecoLido->id,
                'codigo' => $leitura->enderecoLido->codigo,
            ] : null,
            'endereco_esperado' => $leitura->enderecoEsperado ? [
                'id' => $leitura->enderecoEsperado->id,
                'codigo' => $leitura->enderecoEsperado->codigo,
            ] : null,
            'qtde_volume' => (string) $leitura->qtde_volume,
            'unidade' => $leitura->unidade,
            'resultado' => $leitura->resultado,
            'lido_por' => $leitura->lidoPorUser
                ? ['id' => $leitura->lidoPorUser->id, 'name' => $leitura->lidoPorUser->name]
                : null,
            'lido_em' => optional($leitura->lido_em)?->toIso8601String(),
        ];
    }

    /**
     * @param  list<int>  $produtoIds
     * @return array<int, int> produto_id => count volumes qtde>0
     */
    private function volumesAtivosPorProduto(int $empresaId, array $produtoIds): array
    {
        if ($produtoIds === []) {
            return [];
        }

        $rows = EstoqueLote::query()
            ->selectRaw('produto_id, COUNT(*) as total')
            ->where('empresa_id', $empresaId)
            ->whereIn('produto_id', $produtoIds)
            ->where('qtde', '>', 0)
            ->groupBy('produto_id')
            ->pluck('total', 'produto_id');

        $out = [];
        foreach ($produtoIds as $pid) {
            $out[$pid] = (int) ($rows[$pid] ?? 0);
        }

        return $out;
    }

    private function assertItemAceitaRodada(EstoqueInventarioItem $item, int $rodada): void
    {
        if ($rodada === 1) {
            if (! in_array($item->status, [
                EstoqueInventarioItem::STATUS_PENDENTE,
                EstoqueInventarioItem::STATUS_EM_CONTAGEM,
            ], true)) {
                throw ValidationException::withMessages([
                    'status' => ['Item não está disponível para a 1ª contagem física.'],
                ]);
            }

            return;
        }

        if ($item->status !== EstoqueInventarioItem::STATUS_DIVERGENTE) {
            throw ValidationException::withMessages([
                'status' => ['2ª contagem física só após divergência na 1ª.'],
            ]);
        }
    }

    private function parseQtde(mixed $raw): string
    {
        $qtde = PadraoDecimal::parseStrict($raw, PadraoDecimal::SCALE_QTY);
        if ($qtde === null || bccomp($qtde, '0', PadraoDecimal::SCALE_QTY) < 0) {
            throw ValidationException::withMessages([
                'qtde' => ['Quantidade contada deve ser zero ou positiva.'],
            ]);
        }

        return $qtde;
    }

    private function assertEmpresa(Empresa $empresa, EstoqueInventario $inv): void
    {
        if ($inv->empresa_id !== $empresa->id) {
            abort(404);
        }
    }

    private function assertItemDoInv(Empresa $empresa, EstoqueInventario $inv, EstoqueInventarioItem $item): void
    {
        $this->assertEmpresa($empresa, $inv);
        if ($item->inventario_id !== $inv->id || $item->empresa_id !== $empresa->id) {
            abort(404);
        }
    }

    private function podeCancelar(EstoqueInventario $inv): bool
    {
        if (in_array($inv->status, [
            EstoqueInventario::STATUS_ENCERRADO,
            EstoqueInventario::STATUS_CANCELADO,
        ], true)) {
            return false;
        }

        if (array_key_exists('tem_ajuste', $inv->getAttributes())) {
            return ! (bool) $inv->getAttribute('tem_ajuste');
        }

        return ! $inv->itens()->whereNotNull('ajuste_id')->exists();
    }

    private function assertInvAberto(EstoqueInventario $inv): void
    {
        if (in_array($inv->status, [
            EstoqueInventario::STATUS_ENCERRADO,
            EstoqueInventario::STATUS_CANCELADO,
        ], true)) {
            throw ValidationException::withMessages([
                'status' => ['Inventário encerrado ou cancelado.'],
            ]);
        }
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
