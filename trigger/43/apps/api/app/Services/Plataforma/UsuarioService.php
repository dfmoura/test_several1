<?php

namespace App\Services\Plataforma;

use App\Models\Parceiro;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Codigo\CodigoGenerator;
use Illuminate\Support\Collection;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;
use Spatie\Permission\Models\Role;

class UsuarioService
{
    public function __construct(
        private readonly CodigoGenerator $codigoGenerator,
        private readonly AuditLogger $auditLogger,
        private readonly RoleSodValidator $roleSodValidator,
    ) {}

    /**
     * Usuários visíveis ao gestor: compartilham ao menos uma EMP com ele, ou é ele mesmo.
     *
     * @return Collection<int, User>
     */
    public function listFor(User $actor, int $limit = 50): Collection
    {
        $empresaIds = $this->accessibleEmpresaIds($actor);

        return User::query()
            ->with(['roles', 'empresas', 'parceiro'])
            ->where(function ($query) use ($actor, $empresaIds) {
                $query->where('users.id', $actor->id);

                if ($empresaIds !== []) {
                    $query->orWhereHas('empresas', fn ($q) => $q->whereIn('empresas.id', $empresaIds));
                }
            })
            ->orderBy('name')
            ->limit($limit)
            ->get();
    }

    /**
     * Colaboradores ativos sem usuário, em todas as EMPs que o gestor administra.
     *
     * @return Collection<int, Parceiro>
     */
    public function colaboradoresDisponiveis(User $actor, ?int $exceptUserId = null): Collection
    {
        $empresaIds = $this->accessibleEmpresaIds($actor);
        if ($empresaIds === []) {
            return collect();
        }

        return Parceiro::query()
            ->whereIn('empresa_id', $empresaIds)
            ->where('papel_colaborador', true)
            ->where('situacao', 'ATIVO')
            ->where(function ($query) use ($exceptUserId) {
                $query->whereDoesntHave('user');
                if ($exceptUserId !== null) {
                    $query->orWhereHas('user', fn ($q) => $q->where('users.id', $exceptUserId));
                }
            })
            ->orderBy('razao_social')
            ->get();
    }

    public function create(User $actor, array $data): User
    {
        $empresaIds = $this->normalizeEmpresaIds($data);
        $this->assertEmpresaIdsAllowed($actor, $empresaIds);

        $parceiro = $this->resolveParceiroColaborador((int) $data['parceiro_id']);
        $this->assertParceiroEmpresaCompativel($parceiro, $empresaIds);

        if (User::query()->where('parceiro_id', $parceiro->id)->exists()) {
            throw ValidationException::withMessages([
                'parceiro_id' => ['Este colaborador já possui usuário de sistema.'],
            ]);
        }

        $roles = $data['roles'] ?? [];
        $this->roleSodValidator->assertCompatible($roles);
        $this->assertRolesExist($roles);

        return DB::transaction(function () use ($data, $parceiro, $roles, $empresaIds) {
            $codigo = $this->codigoGenerator->nextCode(null, 'USR', 5);
            $empresaDefault = $this->resolveEmpresaDefault($data, $empresaIds, $parceiro->empresa_id);

            $user = User::query()->create([
                'name' => $data['name'],
                'email' => strtolower(trim((string) $data['email'])),
                'password' => $data['password'],
                'codigo' => $codigo,
                'ativo' => true,
                'parceiro_id' => $parceiro->id,
                'empresa_default_id' => $empresaDefault,
                'vigencia_ate' => $data['vigencia_ate'] ?? null,
            ]);

            $this->syncRoles($user, $roles);
            $this->syncEmpresas($user, $empresaIds, $empresaDefault);

            $this->auditLogger->log('CRIAR', 'usuario', $user->id, null, [
                'email' => $user->email,
                'roles' => $roles,
            ]);

            return $user->fresh(['roles', 'empresas', 'parceiro']);
        });
    }

