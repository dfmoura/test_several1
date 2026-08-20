<?php

namespace App\Services\Estoque;

use App\Models\Empresa;
use App\Models\EstoqueAjuste;
use App\Models\EstoqueLote;
use App\Models\EstoqueSaldo;
use App\Models\Produto;
use App\Models\User;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;

/**
 * Virada de estoque (saldo de abertura) via caminho canônico AJU.
 *
 * Nunca escreve estoque_saldos direto — só EstoqueAjusteService → EstoqueSaldoWriter.
 * Motivo A03 · origem CONTAGEM_AVULSA · SoD (solicitante ≠ aprovador).
 *
 * Idempotente: SKU com saldo > 0 ou já com A03 APROVADO é pulado (não corrompe).
 */
class EstoqueViradaService
{
    public function __construct(
        private readonly EstoqueAjusteService $ajustes,
        private readonly EstoqueSaldoWriter $saldos,
    ) {}

    /**
     * @param  array{
     *   incluir_demos?: bool,
     *   set_minimos?: bool,
     *   dry_run?: bool
     * }  $opts
     * @return array{
     *   aplicados: int,
     *   pulados: int,
     *   faltando: int,
     *   erros: int,
     *   itens: list<array<string, mixed>>
     * }
     */
    public function popular(Empresa $empresa, User $solicitante, User $aprovador, array $opts = []): array
    {
        if ((int) $solicitante->id === (int) $aprovador->id) {
            throw ValidationException::withMessages([
                'aprovador' => ['Virada exige SoD: solicitante e aprovador distintos.'],
            ]);
        }

        if (! $aprovador->can('estoque.aprovar')) {
            throw ValidationException::withMessages([
                'aprovador' => ['Aprovador precisa de estoque.aprovar.'],
            ]);
        }

        $incluirDemos = (bool) ($opts['incluir_demos'] ?? false);
        $setMinimos = (bool) ($opts['set_minimos'] ?? true);
        $dryRun = (bool) ($opts['dry_run'] ?? false);

        $catalogo = EstoqueViradaCatalogData::catalogo($incluirDemos);

        $aplicados = 0;
        $pulados = 0;
        $faltando = 0;
        $erros = 0;
        $itens = [];

        $prevUser = Auth::user();

        try {
            foreach ($catalogo as $row) {
                $resultado = $this->processarLinha(
                    $empresa,
                    $solicitante,
                    $aprovador,
                    $row,
                    $setMinimos,
                    $dryRun
                );
                $itens[] = $resultado;

                match ($resultado['acao']) {
                    'aplicado', 'dry_run' => $aplicados++,
                    'pulado' => $pulados++,
                    'faltando' => $faltando++,
                    'erro' => $erros++,
                    default => null,
                };
            }
        } finally {
            if ($prevUser) {
                Auth::login($prevUser);
            } else {
                Auth::logout();
            }
        }

        return [
            'aplicados' => $aplicados,
            'pulados' => $pulados,
            'faltando' => $faltando,
            'erros' => $erros,
            'itens' => $itens,
        ];
    }

