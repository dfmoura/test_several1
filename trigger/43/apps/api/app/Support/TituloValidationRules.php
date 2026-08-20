<?php

namespace App\Support;

use App\Models\Titulo;
use Illuminate\Validation\Rule;

final class TituloValidationRules
{
    /**
     * @return array<string, mixed>
     */
    public static function listFilters(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:120'],
            'tipo' => ['nullable', 'string', 'in:PAGAR,RECEBER'],
            'status' => ['nullable', 'string', Rule::in(Titulo::STATUSES)],
            'situacao' => ['nullable', 'string', Rule::in(['aberto', 'todos', 'ABERTO', 'TODOS'])],
            'faixa' => ['nullable', 'string', Rule::in(TituloAging::FILTROS)],
            'parceiro_id' => ['nullable', 'integer'],
            'natureza_id' => ['nullable', 'integer'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function baixar(): array
    {
        return [
            'conta_financeira_id' => ['required', 'integer', 'exists:empresa_contas_financeiras,id'],
            'valor' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_MONEY, false)),
            'pago_em' => ['required', 'date'],
            'forma' => ['nullable', 'string', Rule::in(Titulo::FORMAS)],
            'observacao' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function criarAvulso(): array
    {
        return [
            'tipo' => ['required', 'string', Rule::in(Titulo::TIPOS)],
            'parceiro_id' => ['required', 'integer', 'exists:parceiros,id'],
            'natureza_id' => ['required', 'integer', 'exists:naturezas_gerenciais,id'],
            'valor' => array_merge(['required'], PadraoDecimal::rules(PadraoDecimal::SCALE_MONEY, false)),
            'emissao' => ['required', 'date'],
            'vencimento' => ['required', 'date'],
            'documento' => ['nullable', 'string', 'max:40'],
            'observacao' => ['nullable', 'string', 'max:2000'],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public static function cancelar(): array
    {
        return [
            'motivo' => ['required', 'string', 'min:3', 'max:500'],
        ];
    }
}