    public function update(User $actor, User $user, array $data): User
    {
        $this->assertCanManage($actor, $user);

        $before = ['email' => $user->email, 'ativo' => $user->ativo, 'roles' => $user->getRoleNames()];

        if (isset($data['roles'])) {
            $this->roleSodValidator->assertCompatible($data['roles']);
            $this->assertRolesExist($data['roles']);
        }

        if (isset($data['name'])) {
            $user->name = $data['name'];
        }
        if (isset($data['email'])) {
            $user->email = strtolower(trim((string) $data['email']));
        }
        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }
        if (array_key_exists('ativo', $data)) {
            if ($actor->id === $user->id && ! (bool) $data['ativo']) {
                throw ValidationException::withMessages([
                    'ativo' => ['Você não pode desativar o próprio acesso.'],
                ]);
            }
            $user->ativo = (bool) $data['ativo'];
        }
        if (array_key_exists('vigencia_ate', $data)) {
            $user->vigencia_ate = $data['vigencia_ate'];
        }

        $user->save();

        if (isset($data['roles'])) {
            $this->syncRoles($user, $data['roles']);
        }

        if (isset($data['empresa_ids'])) {
            $empresaIds = $this->normalizeEmpresaIds($data);
            $this->assertEmpresaIdsAllowed($actor, $empresaIds);

            if ($user->parceiro_id !== null) {
                $parceiro = $user->parceiro ?? Parceiro::query()->find($user->parceiro_id);
                if ($parceiro !== null) {
                    $this->assertParceiroEmpresaCompativel($parceiro, $empresaIds);
                }
            }

            $default = isset($data['empresa_default_id'])
                ? (int) $data['empresa_default_id']
                : ($user->empresa_default_id ?? null);
            $default = $this->resolveEmpresaDefault(
                ['empresa_default_id' => $default],
                $empresaIds,
                $default
            );
            $this->syncEmpresas($user, $empresaIds, $default);
        } elseif (isset($data['empresa_default_id'])) {
            $default = (int) $data['empresa_default_id'];
            $currentIds = $user->empresas()->pluck('empresas.id')->map(fn ($id) => (int) $id)->all();
            if (! in_array($default, $currentIds, true)) {
                throw ValidationException::withMessages([
                    'empresa_default_id' => ['Empresa padrão precisa estar entre as empresas de acesso.'],
                ]);
            }
            $this->syncEmpresas($user, $currentIds, $default);
        }

        $user = $user->fresh(['roles', 'empresas', 'parceiro']);
        $this->auditLogger->log('ATUALIZAR', 'usuario', $user->id, $before, [
            'email' => $user->email,
            'ativo' => $user->ativo,
            'roles' => $user->getRoleNames(),
        ]);

