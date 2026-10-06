<?php

declare(strict_types=1);

namespace App\Suporte;

final class Rotulos
{
    public const TIPOS_DEMANDA = [
        'nova_funcionalidade' => 'Nova funcionalidade',
        'melhoria' => 'Melhoria',
        'correcao' => 'Correção',
        'integracao' => 'Integração',
        'relatorio' => 'Relatório',
        'automacao' => 'Automação',
        'manutencao' => 'Manutenção',
        'outro' => 'Outro',
    ];

    public const PRIORIDADES = [
        'baixa' => 'Baixa',
        'normal' => 'Normal',
        'alta' => 'Alta',
        'urgente' => 'Urgente',
    ];

    public const STATUS_DEMANDA = [
        'RASCUNHO' => 'Rascunho',
        'EM_ANALISE' => 'Em análise',
        'PROPOSTA_ENVIADA' => 'Proposta enviada',
        'APROVADA' => 'Aprovada',
        'EM_EXECUCAO' => 'Em execução',
        'APRESENTADA' => 'Apresentada',
        'CONCLUIDA' => 'Concluída',
        'RECUSADA_CLIENTE' => 'Recusada',
        'RECUSADA_TRIGGER' => 'Não aceita',
        'EXPIRADA' => 'Expirada',
        'CANCELADA' => 'Cancelada',
    ];

    public const STATUS_EMPRESA = [
        'RASCUNHO' => 'Rascunho',
        'AGUARDA_PIX' => 'Aguardando PIX',
        'ATIVA' => 'Ativa',
        'BLOQUEADA' => 'Bloqueada',
        'EXPIRADA' => 'Expirada',
        'CANCELADA' => 'Cancelada',
    ];

    public const MOVIMENTOS = [
        'CREDITO_PIX' => 'PIX recebido',
        'RESERVA' => 'Reserva da demanda',
        'ESTORNO_RESERVA' => 'Reserva devolvida',
        'CONSUMO' => 'Abatimento da fatura',
        'CREDITO_COMPLEMENTO' => 'PIX da diferença',
        'ESTORNO_CONSUMO' => 'Estorno de consumo',
        'AJUSTE' => 'Ajuste',
    ];

    public static function statusDemanda(string $status): string
    {
        return self::STATUS_DEMANDA[$status] ?? $status;
    }

    public static function statusEmpresa(string $status): string
    {
        return self::STATUS_EMPRESA[$status] ?? $status;
    }

    public static function movimento(string $tipo, ?string $observacao = null): string
    {
        if ($observacao === 'ANALISE_NAO_CONTRATADA') {
            return 'Análise não contratada';
        }
        if ($tipo === 'CREDITO_PIX' && $observacao === 'ATIVACAO') {
            return 'PIX de ativação';
        }
        if ($tipo === 'CREDITO_PIX' && $observacao === 'RECARGA') {
            return 'Recarga de saldo';
        }

        return self::MOVIMENTOS[$tipo] ?? $tipo;
    }
}
