<?php

namespace App\Support;

use App\Models\BemPatrimonial;
use Illuminate\Validation\Rule;

class BemPatrimonialValidationRules
{
    /**
     * @return array<string, mixed>
     */
    public static function rules(bool $partial = false, ?int $empresaId = null): array
    {
        $req = $partial ? 'sometimes' : 'required';

        return [
            'descricao' => [$req, 'string', 'min:2', 'max:200'],
            'categoria' => [$req, 'string', Rule::in(BemPatrimonial::CATEGORIAS)],
            'marca' => ['nullable', 'string', 'max:80'],
            'modelo' => ['nullable', 'string', 'max:120'],
            'numero_serie' => ['nullable', 'string', 'max:80'],
            'adquirido_em' => ['nullable', 'date'],
            'valor_aquisicao' => ['nullable', 'numeric', 'min:0', 'max:9999999999.99'],
            'nf_numero' => ['nullable', 'string', 'max:40'],
            'fornecedor_id' => [
                'nullable',
                'integer',
                Rule::exists('parceiros', 'id')->where(function ($q) use ($empresaId) {
                    if ($empresaId !== null) {
                        $q->where('empresa_id', $empresaId);
                    }
                }),
            ],
            'local' => ['nullable', 'string', 'max:120'],
            'departamento_id' => [
                'nullable',
                'integer',
                Rule::exists('departamentos', 'id')->where(function ($q) use ($empresaId) {
                    $q->whereNull('deleted_at')->where('ativo', true);
                    if ($empresaId !== null) {
                        $q->where('empresa_id', $empresaId);
                    }
                }),
            ],
            'responsavel' => ['nullable', 'string', 'max:120'],
            'responsavel_user_id' => [
                'nullable',
                'integer',
                'exists:users,id',
            ],
            'status' => [$partial ? 'sometimes' : 'nullable', 'string', Rule::in(BemPatrimonial::STATUSES)],
            'garantia_ate' => ['nullable', 'date'],
            'placa' => ['nullable', 'string', 'max:16'],
            'renavam' => ['nullable', 'string', 'max:24'],
            'vida_util_meses' => ['nullable', 'integer', 'min:1', 'max:600'],
            'orc_catalogo_maquina_id' => [
                'nullable',
                'integer',
                'exists:orc_catalogo_maquinas,id',
            ],
            'grupo_hora_maquina_nome' => ['nullable', 'string', 'min:1', 'max:80'],
            'capitalizado' => ['sometimes', 'boolean'],
            'observacao' => ['nullable', 'string', 'max:2000'],
            'baixado_em' => ['nullable', 'date'],
            'motivo_baixa' => ['nullable', 'string', 'max:240'],
        ];
    }
}
