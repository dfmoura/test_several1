<?php

namespace App\Services\Comercial\Orcamento;

use App\Models\PedidoItem;
use App\Support\PadraoDecimal;
use App\Support\TipoOperacaoSaida;

/**
 * Preço comercial de item de revenda — fora do motor R1–R20 (ADR_ORC_ITEM_REVENDA).
 * `valor_etiqueta` = total da faixa (mesmo contrato do FAT / PrecoTravadoPedido).
 * Sem teto de R$ 10 (isso é do serviço).
 */
final class OrcamentoRevendaPrecificador
{
    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function calcular(array $input): array
    {
        $faixasOut = [];

        foreach ($input['faixas'] as $faixa) {
            $q = max(0.0, (float) ($faixa['quantidade'] ?? 0));
            $unit = max(0.0, (float) ($faixa['valor_unitario'] ?? 0));
            $comissaoPct = max(0.0, (float) ($faixa['comissao_pct'] ?? 0));
            $bruto = $q * $unit;
            $comissao = $bruto * $comissaoPct / 100.0;
            $base = $bruto + $comissao;
            $valorEtiqueta = (float) PadraoDecimal::roundHalfUp(
                number_format($base, 6, '.', ''),
                PadraoDecimal::SCALE_MONEY
            );

            $faixasOut[] = [
                'quantidade' => $q,
                'valor_unitario_informado' => $unit,
                'valor_servico' => $bruto,
                'comissao' => $comissao,
                'imposto' => 0.0,
                'base' => $base,
                'valor_etiqueta' => $valorEtiqueta,
                'valor_matriz' => 0.0,
                'valor_total' => $valorEtiqueta,
                'valor_papel' => 0.0,
                'valor_maquina' => 0.0,
                'valor_rebobinacao' => 0.0,
                'valor_tubete' => 0.0,
                'valor_caixa' => 0.0,
                'rolos' => 0.0,
                'm2' => 0.0,
                'hora_maq' => 0.0,
            ];
        }

        return [
            'tipo_operacao' => TipoOperacaoSaida::INDUSTRIALIZACAO,
            'necessidade' => PedidoItem::NEC_REVENDA,
            'familia_fiscal' => $input['familia_fiscal'] ?? 'REV',
            'documento_fiscal' => 'NFE',
            'chave_matriz' => null,
            'cobra_matriz' => false,
            'valor_matriz' => 0.0,
            'faixas' => $faixasOut,
            'catalog_snapshot' => [
                'revenda' => [
                    'produto_id' => $input['produto_id'] ?? null,
                    'produto_codigo' => $input['produto_codigo'] ?? null,
                    'produto_descricao' => $input['produto_descricao'] ?? null,
                    'unidade' => $input['unidade'] ?? null,
                ],
            ],
        ];
    }
}
