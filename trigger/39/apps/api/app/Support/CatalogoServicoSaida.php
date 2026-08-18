<?php

namespace App\Support;

/**
 * Catálogo curto de prestação de serviço (estudo 32 SVC-nnn / ADR_OPERACOES_SAIDA).
 * Códigos ISS são parâmetro — o contador corrige sem mudar o trilho.
 */
final class CatalogoServicoSaida
{
    public const REBOBINACAO = 'REBOBINACAO';

    public const ACERTO = 'ACERTO';

    public const AVULSO = 'AVULSO';

    public const MANUTENCAO = 'MANUTENCAO';

    /** @var list<string> */
    public const TIPOS = [
        self::REBOBINACAO,
        self::ACERTO,
        self::AVULSO,
        self::MANUTENCAO,
    ];

    /**
     * @return array<string, array{
     *   codigo: string,
     *   label: string,
     *   familia_fiscal: string,
     *   documento_fiscal: string,
     *   codigo_tributacao_nacional_iss: string,
     *   codigo_nbs: string,
     *   unidade_padrao: string,
     *   material_cliente_padrao: bool,
     *   descricao_padrao: string
     * }>
     */
    public static function todos(): array
    {
        return [
            self::REBOBINACAO => [
                'codigo' => self::REBOBINACAO,
                'label' => 'Rebobinação de bobina',
                'familia_fiscal' => 'SVC-001',
                'documento_fiscal' => 'NFSE',
                'codigo_tributacao_nacional_iss' => '140101',
                'codigo_nbs' => '121012100',
                'unidade_padrao' => 'RL',
                'material_cliente_padrao' => true,
                'descricao_padrao' => 'Rebobinação de bobina de etiqueta do cliente',
            ],
            self::ACERTO => [
                'codigo' => self::ACERTO,
                'label' => 'Acerto / corte',
                'familia_fiscal' => 'SVC-001',
                'documento_fiscal' => 'NFSE',
                'codigo_tributacao_nacional_iss' => '140101',
                'codigo_nbs' => '121012100',
                'unidade_padrao' => 'RL',
                'material_cliente_padrao' => true,
                'descricao_padrao' => 'Acerto de bobina / corte sem industrialização de produto próprio',
            ],
            self::AVULSO => [
                'codigo' => self::AVULSO,
                'label' => 'Serviço avulso',
                'familia_fiscal' => 'SVC-002',
                'documento_fiscal' => 'NFSE',
                'codigo_tributacao_nacional_iss' => '170202',
                'codigo_nbs' => '118064000',
                'unidade_padrao' => 'UN',
                'material_cliente_padrao' => false,
                'descricao_padrao' => 'Prestação de serviço',
            ],
            self::MANUTENCAO => [
                'codigo' => self::MANUTENCAO,
                'label' => 'Manutenção de equipamento cedido',
                'familia_fiscal' => 'SVC-002',
                'documento_fiscal' => 'NFSE',
                'codigo_tributacao_nacional_iss' => '140101',
                'codigo_nbs' => '121012100',
                'unidade_padrao' => 'UN',
                'material_cliente_padrao' => false,
                'descricao_padrao' => 'Manutenção de impressora / equipamento em comodato',
            ],
        ];
    }

    /**
     * @return array{
     *   codigo: string,
     *   label: string,
     *   familia_fiscal: string,
     *   documento_fiscal: string,
     *   codigo_tributacao_nacional_iss: string,
     *   codigo_nbs: string,
     *   unidade_padrao: string,
     *   material_cliente_padrao: bool,
     *   descricao_padrao: string
     * }
     */
    public static function get(string $tipo): array
    {
        $all = self::todos();
        $key = strtoupper(trim($tipo));
        if (! isset($all[$key])) {
            return $all[self::AVULSO];
        }

        return $all[$key];
    }

    public static function isTipo(mixed $value): bool
    {
        return in_array(strtoupper(trim((string) $value)), self::TIPOS, true);
    }

    /**
     * @return list<array<string, mixed>>
     */
    public static function metaForUi(): array
    {
        return array_values(self::todos());
    }
}
