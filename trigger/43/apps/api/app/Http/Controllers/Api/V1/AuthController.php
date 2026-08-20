<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ContaAtivacao;
use App\Support\FlexorcSuperficie;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class AuthController extends Controller
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['nullable', 'email', 'required_without:conta'],
            'conta' => ['nullable', 'string', 'max:32', 'required_without:email'],
            'password' => ['required', 'string'],
        ]);

        $email = isset($credentials['email']) ? strtolower(trim((string) $credentials['email'])) : '';
        $conta = isset($credentials['conta']) ? strtoupper(trim((string) $credentials['conta'])) : '';

        /** @var User|null $user */
        $user = $this->resolverUsuarioLogin($email !== '' ? $email : null, $conta !== '' ? $conta : null);

        // API token auth: valida hash direto (sem depender de sessão/guard web).
        if (! $user || ! Hash::check($credentials['password'], $user->getAuthPassword())) {
            throw ValidationException::withMessages([
                'email' => ['Credenciais inválidas.'],
            ]);
        }

        if (! $user->ativo) {
            throw ValidationException::withMessages([
                'email' => ['Usuário inativo.'],
            ]);
        }

        if ($user->vigencia_ate !== null && $user->vigencia_ate->copy()->endOfDay()->isPast()) {
            throw ValidationException::withMessages([
                'email' => ['Vigência de acesso expirada. Solicite reativação ao administrador.'],
            ]);
        }

        $user->update(['ultimo_login_em' => now()]);
        $token = $user->createToken('api')->plainTextToken;

        auth()->setUser($user);
        $this->auditLogger->log('LOGIN', 'usuario', $user->id, null, [
            'email' => $user->email,
            'conta' => $user->codigo,
        ]);

        $user->load('empresas');

        return response()->json([
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => [
                'id' => $user->id,
                'codigo' => $user->codigo,
                'name' => $user->name,
                'email' => $user->email,
            ],
            'empresas' => $user->empresas->map(fn ($e) => [
                'id' => $e->id,
                'codigo' => $e->codigo,
                'razao_social' => $e->razao_social,
                'nome_fantasia' => $e->nome_fantasia,
            ])->values()->all(),
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $request->user()->currentAccessToken()?->delete();
        $this->auditLogger->log('LOGOUT', 'usuario', $user->id);

        return response()->json(['message' => 'Logout realizado.']);
    }

    public function me(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user()->load(['roles', 'empresas', 'parceiro', 'empresaDefault']);

        return response()->json([
            'user' => [
                'id' => $user->id,
                'codigo' => $user->codigo,
                'name' => $user->name,
                'email' => $user->email,
                'ativo' => $user->ativo,
                'empresa_default_id' => $user->empresa_default_id,
                'parceiro_id' => $user->parceiro_id,
                'ultimo_login_em' => $user->ultimo_login_em,
            ],
            'roles' => $user->getRoleNames(),
            'permissions' => $user->getAllPermissions()->pluck('name')->values()->all(),
            'empresas' => $user->empresas->map(fn ($e) => [
                'id' => $e->id,
                'codigo' => $e->codigo,
                'razao_social' => $e->razao_social,
                'nome_fantasia' => $e->nome_fantasia,
                'padrao' => (bool) $e->pivot->padrao,
                'venda_ativa' => (bool) $e->venda_ativa,
                'estoque_ativo' => (bool) $e->estoque_ativo,
                'origem_latitude' => $e->origem_latitude,
                'origem_longitude' => $e->origem_longitude,
            ]),
            'empresa_contexto' => app()->bound('empresa') ? [
                'id' => app('empresa')->id,
                'codigo' => app('empresa')->codigo,
            ] : null,
            'conta_flexorc' => [
                'max_empresas' => ContaAtivacao::maxEmpresasPorConta(),
                'empresas_count' => $user->empresas->count(),
            ],
            'produto_flexorc' => FlexorcSuperficie::dto(),
        ]);
    }

    private function resolverUsuarioLogin(?string $email, ?string $conta): ?User
    {
        $query = User::query();
        if ($email) {
            $query->where('email', $email);
        }
        if ($conta) {
            $query->whereRaw('UPPER(codigo) = ?', [$conta]);
        }

        return $query->first();
    }
}
