<?php

declare(strict_types=1);

namespace App\Domain\Empresa;

use App\Models\Empresa;
use App\Models\PapelPermissao;
use App\Models\Vinculo;

class EmpresaAtual
{
    public function empresa(): Empresa
    {
        $usuarioId = auth('web')->id();
        abort_unless($usuarioId, 401);
        $empresaId = (int) session('empresa_id');
        $vinculo = Vinculo::query()
            ->where('usuario_id', $usuarioId)
            ->where('empresa_id', $empresaId)
            ->where('status', 'ATIVO')
            ->first();
        abort_unless($vinculo, 403);

        return Empresa::query()->findOrFail($empresaId);
    }

    public function pode(string $permissao): bool
    {
        $papel = (string) session('papel');

        return PapelPermissao::query()
            ->where('papel', $papel)
            ->where('permissao', $permissao)
            ->exists();
    }

    public function exigir(string $permissao): void
    {
        abort_unless($this->pode($permissao), 403);
    }
}