    /**
     * @param  array{
     *   codigo: string,
     *   qtde: string,
     *   minimo: ?string,
     *   fonte: string,
     *   nota: string
     * }  $row
     * @return array<string, mixed>
     */
    private function processarLinha(
        Empresa $empresa,
        User $solicitante,
        User $aprovador,
        array $row,
        bool $setMinimos,
        bool $dryRun,
    ): array {
        $codigo = $row['codigo'];
        $qtdeAlvo = PadraoDecimal::roundHalfUp($row['qtde'], PadraoDecimal::SCALE_QTY);

        $produto = Produto::query()
            ->where('empresa_id', $empresa->id)
            ->where('codigo', $codigo)
            ->where('situacao', 'ATIVO')
            ->first();

        if (! $produto) {
            return [
                'codigo' => $codigo,
                'acao' => 'faltando',
                'motivo' => 'Produto ATIVO não encontrado na EMP',
            ];
        }

        $saldoAtual = $this->qtdeSaldo($empresa, $produto);
        if (bccomp($saldoAtual, '0', PadraoDecimal::SCALE_QTY) > 0) {
            if ($produto->controla_lote && ! $this->temLotes($empresa, $produto)) {
                return $this->backfillLotesExistentes($empresa, $produto, $saldoAtual, $dryRun);
            }

            return [
                'codigo' => $codigo,
                'acao' => 'pulado',
                'motivo' => "Saldo já existe ({$saldoAtual}) — preservado",
                'produto_id' => $produto->id,
            ];
        }

        if ($this->jaTemA03Aprovado($empresa, $produto)) {
            return [
                'codigo' => $codigo,
                'acao' => 'pulado',
                'motivo' => 'Já possui AJU A03 APROVADO',
                'produto_id' => $produto->id,
            ];
        }

        if ($dryRun) {
            return [
                'codigo' => $codigo,
                'acao' => 'dry_run',
                'qtde' => $qtdeAlvo,
                'unidade' => $produto->unidade_interna,
                'fonte' => $row['fonte'],
                'produto_id' => $produto->id,
            ];
        }

        try {
            $lotePayload = $produto->controla_lote
                ? array_map(function (array $linha) {
                    $linha['origem_tipo'] = EstoqueLote::ORIGEM_VIRADA;

                    return $linha;
                }, EstoqueLoteAbertura::planejar($produto, $qtdeAlvo))
                : null;

            Auth::login($solicitante);
            $criado = $this->ajustes->create($empresa, [
                'produto_id' => $produto->id,
                'origem' => EstoqueAjuste::ORIGEM_CONTAGEM_AVULSA,
                'motivo_codigo' => 'A03',
                'qtde_contada' => $qtdeAlvo,
                'checklist_confirmado' => true,
                'lote_payload' => $lotePayload ?: null,
                'observacao' => sprintf(
                    'Virada Camada A · %s · %s',
                    $row['fonte'],
                    $row['nota']
                ),
            ]);

            $ajuste = EstoqueAjuste::query()->findOrFail((int) $criado['id']);

            Auth::login($aprovador);
            $aprovado = $this->ajustes->aprovar($empresa, $ajuste, $aprovador, [
                'causa_raiz' => 'Saldo de abertura / implantação ERP (estudo 32 · A03).',
            ]);

            if ($setMinimos && $row['minimo'] !== null) {
                $produto->estoque_minimo = PadraoDecimal::roundHalfUp(
                    $row['minimo'],
                    PadraoDecimal::SCALE_QTY
                );
                $produto->save();
            }

            return [
                'codigo' => $codigo,
                'acao' => 'aplicado',
                'qtde' => $qtdeAlvo,
                'unidade' => $produto->unidade_interna,
                'ajuste' => $aprovado['ajuste']['codigo'] ?? null,
                'movimento' => $aprovado['movimento']['codigo'] ?? null,
                'produto_id' => $produto->id,
                'fonte' => $row['fonte'],
                'lotes' => $lotePayload ? count($lotePayload) : 0,
            ];
        } catch (\Throwable $e) {
            return [
                'codigo' => $codigo,
                'acao' => 'erro',
                'motivo' => $e->getMessage(),
                'produto_id' => $produto->id,
            ];
        }
    }

    private function qtdeSaldo(Empresa $empresa, Produto $produto): string
    {
        $saldo = EstoqueSaldo::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->first();

        if (! $saldo) {
            return PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_QTY);
        }

        return PadraoDecimal::roundHalfUp((string) $saldo->qtde, PadraoDecimal::SCALE_QTY);
    }

    private function temLotes(Empresa $empresa, Produto $produto): bool
    {
        return EstoqueLote::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->exists();
    }

    /**
     * @return array<string, mixed>
     */
    private function backfillLotesExistentes(
        Empresa $empresa,
        Produto $produto,
        string $saldoAtual,
        bool $dryRun
    ): array {
        $linhas = EstoqueLoteAbertura::planejar($produto, $saldoAtual);
        if ($linhas === []) {
            return [
                'codigo' => $produto->codigo,
                'acao' => 'pulado',
                'motivo' => "Saldo já existe ({$saldoAtual}) — preservado",
                'produto_id' => $produto->id,
            ];
        }

        if ($dryRun) {
            return [
                'codigo' => $produto->codigo,
                'acao' => 'dry_run',
                'qtde' => $saldoAtual,
                'unidade' => $produto->unidade_interna,
                'fonte' => 'backfill_lotes',
                'produto_id' => $produto->id,
                'lotes' => count($linhas),
            ];
        }

        try {
            $this->saldos->backfillLotes($empresa, $produto, $linhas);

            return [
                'codigo' => $produto->codigo,
                'acao' => 'aplicado',
                'qtde' => $saldoAtual,
                'unidade' => $produto->unidade_interna,
                'ajuste' => null,
                'movimento' => null,
                'produto_id' => $produto->id,
                'fonte' => 'backfill_lotes',
                'lotes' => count($linhas),
                'motivo' => 'Lotes de abertura amarrados ao saldo existente (sem alterar SKU)',
            ];
        } catch (\Throwable $e) {
            return [
                'codigo' => $produto->codigo,
                'acao' => 'erro',
                'motivo' => $e->getMessage(),
                'produto_id' => $produto->id,
            ];
        }
    }

    private function jaTemA03Aprovado(Empresa $empresa, Produto $produto): bool
    {
        return EstoqueAjuste::query()
            ->where('empresa_id', $empresa->id)
            ->where('produto_id', $produto->id)
            ->where('motivo_codigo', 'A03')
            ->where('status', EstoqueAjuste::STATUS_APROVADO)
            ->exists();
    }
}
