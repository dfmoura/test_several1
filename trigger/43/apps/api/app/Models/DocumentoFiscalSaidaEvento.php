<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class DocumentoFiscalSaidaEvento extends Model
{
    protected $table = 'documento_fiscal_saida_eventos';

    public const TIPO_CANCELAMENTO = 'CANCELAMENTO';

    public const TIPO_CCE = 'CCE';

    public const TP_CANCELAMENTO = '110111';

    public const TP_CCE = '110110';

    public const STATUS_PROCESSANDO = 'PROCESSANDO';

    public const STATUS_AUTORIZADO = 'AUTORIZADO';

    public const STATUS_REJEITADO = 'REJEITADO';

    public const STATUS_ERRO = 'ERRO';

    protected $fillable = [
        'empresa_id',
        'documento_fiscal_saida_id',
        'tipo',
        'tp_evento',
        'n_seq_evento',
        'status',
        'protocolo',
        'mensagem',
        'justificativa',
        'xml_envio',
        'xml_retorno',
        'response_json',
        'autorizado_em',
        'criado_por',
    ];

    protected function casts(): array
    {
        return [
            'n_seq_evento' => 'integer',
            'response_json' => 'array',
            'autorizado_em' => 'datetime',
        ];
    }

    public function empresa(): BelongsTo
    {
        return $this->belongsTo(Empresa::class);
    }

    public function documento(): BelongsTo
    {
        return $this->belongsTo(DocumentoFiscalSaida::class, 'documento_fiscal_saida_id');
    }
}
