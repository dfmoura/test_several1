<?php

namespace App\Services\Auth;

use App\Exceptions\SessaoAcessoException;
use App\Models\User;
use App\Support\PlatformRbac;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\PersonalAccessToken;

/**
 * Fonte única de emissão/revogação de sessão Bearer (Sanctum PAT).
 *
 * Política: uma sessão viva por usuário; teto de usuários distintos na
 * instalação; idle pelo last_used_at. Operador PLATAFORMA não consome assento.
 */
class SessaoAcessoService
{
    public const CODIGO_SESSAO_OCUPADA = 'SESSAO_OCUPADA';

    public const CODIGO_SESSOES_LIMITE = 'SESSOES_LIMITE';

    public const CODIGO_SESSAO_INATIVA = 'SESSAO_INATIVA';

    public const CODIGO_USUARIO_INATIVO = 'USUARIO_INATIVO';

    public function tokenName(): string
    {
        return (string) config('erp.auth.token_name', 'api');
    }

    public function idleMinutes(): int
    {
        $minutes = (int) config('erp.auth.idle_minutes', 30);

        return max(1, $minutes);
    }

    public function maxUsuariosSimultaneos(): int
    {
        $max = (int) config('erp.auth.max_usuarios_simultaneos', 6);

        return max(1, $max);
    }

    /**
     * Emite um PAT respeitando sessão única e teto simultâneo.
     *
     * @param  array{substituir_ativa?: bool, token_atual?: string|null}  $opcoes
     */
    public function emitir(User $user, array $opcoes = []): string
    {
        $substituir = (bool) ($opcoes['substituir_ativa'] ?? false);
        $tokenAtual = trim((string) ($opcoes['token_atual'] ?? ''));

        return DB::transaction(function () use ($user, $substituir, $tokenAtual) {
            User::query()->whereKey($user->id)->lockForUpdate()->first();
            $this->tokensDaInstalacaoQuery()->lockForUpdate()->get(['id']);

            if ($tokenAtual !== '') {
                $encontrado = PersonalAccessToken::findToken($tokenAtual);
                if ($this->tokenPertenceAoUsuario($encontrado, $user) && $this->tokenEstaVivo($encontrado)) {
                    $this->encerrarSessoes($user);

                    return $this->criarToken($user);
                }
            }

            $vivas = $this->tokensVivosDoUsuario($user);
            if ($vivas->isNotEmpty()) {
                if (! $substituir) {
                    throw new SessaoAcessoException(
                        'Já existe uma sessão ativa neste usuário. Encerre o acesso no outro dispositivo ou use «Encerrar sessão anterior e entrar».',
                        self::CODIGO_SESSAO_OCUPADA,
                        409,
                        ['pode_encerrar_anterior' => true],
                    );
                }
                $this->encerrarSessoes($user);
            } else {
                $this->assertVagaSimultanea($user);
            }

            return $this->criarToken($user);
        });
    }

    public function encerrarSessoes(User $user): int
    {
        return (int) $user->tokens()->where('name', $this->tokenName())->delete();
    }

    public function encerrarTokenAtual(?PersonalAccessToken $token): void
    {
        if ($token === null) {
            return;
        }
        $token->delete();
    }

    public function possuiSessaoAtiva(User $user): bool
    {
        return $this->tokensVivosDoUsuario($user)->isNotEmpty();
    }

