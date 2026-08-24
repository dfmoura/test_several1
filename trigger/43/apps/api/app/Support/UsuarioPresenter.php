<?php

namespace App\Support;

use App\Models\Parceiro;
use App\Models\User;
use App\Services\Auth\SessaoAcessoService;
use Illuminate\Support\Collection;

/**
 * Contrato estável da API /usuarios — roles como string[], empresas resumidas.
 */
final class UsuarioPresenter
{
    /**
     * @return array<string, mixed>
     */
    public static function present(User $user, ?bool $sessaoAtiva = null): array
    {
        $user->loadMissing(['roles', 'empresas', 'parceiro']);

        return [
            'id' => $user->id,
            'codigo' => $user->codigo,
            'name' => $user->name,
            'email' => $user->email,
            'ativo' => (bool) $user->ativo,
            'parceiro_id' => $user->parceiro_id,
            'empresa_default_id' => $user->empresa_default_id,
            'vigencia_ate' => $user->vigencia_ate?->toDateString(),
            'ultimo_login_em' => $user->ultimo_login_em?->toIso8601String(),
            'sessao_ativa' => $sessaoAtiva ?? app(SessaoAcessoService::class)->possuiSessaoAtiva($user),
            'tipo' => $user->parceiro_id !== null ? 'colaborador' : 'conta',
            'roles' => $user->getRoleNames()->values()->all(),
            'empresas' => $user->empresas->map(fn ($empresa) => [
                'id' => $empresa->id,
                'codigo' => $empresa->codigo,
                'razao_social' => $empresa->razao_social,
                'nome_fantasia' => $empresa->nome_fantasia,
                'padrao' => (bool) $empresa->pivot->padrao,
            ])->values()->all(),
            'parceiro' => self::presentParceiro($user->parceiro),
        ];
    }

    /**
     * @param  Collection<int, User>  $users
     * @return list<array<string, mixed>>
     */
    public static function presentMany(Collection $users): array
    {
        $ativas = array_fill_keys(
            app(SessaoAcessoService::class)->idsComSessaoAtiva($users->pluck('id')->all()),
            true,
        );

        return $users
            ->map(fn (User $user) => self::present($user, isset($ativas[$user->id])))
            ->values()
            ->all();
    }

    /**
     * @return array<string, mixed>|null
     */
    public static function presentParceiro(?Parceiro $parceiro): ?array
    {
        if ($parceiro === null) {
            return null;
        }

        return [
            'id' => $parceiro->id,
            'codigo' => $parceiro->codigo,
            'razao_social' => $parceiro->razao_social,
            'nome_fantasia' => $parceiro->nome_fantasia,
            'cargo' => $parceiro->cargo,
            'empresa_id' => $parceiro->empresa_id,
            'email' => $parceiro->email,
        ];
    }

    /**
     * Colaboradores elegíveis para novo usuário (todas as EMPs do gestor).
     *
     * @param  Collection<int, Parceiro>  $colaboradores
     * @return list<array<string, mixed>>
     */
    public static function presentColaboradores(Collection $colaboradores): array
    {
        return $colaboradores->map(fn (Parceiro $parceiro) => [
            'id' => $parceiro->id,
            'codigo' => $parceiro->codigo,
            'razao_social' => $parceiro->razao_social,
            'nome_fantasia' => $parceiro->nome_fantasia,
            'cargo' => $parceiro->cargo,
            'empresa_id' => $parceiro->empresa_id,
            'email' => $parceiro->email,
        ])->values()->all();
    }
}
