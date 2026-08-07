<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Produto;
use App\Models\ProdutoGrupo;
use App\Services\Audit\AuditLogger;
use App\Support\PadraoDecimal;
use App\Support\ProdutoValidationRules;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Throwable;

class ProdutoImportService
{
    public const MAX_ROWS = 500;

    /**
     * Colunas do modelo CSV — sem campos preenchidos automaticamente pelo catálogo de grupos.
     *
     * @var list<string>
     */
    public const TEMPLATE_HEADERS = [
        'codigo',
        'familia',
        'grupo',
        'descricao_fiscal',
        'descricao_comercial',
        'situacao',
        // Fiscais opcionais (override do grupo; exigem produto.fiscal):
        'ncm',
        'cest',
        'origem',
        'tipo_item_sped',
        'cfop_entrada_padrao',
        'cfop_saida_padrao',
        'csosn',
        'cst_icms',
        'cst_pis',
        'cst_cofins',
        'cst_cbs',
        'cclass_trib',
        'aliquota_cbs',
        // Unidades / conversão:
        'unidade_comercial',
        'unidade_interna',
        'fator_conversao',
        // Comercial:
        'preco_tabela',
        'estoque_minimo',
        'lead_time_dias',
        'gtin',
        // Atributos dimensionais (bobina / conversão) → JSON atributos:
        'largura_mm',
        'comprimento_m',
        'gramatura_g_m2',
        'fornecedor_sigla',
        'grupo_estoque',
    ];

    /**
     * Campos preenchidos pelo grupo canônico na simulação (se vazios no CSV).
     *
     * @var list<string>
     */
    public const GRUPO_AUTO_FIELDS = [
        'tipo_item_sped',
        'ncm',
        'unidade_comercial',
        'unidade_interna',
        'cfop_entrada_padrao',
        'cfop_saida_padrao',
    ];

    /** @var list<string> */
    private const FORBIDDEN_KEYS = [
        'id',
        'empresa_id',
        'grupo_id',
        'custo_medio',
        'created_at',
        'updated_at',
        'deleted_at',
    ];

    /** @var list<string> */
    private const ATTRIBUTE_FLAT_FIELDS = [
        'largura_mm',
        'comprimento_m',
        'gramatura_g_m2',
        'fornecedor_sigla',
        'grupo_estoque',
    ];

    public function __construct(
        private readonly ProdutoService $produtoService,
        private readonly ProdutoGrupoService $produtoGrupoService,
        private readonly AuditLogger $auditLogger,
    ) {}

    public function templateCsv(): string
    {
        $headers = self::TEMPLATE_HEADERS;
        $example = array_fill(0, count($headers), '');
        $map = array_flip($headers);

        $example[$map['familia']] = 'MP';
        $example[$map['grupo']] = 'MP-PAP';
        $example[$map['descricao_fiscal']] = 'PAPEL COUCHE AUTOADESIVO';
        $example[$map['descricao_comercial']] = 'Couché brilho 80g';
        $example[$map['situacao']] = 'ATIVO';
        $example[$map['fator_conversao']] = '12.5';
        $example[$map['largura_mm']] = '330';
        $example[$map['comprimento_m']] = '1000';
        $example[$map['gramatura_g_m2']] = '80';
        $example[$map['fornecedor_sigla']] = 'FAS';
        $example[$map['grupo_estoque']] = '10';

        $lines = [
            $this->csvLine($headers),
            $this->csvLine($example),
        ];

        return "\xEF\xBB\xBF".implode("\r\n", $lines)."\r\n";
    }

    /**
     * @return array{total: int, ok: int, erro: int, rows: list<array<string, mixed>>}
     */
    public function preview(Empresa $empresa, UploadedFile $file): array
    {
        $parsed = $this->parseCsvFile($file);
        $rows = $this->validateRows($empresa, $parsed);

        return $this->buildReport($rows);
    }

