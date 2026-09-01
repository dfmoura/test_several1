<?php

namespace App\Services\Comercial\Orcamento;

/**
 * Motor R1–R20 — port fiel de trigger/36 calculator.py + matrix_key.py.
 * Intermediários espelham o Excel (float); teto comercial (ceiling) no fechamento.
 */
final class OrcamentoMotor
{
    public function excelCeiling(float $number, float $significance): float
    {
        if ($significance == 0.0) {
            return $number;
        }

        return ceil($number / $significance - 1e-12) * $significance;
    }

    public function chaveMatriz(
        string $cliente,
        string $medidaFaca,
        float|int|null $z,
        mixed $cores,
        float $larguraCm,
        int $colunas,
    ): string {
        $payload = [
            'cliente' => strtoupper(trim($cliente)),
            'medida' => strtoupper(str_replace(' ', '', trim($medidaFaca))),
            'z' => $z === null ? null : (float) $z,
            'cores' => $cores !== null ? strtoupper(trim((string) $cores)) : '',
            'largura_cm' => round((float) $larguraCm, 6),
            'colunas' => (int) $colunas,
        ];
        ksort($payload);
        // Espelha json.dumps(..., sort_keys=True, ensure_ascii=False) do Python (espaços).
        $raw = $this->pythonJsonDumps($payload);

        return substr(hash('sha256', $raw), 0, 32);
    }

    /**
     * @param  array{
     *   cliente: string,
     *   medida: string,
     *   largura_cm: float|int|string,
     *   puxada_cm: float|int|string,
     *   cores: mixed,
     *   papel: string,
     *   acabamento: string,
     *   modelos: int,
     *   colunas: int,
     *   etiq_por_rolo: int,
     *   tubete: string,
     *   z?: float|int|string|null,
     *   maquina: string,
     *   maquina_roda_servico?: string|null,
     *   imposto_pct?: float|int|string,
     *   matriz?: string,
     *   coluna_rebobinacao?: int,
     *   tipo_troca_produto?: string,
     *   rpm?: float|int|string,
     *   faixas: list<array{quantidade: int, comissao_pct?: float|int|string}>,
     *   overrides?: array<string, mixed>|null,
     *   matriz_ja_cobrada?: bool
     * }  $input
     * @return array{
     *   chave_matriz: string,
     *   cobra_matriz: bool,
     *   valor_matriz: float,
     *   faixas: list<array<string, mixed>>,
     *   catalog_snapshot: array<string, mixed>
     * }
     */
    public function calcular(array $input, ?OrcamentoCatalogo $catalog = null): array
    {
        $base = $catalog ?? OrcamentoCatalogo::load();
        $cat = $base->withOverrides($input['overrides'] ?? null);

        $cliente = (string) $input['cliente'];
        $medida = (string) $input['medida'];
        $largura = (float) $input['largura_cm'];
        $puxada = (float) $input['puxada_cm'];
        $cores = $input['cores'];
        $colunas = (int) $input['colunas'];
        $z = array_key_exists('z', $input) && $input['z'] !== null && $input['z'] !== ''
            ? (float) $input['z']
            : null;
        $matrizFlag = strtoupper(trim((string) ($input['matriz'] ?? 'SIM')));
        $querMatriz = in_array($matrizFlag, ['SIM', 'S', 'YES', 'TRUE', '1'], true);
        $matrizJaCobrada = (bool) ($input['matriz_ja_cobrada'] ?? false);

        $ck = $this->chaveMatriz($cliente, $medida, $z, $cores, $largura, $colunas);
        $cobra = $querMatriz && ! $matrizJaCobrada;
        $matrizRaw = $querMatriz
            ? $this->calcularMatriz($z, $largura, $colunas, $cores, $cat)
            : 0.0;
        $valorMatriz = $cobra ? $this->excelCeiling($matrizRaw, 1.0) : 0.0;

        $faixasOut = [];
        foreach ($input['faixas'] as $faixa) {
            $faixasOut[] = $this->calcularFaixa(
                (int) $faixa['quantidade'],
                (float) ($faixa['comissao_pct'] ?? 0),
                $input,
                $cat,
                $valorMatriz,
            );
        }

        return [
            'chave_matriz' => $ck,
            'cobra_matriz' => $cobra,
            'valor_matriz' => $valorMatriz,
            'motor_version' => OrcamentoMotorRegras::MOTOR_VERSION,
            'faixas' => $faixasOut,
            'catalog_snapshot' => [
                'papel' => $cat->papel,
                'tinta_faixa_m2' => $cat->tintaFaixaM2,
                'tinta_valor_ate_30_por_cor' => $cat->tintaAte30PorCor,
                'tinta_acima_m2' => $cat->tintaAcimaM2,
                'preco_caixa' => $cat->precoCaixa,
                'matriz_cm2' => $cat->matrizCm2,
                'setup_horas' => $cat->setupHoras,
                'limite_metragem_bobina' => $cat->limiteMetragemBobina,
                'minutos_troca_bobina' => $cat->minutosTrocaBobina,
                'ceiling_etiqueta' => $cat->ceilingEtiqueta,
                'perda_papel_f6' => $cat->perdaPapelF6,
                'perda_papel_0_3' => $cat->perdaPapel03,
                'perda_acerto_m' => [
                    '4V' => $cat->perdaAcertoM4v,
                    '5' => $cat->perdaAcertoM5,
                    '6' => $cat->perdaAcertoM6,
                    '7' => $cat->perdaAcertoM7,
                    '8' => $cat->perdaAcertoM8,
                ],
                'tubete' => $cat->tubete,
                'acabamentos' => $cat->acabamentos,
                'hora_parada_h' => $cat->horaParadaH,
                'hora_maquina' => $cat->horaMaquina,
                'tarifas_resolvidas' => $cat->tarifasResolvidas($input),
                'imposto_pct' => (float) ($input['imposto_pct'] ?? 16),
                'overrides' => is_array($input['overrides'] ?? null) ? $input['overrides'] : null,
                'motor_version' => OrcamentoMotorRegras::MOTOR_VERSION,
            ],
        ];
    }