        return $user;
    }

    public function deactivate(User $actor, User $user): User
    {
        $this->assertCanManage($actor, $user);

        return $this->update($actor, $user, ['ativo' => false]);
    }

    public function activate(User $actor, User $user): User
    {
        $this->assertCanManage($actor, $user);

        return $this->update($actor, $user, ['ativo' => true]);
    }

    public function assertCanManage(User $actor, User $target): void
    {
        if ($actor->id === $target->id) {
            return;
        }

        $actorEmpresas = $this->accessibleEmpresaIds($actor);
        if ($actorEmpresas === []) {
            abort(403, 'Sem empresas para administrar usuários.');
        }

        $shared = $target->empresas()->whereIn('empresas.id', $actorEmpresas)->exists();
        if (! $shared) {
            abort(403, 'Sem permissão para administrar este usuário.');
        }
    }

    /**
     * @return list<int>
     */
    private function accessibleEmpresaIds(User $actor): array
    {
        return $actor->empresas()
            ->pluck('empresas.id')
            ->map(fn ($id) => (int) $id)
            ->values()
            ->all();
    }

    /**
     * @param  array<string, mixed>  $data
     * @return list<int>
     */
    private function normalizeEmpresaIds(array $data): array
    {
        $ids = array_values(array_unique(array_map('intval', $data['empresa_ids'] ?? [])));
        if ($ids === []) {
            throw ValidationException::withMessages([
                'empresa_ids' => ['Selecione ao menos uma empresa de acesso.'],
            ]);
        }

        return $ids;
    }

    /**
     * @param  list<int>  $empresaIds
     */
    private function assertEmpresaIdsAllowed(User $actor, array $empresaIds): void
    {
        $allowed = $this->accessibleEmpresaIds($actor);
        if ($allowed === []) {
            throw ValidationException::withMessages([
                'empresa_ids' => ['Sua conta ainda não possui empresas vinculadas.'],
            ]);
        }

        $invalid = array_values(array_diff($empresaIds, $allowed));
        if ($invalid !== []) {
            throw ValidationException::withMessages([
                'empresa_ids' => ['Empresa(s) fora do seu escopo de administração.'],
            ]);
        }
    }

    /**
     * @param  list<int>  $empresaIds
     */
    private function assertParceiroEmpresaCompativel(Parceiro $parceiro, array $empresaIds): void
    {
        if (! in_array((int) $parceiro->empresa_id, $empresaIds, true)) {
            throw ValidationException::withMessages([
                'empresa_ids' => ['O colaborador selecionado pertence a uma empresa que precisa estar no acesso.'],
                'parceiro_id' => ['Colaborador deve pertencer a uma das empresas selecionadas.'],
            ]);
        }
    }

    private function resolveParceiroColaborador(int $parceiroId): Parceiro
    {
        $parceiro = Parceiro::query()->find($parceiroId);

        if ($parceiro === null || ! $parceiro->papel_colaborador) {
            throw ValidationException::withMessages([
                'parceiro_id' => ['Usuário deve ser vinculado a um parceiro colaborador.'],
            ]);
        }

        if ($parceiro->situacao !== 'ATIVO') {
            throw ValidationException::withMessages([
                'parceiro_id' => ['Colaborador precisa estar ATIVO para receber acesso ao sistema.'],
            ]);
        }

        return $parceiro;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  list<int>  $empresaIds
     */
    private function resolveEmpresaDefault(array $data, array $empresaIds, ?int $fallback = null): int
    {
        $default = isset($data['empresa_default_id'])
            ? (int) $data['empresa_default_id']
            : ($fallback ?? $empresaIds[0]);

        if (! in_array($default, $empresaIds, true)) {
            $default = $empresaIds[0];
        }

        return $default;
    }

    /**
     * @param  list<string>  $roles
     */
    private function assertRolesExist(array $roles): void
    {
        $valid = Role::query()->whereIn('name', $roles)->pluck('name')->all();
        $invalid = array_values(array_diff($roles, $valid));

        if ($invalid !== []) {
            throw ValidationException::withMessages([
                'roles' => ['Perfil(is) inválido(s): '.implode(', ', $invalid)],
            ]);
        }
    }

    /**
     * @param  list<string>  $roles
     */
    private function syncRoles(User $user, array $roles): void
    {
        $valid = Role::query()->whereIn('name', $roles)->pluck('name')->all();
        $user->syncRoles($valid);
    }

    /**
     * @param  list<int>  $empresaIds
     */
    private function syncEmpresas(User $user, array $empresaIds, ?int $defaultId = null): void
    {
        $default = $defaultId && in_array($defaultId, $empresaIds, true)
            ? $defaultId
            : $empresaIds[0];

        $sync = [];
        foreach ($empresaIds as $empresaId) {
            $sync[$empresaId] = ['padrao' => $empresaId === $default];
        }
        $user->empresas()->sync($sync);

        if ((int) $user->empresa_default_id !== $default) {
            $user->empresa_default_id = $default;
            $user->save();
        }
    }
}
