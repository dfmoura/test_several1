<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Plataforma\UsuarioService;
use App\Support\UsuarioPresenter;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class UsuarioController extends Controller
{
    public function __construct(private readonly UsuarioService $usuarioService) {}

    public function index(Request $request): JsonResponse
    {
        $actor = $this->authorizeGerir($request);
        $users = $this->usuarioService->listFor($actor);

        return response()->json(['data' => UsuarioPresenter::presentMany($users)]);
    }

    public function colaboradoresDisponiveis(Request $request): JsonResponse
    {
        $actor = $this->authorizeGerir($request);
        $exceptUserId = $request->query('except_user_id');
        $colaboradores = $this->usuarioService->colaboradoresDisponiveis(
            $actor,
            $exceptUserId !== null && $exceptUserId !== '' ? (int) $exceptUserId : null,
        );

        return response()->json(['data' => UsuarioPresenter::presentColaboradores($colaboradores)]);
    }

    public function store(Request $request): JsonResponse
    {
        $actor = $this->authorizeGerir($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', $this->passwordRule()],
            'parceiro_id' => ['required', 'integer', 'exists:parceiros,id'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string'],
            'empresa_ids' => ['required', 'array', 'min:1'],
            'empresa_ids.*' => ['integer', 'exists:empresas,id'],
            'empresa_default_id' => ['nullable', 'integer', 'exists:empresas,id'],
            'vigencia_ate' => ['nullable', 'date', 'after_or_equal:today'],
        ]);

        $user = $this->usuarioService->create($actor, $data);

        return response()->json(['data' => UsuarioPresenter::present($user)], 201);
    }

    public function update(Request $request, User $usuario): JsonResponse
    {
        $actor = $this->authorizeGerir($request);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:users,email,'.$usuario->id],
            'password' => ['nullable', 'string', $this->passwordRule()],
            'ativo' => ['sometimes', 'boolean'],
            'roles' => ['sometimes', 'array', 'min:1'],
            'roles.*' => ['string'],
            'empresa_ids' => ['sometimes', 'array', 'min:1'],
            'empresa_ids.*' => ['integer', 'exists:empresas,id'],
            'empresa_default_id' => ['nullable', 'integer', 'exists:empresas,id'],
            'vigencia_ate' => ['nullable', 'date'],
        ]);

        $user = $this->usuarioService->update($actor, $usuario, $data);

        return response()->json(['data' => UsuarioPresenter::present($user)]);
    }

    public function deactivate(Request $request, User $usuario): JsonResponse
    {
        $actor = $this->authorizeGerir($request);
        $user = $this->usuarioService->deactivate($actor, $usuario);

        return response()->json(['data' => UsuarioPresenter::present($user)]);
    }

    public function activate(Request $request, User $usuario): JsonResponse
    {
        $actor = $this->authorizeGerir($request);
        $user = $this->usuarioService->activate($actor, $usuario);

        return response()->json(['data' => UsuarioPresenter::present($user)]);
    }

    private function authorizeGerir(Request $request): User
    {
        /** @var User $user */
        $user = $request->user();
        if (! $user->can('usuarios.gerir')) {
            abort(403);
        }

        return $user;
    }

    private function passwordRule(): Password
    {
        return Password::min(8)->mixedCase()->numbers()->symbols();
    }
}
