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

        $empresa->load(['fiscaisHistorico', 'contasFinanceiras', ...Empresa::userStampWith()]);

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
            'im_obrigatoria_nfse' => ['sometimes', 'boolean'],
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
            'origem_latitude' => \App\Support\PadraoDecimal::coordinateRules('latitude'),
            'origem_longitude' => \App\Support\PadraoDecimal::coordinateRules('longitude'),
            'venda_ativa' => ['sometimes', 'boolean'],
            'estoque_ativo' => ['sometimes', 'boolean'],
            'logo_path' => ['nullable', 'string'],
            'situacao' => ['sometimes', 'string', 'max:16'],
            'motivo_vigencia_fiscal' => ['nullable', 'string', 'max:255'],
            'contas_financeiras' => ['sometimes', 'array'],
            'contas_financeiras.*.id' => ['nullable', 'integer'],
            'contas_financeiras.*.tipo' => ['nullable', 'string', 'in:BANCO,CAIXA,APLICACAO'],
            'contas_financeiras.*.descricao' => ['nullable', 'string', 'max:255'],
            'contas_financeiras.*.banco_codigo' => ['nullable', 'string', 'max:8'],
            'contas_financeiras.*.banco_nome' => ['nullable', 'string', 'max:255'],
            'contas_financeiras.*.agencia' => ['nullable', 'string', 'max:16'],
            'contas_financeiras.*.conta' => ['nullable', 'string', 'max:32'],
            'contas_financeiras.*.tipo_conta' => ['nullable', 'string', 'in:CORRENTE,POUPANCA,PAGAMENTO'],
            'contas_financeiras.*.pix_chave' => ['nullable', 'string', 'max:255'],
            'contas_financeiras.*.principal' => ['sometimes', 'boolean'],
            'contas_financeiras.*.ativa' => ['sometimes', 'boolean'],
            'contas_financeiras.*.ordem' => ['nullable', 'integer', 'min:0'],
            'contas_financeiras.*.saldo_abertura' => ['nullable', 'numeric'],
            'contas_financeiras.*.saldo_abertura_em' => ['nullable', 'date'],
            'contas_financeiras.*.observacao' => ['nullable', 'string', 'max:255'],
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
