<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Models\ProdutoFornecedorCodigo;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

/**
 * Cria SKU operacional + de-para cProd a partir de uma linha de NF-e.
 *
 * Não lança estoque. Não cria OC. Preserva EstoqueSaldoWriter / assist XML.
 */
class ProdutoFromNfeItemService
{
    public function __construct(
        private readonly ProdutoNfeItemSugestor $sugestor,
        private readonly ProdutoService $produtoService,
        private readonly ProdutoFornecedorCodigoService $deParaService,
        private readonly ProdutoGrupoService $produtoGrupoService,
    ) {}

    /**
     * @param  array{
     *   c_prod: string,
     *   x_prod?: ?string,
     *   ncm?: ?string,
     *   u_com?: ?string,
     *   origem?: int|string|null,
     *   fornecedor_id?: int|string|null,
     *   fornecedor_cnpj?: ?string,
     *   familia?: ?string,
     *   grupo?: ?string,
     *   descricao_fiscal?: ?string,
     *   descricao_comercial?: ?string,
     *   unidade_comercial?: ?string,
     *   unidade_interna?: ?string,
     *   programa_compra?: ?string,
     *   gravar_depara?: bool,
     *   forcar_depara?: bool
     * }  $data
     * @return array{sugestao: array<string, mixed>, produto?: Produto, depara?: ?ProdutoFornecedorCodigo}
     */
    public function preview(Empresa $empresa, array $data): array
    {
        $sugestao = $this->sugestor->sugerir($data);
        $this->aplicarOverrides($sugestao, $data);
        $fornecedor = $this->resolveFornecedor($empresa, $data, required: false);

        return [
            'sugestao' => $sugestao,
            'fornecedor' => $fornecedor ? [
                'id' => $fornecedor->id,
                'codigo' => $fornecedor->codigo,
                'razao_social' => $fornecedor->razao_social,
                'nome_fantasia' => $fornecedor->nome_fantasia,
                'cnpj_cpf' => $fornecedor->cnpj_cpf,
            ] : null,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{sugestao: array<string, mixed>, produto: Produto, depara: ?ProdutoFornecedorCodigo}
     */
    public function create(Empresa $empresa, array $data): array
    {
        $preview = $this->preview($empresa, $data);
        $sugestao = $preview['sugestao'];

        $cProd = trim((string) ($data['c_prod'] ?? ''));
        if ($cProd === '') {
            throw ValidationException::withMessages([
                'c_prod' => ['Informe o cProd da NF-e (código no fornecedor).'],
            ]);
        }

        $gravarDepara = array_key_exists('gravar_depara', $data)
            ? (bool) $data['gravar_depara']
            : (bool) $sugestao['depara_recomendado'];
        $forcarDepara = (bool) ($data['forcar_depara'] ?? false);

        if ($gravarDepara && $sugestao['cprod_generico'] && ! $forcarDepara) {
            throw ValidationException::withMessages([
                'c_prod' => ['cProd genérico — desmarque o de-para ou confirme com forcar_depara.'],
            ]);
        }

        $fornecedor = $this->resolveFornecedor($empresa, $data, required: $gravarDepara);

        $this->produtoGrupoService->seedCatalog();

        return DB::transaction(function () use ($empresa, $data, $sugestao, $fornecedor, $gravarDepara, $cProd) {
            $payload = [
                'familia' => $sugestao['familia'],
                'grupo' => $sugestao['grupo'],
                'descricao_fiscal' => $sugestao['descricao_fiscal'],
                'descricao_comercial' => $sugestao['descricao_comercial'],
                'ncm' => $sugestao['ncm'],
                'origem' => $sugestao['origem'] ?? 0,
                'unidade_comercial' => $sugestao['unidade_comercial'],
                'unidade_interna' => $sugestao['unidade_interna'],
                'fator_conversao' => $sugestao['fator_conversao'],
            ];

            if (! empty($sugestao['programa_compra'])) {
                $payload['atributos'] = [
                    'programa_compra' => $sugestao['programa_compra'],
                    'camada_cadastro' => 'A',
                    'origem_pendente_xml' => false,
                ];
            } else {
                $payload['atributos'] = [
                    'camada_cadastro' => 'A',
                    'origem_pendente_xml' => false,
                ];
            }

            $produto = $this->produtoService->create($empresa, $payload);

            $depara = null;
            if ($gravarDepara) {
                $depara = $this->deParaService->create($produto, [
                    'fornecedor_id' => $fornecedor->id,
                    'c_prod' => $cProd,
                    'x_prod' => $data['x_prod'] ?? $sugestao['descricao_fiscal'],
                ]);
            }

            $produto->loadMissing([
                ...Produto::userStampWith(),
                'fornecedorCodigos.fornecedor:id,codigo,razao_social,nome_fantasia,cnpj_cpf',
                'grupoCatalogo',
            ]);

            return [
                'sugestao' => $sugestao,
                'produto' => $produto,
                'depara' => $depara,
            ];
        });
    }

    /**
     * @param  array<string, mixed>  $sugestao
     * @param  array<string, mixed>  $data
     */
    private function aplicarOverrides(array &$sugestao, array $data): void
    {
        foreach (['familia', 'grupo', 'descricao_fiscal', 'descricao_comercial', 'unidade_comercial', 'unidade_interna', 'ncm'] as $key) {
            if (! array_key_exists($key, $data) || $data[$key] === null || $data[$key] === '') {
                continue;
            }
            $value = is_string($data[$key]) ? trim($data[$key]) : $data[$key];
            if (in_array($key, ['familia', 'grupo', 'unidade_comercial', 'unidade_interna', 'ncm', 'descricao_fiscal', 'descricao_comercial'], true)) {
                $value = is_string($value) ? mb_strtoupper($value) : $value;
            }
            if ($key === 'ncm') {
                $value = preg_replace('/\D/', '', (string) $value) ?? '';
            }
            $sugestao[$key] = $value;
        }

        if (! empty($data['programa_compra'])) {
            $sugestao['programa_compra'] = mb_strtoupper(trim((string) $data['programa_compra']));
        }

        if (isset($data['unidade_comercial'], $data['unidade_interna'])
            && $sugestao['unidade_comercial'] === $sugestao['unidade_interna']) {
            $sugestao['fator_conversao'] = '1';
        }

        // Re-resolve família se só o grupo foi forçado.
        if (! empty($data['grupo']) && empty($data['familia'])) {
            $g = ProdutoGrupo::query()->where('codigo', $sugestao['grupo'])->first();
            if ($g) {
                $sugestao['familia'] = $g->familia;
            }
        }
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function resolveFornecedor(Empresa $empresa, array $data, bool $required): ?Parceiro
    {
        $id = isset($data['fornecedor_id']) ? (int) $data['fornecedor_id'] : 0;
        if ($id > 0) {
            $fornecedor = Parceiro::query()
                ->where('empresa_id', $empresa->id)
                ->where('papel_fornecedor', true)
                ->whereKey($id)
                ->first();
            if (! $fornecedor) {
                throw ValidationException::withMessages([
                    'fornecedor_id' => ['Fornecedor não encontrado nesta empresa.'],
                ]);
            }

            return $fornecedor;
        }

        $cnpj = preg_replace('/\D/', '', (string) ($data['fornecedor_cnpj'] ?? '')) ?? '';
        if ($cnpj !== '') {
            $fornecedor = Parceiro::query()
                ->where('empresa_id', $empresa->id)
                ->where('papel_fornecedor', true)
                ->get()
                ->first(function (Parceiro $p) use ($cnpj) {
                    return preg_replace('/\D/', '', (string) $p->cnpj_cpf) === $cnpj;
                });
            if (! $fornecedor) {
                throw ValidationException::withMessages([
                    'fornecedor_cnpj' => ['Nenhum fornecedor com este CNPJ na empresa ativa.'],
                ]);
            }

            return $fornecedor;
        }

        if ($required) {
            throw ValidationException::withMessages([
                'fornecedor_id' => ['Informe o fornecedor (id ou CNPJ) para gravar o de-para.'],
            ]);
        }

        return null;
    }
}