    /**
     * @param  list<int>  $userIds
     * @return list<int>
     */
    public function idsComSessaoAtiva(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        return $this->tokensVivosQuery()
            ->whereIn('tokenable_id', $userIds)
            ->pluck('tokenable_id')
            ->unique()
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    public function contarUsuariosSimultaneos(): int
    {
        $ids = $this->tokensVivosQuery()
            ->pluck('tokenable_id')
            ->unique()
            ->map(fn ($id) => (int) $id)
            ->values();

        if ($ids->isEmpty()) {
            return 0;
        }

        $plataforma = $this->idsOperadoresPlataforma($ids->all());

        return $ids->reject(fn (int $id) => in_array($id, $plataforma, true))->count();
    }

    /**
     * Token persistido ainda conta como sessão viva (idle + usuário ativo).
     */
    public function tokenEstaVivo(mixed $token): bool
    {
        if (! $token instanceof PersonalAccessToken) {
            return true;
        }

        $tokenable = $token->tokenable;
        if (! $tokenable instanceof User) {
            return false;
        }
        if (! $tokenable->ativo) {
            return false;
        }

        $referencia = $token->last_used_at ?? $token->created_at;
        if ($referencia === null) {
            return true;
        }

        return $referencia->gte($this->limiteIdle());
    }

    public function recusarTokenSeInativo(PersonalAccessToken $token): bool
    {
        $tokenable = $token->tokenable;
        if ($tokenable instanceof User && ! $tokenable->ativo) {
            $this->marcarCodigo(self::CODIGO_USUARIO_INATIVO);
            $token->delete();

            return false;
        }

        if (! $this->tokenEstaVivo($token)) {
            $this->marcarCodigo(self::CODIGO_SESSAO_INATIVA);
            $token->delete();

            return false;
        }

        return true;
    }

    private function assertVagaSimultanea(User $user): void
    {
        if ($this->eOperadorPlataforma($user)) {
            return;
        }

        $max = $this->maxUsuariosSimultaneos();
        $ocupadas = $this->contarUsuariosSimultaneos();
        if ($ocupadas >= $max) {
            throw new SessaoAcessoException(
                "O sistema já possui {$max} usuários conectados. Peça que alguém saia ou que o administrador libere uma sessão em Usuários.",
                self::CODIGO_SESSOES_LIMITE,
                409,
                [
                    'pode_encerrar_anterior' => false,
                    'max' => $max,
                    'ocupadas' => $ocupadas,
                ],
            );
        }
    }

    private function criarToken(User $user): string
    {
        return $user->createToken($this->tokenName())->plainTextToken;
    }

    /**
     * @return Collection<int, PersonalAccessToken>
     */
    private function tokensVivosDoUsuario(User $user): Collection
    {
        $desde = $this->limiteIdle();

        return $user->tokens()
            ->where('name', $this->tokenName())
            ->where(function ($query) use ($desde) {
                $query->where('last_used_at', '>=', $desde)
                    ->orWhere(function ($q) use ($desde) {
                        $q->whereNull('last_used_at')
                            ->where('created_at', '>=', $desde);
                    });
            })
            ->get();
    }

    private function tokensVivosQuery(): Builder
    {
        $desde = $this->limiteIdle();

        return $this->tokensDaInstalacaoQuery()
            ->where(function (Builder $query) use ($desde) {
                $query->where('last_used_at', '>=', $desde)
                    ->orWhere(function (Builder $q) use ($desde) {
                        $q->whereNull('last_used_at')
                            ->where('created_at', '>=', $desde);
                    });
            })
            ->whereExists(function ($query) {
                $query->selectRaw('1')
                    ->from('users')
                    ->whereColumn('users.id', 'personal_access_tokens.tokenable_id')
                    ->where('users.ativo', true)
                    ->whereNull('users.deleted_at');
            });
    }

    private function tokensDaInstalacaoQuery(): Builder
    {
        return PersonalAccessToken::query()
            ->where('name', $this->tokenName())
            ->where('tokenable_type', (new User)->getMorphClass());
    }

    private function limiteIdle(): \Illuminate\Support\Carbon
    {
        return now()->subMinutes($this->idleMinutes());
    }

    private function tokenPertenceAoUsuario(mixed $token, User $user): bool
    {
        return $token instanceof PersonalAccessToken
            && $token->tokenable_type === (new User)->getMorphClass()
            && (int) $token->tokenable_id === (int) $user->id;
    }

    private function eOperadorPlataforma(User $user): bool
    {
        return $user->getRoleNames()->contains(PlatformRbac::ROLE);
    }

    /**
     * @param  list<int>  $userIds
     * @return list<int>
     */
    private function idsOperadoresPlataforma(array $userIds): array
    {
        if ($userIds === []) {
            return [];
        }

        return User::query()
            ->whereIn('id', $userIds)
            ->whereHas('roles', fn ($q) => $q->where('name', PlatformRbac::ROLE))
            ->pluck('id')
            ->map(fn ($id) => (int) $id)
            ->all();
    }

    private function marcarCodigo(string $codigo): void
    {
        if (app()->bound('request')) {
            request()->attributes->set('auth_sessao_codigo', $codigo);
        }
    }
}
