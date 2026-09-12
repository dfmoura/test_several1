<?php

namespace App\Services\Compras;

use App\Mail\OrdemCompraFornecedorMail;
use App\Models\Empresa;
use App\Models\OrdemCompra;
use App\Models\Parceiro;
use App\Support\PadraoDecimal;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;
use Throwable;

/**
 * E-mail da OC ao fornecedor (ADR_OC_RASCUNHO_ENVIO).
 * Motor = MAIL_* da instalação; Reply-To = empresas.email; destino = parceiros.email.
 */
class OrdemCompraEmailService
{
    /**
     * @return array{enviado: bool, destino: string|null, motivo: string|null}
     */
    public function tentarEnviar(OrdemCompra $oc, Empresa $empresa): array
    {
        if (! filter_var(config('erp.ordem_compra_email_auto', true), FILTER_VALIDATE_BOOL)) {
            return ['enviado' => false, 'destino' => null, 'motivo' => 'desligado'];
        }

        $oc->loadMissing([
            'fornecedor',
            'itens.produto:id,codigo,descricao_fiscal,descricao_comercial,unidade_comercial',
            'itens.composicoes',
        ]);

        $fornecedor = $oc->fornecedor;
        if (! $fornecedor instanceof Parceiro) {
            return ['enviado' => false, 'destino' => null, 'motivo' => 'sem_fornecedor'];
        }

        $destino = $this->emailValido($fornecedor->email);
        if ($destino === null) {
            return ['enviado' => false, 'destino' => null, 'motivo' => 'sem_email_cadastro'];
        }

        $replyTo = $this->emailValido($empresa->email);
        $destNome = $fornecedor->nome_fantasia ?: $fornecedor->razao_social ?: 'Fornecedor';

        try {
            Mail::to($destino)->send(new OrdemCompraFornecedorMail(
                ordemCompra: $oc,
                empresa: $empresa,
                destinatarioNome: $destNome,
                replyToAddress: $replyTo,
                payload: $this->montarPayload($oc, $empresa, $fornecedor),
            ));

            return ['enviado' => true, 'destino' => $destino, 'motivo' => null];
        } catch (Throwable $e) {
            Log::warning('ordem_compra.email_fornecedor_falhou', [
                'ordem_compra_id' => $oc->id,
                'empresa_id' => $empresa->id,
                'destino' => $destino,
                'erro' => $e->getMessage(),
            ]);

            return ['enviado' => false, 'destino' => $destino, 'motivo' => 'falha_envio'];
        }
    }