    /**
     * @param  list<array<string, mixed>>  $rawRows
     * @return array{total: int, criados: int, falhas: int, rows: list<array<string, mixed>>}
     */
    public function commit(Empresa $empresa, array $rawRows): array
    {
        if (count($rawRows) > self::MAX_ROWS) {
            throw ValidationException::withMessages([
                'rows' => ['O lote excede o limite de '.self::MAX_ROWS.' linhas.'],
            ]);
        }

        $results = [];
        $criados = 0;
        $falhas = 0;
        $createdIds = [];

        foreach (array_values($rawRows) as $index => $item) {
            $line = (int) ($item['line'] ?? ($index + 2));
            $data = is_array($item['data'] ?? null) ? $item['data'] : (is_array($item) ? $item : []);

            unset($data['line'], $data['status'], $data['errors'], $data['preview']);

            try {
                $validated = $this->validateSingleRow($empresa, $data, $line, []);
                if ($validated['status'] !== 'ok') {
                    $falhas++;
                    $results[] = [
                        'line' => $line,
                        'status' => 'erro',
                        'errors' => $validated['errors'],
                        'codigo' => $data['codigo'] ?? null,
                        'descricao_fiscal' => $data['descricao_fiscal'] ?? null,
                        'familia' => $data['familia'] ?? null,
                        'grupo' => $data['grupo'] ?? null,
                    ];
                    continue;
                }

                $payload = $validated['data'];
                $produto = $this->produtoService->create($empresa, $payload);
                $criados++;
                $createdIds[] = $produto->id;
                $results[] = [
                    'line' => $line,
                    'status' => 'criado',
                    'errors' => [],
                    'id' => $produto->id,
                    'codigo' => $produto->codigo,
                    'descricao_fiscal' => $produto->descricao_fiscal,
                    'familia' => $produto->familia,
                    'grupo' => $produto->grupo,
                ];
            } catch (Throwable $e) {
                $falhas++;
                $results[] = [
                    'line' => $line,
                    'status' => 'erro',
                    'errors' => [$this->exceptionMessage($e)],
                    'codigo' => $data['codigo'] ?? null,
                    'descricao_fiscal' => $data['descricao_fiscal'] ?? null,
                    'familia' => $data['familia'] ?? null,
                    'grupo' => $data['grupo'] ?? null,
                ];
            }
        }

        $this->auditLogger->log(
            'IMPORTAR',
            'produto',
            null,
            null,
            [
                'total' => count($rawRows),
                'criados' => $criados,
                'falhas' => $falhas,
                'ids' => $createdIds,
            ]
        );

        return [
            'total' => count($rawRows),
            'criados' => $criados,
            'falhas' => $falhas,
            'rows' => $results,
        ];
    }

    /**
     * @return list<array{line: int, raw: array<string, string>}>
     */
    public function parseCsvFile(UploadedFile $file): array
    {
        $path = $file->getRealPath();
        if ($path === false) {
            throw ValidationException::withMessages([
                'file' => ['Não foi possível ler o arquivo enviado.'],
            ]);
        }

        $handle = fopen($path, 'rb');
        if ($handle === false) {
            throw ValidationException::withMessages([
                'file' => ['Não foi possível abrir o arquivo CSV.'],
            ]);
        }

        try {
            $firstLine = fgets($handle);
            if ($firstLine === false) {
                throw ValidationException::withMessages([
                    'file' => ['Arquivo CSV vazio.'],
                ]);
            }

            $firstLine = $this->stripBom($firstLine);
            $delimiter = $this->detectDelimiter($firstLine);
            $headers = str_getcsv($firstLine, $delimiter);
            $normalizedHeaders = array_map(fn ($h) => $this->normalizeHeader((string) $h), $headers);

            $hasFamilia = in_array('familia', $normalizedHeaders, true);
            $hasGrupo = in_array('grupo', $normalizedHeaders, true) || in_array('grupo_id', $normalizedHeaders, true);
            $hasDescricao = in_array('descricao_fiscal', $normalizedHeaders, true);

            if (! $hasFamilia || ! $hasGrupo || ! $hasDescricao) {
                throw ValidationException::withMessages([
                    'file' => ['Informe as colunas familia, grupo e descricao_fiscal no cabeçalho.'],
                ]);
            }

            $rows = [];
            $lineNumber = 1;

            while (($values = fgetcsv($handle, 0, $delimiter)) !== false) {
                $lineNumber++;

                if ($this->isEmptyCsvRow($values)) {
                    continue;
                }

                $assoc = [];
                foreach ($normalizedHeaders as $i => $header) {
                    if ($header === '') {
                        continue;
                    }
                    $assoc[$header] = isset($values[$i]) ? trim((string) $values[$i]) : '';
                }

                $rows[] = [
                    'line' => $lineNumber,
                    'raw' => $assoc,
                ];

                if (count($rows) > self::MAX_ROWS) {
                    throw ValidationException::withMessages([
                        'file' => ['O arquivo excede o limite de '.self::MAX_ROWS.' linhas de dados.'],
                    ]);
                }
            }

            if ($rows === []) {
                throw ValidationException::withMessages([
                    'file' => ['Nenhuma linha de dados encontrada no CSV.'],
                ]);
            }

            return $rows;
        } finally {
            fclose($handle);
        }
    }

