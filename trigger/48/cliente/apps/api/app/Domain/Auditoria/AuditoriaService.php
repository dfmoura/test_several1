<?php

declare(strict_types=1);

namespace App\Domain\Auditoria;

use App\Models\Auditoria;

class AuditoriaService
{
    /**
     * @param  array<string, mixed>|null  $antes
     * @param  array<string, mixed>|null  $depois
     */
    public function registrar(
        string $acao,
        string $entidade,
        ?int $entidadeId = null,
        ?int $empresaId = null,
        ?array $antes = null,
        ?array $depois = null,
        ?string $atorTipo = null,
        ?int $atorId = null,
    ): void {
        [$tipo, $id] = $this->ator($atorTipo, $atorId);

        Auditoria::query()->create([
            'ator_tipo' => $tipo,
            'ator_id' => $id,
            'empresa_id' => $empresaId,
            'acao' => $acao,
            'entidade' => $entidade,
            'entidade_id' => $entidadeId,
            'antes' => $antes,
            'depois' => $depois,
            'ip' => request()?->ip(),
            'em' => now(),
        ]);
    }

    /**
     * @return array{0: string, 1: int|null}
     */
    private function ator(?string $tipo, ?int $id): array
    {
        if ($tipo !== null) {
            return [$tipo, $id];
        }
        if (auth('operacao')->check()) {
            return ['TRIGGER', (int) auth('operacao')->id()];
        }
        if (auth('web')->check()) {
            return ['CLIENTE', (int) auth('web')->id()];
        }

        return ['SISTEMA', null];
    }
}
