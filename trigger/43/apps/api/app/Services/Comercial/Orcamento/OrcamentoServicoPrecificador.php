<?php

namespace App\Services\Comercial\Orcamento;

use App\Support\CatalogoServicoSaida;
use App\Support\TipoOperacaoSaida;

/**
 * Preço comercial de prestação de serviço — fora do motor R1–R20 (ADR_OPERACOES_SAIDA).
 * `valor_etiqueta` = total da faixa (mesmo contrato do FAT / PrecoTravadoPedido).
 */
final class OrcamentoServicoPrecificador
{
    public function __construct(private readonly OrcamentoMotor $motor) {}

    /**
     * @param  array<string, mixed>  $input
     * @return array<string, mixed>
     */
    public function calcular(array $input): array
    {
        $cat = OrcamentoCatalogo::load();
        $tipo = CatalogoServicoSaida::get((string) ($input['tipo_servico'] ?? CatalogoServicoSaida::AVULSO));
        $faixasOut = [];

        foreach ($input['faixas'] as $faixa) {
            $q = max(1, (int) ($faixa['quantidade'] ?? 0));
            $unit = max(0.0, (float) ($faixa['valor_unitario'] ?? 0));
            $comissaoPct = max(0.0, (float) ($faixa['comissao_pct'] ?? 0));
            $bruto = $q * $unit;
            $comissao = $bruto * $comissaoPct / 100.0;
            $base = $bruto + $comissao;
            $valorEtiqueta = $this->motor->excelCeiling($base, $cat->ceilingEtiqueta);

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
                'hora_maq' => (float) ($input['horas_maquina'] ?? 0),
            ];
        }

        return [
            'tipo_operacao' => TipoOperacaoSaida::SERVICO,
            'tipo_servico' => $tipo['codigo'],
            'familia_fiscal' => $tipo['familia_fiscal'],
            'documento_fiscal' => $tipo['documento_fiscal'],
            'chave_matriz' => null,
            'cobra_matriz' => false,
            'valor_matriz' => 0.0,
            'faixas' => $faixasOut,
            'catalog_snapshot' => [
                'servico' => $tipo,
                'ceiling_etiqueta' => $cat->ceilingEtiqueta,
            ],
        ];
    }
}