    /**
     * @param  list<array{line: int, raw: array<string, string>}>  $parsed
     * @return list<array<string, mixed>>
     */
    public function validateRows(Empresa $empresa, array $parsed): array
    {
        $seenCodigo = [];
        $results = [];

        foreach ($parsed as $item) {
            $line = $item['line'];
            $mapped = $this->mapRawRow($item['raw']);
            $result = $this->validateSingleRow($empresa, $mapped, $line, $seenCodigo);

            $codigo = $this->nullableString($result['data']['codigo'] ?? $mapped['codigo'] ?? null);

            if ($codigo !== null && ! isset($seenCodigo[$codigo])) {
                $seenCodigo[$codigo] = $line;
            }

            $results[] = $result;
        }

        return $results;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, int>  $seenCodigo
     * @return array<string, mixed>
     */
    public function validateSingleRow(
        Empresa $empresa,
        array $data,
        int $line,
        array $seenCodigo,
    ): array {
        $errors = [];
        $warnings = [];
        $payload = $this->sanitizePayload($data);

        foreach (self::FORBIDDEN_KEYS as $key) {
            unset($payload[$key]);
        }

        $codigo = $this->nullableString($payload['codigo'] ?? null);
        if ($codigo !== null) {
            $payload['codigo'] = $codigo;
        } else {
            unset($payload['codigo']);
        }

        if (isset($payload['familia']) && is_string($payload['familia'])) {
            $payload['familia'] = strtoupper(trim($payload['familia']));
        }

        if (isset($payload['grupo']) && is_string($payload['grupo'])) {
            $payload['grupo'] = strtoupper(trim($payload['grupo']));
        }

        if (isset($payload['situacao']) && is_string($payload['situacao'])) {
            $payload['situacao'] = strtoupper(trim($payload['situacao']));
        }

        if (isset($payload['ncm'])) {
            $ncmDigits = $this->digitsOrNull($payload['ncm']);
            $payload['ncm'] = $ncmDigits;
        }

        if (isset($payload['origem']) && $payload['origem'] !== '' && $payload['origem'] !== null) {
            $payload['origem'] = (int) $payload['origem'];
        }

        foreach (['unidade_comercial', 'unidade_interna'] as $unitField) {
            if (isset($payload[$unitField]) && is_string($payload[$unitField])) {
                $payload[$unitField] = strtoupper(trim($payload[$unitField]));
            }
        }

        if (isset($payload['gtin']) && is_string($payload['gtin'])) {
            $gtin = trim($payload['gtin']);
            if (strcasecmp($gtin, 'SEM GTIN') === 0) {
                $payload['gtin'] = 'SEM GTIN';
            } else {
                $payload['gtin'] = $this->digitsOrNull($gtin) ?? $gtin;
            }
        }

        $payload = $this->expandAttributeColumns($payload);

        $enrichment = $this->enrichFromGrupoCatalog($payload);
        $payload = $enrichment['payload'];
        $grupo = $enrichment['grupo'];
        if (($enrichment['status'] ?? null) === 'erro' && ! empty($enrichment['message'])) {
            $errors[] = $enrichment['message'];
        }
        if (! empty($enrichment['warnings'])) {
            $warnings = array_merge($warnings, $enrichment['warnings']);
        }

        $permissionErrors = $this->assertSoDPermissions(
            $payload,
            $grupo,
            $enrichment['filled'] ?? [],
        );
        $errors = array_merge($errors, $permissionErrors);

        $rules = ProdutoValidationRules::rules(partial: false);
        $rules['codigo'] = ['nullable', 'string', 'max:32'];
        // No CSV o vínculo é pelo código do grupo; grupo_id é resolvido no create.
        $rules['grupo'] = ['required', 'string', 'max:16'];
        unset($rules['grupo_id']);

        $validator = Validator::make($payload, $rules);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $errors[] = $message;
            }
        }

        $validated = $validator->passes() ? $validator->validated() : $payload;

