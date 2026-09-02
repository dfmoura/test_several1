<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\OrcCatalogoAcabamento;
use App\Models\OrcCatalogoMaquina;
use App\Models\OrcCatalogoPapel;
use App\Models\OrcCatalogoTipoTroca;
use App\Services\Comercial\Orcamento\OrcamentoCatalogoAdminService;
use App\Support\PadraoDecimal;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class OrcamentoCatalogoController extends Controller
{
    public function __construct(private readonly OrcamentoCatalogoAdminService $service) {}

    public function resumo(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        return response()->json(['data' => $this->service->resumo()]);
    }

    public function seed(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        $data = $request->validate([
            'force' => ['sometimes', 'boolean'],
        ]);

        $result = $this->service->seedFromJson(forceOverwrite: (bool) ($data['force'] ?? false));

        return response()->json([
            'ok' => true,
            'data' => $result,
            'resumo' => $this->service->resumo(),
        ]);
    }

    public function papeis(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        return response()->json(['data' => $this->service->listPapeis()]);
    }

    public function storePapel(Request $request): JsonResponse
    {
        $this->authorizeManage($request);
        $data = $request->validate([
            'nome' => ['required', 'string', 'min:2', 'max:160'],
            'preco_m2' => ['required', 'numeric', 'min:0', 'max:999999'],
            'ativo' => ['sometimes', 'boolean'],
            'ordem' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        return response()->json(['data' => $this->service->createPapel($data)], 201);
    }

    public function updatePapel(Request $request, OrcCatalogoPapel $papel): JsonResponse
    {
        $this->authorizeManage($request);
        $data = $request->validate([
            'nome' => ['sometimes', 'string', 'min:2', 'max:160'],
            'preco_m2' => ['sometimes', 'numeric', 'min:0', 'max:999999'],
            'ativo' => ['sometimes', 'boolean'],
            'ordem' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        return response()->json(['data' => $this->service->updatePapel($papel, $data)]);
    }

    public function acabamentos(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        return response()->json(['data' => $this->service->listAcabamentos()]);
    }

    public function storeAcabamento(Request $request): JsonResponse
    {
        $this->authorizeManage($request);
        $data = $request->validate([
            'nome' => ['required', 'string', 'min:2', 'max:160'],
            'preco_m2' => ['required', 'numeric', 'min:0', 'max:999999'],
            'perda_m2' => ['sometimes', 'numeric', 'min:0', 'max:999999'],
            'ativo' => ['sometimes', 'boolean'],
            'ordem' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        return response()->json(['data' => $this->service->createAcabamento($data)], 201);
    }

    public function updateAcabamento(Request $request, OrcCatalogoAcabamento $acabamento): JsonResponse
    {
        $this->authorizeManage($request);
        $data = $request->validate([
            'nome' => ['sometimes', 'string', 'min:2', 'max:160'],
            'preco_m2' => ['sometimes', 'numeric', 'min:0', 'max:999999'],
            'perda_m2' => ['sometimes', 'numeric', 'min:0', 'max:999999'],
            'ativo' => ['sometimes', 'boolean'],
            'ordem' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        return response()->json(['data' => $this->service->updateAcabamento($acabamento, $data)]);
    }

    public function tiposTroca(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        return response()->json(['data' => $this->service->listTiposTroca()]);
    }

    public function storeTipoTroca(Request $request): JsonResponse
    {
        $this->authorizeManage($request);
        $data = $request->validate([
            'tipo' => ['required', 'string', 'min:2', 'max:160'],
            'tempo_h' => ['nullable', 'numeric', 'min:0', 'max:24'],
            'tempo_min' => ['nullable', 'numeric', 'min:0', 'max:1440'],
            'ativo' => ['sometimes', 'boolean'],
            'ordem' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);
        if (! array_key_exists('tempo_h', $data) && ! array_key_exists('tempo_min', $data)) {
            return response()->json([
                'message' => 'Informe tempo_h ou tempo_min.',
                'errors' => ['tempo_min' => ['Informe o tempo de parada.']],
            ], 422);
        }

        return response()->json(['data' => $this->service->createTipoTroca($data)], 201);
    }

    public function updateTipoTroca(Request $request, OrcCatalogoTipoTroca $tipoTroca): JsonResponse
    {
        $this->authorizeManage($request);
        $data = $request->validate([
            'tipo' => ['sometimes', 'string', 'min:2', 'max:160'],
            'tempo_h' => ['nullable', 'numeric', 'min:0', 'max:24'],
            'tempo_min' => ['nullable', 'numeric', 'min:0', 'max:1440'],
            'ativo' => ['sometimes', 'boolean'],
            'ordem' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        return response()->json(['data' => $this->service->updateTipoTroca($tipoTroca, $data)]);
    }

    public function maquinas(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        $empresa = app('empresa');
        $empresaId = $empresa instanceof \App\Models\Empresa ? $empresa->id : null;

        return response()->json(['data' => $this->service->listMaquinas(true, $empresaId)]);
    }

    public function storeMaquina(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        throw ValidationException::withMessages([
            'nome' => [
                'Grupo hora-máquina operacional nasce no Patrimônio (bem máquina gráfica). Reuse o grupo da mesma classe ou informe um nome novo no cadastro do bem. Esta tela só edita tarifas R$/h.',
            ],
        ]);
    }

    public function updateMaquina(Request $request, OrcCatalogoMaquina $maquina): JsonResponse
    {
        $this->authorizeManage($request);
        $data = $request->validate([
            'nome' => ['sometimes', 'string', 'min:1', 'max:80'],
            'ativo' => ['sometimes', 'boolean'],
            'ordem' => ['sometimes', 'integer', 'min:0', 'max:9999'],
            'tarifas' => ['sometimes', 'array'],
            'tarifas.*' => ['numeric', 'min:0', 'max:999999'],
        ]);

        return response()->json(['data' => $this->service->updateMaquina($maquina, $data)]);
    }

    public function parametros(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        return response()->json(['data' => $this->service->listParametros()]);
    }

    public function updateParametro(Request $request, string $chave): JsonResponse
    {
        $this->authorizeManage($request);
        $data = $request->validate([
            'valor' => ['sometimes', 'numeric', 'min:0', 'max:999999'],
            'ativo' => ['sometimes', 'boolean'],
            'rotulo' => ['sometimes', 'string', 'min:2', 'max:160'],
            'unidade' => ['sometimes', 'nullable', 'string', 'max:32'],
            'ordem' => ['sometimes', 'integer', 'min:0', 'max:9999'],
        ]);

        return response()->json(['data' => $this->service->updateParametro($chave, $data)]);
    }

    public function estruturas(Request $request): JsonResponse
    {
        $this->authorizeManage($request);

        return response()->json(['data' => $this->service->listEstruturas()]);
    }

    public function updateEstrutura(Request $request, string $chave): JsonResponse
    {
        $this->authorizeManage($request);
        $data = $request->validate([
            'payload' => ['required', 'array'],
        ]);

        return response()->json(['data' => $this->service->updateEstrutura($chave, $data)]);
    }

    public function regras(Request $request): JsonResponse
    {
        $user = $request->user();
        if (! $user->can('orcamento.catalogo.gerir') && ! $user->can('orcamento.ler')) {
            abort(403, 'Permissão orcamento.ler ou orcamento.catalogo.gerir necessária.');
        }

        return response()->json(['data' => $this->service->regrasComParametros()]);
    }

    private function authorizeManage(Request $request): void
    {
        if (! $request->user()->can('orcamento.catalogo.gerir')) {
            abort(403, 'Permissão orcamento.catalogo.gerir necessária.');
        }
    }
}
