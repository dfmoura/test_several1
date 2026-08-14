<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Parceiro;
use App\Services\Cadastros\ParceiroService;
use App\Support\OrigemLead;
use App\Support\ParceiroValidationRules;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ParceiroController extends Controller
{
    public function __construct(private readonly ParceiroService $parceiroService) {}

    public function index(Request $request): JsonResponse
    {
        $this->authorizeRead($request);

        $validated = $request->validate([
            'q' => ['nullable', 'string'],
            'papel' => ['nullable', 'string'],
        ]);

        $empresa = app('empresa');
        $data = $this->parceiroService->list($empresa, $validated['q'] ?? null, $validated['papel'] ?? null);

        return response()->json(['data' => $data]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeWrite($request);

        $data = $this->validateParceiro($request);
        $parceiro = $this->parceiroService->create(app('empresa'), $data);

        return response()->json(['data' => $parceiro], 201);
    }

    /**
     * Prospect mínimo inline no ORC (ORCAMENTO_PROSPECT).
     * Autorizado com parceiro.escrever OU orcamento.escrever.
     */
    public function prospectRapido(Request $request): JsonResponse
    {
        $this->authorizeProspectRapido($request);

        $validated = $request->validate([
            'nome' => ['required', 'string', 'max:255'],
            'whatsapp' => ['nullable', 'string', 'max:32'],
            'email' => ['nullable', 'email', 'max:255'],
            'cep' => ['nullable', 'string', 'max:10'],
            'logradouro' => ['nullable', 'string', 'max:255'],
            'numero' => ['nullable', 'string', 'max:32'],
            'complemento' => ['nullable', 'string', 'max:255'],
            'bairro' => ['nullable', 'string', 'max:255'],
            'municipio' => ['required', 'string', 'max:120'],
            'uf' => ['required', 'string', 'size:2'],
            'ibge' => ['nullable', 'string', 'max:7'],
            'cnpj_cpf' => ['nullable', 'string', 'max:18'],
            'origem_lead' => ['nullable', 'string', Rule::in(OrigemLead::OPCOES)],
            'forcar' => ['sometimes', 'boolean'],
        ]);

        if (empty($validated['whatsapp']) && empty($validated['email'])) {
            return response()->json([
                'message' => 'Informe WhatsApp ou e-mail (ao menos um canal).',
                'errors' => ['contato' => ['Informe WhatsApp ou e-mail (ao menos um canal).']],
            ], 422);
        }

        $empresa = app('empresa');
        $forcar = (bool) ($validated['forcar'] ?? false);

        if (! $forcar) {
            $candidatos = $this->parceiroService->buscarCandidatosDuplicados($empresa, [
                'nome' => $validated['nome'],
                'whatsapp' => $validated['whatsapp'] ?? null,
                'email' => $validated['email'] ?? null,
                'cnpj_cpf' => $validated['cnpj_cpf'] ?? null,
            ]);

            if ($candidatos !== []) {
                return response()->json([
                    'message' => 'Possíveis cadastros já existentes — reutilize ou confirme criação.',
                    'candidatos' => array_map(static fn (Parceiro $p) => [
                        'id' => $p->id,
                        'codigo' => $p->codigo,
                        'razao_social' => $p->razao_social,
                        'is_prospect' => (bool) $p->is_prospect,
                        'papel_cliente' => (bool) $p->papel_cliente,
                        'municipio' => $p->municipio,
                        'uf' => $p->uf,
                        'whatsapp' => $p->whatsapp,
                        'email' => $p->email,
                        'cnpj_cpf' => $p->cnpj_cpf,
                    ], $candidatos),
                ], 409);
            }
        }

        $parceiro = $this->parceiroService->createProspectRapido($empresa, $validated);

        return response()->json(['data' => $parceiro], 201);
    }

    public function show(Request $request, Parceiro $parceiro): JsonResponse
    {
        $this->authorizeRead($request);
        $this->assertEmpresa($parceiro);

        $parceiro->load(['contatos', 'contasBancarias', 'enderecosEntrega', 'fiscaisHistorico', 'departamentoRef', ...Parceiro::userStampWith()]);

        return response()->json(['data' => $parceiro]);
    }

    public function update(Request $request, Parceiro $parceiro): JsonResponse
    {
        $this->assertEmpresa($parceiro);

        $data = $this->validateParceiro($request, partial: true);

        if ($this->hasBancarioFields($data) && ! $request->user()->can('parceiro.bancario')) {
            abort(403, 'Permissão parceiro.bancario necessária.');
        }

        if ($this->hasCreditoFields($data) && ! $request->user()->can('credito.escrever')) {
            abort(403, 'Permissão credito.escrever necessária.');
        }

        if ($this->hasNonBancarioWrite($data) && ! $request->user()->can('parceiro.escrever')) {
            abort(403, 'Permissão parceiro.escrever necessária.');
        }

        $parceiro = $this->parceiroService->update($parceiro, $data);

        return response()->json(['data' => $parceiro]);
    }

    private function validateParceiro(Request $request, bool $partial = false): array
    {
        $validated = $request->validate(ParceiroValidationRules::rules($partial));

        // Completude fiscal é calculada no service — nunca confiar no cliente.
        unset($validated['cadastro_fiscal_completo']);

        return $validated;
    }

    private function authorizeRead(Request $request): void
    {
        if (! $request->user()->can('parceiro.ler') && ! $request->user()->can('orcamento.ler')) {
            abort(403);
        }
    }

    private function authorizeWrite(Request $request): void
    {
        if (! $request->user()->can('parceiro.escrever')) {
            abort(403);
        }
    }

    private function authorizeProspectRapido(Request $request): void
    {
        $user = $request->user();
        if (! $user->can('parceiro.escrever') && ! $user->can('orcamento.escrever')) {
            abort(403, 'Permissão parceiro.escrever ou orcamento.escrever necessária.');
        }
    }

    private function assertEmpresa(Parceiro $parceiro): void
    {
        if ($parceiro->empresa_id !== app('empresa')->id) {
            abort(404);
        }
    }

    private function hasBancarioFields(array $data): bool
    {
        return array_intersect(array_keys($data), ParceiroValidationRules::bancarioKeys()) !== [];
    }

    private function hasCreditoFields(array $data): bool
    {
        return array_intersect(array_keys($data), ParceiroValidationRules::creditoKeys()) !== [];
    }

    private function hasNonBancarioWrite(array $data): bool
    {
        $bancario = [
            'banco_codigo', 'banco_nome', 'agencia', 'conta', 'pix_chave',
            'limite_credito', 'contas_bancarias',
        ];

        return array_diff(array_keys($data), $bancario) !== [];
    }
}