        if ($codigo !== null) {
            $validated['codigo'] = $codigo;
        }

        foreach (self::GRUPO_AUTO_FIELDS as $field) {
            if (! array_key_exists($field, $validated) && array_key_exists($field, $payload)) {
                $validated[$field] = $payload[$field];
            }
        }

        if (isset($payload['atributos']) && is_array($payload['atributos'])) {
            $validated['atributos'] = $payload['atributos'];
        }

        if (isset($validated['ncm']) && $validated['ncm'] !== null && $validated['ncm'] !== '') {
            $ncm = (string) $validated['ncm'];
            if (! preg_match('/^\d{8}$/', $ncm)) {
                $errors[] = 'NCM deve ter exatamente 8 dígitos.';
            }
        }

        $uCom = $this->nullableString($validated['unidade_comercial'] ?? null);
        $uInt = $this->nullableString($validated['unidade_interna'] ?? null);
        // Unidades fora do catálogo oficial já caem em erro via ProdutoValidationRules
        // (UnidadesMedida). Aqui só reforçamos a regra de conversão do domínio 32.
        if ($uCom !== null && $uInt !== null && $uCom !== $uInt) {
            $fator = $validated['fator_conversao'] ?? null;
            if ($fator === null || $fator === '' || ! $this->decimalGreaterThanZero($fator)) {
                $errors[] = 'fator_conversao é obrigatório e deve ser > 0 quando unidade_comercial ≠ unidade_interna.';
            }
        }

        if ($grupo && $grupo->exige_dimensao_sku) {
            $attrs = is_array($validated['atributos'] ?? null) ? $validated['atributos'] : [];
            $largura = $attrs['largura_mm'] ?? null;
            $comprimento = $attrs['comprimento_m'] ?? null;
            if ($largura === null || $largura === '' || ! $this->decimalGreaterThanZero($largura)) {
                $errors[] = "Grupo {$grupo->codigo} exige largura_mm > 0 (SKU dimensional).";
            }
            if ($comprimento === null || $comprimento === '' || ! $this->decimalGreaterThanZero($comprimento)) {
                $errors[] = "Grupo {$grupo->codigo} exige comprimento_m > 0 (SKU dimensional).";
            }
        }

        if ($codigo !== null) {
            $existsCodigo = Produto::withTrashed()
                ->where('empresa_id', $empresa->id)
                ->where('codigo', $codigo)
                ->exists();
            if ($existsCodigo) {
                $errors[] = 'Código já cadastrado nesta empresa.';
            }
            if (isset($seenCodigo[$codigo])) {
                $errors[] = "Código duplicado no arquivo (também na linha {$seenCodigo[$codigo]}).";
            }
        }

        $situacao = strtoupper((string) ($validated['situacao'] ?? 'ATIVO'));
        if (! in_array($situacao, ['ATIVO', 'INATIVO'], true)) {
            $errors[] = 'situacao deve ser ATIVO ou INATIVO.';
        } else {
            $validated['situacao'] = $situacao;
        }

        $errors = array_values(array_unique($errors));
        $warnings = array_values(array_unique($warnings));