    public function calcularMatriz(
        ?float $z,
        float $larguraCm,
        int $colunas,
        mixed $cores,
        OrcamentoCatalogo $cat,
    ): float {
        if ($z === null || $z < 1) {
            return 0.0;
        }
        $coresStr = strtoupper(trim((string) $cores));
        if ($coresStr === '4V') {
            $ncores = 4.0;
        } else {
            try {
                $ncores = (float) $cores;
            } catch (\Throwable) {
                $ncores = 0.0;
            }
        }
        $larguraMatriz = $larguraCm * $colunas;

        return ((((float) $z * 3.175) / 10) + 4) * ($larguraMatriz + 4) * $ncores * $cat->matrizCm2;
    }

    /**
     * @param  array<string, mixed>  $inp
     * @return array<string, mixed>
     */
    public function calcularFaixa(
        int $q,
        float $comissaoPct,
        array $inp,
        OrcamentoCatalogo $cat,
        float $valorMatrizFaixa,
    ): array {
        $puxada = (float) $inp['puxada_cm'];
        $largura = (float) $inp['largura_cm'];
        $colunas = (int) $inp['colunas'];
        $modelos = (int) $inp['modelos'];
        $etiq = (int) $inp['etiq_por_rolo'];
        $rpm = (float) ($inp['rpm'] ?? 1000);
        $colReb = (int) ($inp['coluna_rebobinacao'] ?? 1) ?: 1;
        $limite = $cat->limiteMetragemBobina;
        $tipoTroca = (string) ($inp['tipo_troca_produto'] ?? 'SEM PARADA');
        $impostoPct = (float) ($inp['imposto_pct'] ?? 16);

        // R1
        $metragem = ($puxada / 100.0) * $q / $colunas;
        // R2
        $m2 = $this->excelCeiling(($q * $largura * $puxada) / 10000.0, 0.1);
        // R3
        $horaMaq = ($metragem / $rpm) + $cat->setupHoras;
        // R4
        if ($metragem < $limite) {
            $horaTrocaBobina = 0.0;
            $temTrocaBobina = false;
        } else {
            $minutos = $cat->minutosTrocaBobina;
            $horaTrocaBobina = ((($metragem / 1000.0) - 1) * $minutos) / 60.0;
            $temTrocaBobina = true;
        }
        // R5
        $horaTrocaProd = $cat->horaParada($tipoTroca) * ($modelos - 1);
        // R6–R8
        $perdaAcerto = $this->perdaAcertoM2($inp['cores'], $largura, $cat);
        $perdaTroca = $this->perdaTrocaProdutoM2($inp['cores'], $largura, $modelos, $colunas, $cat);
        $perdaAcab = $cat->usaTintaMatriz()
            ? $cat->perdaAcabM2((string) $inp['acabamento'], $largura, $colunas)
            : $cat->perdaAcab((string) $inp['acabamento']);
        if ($metragem <= $limite) {
            $perdaBobinaM2 = 0.0;
        } else {
            $perdaBobinaM2 = (5 * ($largura - 0.75) * $colunas / 100.0) * ($metragem / 1000.0);
        }
        // R9
        $rolos = $q / $etiq;
        $rolosPorCaixa = $cat->rolosPorCaixa((string) $inp['tubete']);
        $caixaMedida = $cat->medidaCaixaPreferida((string) $inp['tubete']);
        $qtdeCaixas = $cat->qtdeCaixas((string) $inp['tubete'], $rolos);

        $taxa = $cat->taxaHoraMaquina((string) $inp['maquina'], $inp['cores']);
        $precoPapel = $cat->precoPapel((string) $inp['papel']);
        $valorPapel = ($m2 + $perdaAcerto + $perdaTroca + $perdaBobinaM2) * $precoPapel;
        $valorMaquina = $taxa * $horaMaq;
        $valorTrocaProduto = $taxa * $horaTrocaProd;
        $valorTrocaBobina = $temTrocaBobina ? $taxa * $horaTrocaBobina : 0.0;
        $valorPapelTrocaProduto = $cat->usaTintaMatriz() ? 0.0 : $perdaTroca * $precoPapel;

        if ($cat->usaTintaMatriz()) {
            $areaTinta = $m2 + $perdaAcerto + $perdaTroca + $perdaBobinaM2;
            $valorTinta = $cat->tintaMatrizRate($areaTinta, $inp['cores']) * $areaTinta;
        } else {
            $areaTinta = $m2 + $perdaAcerto;
            if ($areaTinta <= $cat->tintaFaixaM2) {
                $ck = $this->coresKey($inp['cores']);
                $ncores = $ck === '4V' ? 4.0 : (float) $inp['cores'];
                $valorTinta = $ncores * $cat->tintaAte30PorCor;
            } else {
                $valorTinta = $areaTinta * $cat->tintaAcimaM2;
            }
        }

        $valorAcabamento = $cat->usaTintaMatriz()
            ? $cat->precoAcabamento((string) $inp['acabamento']) * ($m2 + $perdaAcab)
            : $cat->precoAcabamento((string) $inp['acabamento'])
                * ($m2 + $perdaAcerto + $perdaAcab);
        $valorRebob = (($metragem * $colunas) / $colReb / 1000.0) * $cat->precoRebobinacao();
        $valorTubete = ($q / $etiq) * $cat->precoTubete((string) $inp['tubete']);
        $valorCaixa = $qtdeCaixas * $cat->precoCaixa;

        $valorServico = $valorPapel
            + $valorMaquina
            + $valorTrocaProduto
            + $valorTrocaBobina
            + $valorPapelTrocaProduto
            + $valorTinta
            + $valorAcabamento
            + $valorRebob
            + $valorTubete
            + $valorCaixa;
        $comissao = $valorServico * $comissaoPct / 100.0;
        $imposto = $valorServico * $impostoPct / 100.0;
        $base = $valorServico + $comissao + $imposto;
        $valorEtiqueta = $this->excelCeiling($base, $cat->ceilingEtiqueta);

        return [
            'quantidade' => $q,
            'metragem' => $metragem,
            'm2' => $m2,
            'hora_maq' => $horaMaq,
            'hora_troca_prod' => $horaTrocaProd,
            'hora_troca_bobina' => $horaTrocaBobina,
            'perda_acerto' => $perdaAcerto,
            'perda_acabamento' => $perdaAcab,
            'perda_papel_troca_produto' => $perdaTroca,
            'perda_bobina_m2' => $perdaBobinaM2,
            'rolos' => $rolos,
            'qtde_caixas' => $qtdeCaixas,
            'rolos_por_caixa' => $rolosPorCaixa,
            'caixa_medida' => $caixaMedida,
            'valor_papel' => $valorPapel,
            'valor_maquina' => $valorMaquina,
            'valor_troca_produto' => $valorTrocaProduto,
            'valor_troca_bobina' => $valorTrocaBobina,
            'valor_papel_troca_produto' => $valorPapelTrocaProduto,
            'valor_tinta' => $valorTinta,
            'valor_acabamento' => $valorAcabamento,
            'valor_rebobinacao' => $valorRebob,
            'valor_tubete' => $valorTubete,
            'valor_caixa' => $valorCaixa,
            'valor_servico' => $valorServico,
            'comissao' => $comissao,
            'imposto' => $imposto,
            'base' => $base,
            'valor_etiqueta' => $valorEtiqueta,
            'valor_matriz' => $valorMatrizFaixa,
            'valor_total' => $valorEtiqueta + $valorMatrizFaixa,
        ];
    }

