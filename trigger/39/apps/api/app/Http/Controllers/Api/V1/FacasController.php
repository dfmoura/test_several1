<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Services\Comercial\FacasMapaService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class FacasController extends Controller
{
    public function __construct(private readonly FacasMapaService $facasMapaService) {}

    public function resumo(Request $request): JsonResponse
    {
        $this->authorizeLer($request);

        return response()->json(['data' => $this->facasMapaService->resumo()]);
    }

    public function index(Request $request): JsonResponse
    {
        // Qualquer usuário autenticado no contexto (mesmo padrão do 36 / FacaPicker).
        if (! $request->user()) {
            abort(401);
        }

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'medida' => ['nullable', 'string', 'max:64'],
            'maquina' => ['nullable', 'string', 'max:64'],
            'formato' => ['nullable', 'string', 'max:64'],
            'so_completas' => ['nullable', 'boolean'],
            'completas' => ['nullable', 'boolean'],
            'incluir_inativas' => ['nullable', 'boolean'],
            'ativo' => ['nullable', 'boolean'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:800'],
        ]);

        foreach (['so_completas', 'completas', 'incluir_inativas', 'ativo'] as $flag) {
            if ($request->has($flag)) {
                $validated[$flag] = filter_var($request->query($flag), FILTER_VALIDATE_BOOLEAN, FILTER_NULL_ON_FAILURE);
            }
        }

        // Gestão (mapa Comercial): inativas só com orcamento.ler explícito + flag.
        if (! empty($validated['incluir_inativas']) || array_key_exists('ativo', $validated)) {
            $this->authorizeLer($request);
        }

        $data = $this->facasMapaService->list($validated);

        return response()->json($data);
    }

    public function show(Request $request, int $faca): JsonResponse
    {
        if (! $request->user()) {
            abort(401);
        }

        $row = $this->facasMapaService->find($faca);
        if (! $row) {
            abort(404, 'Faca não encontrada no mapa.');
        }

        // Inativas só para quem lê o mapa comercial.
        if (array_key_exists('ativo', $row) && $row['ativo'] === false) {
            $this->authorizeLer($request);
        }

        return response()->json(['data' => $row]);
    }

    public function store(Request $request): JsonResponse
    {
        $this->authorizeEscrever($request);

        $data = $request->validate([
            'medida' => ['required', 'string', 'max:64'],
            'formato' => ['required', 'string', 'max:64'],
            'faca' => ['nullable', 'string', 'max:64'],
            'maquina_catalogo' => ['required', 'string', 'max:64'],
            'maquina_origem' => ['nullable', 'string', 'max:64'],
            'puxada' => ['nullable', 'numeric', 'gt:0'],
            'z' => ['nullable', 'numeric', 'gte:0'],
            'repeticao' => ['nullable', 'numeric', 'gte:0'],
            'largura_faca' => ['nullable', 'numeric', 'gt:0'],
            'diametro_cm' => ['nullable', 'numeric', 'gt:0'],
            'tamanho_raw' => ['nullable', 'string', 'max:64'],
            'tamanho_tipo' => ['nullable', 'string', 'max:32'],
            'n_facas' => ['nullable', 'integer', 'min:0'],
            'cilindro' => ['nullable', 'string', 'max:32'],
            'colunas_mapa' => ['nullable', 'string', 'max:64'],
            'conjugada' => ['nullable', 'string', 'max:160'],
            'fornecedor' => ['nullable', 'string', 'max:120'],
            'cliente_nota' => ['nullable', 'string', 'max:255'],
            'completa' => ['nullable', 'boolean'],
        ]);

        $created = $this->facasMapaService->create($data);

        return response()->json(['data' => $created], 201);
    }

    public function setAtivo(Request $request, int $faca): JsonResponse
    {
        $this->authorizeEscrever($request);

        $data = $request->validate([
            'ativo' => ['required', 'boolean'],
        ]);

        $row = $this->facasMapaService->setAtivo($faca, (bool) $data['ativo']);

        return response()->json(['data' => $row]);
    }

    public function seed(Request $request): JsonResponse
    {
        $this->authorizeEscrever($request);

        $data = $request->validate([
            'force' => ['nullable', 'boolean'],
        ]);

        $result = $this->facasMapaService->seedFromJson(
            forceOverwrite: (bool) ($data['force'] ?? false),
        );

        return response()->json([
            'data' => $result,
            'resumo' => $this->facasMapaService->resumo(),
        ]);
    }

    private function authorizeLer(Request $request): void
    {
        if (! $request->user()?->can('orcamento.ler')) {
            abort(403, 'Permissão orcamento.ler necessária.');
        }
    }

    private function authorizeEscrever(Request $request): void
    {
        if (! $request->user()?->can('orcamento.escrever')) {
            abort(403, 'Permissão orcamento.escrever necessária.');
        }
    }
}
