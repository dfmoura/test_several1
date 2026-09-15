<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\ProdutoFornecedorCodigo;
use App\Services\Fiscal\NfeCompraExtractor;
use Illuminate\Http\UploadedFile;
use Illuminate\Validation\ValidationException;
use Throwable;

/**
 * Cadastro de SKU + de-para a partir do XML da NF-e de compra.
 *
 * Não lança estoque. Não cria OC. Reusa NfeCompraExtractor + ProdutoFromNfeItemService.
 */
class ProdutoFromNfeXmlService
{
    public const MAX_FILE_KB = 5120;

    public const MAX_COMMIT_ITEMS = 80;

    public function __construct(
        private readonly NfeCompraExtractor $extractor,
        private readonly ProdutoFromNfeItemService $fromNfeItem,
    ) {}

    /**
     * @return array{
     *   chave_nfe: ?string,
     *   numero: ?string,
     *   serie: ?string,
     *   data_emissao: ?string,
     *   emit: array<string, mixed>,
     *   fornecedor: ?array<string, mixed>,
     *   itens: list<array<string, mixed>>,
     *   total_dets: int,
     *   total_cprods: int
     * }
     */
    public function preview(Empresa $empresa, UploadedFile $file): array
    {
        $xml = $this->readXmlFile($file);
        try {
            $compra = $this->extractor->extractCompra($xml);
        } catch (\InvalidArgumentException $e) {
            throw ValidationException::withMessages([
                'file' => [$e->getMessage()],
            ]);
        }

        $emit = $compra['emit'] ?? [];
        $cnpj = $this->digits((string) ($emit['cnpj_cpf'] ?? ''));
        $fornecedor = $this->resolveFornecedorByCnpj($empresa, $cnpj);

        $agrupados = $this->agruparItensPorCProd($compra['itens'] ?? []);
        $itens = [];
        foreach ($agrupados as $grupo) {
            $payload = [
                'c_prod' => $grupo['c_prod'],
                'x_prod' => $grupo['x_prod'],
                'ncm' => $grupo['ncm'],
                'u_com' => $grupo['u_com'],
                'origem' => $grupo['origem'],
                'fornecedor_id' => $fornecedor?->id,
                'fornecedor_cnpj' => $cnpj !== '' ? $cnpj : null,
            ];

            $itemPreview = $this->fromNfeItem->preview($empresa, $payload);
            $existente = $this->findDeparaExistente($empresa, $fornecedor, $grupo['c_prod']);

            $itens[] = [
                'n_item' => $grupo['n_item'],
                'c_prod' => $grupo['c_prod'],
                'x_prod' => $grupo['x_prod'],
                'ncm' => $grupo['ncm'],
                'u_com' => $grupo['u_com'],
                'origem' => $grupo['origem'],
                'qtd_dets' => $grupo['qtd_dets'],
                'sugestao' => $itemPreview['sugestao'],
                'status' => $existente ? 'ja_cadastrado' : 'novo',
                'produto_existente' => $existente,
            ];
        }

        return [
            'chave_nfe' => $compra['chave_nfe'] ?? null,
            'numero' => $compra['numero'] ?? null,
            'serie' => $compra['serie'] ?? null,
            'data_emissao' => $compra['data_emissao'] ?? null,
            'emit' => $emit,
            'fornecedor' => $fornecedor ? [
                'id' => $fornecedor->id,
                'codigo' => $fornecedor->codigo,
                'razao_social' => $fornecedor->razao_social,
                'nome_fantasia' => $fornecedor->nome_fantasia,
                'cnpj_cpf' => $fornecedor->cnpj_cpf,
            ] : null,
            'itens' => $itens,
            'total_dets' => count($compra['itens'] ?? []),
            'total_cprods' => count($itens),
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $items
     * @return array{
     *   total: int,
     *   criados: int,
     *   ignorados: int,
     *   falhas: int,
     *   rows: list<array<string, mixed>>
     * }
     */
    public function commit(Empresa $empresa, array $items): array
    {
        if (count($items) > self::MAX_COMMIT_ITEMS) {
            throw ValidationException::withMessages([
                'items' => ['O lote excede o limite de '.self::MAX_COMMIT_ITEMS.' itens.'],
            ]);
        }

        $rows = [];
        $criados = 0;
        $ignorados = 0;
        $falhas = 0;

        foreach ($items as $index => $raw) {
            $line = $index + 1;
            $acao = (string) ($raw['acao'] ?? 'criar');

            if ($acao === 'pular') {
                $ignorados++;
                $rows[] = [
                    'line' => $line,
                    'status' => 'ignorado',
                    'c_prod' => $raw['c_prod'] ?? null,
                    'errors' => [],
                ];

                continue;
            }

            try {
                $payload = $this->normalizeCommitItem($raw);
                $result = $this->fromNfeItem->create($empresa, $payload);
                $criados++;
                $rows[] = [
                    'line' => $line,
                    'status' => 'criado',
                    'c_prod' => $payload['c_prod'],
                    'produto_id' => $result['produto']->id,
                    'produto_codigo' => $result['produto']->codigo,
                    'depara' => $result['depara']?->c_prod,
                    'errors' => [],
                ];
            } catch (ValidationException $e) {
                $falhas++;
                $rows[] = [
                    'line' => $line,
                    'status' => 'erro',
                    'c_prod' => $raw['c_prod'] ?? null,
                    'errors' => $this->flattenValidation($e),
                ];
            } catch (Throwable $e) {
                $falhas++;
                $rows[] = [
                    'line' => $line,
                    'status' => 'erro',
                    'c_prod' => $raw['c_prod'] ?? null,
                    'errors' => [$e->getMessage()],
                ];
            }
        }

        return [
            'total' => count($items),
            'criados' => $criados,
            'ignorados' => $ignorados,
            'falhas' => $falhas,
            'rows' => $rows,
        ];
    }

    private function readXmlFile(UploadedFile $file): string
    {
        $ext = strtolower((string) $file->getClientOriginalExtension());
        if ($ext !== '' && $ext !== 'xml') {
            throw ValidationException::withMessages([
                'file' => ['Envie um arquivo .xml da NF-e.'],
            ]);
        }

        $content = @file_get_contents($file->getRealPath() ?: '');
        if ($content === false || trim($content) === '') {
            throw ValidationException::withMessages([
                'file' => ['Não foi possível ler o XML.'],
            ]);
        }

        return $content;
    }

    /**
     * @param  list<array<string, mixed>>  $itens
     * @return list<array{
     *   n_item: int|string|null,
     *   c_prod: string,
     *   x_prod: ?string,
     *   ncm: ?string,
     *   u_com: ?string,
     *   origem: int|null,
     *   qtd_dets: int
     * }>
     */
    private function agruparItensPorCProd(array $itens): array
    {
        $map = [];
        foreach ($itens as $item) {
            $cProd = trim((string) ($item['c_prod'] ?? ''));
            if ($cProd === '') {
                continue;
            }
            $key = mb_strtoupper($cProd);
            if (! isset($map[$key])) {
                $orig = $item['orig'] ?? null;
                $map[$key] = [
                    'n_item' => $item['n_item'] ?? null,
                    'c_prod' => $cProd,
                    'x_prod' => isset($item['x_prod']) ? (string) $item['x_prod'] : null,
                    'ncm' => isset($item['ncm']) ? (string) $item['ncm'] : null,
                    'u_com' => isset($item['u_com']) ? (string) $item['u_com'] : null,
                    'origem' => $orig !== null && $orig !== '' ? (int) $orig : null,
                    'qtd_dets' => 1,
                ];
            } else {
                $map[$key]['qtd_dets']++;
            }
        }

        return array_values($map);
    }

    private function resolveFornecedorByCnpj(Empresa $empresa, string $cnpj): ?Parceiro
    {
        if ($cnpj === '') {
            return null;
        }

        return Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where('papel_fornecedor', true)
            ->get()
            ->first(function (Parceiro $p) use ($cnpj) {
                return $this->digits((string) $p->cnpj_cpf) === $cnpj;
            });
    }

    /**
     * @return array{id: int, codigo: string, descricao: ?string}|null
     */
    private function findDeparaExistente(Empresa $empresa, ?Parceiro $fornecedor, string $cProd): ?array
    {
        if ($fornecedor === null) {
            return null;
        }

        $row = ProdutoFornecedorCodigo::query()
            ->with('produto:id,codigo,descricao_comercial,descricao_fiscal')
            ->where('empresa_id', $empresa->id)
            ->where('fornecedor_id', $fornecedor->id)
            ->whereRaw('UPPER(c_prod) = ?', [mb_strtoupper(trim($cProd))])
            ->first();

        if (! $row || ! $row->produto) {
            return null;
        }

        return [
            'id' => $row->produto->id,
            'codigo' => $row->produto->codigo,
            'descricao' => $row->produto->descricao_comercial ?? $row->produto->descricao_fiscal,
        ];
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return array<string, mixed>
     */
    private function normalizeCommitItem(array $raw): array
    {
        return [
            'c_prod' => trim((string) ($raw['c_prod'] ?? '')),
            'x_prod' => isset($raw['x_prod']) ? trim((string) $raw['x_prod']) : null,
            'ncm' => isset($raw['ncm']) ? trim((string) $raw['ncm']) : null,
            'u_com' => isset($raw['u_com']) ? trim((string) $raw['u_com']) : null,
            'origem' => array_key_exists('origem', $raw) && $raw['origem'] !== null && $raw['origem'] !== ''
                ? (int) $raw['origem']
                : null,
            'fornecedor_id' => isset($raw['fornecedor_id']) ? (int) $raw['fornecedor_id'] : null,
            'fornecedor_cnpj' => isset($raw['fornecedor_cnpj']) ? trim((string) $raw['fornecedor_cnpj']) : null,
            'familia' => isset($raw['familia']) ? trim((string) $raw['familia']) : null,
            'grupo' => isset($raw['grupo']) ? trim((string) $raw['grupo']) : null,
            'descricao_fiscal' => isset($raw['descricao_fiscal']) ? trim((string) $raw['descricao_fiscal']) : null,
            'descricao_comercial' => isset($raw['descricao_comercial']) ? trim((string) $raw['descricao_comercial']) : null,
            'unidade_comercial' => isset($raw['unidade_comercial']) ? trim((string) $raw['unidade_comercial']) : null,
            'unidade_interna' => isset($raw['unidade_interna']) ? trim((string) $raw['unidade_interna']) : null,
            'programa_compra' => isset($raw['programa_compra']) ? trim((string) $raw['programa_compra']) : null,
            'gravar_depara' => array_key_exists('gravar_depara', $raw) ? (bool) $raw['gravar_depara'] : true,
            'forcar_depara' => array_key_exists('forcar_depara', $raw) ? (bool) $raw['forcar_depara'] : false,
        ];
    }

    /**
     * @return list<string>
     */
    private function flattenValidation(ValidationException $e): array
    {
        $out = [];
        foreach ($e->errors() as $messages) {
            foreach ($messages as $msg) {
                $out[] = (string) $msg;
            }
        }

        return $out !== [] ? $out : ['Validação falhou.'];
    }

    private function digits(string $value): string
    {
        return preg_replace('/\D/', '', $value) ?? '';
    }
}
