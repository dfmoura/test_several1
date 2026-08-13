<?php

namespace App\Http\Controllers\Api\V1;

use App\Http\Controllers\Controller;
use App\Models\Empresa;
use App\Services\Cadastros\DepartamentoService;
use App\Services\Cadastros\FatorConversaoSugeridor;
use App\Services\Cadastros\NaturezaGerencialService;
use App\Services\Cadastros\ProdutoGrupoService;
use App\Services\Consulta\BrasilApiClient;
use App\Services\Consulta\FiscalCatalogService;
use Illuminate\Http\Client\RequestException;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class ConsultaController extends Controller
{
    public function __construct(
        private readonly BrasilApiClient $brasilApiClient,
        private readonly FiscalCatalogService $fiscalCatalogService,
        private readonly ProdutoGrupoService $produtoGrupoService,
        private readonly NaturezaGerencialService $naturezaGerencialService,
        private readonly DepartamentoService $departamentoService,
    ) {}

    public function cnpj(string $cnpj): JsonResponse
    {
        try {
            return response()->json(['data' => $this->brasilApiClient->getCnpj($cnpj)]);
        } catch (\InvalidArgumentException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (RequestException $e) {
            return response()->json(['message' => 'Consulta CNPJ indisponível.'], $e->response?->status() ?? 502);
        }
    }

    public function cep(string $cep): JsonResponse
    {
        try {
            return response()->json(['data' => $this->brasilApiClient->getCep($cep)]);
        } catch (\InvalidArgumentException|\RuntimeException $e) {
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (RequestException $e) {
            return response()->json(['message' => 'Consulta CEP indisponível.'], $e->response?->status() ?? 502);
        }
    }

    public function bancos(): JsonResponse
    {
        try {
            return response()->json(['data' => $this->brasilApiClient->getBanks()]);
        } catch (RequestException $e) {
            return response()->json(['message' => 'Consulta de bancos indisponível.'], $e->response?->status() ?? 502);
        }
    }

    public function ncm(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:40'],
        ]);

        $data = $this->fiscalCatalogService->searchNcm(
            $validated['q'] ?? null,
            (int) ($validated['limit'] ?? 20)
        );

        return response()->json(['data' => $data]);
    }

    public function cest(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'ncm' => ['nullable', 'string', 'max:8'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:40'],
        ]);

        $data = $this->fiscalCatalogService->searchCest(
            $validated['q'] ?? null,
            $validated['ncm'] ?? null,
            (int) ($validated['limit'] ?? 20)
        );

        return response()->json(['data' => $data]);
    }

    public function csosn(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:40'],
        ]);

        $data = $this->fiscalCatalogService->searchCsosn(
            $validated['q'] ?? null,
            (int) ($validated['limit'] ?? 20)
        );

        return response()->json(['data' => $data]);
    }

    public function cfop(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'tipo' => ['nullable', 'string', 'in:ENTRADA,SAIDA,entrada,saida'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:40'],
        ]);

        $tipo = isset($validated['tipo']) ? strtoupper($validated['tipo']) : null;

        $data = $this->fiscalCatalogService->searchCfop(
            $validated['q'] ?? null,
            $tipo,
            (int) ($validated['limit'] ?? 20)
        );

        return response()->json(['data' => $data]);
    }

    public function cstIcms(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:40'],
        ]);

        return response()->json([
            'data' => $this->fiscalCatalogService->searchCstIcms(
                $validated['q'] ?? null,
                (int) ($validated['limit'] ?? 20)
            ),
        ]);
    }

    public function cstPisCofins(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:40'],
        ]);

        return response()->json([
            'data' => $this->fiscalCatalogService->searchCstPisCofins(
                $validated['q'] ?? null,
                (int) ($validated['limit'] ?? 20)
            ),
        ]);
    }

    public function cstCbs(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:40'],
        ]);

        return response()->json([
            'data' => $this->fiscalCatalogService->searchCstCbs(
                $validated['q'] ?? null,
                (int) ($validated['limit'] ?? 20)
            ),
        ]);
    }

    public function cClassTrib(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
            'limit' => ['nullable', 'integer', 'min:1', 'max:40'],
        ]);

        return response()->json([
            'data' => $this->fiscalCatalogService->searchCClassTrib(
                $validated['q'] ?? null,
                (int) ($validated['limit'] ?? 20)
            ),
        ]);
    }

    public function tiposItemSped(): JsonResponse
    {
        return response()->json(['data' => $this->fiscalCatalogService->tiposItemSped()]);
    }

    public function origensMercadoria(): JsonResponse
    {
        return response()->json(['data' => $this->fiscalCatalogService->origens()]);
    }

    public function unidadesMedida(): JsonResponse
    {
        return response()->json(['data' => $this->fiscalCatalogService->unidadesMedida()]);
    }

    public function fatorConversao(Request $request, FatorConversaoSugeridor $sugeridor): JsonResponse
    {
        $validated = $request->validate([
            'de' => ['nullable', 'string', 'max:8'],
            'para' => ['nullable', 'string', 'max:8'],
            'largura_mm' => ['nullable', 'string', 'max:32'],
            'comprimento_m' => ['nullable', 'string', 'max:32'],
            'gramatura_g_m2' => ['nullable', 'string', 'max:32'],
            'qtd_por_caixa' => ['nullable', 'string', 'max:32'],
            'densidade_g_ml' => ['nullable', 'string', 'max:32'],
            'metragem_por_milheiro' => ['nullable', 'string', 'max:32'],
        ]);

        $attrs = array_filter([
            'largura_mm' => $validated['largura_mm'] ?? null,
            'comprimento_m' => $validated['comprimento_m'] ?? null,
            'gramatura_g_m2' => $validated['gramatura_g_m2'] ?? null,
            'qtd_por_caixa' => $validated['qtd_por_caixa'] ?? null,
            'densidade_g_ml' => $validated['densidade_g_ml'] ?? null,
            'metragem_por_milheiro' => $validated['metragem_por_milheiro'] ?? null,
        ], fn ($v) => $v !== null && $v !== '');

        return response()->json([
            'data' => $sugeridor->sugerir(
                $validated['de'] ?? null,
                $validated['para'] ?? null,
                $attrs
            ),
        ]);
    }

    public function produtoGrupos(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'familia' => ['nullable', 'string', 'in:MP,EMB,REV,PA,SVC,FAC'],
            'natureza' => ['nullable', 'string', 'in:COMPRA,VENDA,AMBOS'],
            'todos' => ['nullable', 'boolean'],
        ]);

        $data = $this->produtoGrupoService->list(
            $validated['familia'] ?? null,
            $validated['natureza'] ?? null,
            ! ($validated['todos'] ?? false)
        );

        return response()->json(['data' => $data]);
    }

    /**
     * Folhas ativas de naturezas gerenciais (picker futuro TIT/BX).
     * Não confundir com /consulta/produto-grupos?natureza=COMPRA|VENDA.
     */
    public function naturezasGerenciais(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'grupo' => ['nullable', 'integer', 'min:1', 'max:5'],
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        $grupo = isset($validated['grupo']) ? (int) $validated['grupo'] : null;
        $data = $this->naturezaGerencialService
            ->folhasAtivas($grupo, $validated['q'] ?? null)
            ->map(fn ($n) => $this->naturezaGerencialService->toArray($n))
            ->values()
            ->all();

        return response()->json(['data' => $data]);
    }

    /**
     * Departamentos ativos da EMP (picker colaborador).
     * Não confundir com centro de custo (financeiro).
     */
    public function departamentos(Request $request): JsonResponse
    {
        $empresa = app('empresa');
        if (! $empresa instanceof Empresa) {
            abort(400, 'Empresa não selecionada.');
        }

        $validated = $request->validate([
            'q' => ['nullable', 'string', 'max:120'],
        ]);

        $data = $this->departamentoService->consultaAtivos($empresa, $validated['q'] ?? null);

        return response()->json(['data' => $data]);
    }
}
