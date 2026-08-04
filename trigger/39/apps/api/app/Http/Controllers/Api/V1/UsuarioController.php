<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Plataforma\UsuarioService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class UsuarioController extends Controller
{
    public function __construct(private readonly UsuarioService $usuarioService) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        return response()->json(['data' => $this->usuarioService->list()]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8'],
            'parceiro_id' => ['required', 'integer', 'exists:parceiros,id'],
            'roles' => ['required', 'array', 'min:1'],
            'roles.*' => ['string'],
            'empresa_ids' => ['sometimes', 'array', 'min:1'],
            'empresa_ids.*' => ['integer', 'exists:empresas,id'],
            'empresa_default_id' => ['nullable', 'integer', 'exists:empresas,id'],
            'vigencia_ate' => ['nullable', 'date', 'after_or_equal:today'],
        ]);

        $user = $this->usuarioService->create($data);

        return response()->json(['data' => $user], 201);
    }

    public function update(Request $request, User $usuario): JsonResponse
    {
        $this->authorizeAdmin($request);

        $data = $request->validate([
            'name' => ['sometimes', 'string', 'max:255'],
            'email' => ['sometimes', 'email', 'unique:users,email,'.$usuario->id],
            'password' => ['nullable', 'string', 'min:8'],
            'ativo' => ['sometimes', 'boolean'],
            'roles' => ['sometimes', 'array', 'min:1'],
            'roles.*' => ['string'],
            'empresa_ids' => ['sometimes', 'array', 'min:1'],
            'empresa_ids.*' => ['integer', 'exists:empresas,id'],
            'empresa_default_id' => ['nullable', 'integer', 'exists:empresas,id'],
            'vigencia_ate' => ['nullable', 'date'],
        ]);

        $user = $this->usuarioService->update($usuario, $data);

        return response()->json(['data' => $user]);
    }

    public function deactivate(Request $request, User $usuario): JsonResponse
    {
        $this->authorizeAdmin($request);

        $user = $this->usuarioService->deactivate($usuario);

        return response()->json(['data' => $user]);
    }

    public function activate(Request $request, User $usuario): JsonResponse
    {
        $this->authorizeAdmin($request);

        $user = $this->usuarioService->activate($usuario);

        return response()->json(['data' => $user]);
    }

    private function authorizeAdmin(Request $request): void
    {
        if (! $request->user()->can('usuarios.gerir')) {
            abort(403);
        }
    }
}
