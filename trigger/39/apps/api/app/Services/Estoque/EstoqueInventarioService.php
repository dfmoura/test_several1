<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueAjuste;
use App\Models\EstoqueInventario;
use App\Models\EstoqueInventarioItem;
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
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function list(Empresa $empresa, ?string $status = null, ?string $tipo = null): array
    {
        $query = EstoqueInventario::query()
            ->with([...EstoqueInventario::userStampWith()])
            ->withCount('itens')
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
     * @return array<string, mixed>
     */
    public function cancelar(Empresa $empresa, EstoqueInventario $inv): array
    {
        $this->assertEmpresa($empresa, $inv);

        if ($inv->status === EstoqueInventario::STATUS_ENCERRADO) {
            throw ValidationException::withMessages([
                'status' => ['Inventário encerrado não pode ser cancelado.'],
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

        $inv->itens()->update(['status' => EstoqueInventarioItem::STATUS_OK]);

        return $this->show($empresa, $inv->fresh(), false);
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
            $out['itens'] = $inv->itens->map(fn (EstoqueInventarioItem $i) => $this->itemOut($i, $cego))->all();
        }

        return $out;
    }

    /**
     * @return array<string, mixed>
     */
    private function itemOut(EstoqueInventarioItem $item, bool $cego): array
    {
        $item->loadMissing([
            'produto:id,codigo,descricao_fiscal,familia,unidade_interna',
            'contadoPor1User:id,name',
            'contadoPor2User:id,name',
            'ajuste:id,codigo,status',
        ]);

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
