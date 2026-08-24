<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Services\Plataforma\EmpresaOnboardingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rules\Password;

class EmpresaOnboardingController extends Controller
{
    public function __construct(private readonly EmpresaOnboardingService $onboarding) {}

    public function storeConta(Request $request): JsonResponse
    {
        $this->assertPublicContaRegistrationEnabled();

        $data = $request->validate($this->regrasConta());
        $out = $this->onboarding->registrarConta($data);

        return response()->json($this->payloadConta($out['user'], $out['token']), 201);
    }

    public function abrirEmpresa(Request $request): JsonResponse
    {
        /** @var User $user */
        $user = $request->user();
        $data = $request->validate($this->regrasEmpresa());
        $out = $this->onboarding->abrirEmpresa($user, $data);

        return response()->json([
            'empresa' => $this->payloadEmpresa($out['empresa']),
            'user' => $this->payloadUser($out['user']),
        ], 201);
    }

    public function store(Request $request): JsonResponse
    {
        $this->assertPublicContaRegistrationEnabled();

        $data = $request->validate(array_merge($this->regrasConta(), $this->regrasEmpresa()));
        $out = $this->onboarding->registrar($data);

        return response()->json([
            'token' => $out['token'],
            'token_type' => 'Bearer',
            'empresa' => $this->payloadEmpresa($out['empresa']),
            'user' => $this->payloadUser($out['user']),
        ], 201);
    }

    private function assertPublicContaRegistrationEnabled(): void
    {
        if (config('erp.flexorc.public_conta_registration')) {
            return;
        }

        abort(403, 'Cadastro público de conta desativado. Solicite acesso ao administrador master.');
    }

    /**
     * @return array<string, mixed>
     */
    private function regrasConta(): array
    {
        return [
            'admin_name' => ['required', 'string', 'max:160'],
            'admin_email' => ['required', 'email', 'max:255'],
            'admin_password' => ['required', 'string', Password::min(8)->mixedCase()->numbers()],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function regrasEmpresa(): array
    {
        return [
            'cnpj' => ['required', 'string', 'max:18'],
            'razao_social' => ['required', 'string', 'max:255'],
            'nome_fantasia' => ['nullable', 'string', 'max:255'],
            'ie' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'email', 'max:255'],
            'telefone' => ['nullable', 'string', 'max:32'],
            'logradouro' => ['nullable', 'string', 'max:255'],
            'numero' => ['nullable', 'string', 'max:32'],
            'complemento' => ['nullable', 'string', 'max:120'],
            'bairro' => ['nullable', 'string', 'max:120'],
            'municipio' => ['required', 'string', 'max:120'],
            'uf' => ['required', 'string', 'size:2'],
            'cep' => ['nullable', 'string', 'max:12'],
            'ibge' => ['nullable', 'string', 'max:12'],
            'regime' => ['nullable', 'string', 'max:40'],
            'crt' => ['nullable', 'integer', 'min:1', 'max:4'],
        ];
    }

    /**
     * @return array{token: string, token_type: string, user: array<string, mixed>}
     */
    private function payloadConta(User $user, string $token): array
    {
        return [
            'token' => $token,
            'token_type' => 'Bearer',
            'user' => $this->payloadUser($user),
        ];
    }

    /**
     * @return array{id: int, codigo: string, email: string, name: string}
     */
    private function payloadUser(User $user): array
    {
        return [
            'id' => $user->id,
            'codigo' => $user->codigo,
            'email' => $user->email,
            'name' => $user->name,
        ];
    }

    /**
     * @return array{id: int, codigo: string, razao_social: string}
     */
    private function payloadEmpresa(mixed $empresa): array
    {
        return [
            'id' => $empresa->id,
            'codigo' => $empresa->codigo,
            'razao_social' => $empresa->razao_social,
        ];
    }
}
