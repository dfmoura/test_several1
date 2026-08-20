<?php

namespace App\Services\Audit;

use App\Models\AuditLog;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Request;

class AuditLogger
{
    public function log(
        string $acao,
        ?string $entidade = null,
        ?int $entidadeId = null,
        ?array $de = null,
        ?array $para = null,
    ): AuditLog {
        $empresa = app()->bound('empresa') ? app('empresa') : null;

        return AuditLog::query()->create([
            'empresa_id' => $empresa?->id,
            'user_id' => Auth::id(),
            'acao' => $acao,
            'entidade' => $entidade,
            'entidade_id' => $entidadeId,
            'de' => $de,
            'para' => $para,
            'ip' => Request::ip(),
            'user_agent' => Request::userAgent(),
        ]);
    }
}
