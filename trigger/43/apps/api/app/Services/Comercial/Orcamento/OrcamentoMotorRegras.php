<?php

namespace App\Services\Comercial\Orcamento;

use App\Models\OrcCatalogoParametro;

/**
 * Metadados das regras R1–R20 + satélites (matriz, frete) — sem DSL.
 * ADR_ORC_MOTOR_REGRAS · estudo 32 GERACAO §5.
 */
final class OrcamentoMotorRegras
{
    public const MOTOR_VERSION = 2;

    /**
     * @return array{
     *   motor_version: int,
     *   regras: list<array<string, mixed>>,
     *   constantes_estruturais: list<array<string, mixed>>
     * }
     */
    public static function catalogo(): array
    {
        return [
            'motor_version' => self::MOTOR_VERSION,
            'regras' => self::regras(),
            'constantes_estruturais' => [
                [
                    'id' => 'matriz_fator_z',
                    'rotulo' => 'Fator Z da matriz',
                    'valor' => 3.175,
                    'formula' => '((Z × 3,175) ÷ 10) + 4',
                    'nota' => 'Geometria do clichê — estrutura do motor v1 (somente leitura).',
                ],
                [
                    'id' => 'matriz_folga_cm',
                    'rotulo' => 'Folga da matriz (cm)',
                    'valor' => 4,
                    'formula' => '(largura × colunas) + 4',
                    'nota' => 'Estrutura do motor v1 (somente leitura).',
                ],
                [
                    'id' => 'perda_bobina_fator',
                    'rotulo' => 'Fator perda bobina',
                    'valor' => 5,
                    'formula' => '5 × (largura − 0,75) × colunas ÷ 100 × (metragem ÷ 1000)',
                    'nota' => 'Coeficiente geométrico estrutural; limite e minutos de troca são parametrizados.',
                ],
            ],
        ];
    }

