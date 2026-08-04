<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Services\Cadastros\EmpresaFiscalRules;
use App\Services\Cadastros\EmpresaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class EmpresaController extends Controller
{
    public function __construct(private readonly EmpresaService $empresaService) {}

    public function index(Request $request): JsonResponse
    {
        // Qualquer usuário autenticado lista as empresas às quais tem vínculo.
        $empresas = $request->user()
            ->empresas()
            ->orderBy('codigo')
            ->get();

        return response()->json(['data' => $empresas]);
    }

    public function show(Request $request, Empresa $empresa): JsonResponse
    {
        if (! $request->user()->hasEmpresaAccess($empresa->id)) {
            abort(403);
        }

        $empresa->load('fiscaisHistorico');

        return response()->json(['data' => $empresa]);
    }

    public function update(Request $request, Empresa $empresa): JsonResponse
    {
        $this->authorizePermission($request, 'empresas.gerir');

        if (! $request->user()->hasEmpresaAccess($empresa->id)) {
            abort(403);
        }

        $data = $request->validate([
            'cnpj' => ['sometimes', 'string', 'max:14'],
            'razao_social' => ['sometimes', 'string', 'max:255'],
            'nome_fantasia' => ['nullable', 'string', 'max:255'],
            'ie' => ['nullable', 'string', 'max:32'],
            'ie_status' => ['nullable', 'string', 'in:'.implode(',', EmpresaFiscalRules::IE_STATUSES)],
            'im' => ['nullable', 'string', 'max:32'],
            'iest' => ['nullable', 'string', 'max:32'],
            'regime' => ['nullable', 'string', 'max:32', 'in:'.implode(',', EmpresaFiscalRules::REGIMES)],
            'crt' => ['nullable', 'integer', 'in:1,2,3,4'],
            'regime_desde' => ['nullable', 'date'],
            'cnae' => ['nullable', 'string', 'max:16'],
            'cnaes_secundarios' => ['nullable', 'array'],
            'cnaes_secundarios.*.codigo' => ['required_with:cnaes_secundarios', 'string', 'max:16'],
            'cnaes_secundarios.*.descricao' => ['nullable', 'string', 'max:255'],
            'email' => ['nullable', 'email'],
            'telefone' => ['nullable', 'string', 'max:32'],
            'logradouro' => ['nullable', 'string'],
            'numero' => ['nullable', 'string', 'max:32'],
            'complemento' => ['nullable', 'string'],
            'bairro' => ['nullable', 'string'],
            'municipio' => ['nullable', 'string'],
            'uf' => ['nullable', 'string', 'size:2'],
            'cep' => ['nullable', 'string', 'max:8'],
            'ibge' => ['nullable', 'string', 'max:7'],
            'venda_ativa' => ['sometimes', 'boolean'],
            'estoque_ativo' => ['sometimes', 'boolean'],
            'logo_path' => ['nullable', 'string'],
            'situacao' => ['sometimes', 'string', 'max:16'],
            'motivo_vigencia_fiscal' => ['nullable', 'string', 'max:255'],
        ]);

        if (array_key_exists('cnpj', $data)) {
            $digits = preg_replace('/\D/', '', (string) $data['cnpj']) ?? '';
            $existe = Empresa::query()
                ->where('cnpj', $digits)
                ->where('id', '!=', $empresa->id)
                ->exists();

            if ($existe) {
                return response()->json([
                    'message' => 'CNPJ já cadastrado em outra empresa.',
                    'errors' => ['cnpj' => ['CNPJ já cadastrado.']],
                ], 422);
            }
        }

        $motivo = $data['motivo_vigencia_fiscal'] ?? null;
        unset($data['motivo_vigencia_fiscal']);

        $updated = $this->empresaService->update($empresa, $data, $motivo);

        return response()->json(['data' => $updated]);
    }

    private function authorizePermission(Request $request, string $permission): void
    {
        if (! $request->user()->can($permission)) {
            abort(403, 'Permissão negada.');
        }
    }
}
