<?php

namespace App\Support;

/**
 * Trilhos de saída (ADR_OPERACOES_SAIDA). Não misturar com stage nem EMP.
 */
final class TipoOperacaoSaida
{
    public const INDUSTRIALIZACAO = 'INDUSTRIALIZACAO';

    public const SERVICO = 'SERVICO';

    public const CESSAO_BEM = 'CESSAO_BEM';

    /** @var list<string> */
    public const TODOS = [
        self::INDUSTRIALIZACAO,
        self::SERVICO,
        self::CESSAO_BEM,
    ];

    public static function fromInput(mixed $value): string
    {
        $raw = strtoupper(trim((string) $value));
        if ($raw === '' || $raw === 'PRODUCAO') {
            return self::INDUSTRIALIZACAO;
        }
        if (in_array($raw, self::TODOS, true)) {
            return $raw;
        }
        if (str_contains($raw, 'SERV')) {
            return self::SERVICO;
        }
        if (str_contains($raw, 'CESSAO') || str_contains($raw, 'COMODATO') || str_contains($raw, 'LOCAC')) {
            return self::CESSAO_BEM;
        }

        return self::INDUSTRIALIZACAO;
    }

    public static function isServico(mixed $value): bool
    {
        return self::fromInput($value) === self::SERVICO;
    }

    public static function isIndustrializacao(mixed $value): bool
    {
        return self::fromInput($value) === self::INDUSTRIALIZACAO;
    }

    /**
     * @return list<array{codigo: string, label: string, resumo: string}>
     */
    public static function metaForUi(): array
    {
        return [
            [
                'codigo' => self::INDUSTRIALIZACAO,
                'label' => 'Venda de Produto',
                'resumo' => 'Industrialização ou revenda. Orçamento técnico, ordem de produção e NF-e.',
            ],
            [
                'codigo' => self::SERVICO,
                'label' => 'Prestação de serviços',
                'resumo' => 'Rebobinação, acerto, manutenção. Ordem de serviço e NFS-e Nacional. Sem produto acabado próprio.',
            ],
            [
                'codigo' => self::CESSAO_BEM,
                'label' => 'Cessão de equipamento',
                'resumo' => 'Comodato de impressora. Não é orçamento nem nota fiscal — cadastre no patrimônio.',
            ],
        ];
    }
}
