<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\ContaAtivacao;
use App\Support\FlexorcSuperficie;
use App\Models\User;
use App\Services\Audit\AuditLogger;
use App\Services\Auth\SessaoAcessoService;
use App\Services\Plataforma\EmpresaAtivacaoService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

class AuthController extends Controller
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly SessaoAcessoService $sessaoAcesso,
        private readonly EmpresaAtivacaoService $ativacao,
    ) {}

    public function login(Request $request): JsonResponse
    {
        $credentials = $request->validate([
            'email' => ['nullable', 'email', 'required_without:conta'],
            'conta' => ['nullable', 'string', 'max:32', 'required_without:email'],
            'password' => ['required', 'string'],
            'encerrar_sessao_anterior' => ['sometimes', 'boolean'],
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

        $substituir = (bool) ($credentials['encerrar_sessao_anterior'] ?? false);
        $token = $this->sessaoAcesso->emitir($user, [
            'substituir_ativa' => $substituir,
            'token_atual' => $request->bearerToken(),
        ]);

        $user->update(['ultimo_login_em' => now()]);

        auth()->setUser($user);
        $this->auditLogger->log('LOGIN', 'usuario', $user->id, null, [
            'email' => $user->email,
            'conta' => $user->codigo,
            'substituiu_sessao' => $substituir,
        ]);
        auth()->forgetGuards();

        $user->load('empresas');
        $billingAviso = $this->ativacao->avisoBillingConta($user);

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
            'billing_aviso' => $billingAviso,
        ]);
    }

    public function logout(Request $request): JsonResponse
    {
        $user = $request->user();
        $token = $user->currentAccessToken();
        if ($token instanceof PersonalAccessToken) {
            $this->sessaoAcesso->encerrarTokenAtual($token);
        } else {
            $this->sessaoAcesso->encerrarSessoes($user);
        }
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
            'billing_aviso' => $this->ativacao->avisoBillingConta($user),
            'produto_flexorc' => FlexorcSuperficie::dto(),
            'console_plataforma' => $user->getRoleNames()->contains(\App\Support\PlatformRbac::ROLE)
                || in_array('plataforma.operar', $user->getAllPermissions()->pluck('name')->all(), true),
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