    public function perdaAcertoM2(mixed $cores, float $larguraCm, OrcamentoCatalogo $cat): float
    {
        $k = $this->coresKey($cores);
        if (in_array($k, ['0', '1', '2', '3'], true)) {
            return (float) $cat->perdaPapel03[$k];
        }
        if ($k === '4') {
            return ($larguraCm + 1) / 100.0 * $cat->perdaPapelF6;
        }
        if ($k === '4V') {
            return ($larguraCm / 100.0) * $cat->perdaAcertoM4v;
        }
        if ($k === '5') {
            return ($larguraCm / 100.0) * $cat->perdaAcertoM5;
        }
        if ($k === '6') {
            return ($larguraCm / 100.0) * $cat->perdaAcertoM6;
        }
        if ($k === '7') {
            return ($larguraCm / 100.0) * $cat->perdaAcertoM7;
        }
        if ($k === '8') {
            return ($larguraCm / 100.0) * $cat->perdaAcertoM8;
        }
        throw new \InvalidArgumentException("Cores não suportadas: {$k}");
    }

    public function perdaTrocaProdutoM2(
        mixed $cores,
        float $larguraCm,
        int $modelos,
        int $colunas,
        OrcamentoCatalogo $cat,
    ): float {
        if ($cat->usaTintaMatriz()) {
            if ($colunas <= 0) {
                return 0.0;
            }
            $fator = $cat->perdaTrocaM2Fator($cores);

            return ($larguraCm / 100.0) * $fator * $colunas;
        }

        return $this->perdaPapelTrocaProdutoM2($cores, $larguraCm, $modelos, $cat);
    }

