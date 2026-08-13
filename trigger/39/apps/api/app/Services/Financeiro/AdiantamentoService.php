<?php

namespace App\Services\Financeiro;

use App\Models\Cobranca;
use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\NaturezaGerencial;
use App\Models\Orcamento;
use App\Models\Parceiro;
use App\Models\ParametroEmpresa;
use App\Models\Titulo;
use App\Services\Banking\BankProviderResolver;
use App\Services\Codigo\CodigoGenerator;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Adiantamento/sinal no aceite do ORC (estudo 32 §5.1 / UC-COM-009).
 * Aceite comercial ≠ liberação financeira.
 */
class AdiantamentoService
{
    public const FIN_LIBERADO = 'LIBERADO';

    public const FIN_AGUARDA_ADIANTAMENTO = 'AGUARDA_ADIANTAMENTO';

    public const ORIGEM_ADIANTAMENTO = 'ADIANTAMENTO';

    public const PARAM_OBRIGATORIO = 'orc.adiantamento_obrigatorio';

    public const PARAM_PERCENTUAL = 'orc.adiantamento_percentual';

    public function __construct(
        private readonly CodigoGenerator $codigos,
        private readonly BankProviderResolver $banks,
        private readonly TituloService $titulos,
        private readonly \App\Services\Comercial\PedidoService $pedidos,
    ) {}

    public function exigeAdiantamento(Empresa $empresa, ?Parceiro $parceiro): bool
    {
        if ($this->paramBool($empresa, self::PARAM_OBRIGATORIO, false)) {
            return true;
        }

        if ($parceiro === null) {
            return true;
        }

        $limite = PadraoDecimal::parseStrict((string) $parceiro->limite_credito, PadraoDecimal::SCALE_MONEY) ?? '0.00';

        return bccomp($limite, '0', PadraoDecimal::SCALE_MONEY) <= 0;
    }

    public function percentual(Empresa $empresa): string
    {
        $raw = $this->paramValue($empresa, self::PARAM_PERCENTUAL);
        if ($raw === null || $raw === '') {
            return '50';
        }
        $n = PadraoDecimal::parseStrict($raw, 2);
        if ($n === null || bccomp($n, '0', 2) <= 0 || bccomp($n, '100', 2) > 0) {
            return '50';
        }

        return $n;
    }

