<?php

namespace App\Services\Plataforma;

use App\Models\Parceiro;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Codigo\CodigoGenerator;
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

    public function list(int $limit = 50)
    {
        return User::query()
            ->with(['roles', 'empresas', 'parceiro'])
            ->orderBy('name')
            ->limit($limit)
            ->get();
    }

    public function create(array $data): User
    {
        $parceiro = Parceiro::query()->find($data['parceiro_id'] ?? null);

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

        if (User::query()->where('parceiro_id', $parceiro->id)->exists()) {
            throw ValidationException::withMessages([
                'parceiro_id' => ['Este colaborador já possui usuário de sistema.'],
            ]);
        }

        $roles = $data['roles'] ?? [];
        $this->roleSodValidator->assertCompatible($roles);
        $this->assertRolesExist($roles);

        return DB::transaction(function () use ($data, $parceiro, $roles) {
            $codigo = $this->codigoGenerator->nextCode(null, 'USR', 5);
            $empresaDefault = $data['empresa_default_id'] ?? $parceiro->empresa_id;
            $empresaIds = $data['empresa_ids'] ?? [$parceiro->empresa_id];

            if (! in_array($empresaDefault, $empresaIds, true)) {
                $empresaIds[] = $empresaDefault;
            }

            $user = User::query()->create([
                'name' => $data['name'],
                'email' => $data['email'],
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

    public function update(User $user, array $data): User
    {
        $before = ['email' => $user->email, 'ativo' => $user->ativo, 'roles' => $user->getRoleNames()];

        if (isset($data['roles'])) {
            $this->roleSodValidator->assertCompatible($data['roles']);
            $this->assertRolesExist($data['roles']);
        }

        if (isset($data['name'])) {
            $user->name = $data['name'];
        }
        if (isset($data['email'])) {
            $user->email = $data['email'];
        }
        if (! empty($data['password'])) {
            $user->password = $data['password'];
        }
        if (array_key_exists('ativo', $data)) {
            $user->ativo = (bool) $data['ativo'];
        }
        if (array_key_exists('vigencia_ate', $data)) {
            $user->vigencia_ate = $data['vigencia_ate'];
        }
        if (isset($data['empresa_default_id'])) {
            $user->empresa_default_id = $data['empresa_default_id'];
        }

        $user->save();

        if (isset($data['roles'])) {
            $this->syncRoles($user, $data['roles']);
        }
        if (isset($data['empresa_ids'])) {
            $default = $data['empresa_default_id'] ?? $user->empresa_default_id;
            $this->syncEmpresas($user, $data['empresa_ids'], $default);
        }

        $user = $user->fresh(['roles', 'empresas', 'parceiro']);
        $this->auditLogger->log('ATUALIZAR', 'usuario', $user->id, $before, [
            'email' => $user->email,
            'ativo' => $user->ativo,
            'roles' => $user->getRoleNames(),
        ]);

        return $user;
    }

    public function deactivate(User $user): User
    {
        return $this->update($user, ['ativo' => false]);
    }

    public function activate(User $user): User
    {
        return $this->update($user, ['ativo' => true]);
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

    private function syncRoles(User $user, array $roles): void
    {
        $valid = Role::query()->whereIn('name', $roles)->pluck('name')->all();
        $user->syncRoles($valid);
    }

    /**
     * @param  list<int|string>  $empresaIds
     */
    private function syncEmpresas(User $user, array $empresaIds, ?int $defaultId = null): void
    {
        $ids = array_values(array_unique(array_map('intval', $empresaIds)));
        if ($ids === []) {
            throw ValidationException::withMessages([
                'empresa_ids' => ['Selecione ao menos uma empresa de acesso.'],
            ]);
        }

        $default = $defaultId && in_array($defaultId, $ids, true)
            ? $defaultId
            : $ids[0];

        $sync = [];
        foreach ($ids as $empresaId) {
            $sync[$empresaId] = ['padrao' => $empresaId === $default];
        }
        $user->empresas()->sync($sync);

        if ($user->empresa_default_id !== $default) {
            $user->empresa_default_id = $default;
            $user->save();
        }
    }
}
