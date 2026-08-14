<?php

namespace App\Services\Financeiro;

use App\Models\Cobranca;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\EstoqueMovimento;
use App\Models\Faturamento;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\OrdemCompra;
use App\Models\Pedido;
use App\Models\Titulo;
use App\Models\TituloBaixa;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class TituloService
{
    public function __construct(
        private readonly CodigoGenerator $codigos,
    ) {}

    /**
     * @return list<array<string, mixed>>
     */
    public function listPagar(Empresa $empresa, ?string $q = null, ?string $status = null, ?int $parceiroId = null): array
    {
        return $this->listByTipo($empresa, Titulo::TIPO_PAGAR, $q, $status, $parceiroId);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public function listReceber(Empresa $empresa, ?string $q = null, ?string $status = null, ?int $parceiroId = null): array
    {
        return $this->listByTipo($empresa, Titulo::TIPO_RECEBER, $q, $status, $parceiroId);
    }

    /**
     * @return list<array<string, mixed>>
     */
    private function listByTipo(
        Empresa $empresa,
        string $tipo,
        ?string $q = null,
        ?string $status = null,
        ?int $parceiroId = null,
    ): array {
        $query = Titulo::query()
            ->with([
                'parceiro:id,codigo,razao_social,nome_fantasia',
                'natureza:id,codigo,codigo_exibicao,nome',
                'ordemCompra:id,codigo',
                'orcamento:id,codigo,financeiro_status',
                'pedido:id,codigo',
                'faturamento:id,codigo',
                'cobrancas',
                'baixas',
                ...Titulo::userStampWith(),
            ])
            ->where('empresa_id', $empresa->id)
            ->where('tipo', $tipo)
            ->orderByDesc('id');

        if ($status) {
            $query->where('status', $status);
        }

        if ($parceiroId) {
            $query->where('parceiro_id', $parceiroId);
        }

        if ($q) {
            $like = '%'.$q.'%';
            $query->where(function ($inner) use ($like) {
                $inner->where('codigo', 'like', $like)
                    ->orWhere('documento', 'like', $like)
                    ->orWhereHas('parceiro', function ($pq) use ($like) {
                        $pq->where('codigo', 'like', $like)
                            ->orWhere('razao_social', 'like', $like);
                    });
            });
        }

        return $query->get()->map(fn (Titulo $t) => $this->toOut($t))->all();
    }

    public function criarReceberAdiantamento(
        Empresa $empresa,
        int $parceiroId,
        NaturezaGerencial $natureza,
        Orcamento $orcamento,
        string $valor,
        string $emissao,
        string $vencimento,
        ?string $observacao,
    ): Titulo {
        $ano = (int) now()->year;
        $codigo = $this->codigos->nextCode($empresa->id, 'TIT-'.$ano, 5);

        return Titulo::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'tipo' => Titulo::TIPO_RECEBER,
            'parceiro_id' => $parceiroId,
            'natureza_id' => $natureza->id,
            'orcamento_id' => $orcamento->id,
            'origem' => AdiantamentoService::ORIGEM_ADIANTAMENTO,
            'documento' => $orcamento->codigo,
            'emissao' => $emissao,
            'vencimento' => $vencimento,
            'valor' => $valor,
            'saldo' => $valor,
            'status' => Titulo::STATUS_ABERTO,
            'observacao' => $observacao,
        ]);
    }

    public function criarReceberFatura(
        Empresa $empresa,
        Pedido $pedido,
        Faturamento $faturamento,
        NaturezaGerencial $natureza,
        string $valor,
        string $emissao,
        string $vencimento,
        int $parcela,
        int $totalParcelas,
        ?string $observacao,
    ): Titulo {
        $ano = (int) now()->year;
        $codigo = $this->codigos->nextCode($empresa->id, 'TIT-'.$ano, 5);
        $nDup = $totalParcelas > 1 ? str_pad((string) $parcela, 3, '0', STR_PAD_LEFT) : null;
        $doc = $faturamento->codigo;
        if ($nDup) {
            $doc .= '-'.$nDup;
        }

        return Titulo::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'tipo' => Titulo::TIPO_RECEBER,
            'parceiro_id' => $pedido->parceiro_id,
            'natureza_id' => $natureza->id,
            'orcamento_id' => $pedido->orcamento_id,
            'pedido_id' => $pedido->id,
            'faturamento_id' => $faturamento->id,
            'origem' => FaturamentoService::ORIGEM_FATURA,
            'documento' => $doc,
            'parcela' => $parcela,
            'n_dup' => $nDup,
            'emissao' => $emissao,
            'vencimento' => $vencimento,
            'valor' => $valor,
            'saldo' => $valor,
            'status' => Titulo::STATUS_ABERTO,
            'observacao' => $observacao,
        ]);
    }

    /**
     * Cria título(s) a pagar a partir da entrada de estoque (chamado só por EstoqueEntradaService).
     *
     * @param  list<array{vencimento: string, valor: string, n_dup?: ?string, parcela?: int}>|null  $parcelas
     * @return list<\App\Models\Titulo>
     */
    public function criarPagarDeEntrada(
        Empresa $empresa,
        OrdemCompra $oc,
        EstoqueMovimento $movimento,
        NaturezaGerencial $natureza,
        string $valorFallback,
        ?string $vencimentoFallback,
        string $emissao,
        ?string $documento,
        ?array $parcelas = null,
    ): array {
        $linhas = $parcelas;
        if ($linhas === null || $linhas === []) {
            if ($vencimentoFallback === null || $vencimentoFallback === '') {
                throw ValidationException::withMessages([
                    'vencimento' => ['Informe o vencimento do título ou as parcelas da NF.'],
                ]);
            }
            $linhas = [[
                'vencimento' => $vencimentoFallback,
                'valor' => $valorFallback,
                'n_dup' => null,
                'parcela' => 1,
            ]];
        }

        $titulos = [];
        $ordem = 1;
        foreach ($linhas as $linha) {
            $valor = PadraoDecimal::parseStrict((string) $linha['valor'], PadraoDecimal::SCALE_MONEY);
            if ($valor === null || bccomp($valor, '0', PadraoDecimal::SCALE_MONEY) <= 0) {
                throw ValidationException::withMessages([
                    'parcelas' => ['Cada parcela deve ter valor maior que zero.'],
                ]);
            }

            $parcela = isset($linha['parcela']) ? (int) $linha['parcela'] : $ordem;
            $nDup = isset($linha['n_dup']) ? $this->nullIfEmpty($linha['n_dup']) : null;
            $doc = $documento;
            if ($doc && $nDup) {
                $doc = $doc.'-'.$nDup;
            } elseif ($doc && count($linhas) > 1) {
                $doc = $doc.'-'.str_pad((string) $parcela, 3, '0', STR_PAD_LEFT);
            }

            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'TIT-'.$ano, 5);

            $titulos[] = Titulo::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'tipo' => Titulo::TIPO_PAGAR,
                'parceiro_id' => $oc->fornecedor_id,
                'natureza_id' => $natureza->id,
                'ordem_compra_id' => $oc->id,
                'movimento_id' => $movimento->id,
                'documento' => $doc,
                'parcela' => $parcela,
                'n_dup' => $nDup,
                'emissao' => $emissao,
                'vencimento' => (string) $linha['vencimento'],
                'valor' => $valor,
                'saldo' => $valor,
                'status' => Titulo::STATUS_ABERTO,
            ]);
            $ordem++;
        }

        return $titulos;
    }

    public function cancelarAberto(Titulo $titulo, string $motivo): Titulo
    {
        if ($titulo->status === Titulo::STATUS_CANCELADO) {
            return $titulo;
        }

        if ($titulo->status !== Titulo::STATUS_ABERTO) {
            throw ValidationException::withMessages([
                'titulo' => ['Título '.$titulo->codigo.' não está aberto — não é possível estornar o faturamento.'],
            ]);
        }

        $titulo->loadMissing('baixas');
        if ($titulo->baixas->isNotEmpty()) {
            throw ValidationException::withMessages([
                'titulo' => ['Título '.$titulo->codigo.' já possui baixa — não é possível estornar o faturamento.'],
            ]);
        }

        $titulo->status = Titulo::STATUS_CANCELADO;
        $titulo->saldo = PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_MONEY);
        $obs = trim((string) $titulo->observacao);
        $nota = 'Estorno: '.$motivo;
        $titulo->observacao = $obs === '' ? $nota : $obs.' · '.$nota;
        $titulo->save();

        return $titulo;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    public function baixar(Empresa $empresa, Titulo $titulo, array $data, bool $permitirReceber = false): array
    {
        if ($titulo->empresa_id !== $empresa->id) {
            abort(404);
        }

        $tiposOk = $permitirReceber
            ? [Titulo::TIPO_PAGAR, Titulo::TIPO_RECEBER]
            : [Titulo::TIPO_PAGAR];

        // Contas a receber também baixam pela UI financeira.
        if ($titulo->tipo === Titulo::TIPO_RECEBER) {
            $tiposOk = [Titulo::TIPO_PAGAR, Titulo::TIPO_RECEBER];
        }

        if (! in_array($titulo->tipo, $tiposOk, true)) {
            throw ValidationException::withMessages([
                'tipo' => ['Tipo de título não elegível para baixa.'],
            ]);
        }

        if (! in_array($titulo->status, [Titulo::STATUS_ABERTO, Titulo::STATUS_PARCIAL], true)) {
            throw ValidationException::withMessages([
                'status' => ['Título não está aberto para baixa.'],
            ]);
        }

        $conta = EmpresaContaFinanceira::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', (int) $data['conta_financeira_id'])
            ->first();

        if (! $conta) {
            throw ValidationException::withMessages([
                'conta_financeira_id' => ['Conta financeira inválida para a empresa.'],
            ]);
        }

        $valor = PadraoDecimal::parseStrict($data['valor'], PadraoDecimal::SCALE_MONEY);
        if ($valor === null || bccomp($valor, '0', PadraoDecimal::SCALE_MONEY) <= 0) {
            throw ValidationException::withMessages([
                'valor' => ['Valor da baixa deve ser maior que zero.'],
            ]);
        }

        if (bccomp($valor, (string) $titulo->saldo, PadraoDecimal::SCALE_MONEY) > 0) {
            throw ValidationException::withMessages([
                'valor' => ['Valor da baixa não pode exceder o saldo do título.'],
            ]);
        }

        $baixa = DB::transaction(function () use ($empresa, $titulo, $conta, $valor, $data) {
            $titulo = Titulo::query()->lockForUpdate()->findOrFail($titulo->id);

            if (bccomp($valor, (string) $titulo->saldo, PadraoDecimal::SCALE_MONEY) > 0) {
                throw ValidationException::withMessages([
                    'valor' => ['Valor da baixa não pode exceder o saldo do título.'],
                ]);
            }

            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'BX-'.$ano, 5);

            $baixa = TituloBaixa::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'titulo_id' => $titulo->id,
                'conta_financeira_id' => $conta->id,
                'valor' => $valor,
                'pago_em' => $data['pago_em'],
                'forma' => $this->nullIfEmpty($data['forma'] ?? null),
                'observacao' => $this->nullIfEmpty($data['observacao'] ?? null),
            ]);

            $novoSaldo = PadraoDecimal::roundHalfUp(
                bcsub((string) $titulo->saldo, $valor, PadraoDecimal::SCALE_MONEY + 2),
                PadraoDecimal::SCALE_MONEY
            );

            $titulo->saldo = $novoSaldo;
            $titulo->status = bccomp($novoSaldo, '0', PadraoDecimal::SCALE_MONEY) === 0
                ? Titulo::STATUS_QUITADO
                : Titulo::STATUS_PARCIAL;
            $titulo->save();

            return $baixa;
        });

        $tituloFresh = $titulo->fresh(['cobrancas', 'orcamento']);
        if ($tituloFresh && $tituloFresh->tipo === Titulo::TIPO_RECEBER) {
            // Lazy resolve evita ciclo no container se AdiantamentoService injeta TituloService.
            app(AdiantamentoService::class)->liberarSeAdiantamentoQuitado($tituloFresh);
        }

        return [
            'baixa' => $this->baixaToOut($baixa->fresh(['contaFinanceira'])),
            'titulo' => $this->toOut($tituloFresh ?? $titulo->fresh()),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function toOut(Titulo $t): array
    {
        $t->loadMissing([
            'parceiro:id,codigo,razao_social,nome_fantasia',
            'natureza:id,codigo,codigo_exibicao,nome',
            'ordemCompra:id,codigo',
            'orcamento:id,codigo,financeiro_status',
            'pedido:id,codigo',
            'faturamento:id,codigo',
            'cobrancas',
            'baixas.contaFinanceira:id,codigo,descricao',
            ...Titulo::userStampWith(),
        ]);

        return [
            'id' => $t->id,
            'empresa_id' => $t->empresa_id,
            'codigo' => $t->codigo,
            'tipo' => $t->tipo,
            'origem' => $t->origem,
            'parceiro_id' => $t->parceiro_id,
            'parceiro' => $t->parceiro ? [
                'id' => $t->parceiro->id,
                'codigo' => $t->parceiro->codigo,
                'razao_social' => $t->parceiro->razao_social,
                'nome_fantasia' => $t->parceiro->nome_fantasia,
            ] : null,
            'natureza_id' => $t->natureza_id,
            'natureza' => $t->natureza ? [
                'id' => $t->natureza->id,
                'codigo' => $t->natureza->codigo,
                'codigo_exibicao' => $t->natureza->codigo_exibicao,
                'nome' => $t->natureza->nome,
            ] : null,
            'ordem_compra_id' => $t->ordem_compra_id,
            'movimento_id' => $t->movimento_id,
            'orcamento_id' => $t->orcamento_id,
            'orcamento' => $t->orcamento ? [
                'id' => $t->orcamento->id,
                'codigo' => $t->orcamento->codigo,
                'financeiro_status' => $t->orcamento->financeiro_status,
            ] : null,
            'pedido_id' => $t->pedido_id,
            'pedido' => $t->pedido ? [
                'id' => $t->pedido->id,
                'codigo' => $t->pedido->codigo,
            ] : null,
            'faturamento_id' => $t->faturamento_id,
            'faturamento' => $t->faturamento ? [
                'id' => $t->faturamento->id,
                'codigo' => $t->faturamento->codigo,
            ] : null,
            'documento' => $t->documento,
            'parcela' => $t->parcela,
            'n_dup' => $t->n_dup,
            'emissao' => optional($t->emissao)?->format('Y-m-d'),
            'vencimento' => optional($t->vencimento)?->format('Y-m-d'),
            'valor' => (string) $t->valor,
            'saldo' => (string) $t->saldo,
            'status' => $t->status,
            'observacao' => $t->observacao,
            'cobrancas' => $t->relationLoaded('cobrancas')
                ? $t->cobrancas->map(fn (Cobranca $c) => [
                    'id' => $c->id,
                    'codigo' => $c->codigo,
                    'provider' => $c->provider,
                    'status' => $c->status,
                    'pix_copia_cola' => $c->pix_copia_cola,
                    'pix_qr_base64' => $c->pix_qr_base64,
                    'linha_digitavel' => $c->linha_digitavel,
                    'vencimento' => optional($c->vencimento)?->format('Y-m-d'),
                ])->values()->all()
                : [],
            'baixas' => $t->relationLoaded('baixas')
                ? $t->baixas->map(fn (TituloBaixa $b) => $this->baixaToOut($b))->values()->all()
                : [],
            'created_at' => optional($t->created_at)?->toIso8601String(),
            'updated_at' => optional($t->updated_at)?->toIso8601String(),
            'criado_por' => Titulo::userStampFrom($t->criador),
            'atualizado_por' => Titulo::userStampFrom($t->atualizador),
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function baixaToOut(TituloBaixa $b): array
    {
        $b->loadMissing(['contaFinanceira:id,codigo,descricao', ...TituloBaixa::userStampWith()]);

        return [
            'id' => $b->id,
            'empresa_id' => $b->empresa_id,
            'codigo' => $b->codigo,
            'titulo_id' => $b->titulo_id,
            'conta_financeira_id' => $b->conta_financeira_id,
            'conta_financeira' => $b->contaFinanceira ? [
                'id' => $b->contaFinanceira->id,
                'codigo' => $b->contaFinanceira->codigo,
                'descricao' => $b->contaFinanceira->descricao,
            ] : null,
            'valor' => (string) $b->valor,
            'pago_em' => optional($b->pago_em)?->format('Y-m-d'),
            'forma' => $b->forma,
            'observacao' => $b->observacao,
            'created_at' => optional($b->created_at)?->toIso8601String(),
            'criado_por' => TituloBaixa::userStampFrom($b->criador),
            'atualizado_por' => TituloBaixa::userStampFrom($b->atualizador),
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