    /**
     * Emite TIT RECEBER + COB PIX e marca ORC AGUARDA_ADIANTAMENTO.
     * Deve rodar dentro/após o aceite (ORC já APROVADO).
     *
     * @return array<string, mixed>
     */
    public function emitirDoOrcamento(Orcamento $orcamento, int $faixaIndex): array
    {
        $orcamento->loadMissing(['empresa', 'parceiro']);
        $empresa = $orcamento->empresa;
        if ($empresa === null) {
            throw new RuntimeException('ORC sem empresa.');
        }

        if (! $this->exigeAdiantamento($empresa, $orcamento->parceiro)) {
            $orcamento->financeiro_status = self::FIN_LIBERADO;
            $orcamento->save();
            $this->pedidos->garantirDeOrcamentoLiberado($orcamento->fresh(['empresa', 'parceiro', 'pedido']));

            return [
                'exigido' => false,
                'financeiro_status' => self::FIN_LIBERADO,
                'adiantamento' => null,
            ];
        }

        if ($orcamento->adiantamento_titulo_id) {
            return [
                'exigido' => true,
                'financeiro_status' => $orcamento->financeiro_status ?? self::FIN_AGUARDA_ADIANTAMENTO,
                'adiantamento' => $this->dtoPublico($orcamento->fresh(['adiantamentoTitulo.cobrancas'])),
            ];
        }

        $base = $this->valorBaseFaixa($orcamento, $faixaIndex);
        $pct = $this->percentual($empresa);
        $valor = PadraoDecimal::roundHalfUp(
            bcmul($base, bcdiv($pct, '100', 8), 8),
            PadraoDecimal::SCALE_MONEY
        );

        if (bccomp($valor, '0', PadraoDecimal::SCALE_MONEY) <= 0) {
            throw ValidationException::withMessages([
                'adiantamento' => ['Valor do adiantamento inválido.'],
            ]);
        }

        $natureza = NaturezaGerencial::query()
            ->where(function ($q) {
                $q->where('codigo_exibicao', '1.01.01')
                    ->orWhere('codigo', '1.01.01');
            })
            ->first();

        if ($natureza === null) {
            $natureza = NaturezaGerencial::query()
                ->where('codigo_exibicao', 'like', '1.01.%')
                ->orderBy('codigo_exibicao')
                ->first();
        }
        if ($natureza === null) {
            throw new RuntimeException('Natureza gerencial de receita (1.01.01) não encontrada — rode o seed de naturezas.');
        }

        $conta = EmpresaContaFinanceira::query()
            ->where('empresa_id', $empresa->id)
            ->where('ativa', true)
            ->orderByDesc('principal')
            ->orderBy('ordem')
            ->orderBy('id')
            ->first();

        if ($conta === null) {
            throw ValidationException::withMessages([
                'conta_financeira' => ['Cadastre uma conta financeira (CFIN) na empresa antes de emitir PIX.'],
            ]);
        }

        $parceiroId = $orcamento->parceiro_id;
        if (! $parceiroId) {
            throw ValidationException::withMessages([
                'parceiro' => ['Orçamento sem parceiro — não é possível emitir adiantamento.'],
            ]);
        }

        $vencimento = now()->addDays(3)->toDateString();
        $emissao = now()->toDateString();
        $idempotency = 'ORC-ADI-'.$orcamento->id.'-v'.$orcamento->versao.'-f'.$faixaIndex;

        $resultado = DB::transaction(function () use (
            $empresa,
            $orcamento,
            $parceiroId,
            $natureza,
            $conta,
            $valor,
            $pct,
            $vencimento,
            $emissao,
            $idempotency,
        ) {
            $existente = Cobranca::query()
                ->where('empresa_id', $empresa->id)
                ->where('idempotency_key', $idempotency)
                ->first();
            if ($existente) {
                $orcamento->adiantamento_titulo_id = $existente->titulo_id;
                $orcamento->financeiro_status = self::FIN_AGUARDA_ADIANTAMENTO;
                $orcamento->save();

                return $existente->titulo_id;
            }

            $titulo = $this->titulos->criarReceberAdiantamento(
                $empresa,
                $parceiroId,
                $natureza,
                $orcamento,
                $valor,
                $emissao,
                $vencimento,
                'Adiantamento '.$pct.'% — '.$orcamento->codigo,
            );

            $provider = $this->banks->default();
            $emitida = $provider->emitirCobranca($empresa, $titulo, [
                'valor' => $valor,
                'vencimento' => $vencimento,
                'pagador_nome' => $orcamento->cliente_nome ?: $orcamento->parceiro?->razao_social,
                'pagador_documento' => $orcamento->parceiro?->cnpj_cpf,
                'descricao' => 'Adiantamento '.$orcamento->codigo,
                'idempotency_key' => $idempotency,
                'seu_numero' => substr(preg_replace('/\W+/', '', $orcamento->codigo) ?: (string) $orcamento->id, 0, 15),
            ]);

            $ano = (int) now()->year;
            $codigo = $this->codigos->nextCode($empresa->id, 'COB-'.$ano, 5);

            Cobranca::query()->create([
                'empresa_id' => $empresa->id,
                'codigo' => $codigo,
                'titulo_id' => $titulo->id,
                'empresa_conta_financeira_id' => $conta->id,
                'provider' => $provider->nome(),
                'provider_ref' => $emitida->providerRef,
                'txid' => $emitida->txid,
                'idempotency_key' => $idempotency,
                'pix_copia_cola' => $emitida->pixCopiaCola,
                'pix_qr_base64' => $emitida->pixQrBase64,
                'linha_digitavel' => $emitida->linhaDigitavel,
                'pdf_url' => $emitida->pdfUrl,
                'vencimento' => $vencimento,
                'status' => $emitida->status,
                'provider_payload' => $emitida->raw,
            ]);

            $orcamento->adiantamento_titulo_id = $titulo->id;
            $orcamento->financeiro_status = self::FIN_AGUARDA_ADIANTAMENTO;
            $orcamento->save();

            return $titulo->id;
        });

        $orcamento->refresh();

        return [
            'exigido' => true,
            'financeiro_status' => self::FIN_AGUARDA_ADIANTAMENTO,
            'adiantamento' => $this->dtoPublico($orcamento),
            'titulo_id' => $resultado,
        ];
    }