    public function perdaPapelTrocaProdutoM2(
        mixed $cores,
        float $larguraCm,
        int $modelos,
        OrcamentoCatalogo $cat,
    ): float {
        $metros = $cat->perdaPapelAcertoMetros($cores);
        if ($metros <= 0 || $modelos <= 0) {
            return 0.0;
        }

        return $metros * ($larguraCm / 100.0) * $modelos;
    }

    private function coresKey(mixed $cores): string
    {
        if (is_string($cores)) {
            return strtoupper(trim($cores));
        }
        if (is_float($cores) && $cores == (int) $cores) {
            return (string) (int) $cores;
        }
        if (is_int($cores)) {
            return (string) $cores;
        }

        return trim((string) $cores);
    }

    /**
     * @param  array<string, mixed>  $payload
     */
    private function pythonJsonDumps(array $payload): string
    {
        $parts = [];
        foreach ($payload as $key => $value) {
            $parts[] = json_encode((string) $key, JSON_UNESCAPED_UNICODE).': '.$this->pythonJsonValue($value);
        }

        return '{'.implode(', ', $parts).'}';
    }

    private function pythonJsonValue(mixed $value): string
    {
        if ($value === null) {
            return 'null';
        }
        if (is_bool($value)) {
            return $value ? 'true' : 'false';
        }
        if (is_int($value)) {
            return (string) $value;
        }
        if (is_float($value)) {
            if (is_finite($value) && floor($value) == $value) {
                return sprintf('%.1f', $value);
            }

            $encoded = json_encode($value, JSON_UNESCAPED_UNICODE);
            // Evita notação científica quando possível.
            return is_string($encoded) ? $encoded : (string) $value;
        }

        return json_encode((string) $value, JSON_UNESCAPED_UNICODE) ?: '""';
    }
}