    /**
     * @return list<array{
     *   id: string,
     *   grupo: string,
     *   titulo: string,
     *   resumo: string,
     *   formula: string,
     *   parametrizado: bool,
     *   parametros: list<string>,
     *   catalogo_tab: string|null
     * }>
     */
    public static function regras(): array
    {
        return [
            [
                'id' => 'R1_metragem',
                'grupo' => 'metragens',
                'titulo' => 'Metragem linear',
                'resumo' => 'Quanto de bobina o serviço consome em metros.',
                'formula' => 'metragem = (puxada ÷ 100) × quantidade ÷ colunas',
                'parametrizado' => false,
                'parametros' => [],
                'catalogo_tab' => null,
            ],
            [
                'id' => 'R2_m2',
                'grupo' => 'metragens',
                'titulo' => 'Área (m²)',
                'resumo' => 'Área útil com teto Excel em passos de 0,1.',
                'formula' => 'm² = CEILING(qtd × largura × puxada ÷ 10.000 ; 0,1)',
                'parametrizado' => false,
                'parametros' => [],
                'catalogo_tab' => null,
            ],
            [
                'id' => 'R3_hora_maq',
                'grupo' => 'tempos',
                'titulo' => 'Hora-máquina',
                'resumo' => 'Tempo de impressão + setup básico.',
                'formula' => 'hora_maq = (metragem ÷ RPM) + setup_horas',
                'parametrizado' => true,
                'parametros' => [OrcCatalogoParametro::CHAVE_SETUP_HORAS],
                'catalogo_tab' => 'parametros',
            ],
            [
                'id' => 'R4_troca_bobina',
                'grupo' => 'tempos',
                'titulo' => 'Troca de bobina',
                'resumo' => 'Só se metragem ≥ limite; minutos por mil metros.',
                'formula' => 'se metragem ≥ limite: ((metragem ÷ 1000) − 1) × minutos ÷ 60',
                'parametrizado' => true,
                'parametros' => [
                    OrcCatalogoParametro::CHAVE_LIMITE_METRAGEM_BOBINA,
                    OrcCatalogoParametro::CHAVE_MINUTOS_TROCA_BOBINA,
                ],
                'catalogo_tab' => 'parametros',
            ],
            [
                'id' => 'R5_troca_produto',
                'grupo' => 'tempos',
                'titulo' => 'Troca de produto / arte',
                'resumo' => 'Tempo de parada × (modelos − 1).',
                'formula' => 'hora_troca_prod = tempo_parada(tipo) × (modelos − 1)',
                'parametrizado' => true,
                'parametros' => [],
                'catalogo_tab' => 'trocas',
            ],
            [
                'id' => 'R5b_perda_troca_produto_m2',
                'grupo' => 'perdas',
                'titulo' => 'Perda troca produto (m²)',
                'resumo' => 'rv4 col. E — fator m² × largura × colunas.',
                'formula' => '(largura ÷ 100) × fator(cores) × colunas',
                'parametrizado' => true,
                'parametros' => [],
                'catalogo_tab' => 'perdas',
            ],
            [
                'id' => 'R6_perda_acerto',
                'grupo' => 'perdas',
                'titulo' => 'Perda de acerto',
                'resumo' => 'Papel de acerto conforme cores.',
                'formula' => '0–3: m² fixos · 4: (larg+1)/100 × F6 · 4V–8: (larg/100) × metros',
                'parametrizado' => true,
                'parametros' => [
                    OrcCatalogoParametro::CHAVE_PERDA_PAPEL_0,
                    OrcCatalogoParametro::CHAVE_PERDA_PAPEL_1,
                    OrcCatalogoParametro::CHAVE_PERDA_PAPEL_2,
                    OrcCatalogoParametro::CHAVE_PERDA_PAPEL_3,
                    OrcCatalogoParametro::CHAVE_PERDA_PAPEL_F6,
                    OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_4V,
                    OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_5,
                    OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_6,
                    OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_7,
                    OrcCatalogoParametro::CHAVE_PERDA_ACERTO_M_8,
                ],
                'catalogo_tab' => 'perdas',
            ],
            [
                'id' => 'R7_perda_acabamento',
                'grupo' => 'perdas',
                'titulo' => 'Perda de acabamento',
                'resumo' => 'm² extras do acabamento escolhido.',
                'formula' => 'perda_acabamento = tabela do acabamento',
                'parametrizado' => true,
                'parametros' => [],
                'catalogo_tab' => 'acabamentos',
            ],
            [
                'id' => 'R8_perda_bobina',
                'grupo' => 'perdas',
                'titulo' => 'Perda de bobina',
                'resumo' => 'Só acima do limite de metragem.',
                'formula' => '5 × (largura − 0,75) × colunas ÷ 100 × (metragem ÷ 1000)',
                'parametrizado' => true,
                'parametros' => [OrcCatalogoParametro::CHAVE_LIMITE_METRAGEM_BOBINA],
                'catalogo_tab' => 'parametros',
            ],
            [
                'id' => 'R9_embalagem',
                'grupo' => 'embalagem',
                'titulo' => 'Rolos e caixas',
                'resumo' => 'Embalagem derivada de etiq/rolo e tubete.',
                'formula' => 'rolos = qtd ÷ etiq_por_rolo · caixas = CEILING(rolos ÷ capacidade)',
                'parametrizado' => true,
                'parametros' => [OrcCatalogoParametro::CHAVE_PRECO_CAIXA],
                'catalogo_tab' => 'embalagem',
            ],
            [
                'id' => 'CUSTO_papel',
                'grupo' => 'custos',
                'titulo' => 'Valor papel',
                'resumo' => '(m² + perdas) × preço do papel.',
                'formula' => '(m² + perda_acerto + perda_bobina) × preco_papel',
                'parametrizado' => true,
                'parametros' => [],
                'catalogo_tab' => 'papeis',
            ],
            [
                'id' => 'CUSTO_maquina',
                'grupo' => 'custos',
                'titulo' => 'Valor máquina / trocas',
                'resumo' => 'Tarifa G10 × horas.',
                'formula' => 'tarifa(cores) × (hora_maq + trocas)',
                'parametrizado' => true,
                'parametros' => [],
                'catalogo_tab' => 'maquinas',
            ],
            [
                'id' => 'CUSTO_tinta',
                'grupo' => 'custos',
                'titulo' => 'Valor tinta',
                'resumo' => 'Matriz TINTA (2) rv4 ou faixa legada v1.',
                'formula' => 'v2: taxa(MTS×cor) × área (matriz TINTA (2) rv4)',
                'parametrizado' => true,
                'parametros' => [],
                'catalogo_tab' => 'tinta',
            ],
            [
                'id' => 'CUSTO_acabamento',
                'grupo' => 'custos',
                'titulo' => 'Valor acabamento / rebobinação',
                'resumo' => 'Preço do acabamento × área com perdas.',
                'formula' => 'preco × (m² + perda_acerto + perda_acab)',
                'parametrizado' => true,
                'parametros' => [],
                'catalogo_tab' => 'acabamentos',
            ],
            [
                'id' => 'CUSTO_tubete_caixa',
                'grupo' => 'custos',
                'titulo' => 'Tubete e caixa',
                'resumo' => 'Embalagem unitária.',
                'formula' => 'rolos × preco_tubete + CEILING(rolos ÷ rolos_por_caixa) × preco_caixa',
                'parametrizado' => true,
                'parametros' => [
                    OrcCatalogoParametro::CHAVE_TUBETE_1,
                    OrcCatalogoParametro::CHAVE_TUBETE_1_5,
                    OrcCatalogoParametro::CHAVE_TUBETE_3,
                    OrcCatalogoParametro::CHAVE_PRECO_CAIXA,
                ],
                'catalogo_tab' => 'embalagem',
            ],
            [
                'id' => 'FECHAMENTO',
                'grupo' => 'fechamento',
                'titulo' => 'Fechamento comercial',
                'resumo' => 'Serviço + comissão + imposto com teto.',
                'formula' => 'CEILING(serviço + comissão% + imposto% ; ceiling_etiqueta)',
                'parametrizado' => true,
                'parametros' => [OrcCatalogoParametro::CHAVE_CEILING_ETIQUETA],
                'catalogo_tab' => 'parametros',
            ],
            [
                'id' => 'MATRIZ',
                'grupo' => 'matriz',
                'titulo' => 'Matriz / clichê',
                'resumo' => 'Área geométrica × tarifa R$/cm².',
                'formula' => 'CEILING( ((Z×3,175)/10)+4 ) × (larg×col+4) × ncores × matriz_cm2 ; 1)',
                'parametrizado' => true,
                'parametros' => [OrcCatalogoParametro::CHAVE_MATRIZ_CM2],
                'catalogo_tab' => 'matriz',
            ],
            [
                'id' => 'FRETE',
                'grupo' => 'frete',
                'titulo' => 'Frete estimado (pós-motor)',
                'resumo' => 'Fora do R1–R20 — faixas kg × km.',
                'formula' => 'máx(mínimo ; R$/km × km) — teto em centavos',
                'parametrizado' => true,
                'parametros' => [OrcCatalogoParametro::CHAVE_PESO_CAIXA_KG],
                'catalogo_tab' => 'frete',
            ],
        ];
    }
}