    /**
     * Após BX total do TIT de adiantamento → libera ORC financeiramente.
     */
    public function liberarSeAdiantamentoQuitado(Titulo $titulo): void
    {
        if ($titulo->origem !== self::ORIGEM_ADIANTAMENTO || $titulo->tipo !== Titulo::TIPO_RECEBER) {
            return;
        }

        if ($titulo->status !== Titulo::STATUS_QUITADO) {
            return;
        }

        $orcamento = Orcamento::query()
            ->where('adiantamento_titulo_id', $titulo->id)
            ->first();

        if ($orcamento === null && $titulo->orcamento_id) {
            $orcamento = Orcamento::query()->find($titulo->orcamento_id);
        }

        if ($orcamento === null) {
            return;
        }

        Cobranca::query()
            ->where('titulo_id', $titulo->id)
            ->whereIn('status', [Cobranca::STATUS_EMITIDA, Cobranca::STATUS_REGISTRADA])
            ->update(['status' => Cobranca::STATUS_PAGA]);

        if ($orcamento->financeiro_status !== self::FIN_LIBERADO) {
            $orcamento->financeiro_status = self::FIN_LIBERADO;
            $orcamento->save();
        }

        $this->pedidos->garantirDeOrcamentoLiberado($orcamento->fresh(['empresa', 'parceiro', 'pedido']));
    }

    /**
     * @return array<string, mixed>|null
     */
    public function dtoPublico(Orcamento $orcamento): ?array
    {
        $orcamento->loadMissing(['adiantamentoTitulo.cobrancas']);
        $titulo = $orcamento->adiantamentoTitulo;
        if ($titulo === null) {
            return null;
        }

        $cob = $titulo->cobrancas->sortByDesc('id')->first();
        $pct = $orcamento->empresa
            ? $this->percentual($orcamento->empresa)
            : '50';

        return [
            'exigido' => true,
            'financeiro_status' => $orcamento->financeiro_status,
            'status_exibicao' => $orcamento->financeiro_status === self::FIN_AGUARDA_ADIANTAMENTO
                ? 'AGUARDANDO_PAGAMENTO'
                : 'APROVADO',
            'titulo_codigo' => $titulo->codigo,
            'titulo_status' => $titulo->status,
            'cob_codigo' => $cob?->codigo,
            'cob_status' => $cob?->status,
            'provider' => $cob?->provider,
            'pode_simular_pagamento' => $cob?->provider === 'mock'
                && $orcamento->financeiro_status === self::FIN_AGUARDA_ADIANTAMENTO
                && $titulo->status !== Titulo::STATUS_QUITADO,
            'valor' => (string) $titulo->valor,
            'saldo' => (string) $titulo->saldo,
            'percentual' => $pct,
            'vencimento' => optional($titulo->vencimento)?->format('Y-m-d'),
            'pix_copia_cola' => $cob?->pix_copia_cola,
            'pix_qr_base64' => $cob?->pix_qr_base64,
            'linha_digitavel' => $cob?->linha_digitavel,
            'pago' => $titulo->status === Titulo::STATUS_QUITADO
                || $orcamento->financeiro_status === self::FIN_LIBERADO,
        ];
    }

    private function valorBaseFaixa(Orcamento $orcamento, int $faixaIndex): string
    {
        $faixas = $orcamento->result_snapshot['faixas'] ?? [];
        if (! is_array($faixas) || ! array_key_exists($faixaIndex, $faixas) || ! is_array($faixas[$faixaIndex])) {
            throw ValidationException::withMessages([
                'faixa_index' => ['Faixa aprovada inválida para adiantamento.'],
            ]);
        }

        $fx = $faixas[$faixaIndex];
        $input = is_array($orcamento->input_snapshot) ? $orcamento->input_snapshot : [];
        $result = is_array($orcamento->result_snapshot) ? $orcamento->result_snapshot : [];
        $facaNova = (bool) ($result['faca_nova'] ?? $input['faca_nova'] ?? false);
        $valorFaca = (float) ($result['valor_faca_nova'] ?? $input['valor_faca_nova'] ?? 0);
        $valorTotal = (float) ($fx['valor_total'] ?? 0);
        $total = $facaNova
            ? (float) ($fx['valor_total_com_faca'] ?? ($valorTotal + $valorFaca))
            : $valorTotal;

        return PadraoDecimal::roundHalfUp((string) $total, PadraoDecimal::SCALE_MONEY);
    }

    private function paramBool(Empresa $empresa, string $chave, bool $default): bool
    {
        $v = $this->paramValue($empresa, $chave);
        if ($v === null) {
            return $default;
        }
        $v = strtolower(trim($v));

        return in_array($v, ['1', 'true', 'sim', 'yes', 'on'], true);
    }

    private function paramValue(Empresa $empresa, string $chave): ?string
    {
        $row = ParametroEmpresa::query()
            ->where('empresa_id', $empresa->id)
            ->where('chave', $chave)
            ->first();

        return $row?->valor;
    }
}