        return [
            'line' => $line,
            'status' => $errors === [] ? 'ok' : 'erro',
            'errors' => $errors,
            'data' => $validated,
            'preview' => [
                'codigo' => $codigo,
                'familia' => $validated['familia'] ?? ($payload['familia'] ?? null),
                'grupo' => $validated['grupo'] ?? ($payload['grupo'] ?? null),
                'descricao_fiscal' => $validated['descricao_fiscal'] ?? ($payload['descricao_fiscal'] ?? null),
                'ncm' => $validated['ncm'] ?? ($payload['ncm'] ?? null),
                'unidade_comercial' => $validated['unidade_comercial'] ?? ($payload['unidade_comercial'] ?? null),
                'unidade_interna' => $validated['unidade_interna'] ?? ($payload['unidade_interna'] ?? null),
                'warnings' => $warnings,
                'enrichment' => [
                    'status' => $enrichment['status'] ?? 'ignorado',
                    'filled' => $enrichment['filled'] ?? [],
                    'message' => $enrichment['message'] ?? null,
                    'grupo_nome' => $grupo?->nome,
                    'exige_dimensao_sku' => (bool) ($grupo?->exige_dimensao_sku),
                    'ncm_confirmado' => $grupo?->ncm_confirmado,
                ],
            ],
        ];
    }

    /**
     * Preenche campos vazios a partir do catálogo de grupos (defaults oficiais).
     *
     * @param  array<string, mixed>  $payload
     * @return array{
     *   payload: array<string, mixed>,
     *   status: string,
     *   filled: list<string>,
     *   message: ?string,
     *   warnings: list<string>,
     *   grupo: ?ProdutoGrupo
     * }
     */
    public function enrichFromGrupoCatalog(array $payload): array
    {
        $familia = isset($payload['familia']) ? strtoupper(trim((string) $payload['familia'])) : '';
        $grupoCodigo = isset($payload['grupo']) ? strtoupper(trim((string) $payload['grupo'])) : '';

        if ($familia === '' || $grupoCodigo === '') {
            return [
                'payload' => $payload,
                'status' => 'ignorado',
                'filled' => [],
                'message' => null,
                'warnings' => [],
                'grupo' => null,
            ];
        }

        try {
            $grupo = $this->produtoGrupoService->resolveForFamilia($familia, null, $grupoCodigo);
        } catch (ValidationException $e) {
            return [
                'payload' => $payload,
                'status' => 'erro',
                'filled' => [],
                'message' => implode(' ', $e->validator->errors()->all()),
                'warnings' => [],
                'grupo' => null,
            ];
        }

        $defaults = [
            'tipo_item_sped' => $grupo->tipo_item_sped,
            'ncm' => $grupo->ncm_padrao,
            'unidade_comercial' => $grupo->unidade_comercial_padrao,
            'unidade_interna' => $grupo->unidade_interna_padrao,
            'cfop_entrada_padrao' => $grupo->cfop_entrada_padrao,
            'cfop_saida_padrao' => $grupo->cfop_saida_padrao,
        ];

        $filled = [];
        foreach ($defaults as $field => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $current = $payload[$field] ?? null;
            if ($current === null || $current === '') {
                $payload[$field] = $value;
                $filled[] = $field;
            }
        }

        if (! isset($payload['atributos']) || ! is_array($payload['atributos'])) {
            $payload['atributos'] = [];
        }

        if ($grupo->grupo_estoque_padrao) {
            $currentGe = $payload['atributos']['grupo_estoque'] ?? null;
            if ($currentGe === null || $currentGe === '') {
                $payload['atributos']['grupo_estoque'] = $grupo->grupo_estoque_padrao;
                $filled[] = 'atributos.grupo_estoque';
            }
        }

        // Conversão sugerida pelo domínio 32 (MIL↔UN e demais pontes com atributos).
        $warnings = [];
        $uCom = isset($payload['unidade_comercial']) ? strtoupper((string) $payload['unidade_comercial']) : '';
        $uInt = isset($payload['unidade_interna']) ? strtoupper((string) $payload['unidade_interna']) : '';
        $fatorEmpty = ! isset($payload['fator_conversao']) || $payload['fator_conversao'] === '' || $payload['fator_conversao'] === null;
        if ($fatorEmpty && $uCom !== '' && $uInt !== '' && $uCom !== $uInt) {
            $attrs = is_array($payload['atributos'] ?? null) ? $payload['atributos'] : [];
            $sugestao = app(FatorConversaoSugeridor::class)->sugerir($uCom, $uInt, $attrs);
            if ($sugestao['status'] === FatorConversaoSugeridor::STATUS_SUGERIDO && $sugestao['fator'] !== null) {
                $payload['fator_conversao'] = $sugestao['fator'];
                $filled[] = 'fator_conversao';
            } elseif ($sugestao['status'] === FatorConversaoSugeridor::STATUS_INCOMPLETO && $sugestao['faltando'] !== []) {
                $warnings[] = ($sugestao['mensagem'] ?? 'Atributos insuficientes para sugerir fator.')
                    .' Faltando: '.implode(', ', $sugestao['faltando']).'.';
            }
        }

        if (! $grupo->ncm_confirmado) {
            $warnings[] = "Grupo {$grupo->codigo}: NCM ainda não confirmado empiricamente — valide com a NF do fornecedor.";
        }

        $status = 'ok_sem_lacunas';
        if ($filled !== []) {
            $status = 'atualizado';
        }

        return [
            'payload' => $payload,
            'status' => $status,
            'filled' => $filled,
            'message' => $filled === []
                ? null
                : 'Campos preenchidos pelo grupo '.$grupo->codigo.': '.implode(', ', $filled).'.',
            'warnings' => $warnings,
            'grupo' => $grupo,
        ];
    }

    /**
     * @param  array<string, string>  $raw
     * @return array<string, mixed>
     */
    public function mapRawRow(array $raw): array
    {
        $mapped = [];
        foreach ($raw as $key => $value) {
            $header = $this->normalizeHeader($key);
            if ($header === '' || $value === '') {
                continue;
            }
            $mapped[$header] = $value;
        }

        return $mapped;
    }

    public function normalizeHeader(string $header): string
    {
        $header = $this->stripBom($header);
        $header = trim($header);
        $header = mb_strtolower($header);
        $header = $this->asciiFold($header);
        $header = preg_replace('/[^a-z0-9]+/', '_', $header) ?? $header;
        $header = trim($header, '_');

        $aliases = [
            'descricao' => 'descricao_fiscal',
            'desc_fiscal' => 'descricao_fiscal',
            'desc_comercial' => 'descricao_comercial',
            'family' => 'familia',
            'grupo_produto' => 'grupo',
            'grupo_codigo' => 'grupo',
            'un' => 'unidade_comercial',
            'unidade' => 'unidade_comercial',
            'un_comercial' => 'unidade_comercial',
            'un_interna' => 'unidade_interna',
            'fator' => 'fator_conversao',
            'preco' => 'preco_tabela',
            'largura' => 'largura_mm',
            'comprimento' => 'comprimento_m',
            'gramatura' => 'gramatura_g_m2',
            'fornecedor' => 'fornecedor_sigla',
            'sigla_fornecedor' => 'fornecedor_sigla',
            'gg' => 'grupo_estoque',
            'cst_ibs_cbs' => 'cst_cbs',
            'cst_ibs' => 'cst_cbs',
            'cclasstrib' => 'cclass_trib',
            'classificacao_tributaria' => 'cclass_trib',
            'aliq_cbs' => 'aliquota_cbs',
            'p_cbs' => 'aliquota_cbs',
            'pcbs' => 'aliquota_cbs',
        ];

        return $aliases[$header] ?? $header;
    }

    public function detectDelimiter(string $headerLine): string
    {
        $semi = substr_count($headerLine, ';');
        $comma = substr_count($headerLine, ',');

        return $semi >= $comma ? ';' : ',';
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array{total: int, ok: int, erro: int, rows: list<array<string, mixed>>}
     */
    private function buildReport(array $rows): array
    {
        $ok = 0;
        $erro = 0;
        foreach ($rows as $row) {
            if (($row['status'] ?? '') === 'ok') {
                $ok++;
            } else {
                $erro++;
            }
        }

        return [
            'total' => count($rows),
            'ok' => $ok,
            'erro' => $erro,
            'rows' => $rows,
        ];
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function sanitizePayload(array $data): array
    {
        $clean = [];
        foreach ($data as $key => $value) {
            if (! is_string($key)) {
                continue;
            }
            if (is_string($value)) {
                $value = trim($value);
                if ($value === '') {
                    continue;
                }
            }
            $clean[$key] = $value;
        }

        return $clean;
    }

    /**
     * Flat CSV columns → atributos JSON (domínio bobina / conversão).
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function expandAttributeColumns(array $payload): array
    {
        $attrs = [];
        if (isset($payload['atributos']) && is_array($payload['atributos'])) {
            $attrs = $payload['atributos'];
        }

        foreach (self::ATTRIBUTE_FLAT_FIELDS as $field) {
            if (! array_key_exists($field, $payload)) {
                continue;
            }
            $value = $payload[$field];
            unset($payload[$field]);

            if ($value === null || $value === '') {
                continue;
            }

            if (in_array($field, ['largura_mm', 'comprimento_m', 'gramatura_g_m2'], true)) {
                // String canônica/BR — escala validada por PadraoDecimal; sem float (§1).
                $attrs[$field] = trim((string) $value);
            } elseif ($field === 'fornecedor_sigla') {
                $attrs[$field] = strtoupper(trim((string) $value));
            } elseif ($field === 'grupo_estoque') {
                $attrs[$field] = str_pad(preg_replace('/\D/', '', (string) $value) ?: (string) $value, 2, '0', STR_PAD_LEFT);
            } else {
                $attrs[$field] = $value;
            }
        }

        if ($attrs !== []) {
            $payload['atributos'] = $attrs;
        }

        return $payload;
    }

    /**
     * Override fiscal explícito exige produto.fiscal.
     * Valores iguais ao default do grupo (ou preenchidos na hora) não exigem SoD.
     *
     * @param  array<string, mixed>  $payload
     * @param  list<string>  $autoFilled
     * @return list<string>
     */
    private function assertSoDPermissions(array $payload, ?ProdutoGrupo $grupo, array $autoFilled): array
    {
        $errors = [];
        $user = Auth::user();

        $grupoDefaults = [];
        if ($grupo) {
            $grupoDefaults = [
                'tipo_item_sped' => $grupo->tipo_item_sped,
                'ncm' => $grupo->ncm_padrao,
                'cfop_entrada_padrao' => $grupo->cfop_entrada_padrao,
                'cfop_saida_padrao' => $grupo->cfop_saida_padrao,
            ];
        }

        $fiscalOverrides = [];
        foreach (ProdutoValidationRules::fiscalKeys() as $key) {
            if (! array_key_exists($key, $payload)) {
                continue;
            }
            if (in_array($key, $autoFilled, true)) {
                continue;
            }

            $value = $payload[$key];
            if ($value === null || $value === '') {
                continue;
            }

            if (array_key_exists($key, $grupoDefaults)) {
                $default = $grupoDefaults[$key];
                if ($default !== null && $default !== '' && (string) $value === (string) $default) {
                    continue;
                }
            }

            $fiscalOverrides[] = $key;
        }

        if ($fiscalOverrides !== [] && (! $user || ! $user->can('produto.fiscal'))) {
            $errors[] = 'Permissão produto.fiscal necessária para importar campos fiscais: '
                .implode(', ', $fiscalOverrides).'.';
        }

        return $errors;
    }

    private function exceptionMessage(Throwable $e): string
    {
        if ($e instanceof ValidationException) {
            return implode(' ', $e->validator->errors()->all());
        }

        return $e->getMessage() !== '' ? $e->getMessage() : 'Falha ao importar a linha.';
    }

    private function stripBom(string $value): string
    {
        return preg_replace('/^\xEF\xBB\xBF/', '', $value) ?? $value;
    }

    /**
     * @param  list<string|null>  $values
     */
    private function isEmptyCsvRow(array $values): bool
    {
        foreach ($values as $value) {
            if (trim((string) $value) !== '') {
                return false;
            }
        }

        return true;
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }

        $trimmed = trim((string) $value);

        return $trimmed === '' ? null : $trimmed;
    }

    private function digitsOrNull(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        $digits = preg_replace('/\D/', '', (string) $value);

        return $digits === '' ? null : $digits;
    }

    private function asciiFold(string $value): string
    {
        $translated = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
        if (is_string($translated) && $translated !== '') {
            return $translated;
        }

        return strtr($value, [
            'á' => 'a', 'à' => 'a', 'â' => 'a', 'ã' => 'a', 'ä' => 'a',
            'é' => 'e', 'è' => 'e', 'ê' => 'e', 'ë' => 'e',
            'í' => 'i', 'ì' => 'i', 'î' => 'i', 'ï' => 'i',
            'ó' => 'o', 'ò' => 'o', 'ô' => 'o', 'õ' => 'o', 'ö' => 'o',
            'ú' => 'u', 'ù' => 'u', 'û' => 'u', 'ü' => 'u',
            'ç' => 'c', 'ñ' => 'n',
        ]);
    }

    /**
     * Comparação > 0 sem float binário (PADRAO_DECIMAL §1).
     */
    private function decimalGreaterThanZero(mixed $value): bool
    {
        try {
            $canonical = PadraoDecimal::parse($value);
        } catch (\InvalidArgumentException) {
            return false;
        }

        if ($canonical === null) {
            return false;
        }

        return bccomp($canonical, '0', 12) === 1;
    }

    /**
     * @param  list<string|null>  $fields
     */
    private function csvLine(array $fields): string
    {
        $escaped = [];
        foreach ($fields as $field) {
            $value = (string) ($field ?? '');
            $needsQuotes = str_contains($value, ';')
                || str_contains($value, '"')
                || str_contains($value, "\n")
                || str_contains($value, "\r");
            $value = str_replace('"', '""', $value);
            $escaped[] = $needsQuotes ? '"'.$value.'"' : $value;
        }

        return implode(';', $escaped);
    }
}