    /**
     * @return array<string, mixed>
     */
    private function montarPayload(OrdemCompra $oc, Empresa $empresa, Parceiro $fornecedor): array
    {
        $itens = $oc->itens->map(function ($item) {
            $desc = $item->produto?->descricao_comercial
                ?: $item->produto?->descricao_fiscal
                ?: 'Item';

            $composicao = [];
            if ($item->relationLoaded('composicoes')) {
                foreach ($item->composicoes as $c) {
                    $composicao[] = [
                        'largura_mm' => PadraoDecimal::roundHalfUp((string) $c->largura_mm, PadraoDecimal::SCALE_DIM),
                        'quantidade' => PadraoDecimal::roundHalfUp((string) $c->quantidade, PadraoDecimal::SCALE_QTY),
                        'comprimento_m' => PadraoDecimal::roundHalfUp((string) $c->comprimento_m, PadraoDecimal::SCALE_DIM),
                        'area_m2' => PadraoDecimal::roundHalfUp((string) $c->area_m2, PadraoDecimal::SCALE_QTY),
                    ];
                }
            }

            return [
                'codigo' => $item->produto?->codigo ?? '—',
                'descricao' => $desc,
                'qtde' => PadraoDecimal::roundHalfUp((string) $item->qtde_pedida, PadraoDecimal::SCALE_QTY),
                'unidade' => $item->unidade,
                'valor_unitario' => PadraoDecimal::roundHalfUp((string) $item->valor_unitario, PadraoDecimal::SCALE_UNIT_PRICE),
                'valor_total' => PadraoDecimal::roundHalfUp((string) $item->valor_total, PadraoDecimal::SCALE_MONEY),
                'aliq_ipi' => $item->aliq_ipi !== null
                    ? PadraoDecimal::roundHalfUp((string) $item->aliq_ipi, PadraoDecimal::SCALE_PERCENT)
                    : null,
                'aliq_icms' => $item->aliq_icms !== null
                    ? PadraoDecimal::roundHalfUp((string) $item->aliq_icms, PadraoDecimal::SCALE_PERCENT)
                    : null,
                'valor_ipi' => PadraoDecimal::roundHalfUp((string) ($item->valor_ipi ?? '0'), PadraoDecimal::SCALE_MONEY),
                'valor_icms' => PadraoDecimal::roundHalfUp((string) ($item->valor_icms ?? '0'), PadraoDecimal::SCALE_MONEY),
                'composicao' => $composicao,
            ];
        })->values()->all();

        $valorFrete = PadraoDecimal::roundHalfUp((string) ($oc->valor_frete ?? '0'), PadraoDecimal::SCALE_MONEY);
        $valorIpi = PadraoDecimal::roundHalfUp((string) ($oc->valor_ipi ?? '0'), PadraoDecimal::SCALE_MONEY);
        $valorIcms = PadraoDecimal::roundHalfUp((string) ($oc->valor_icms ?? '0'), PadraoDecimal::SCALE_MONEY);
        $valorTotal = PadraoDecimal::roundHalfUp((string) $oc->valor_total, PadraoDecimal::SCALE_MONEY);
        $valorPrevisto = PadraoDecimal::roundHalfUp(
            bcadd(bcadd($valorTotal, $valorIpi, PadraoDecimal::SCALE_MONEY + 2), $valorFrete, PadraoDecimal::SCALE_MONEY + 2),
            PadraoDecimal::SCALE_MONEY
        );

        return [
            'empresa' => [
                'razao_social' => $empresa->razao_social,
                'nome_fantasia' => $empresa->nome_fantasia,
                'cnpj' => $empresa->cnpj,
                'email' => $empresa->email,
                'telefone' => $empresa->telefone,
                'endereco' => $this->formatEndereco(
                    $empresa->logradouro,
                    $empresa->numero ?? null,
                    $empresa->bairro ?? null,
                    $empresa->municipio ?? null,
                    $empresa->uf ?? null,
                    $empresa->cep ?? null,
                ),
            ],
            'fornecedor' => [
                'razao_social' => $fornecedor->razao_social,
                'nome_fantasia' => $fornecedor->nome_fantasia,
                'cnpj_cpf' => $fornecedor->cnpj_cpf,
                'email' => $fornecedor->email,
                'telefone' => $fornecedor->telefone,
                'endereco' => $this->formatEndereco(
                    $fornecedor->logradouro,
                    $fornecedor->numero,
                    $fornecedor->bairro,
                    $fornecedor->municipio,
                    $fornecedor->uf,
                    $fornecedor->cep,
                ),
            ],
            'urgente' => (bool) $oc->urgente,
            'condicao_pagamento' => $oc->condicao_pagamento,
            'previsao_entrega' => optional($oc->previsao_entrega)?->format('d/m/Y'),
            'observacao' => $oc->observacao,
            'valor_total' => $valorTotal,
            'valor_ipi' => $valorIpi,
            'valor_icms' => $valorIcms,
            'valor_frete' => $valorFrete,
            'valor_previsto' => $valorPrevisto,
            'itens' => $itens,
        ];
    }

    private function formatEndereco(
        mixed $logradouro,
        mixed $numero,
        mixed $bairro,
        mixed $municipio,
        mixed $uf,
        mixed $cep,
    ): ?string {
        $parts = array_filter([
            trim((string) $logradouro),
            trim((string) $numero) !== '' ? 'nº '.trim((string) $numero) : null,
            trim((string) $bairro),
            trim(implode('/', array_filter([trim((string) $municipio), trim((string) $uf)]))),
            trim((string) $cep) !== '' ? 'CEP '.trim((string) $cep) : null,
        ], fn ($p) => $p !== null && $p !== '');

        return $parts === [] ? null : implode(' · ', $parts);
    }

    private function emailValido(mixed $email): ?string
    {
        $mail = trim((string) $email);
        if ($mail === '' || ! filter_var($mail, FILTER_VALIDATE_EMAIL)) {
            return null;
        }

        return $mail;
    }
}
