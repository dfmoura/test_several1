<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Services\Audit\AuditLogger;
use App\Services\Consulta\BrasilApiClient;
use App\Support\ParceiroValidationRules;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Throwable;

class ParceiroImportService
{
    public const MAX_ROWS = 500;

    /**
     * Colunas do modelo CSV — sem campos preenchidos automaticamente pela consulta CNPJ.
     *
     * @var list<string>
     */
    public const TEMPLATE_HEADERS = [
        'codigo',
        'tipo_pessoa',
        'cnpj_cpf',
        'papeis',
        'papel_cliente',
        'papel_fornecedor',
        'papel_colaborador',
        'papel_transportadora',
        'papel_banco',
        'papel_entidade',
        'papel_vendedor',
        'papel_contador',
        'situacao',
        'is_prospect',
        'emite_documento_fiscal',
        'ie',
        'im',
        'suframa',
        'ind_ie_dest',
        'ie_status',
        'consumidor_final',
        'finalidade',
        'whatsapp',
        'email_xml',
        'contato_nome',
        'contato_funcao',
        'contato_telefone',
        'contato_whatsapp',
        'contato_email',
        'limite_credito',
        'condicao_pagamento',
        'forma_pagamento',
        'banco_codigo',
        'banco_nome',
        'agencia',
        'conta',
        'pix_chave',
        'tipo_conta',
        'tipo_fornecimento',
        'cfop_entrada_padrao',
        'vinculo',
        'cargo',
        'departamento',
        // PF / override manual (não vêm da API CNPJ):
        'razao_social',
    ];

    /**
     * Campos preenchidos/atualizados pela BrasilAPI CNPJ na simulação (se vazios no CSV).
     *
     * @var list<string>
     */
    public const CNPJ_AUTO_FIELDS = [
        'razao_social',
        'nome_fantasia',
        'logradouro',
        'numero',
        'complemento',
        'bairro',
        'municipio',
        'uf',
        'cep',
        'ibge',
        'telefone',
        'email',
        'regime',
        'regime_desde',
        'area_incentivada',
        'cnae',
        'cnaes_secundarios',
    ];

    /** @var list<string> */
    private const FORBIDDEN_KEYS = [
        'id',
        'empresa_id',
        'vendedor_parceiro_id',
        'credito_utilizado',
        'consulta_snapshot',
        'cadastro_fiscal_completo',
        'bloqueado_em',
        'motivo_bloqueio',
        'comissao_percentual',
        'admissao_em',
        'desligamento_em',
    ];

    /** @var list<string> */
    private const PAPEIS = [
        'cliente',
        'fornecedor',
        'colaborador',
        'transportadora',
        'banco',
        'entidade',
        'vendedor',
        'contador',
    ];

    /** @var list<string> */
    private const BOOLEAN_FIELDS = [
        'area_incentivada',
        'consumidor_final',
        'is_prospect',
        'emite_documento_fiscal',
        'papel_cliente',
        'papel_fornecedor',
        'papel_colaborador',
        'papel_transportadora',
        'papel_banco',
        'papel_entidade',
        'papel_vendedor',
        'papel_contador',
    ];

    /** @var array<string, array|null> */
    private array $cnpjLookupCache = [];

    public function __construct(
        private readonly ParceiroService $parceiroService,
        private readonly AuditLogger $auditLogger,
        private readonly BrasilApiClient $brasilApiClient,
    ) {}

    public function templateCsv(): string
    {
        $headers = self::TEMPLATE_HEADERS;
        $example = array_fill(0, count($headers), '');
        $map = array_flip($headers);
        $example[$map['tipo_pessoa']] = 'PJ';
        $example[$map['cnpj_cpf']] = '11222333000181';
        $example[$map['papeis']] = 'cliente';
        $example[$map['situacao']] = 'ATIVO';
        $example[$map['finalidade']] = 'REVENDA';

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
     * @param  list<array<string, mixed>>  $rawRows  Linhas com payload pronto (campo data) vindas do preview
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

            // Remove metadados do preview se o cliente reenviar a linha completa.
            unset($data['line'], $data['status'], $data['errors'], $data['preview']);

            try {
                $validated = $this->validateSingleRow($empresa, $data, $line, [], []);
                if ($validated['status'] !== 'ok') {
                    $falhas++;
                    $results[] = [
                        'line' => $line,
                        'status' => 'erro',
                        'errors' => $validated['errors'],
                        'razao_social' => $data['razao_social'] ?? null,
                        'cnpj_cpf' => $data['cnpj_cpf'] ?? null,
                    ];
                    continue;
                }

                $payload = $validated['data'];
                $parceiro = $this->parceiroService->create($empresa, $payload);
                $criados++;
                $createdIds[] = $parceiro->id;
                $results[] = [
                    'line' => $line,
                    'status' => 'criado',
                    'errors' => [],
                    'id' => $parceiro->id,
                    'codigo' => $parceiro->codigo,
                    'razao_social' => $parceiro->razao_social,
                    'cnpj_cpf' => $parceiro->cnpj_cpf,
                ];
            } catch (Throwable $e) {
                $falhas++;
                $results[] = [
                    'line' => $line,
                    'status' => 'erro',
                    'errors' => [$this->exceptionMessage($e)],
                    'razao_social' => $data['razao_social'] ?? null,
                    'cnpj_cpf' => $data['cnpj_cpf'] ?? null,
                ];
            }
        }

        $this->auditLogger->log(
            'IMPORTAR',
            'parceiro',
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

            if (
                ! in_array('razao_social', $normalizedHeaders, true)
                && ! in_array('cnpj_cpf', $normalizedHeaders, true)
            ) {
                throw ValidationException::withMessages([
                    'file' => ['Informe ao menos a coluna razao_social ou cnpj_cpf no cabeçalho.'],
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
        $seenCnpj = [];
        $seenCodigo = [];
        $results = [];

        foreach ($parsed as $item) {
            $line = $item['line'];
            $mapped = $this->mapRawRow($item['raw']);
            $result = $this->validateSingleRow($empresa, $mapped, $line, $seenCnpj, $seenCodigo);

            $cnpj = $this->digitsOrNull($result['data']['cnpj_cpf'] ?? $mapped['cnpj_cpf'] ?? null);
            $codigo = $this->nullableString($result['data']['codigo'] ?? $mapped['codigo'] ?? null);

            if ($cnpj !== null && ! isset($seenCnpj[$cnpj])) {
                $seenCnpj[$cnpj] = $line;
            }

            if ($codigo !== null && ! isset($seenCodigo[$codigo])) {
                $seenCodigo[$codigo] = $line;
            }

            $results[] = $result;
        }

        return $results;
    }

    /**
     * @param  array<string, mixed>  $data
     * @param  array<string, int>  $seenCnpj
     * @param  array<string, int>  $seenCodigo
     * @return array<string, mixed>
     */
    public function validateSingleRow(
        Empresa $empresa,
        array $data,
        int $line,
        array $seenCnpj,
        array $seenCodigo,
    ): array {
        $errors = [];
        $payload = $this->sanitizePayload($data);
        $payload = $this->applyPapeisColumn($payload);
        $payload = $this->normalizeBooleans($payload);
        $payload = $this->expandFlatRelations($payload);

        foreach (self::FORBIDDEN_KEYS as $key) {
            unset($payload[$key]);
        }

        // codigo é opcional e tratado à parte do Validator de CRUD.
        $codigo = $this->nullableString($payload['codigo'] ?? null);
        if ($codigo !== null) {
            $payload['codigo'] = $codigo;
        } else {
            unset($payload['codigo']);
        }

        if (isset($payload['cnpj_cpf'])) {
            $digits = $this->digitsOrNull($payload['cnpj_cpf']);
            $payload['cnpj_cpf'] = $digits;
        }

        if (isset($payload['cep'])) {
            $payload['cep'] = $this->digitsOrNull($payload['cep']);
        }

        if (isset($payload['ibge'])) {
            $payload['ibge'] = $this->digitsOrNull($payload['ibge']);
        }

        if (isset($payload['uf']) && is_string($payload['uf'])) {
            $payload['uf'] = strtoupper(trim($payload['uf']));
            if ($payload['uf'] === '') {
                $payload['uf'] = null;
            }
        }

        if (isset($payload['ind_ie_dest']) && $payload['ind_ie_dest'] !== '' && $payload['ind_ie_dest'] !== null) {
            $payload['ind_ie_dest'] = (int) $payload['ind_ie_dest'];
        }

        // Atualização automática via API CNPJ (após mapeamento do template, antes da validação final).
        $enrichment = $this->enrichFromCnpjApi($payload);
        $payload = $enrichment['payload'];
        if (($enrichment['status'] ?? null) === 'erro') {
            $needsRazao = $this->nullableString($payload['razao_social'] ?? null) === null;
            if ($needsRazao && ! empty($enrichment['message'])) {
                $errors[] = $enrichment['message'];
            }
        }

        $permissionErrors = $this->assertSoDPermissions($payload);
        $errors = array_merge($errors, $permissionErrors);

        $rules = ParceiroValidationRules::rules(partial: false);
        $rules['codigo'] = ['nullable', 'string', 'max:16'];

        $validator = Validator::make($payload, $rules);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $errors[] = $message;
            }
        }

        $validated = $validator->passes() ? $validator->validated() : $payload;
        unset($validated['cadastro_fiscal_completo']);

        if ($codigo !== null) {
            $validated['codigo'] = $codigo;
        }

        // Preserva campos auto-preenchidos que o validator possa ter omitido se falhou parcialmente.
        foreach (self::CNPJ_AUTO_FIELDS as $field) {
            if (! array_key_exists($field, $validated) && array_key_exists($field, $payload)) {
                $validated[$field] = $payload[$field];
            }
        }

        if (! $this->hasAnyPapel($validated)) {
            $errors[] = 'Informe ao menos um papel para o parceiro.';
        }

        $cnpj = $this->digitsOrNull($validated['cnpj_cpf'] ?? null);
        if ($cnpj !== null) {
            $exists = Parceiro::withTrashed()
                ->where('empresa_id', $empresa->id)
                ->where('cnpj_cpf', $cnpj)
                ->exists();
            if ($exists) {
                $errors[] = 'CNPJ/CPF já cadastrado nesta empresa.';
            }
            if (isset($seenCnpj[$cnpj])) {
                $errors[] = "CNPJ/CPF duplicado no arquivo (também na linha {$seenCnpj[$cnpj]}).";
            }
        }

        if ($codigo !== null) {
            $existsCodigo = Parceiro::withTrashed()
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

        $errors = array_values(array_unique($errors));

        return [
            'line' => $line,
            'status' => $errors === [] ? 'ok' : 'erro',
            'errors' => $errors,
            'data' => $validated,
            'preview' => [
                'razao_social' => $validated['razao_social'] ?? ($payload['razao_social'] ?? null),
                'nome_fantasia' => $validated['nome_fantasia'] ?? ($payload['nome_fantasia'] ?? null),
                'cnpj_cpf' => $cnpj,
                'codigo' => $codigo,
                'tipo_pessoa' => $validated['tipo_pessoa'] ?? ($payload['tipo_pessoa'] ?? null),
                'municipio' => $validated['municipio'] ?? ($payload['municipio'] ?? null),
                'uf' => $validated['uf'] ?? ($payload['uf'] ?? null),
                'papeis' => $this->listPapeis(array_merge($payload, $validated)),
                'enrichment' => [
                    'status' => $enrichment['status'] ?? 'ignorado',
                    'filled' => $enrichment['filled'] ?? [],
                    'message' => $enrichment['message'] ?? null,
                ],
            ],
        ];
    }

    /**
     * Preenche campos vazios a partir da BrasilAPI quando houver CNPJ (14 dígitos).
     *
     * @param  array<string, mixed>  $payload
     * @return array{payload: array<string, mixed>, status: string, filled: list<string>, message: ?string}
     */
    public function enrichFromCnpjApi(array $payload): array
    {
        $cnpj = $this->digitsOrNull($payload['cnpj_cpf'] ?? null);
        if ($cnpj === null || strlen($cnpj) !== 14) {
            return [
                'payload' => $payload,
                'status' => 'ignorado',
                'filled' => [],
                'message' => null,
            ];
        }

        if (! array_key_exists($cnpj, $this->cnpjLookupCache)) {
            try {
                $this->cnpjLookupCache[$cnpj] = $this->brasilApiClient->getCnpj($cnpj);
            } catch (Throwable $e) {
                $this->cnpjLookupCache[$cnpj] = null;
                $needsRazao = $this->nullableString($payload['razao_social'] ?? null) === null;

                return [
                    'payload' => $payload,
                    'status' => 'erro',
                    'filled' => [],
                    'message' => $needsRazao
                        ? 'Consulta CNPJ falhou e razao_social está vazia. Informe razao_social no CSV ou corrija o CNPJ. ('.$e->getMessage().')'
                        : 'Consulta CNPJ falhou; mantendo dados do CSV. ('.$e->getMessage().')',
                ];
            }
        }

        $remote = $this->cnpjLookupCache[$cnpj];
        if (! is_array($remote)) {
            $needsRazao = $this->nullableString($payload['razao_social'] ?? null) === null;

            return [
                'payload' => $payload,
                'status' => 'erro',
                'filled' => [],
                'message' => $needsRazao
                    ? 'CNPJ não encontrado na consulta e razao_social está vazia.'
                    : 'CNPJ não encontrado na consulta; mantendo dados do CSV.',
            ];
        }

        $mapped = $this->mapBrasilApiToParceiro($remote);
        $filled = [];

        if (! isset($payload['tipo_pessoa']) || $payload['tipo_pessoa'] === '') {
            $payload['tipo_pessoa'] = 'PJ';
            $filled[] = 'tipo_pessoa';
        }

        foreach ($mapped as $field => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $current = $payload[$field] ?? null;
            if ($current === null || $current === '') {
                $payload[$field] = $value;
                $filled[] = $field;
            }
        }

        return [
            'payload' => $payload,
            'status' => $filled === [] ? 'ok_sem_lacunas' : 'atualizado',
            'filled' => $filled,
            'message' => $filled === []
                ? null
                : 'Campos atualizados pela API CNPJ: '.implode(', ', $filled).'.',
        ];
    }

    /**
     * @param  array<string, mixed>  $remote
     * @return array<string, mixed>
     */
    private function mapBrasilApiToParceiro(array $remote): array
    {
        $uf = isset($remote['uf']) ? strtoupper(trim((string) $remote['uf'])) : null;
        $suframa = null;
        $regime = $remote['regime_sugerido'] ?? null;
        $cnae = $this->digitsOrNull($remote['cnae'] ?? ($remote['cnae_fiscal'] ?? null));
        if ($cnae !== null) {
            $cnae = str_pad($cnae, 7, '0', STR_PAD_LEFT);
        }

        $mapped = [
            'razao_social' => $this->nullableString($remote['razao_social'] ?? null),
            'nome_fantasia' => $this->nullableString($remote['nome_fantasia'] ?? null),
            'logradouro' => $this->nullableString($remote['logradouro'] ?? null),
            'numero' => $this->nullableString($remote['numero'] ?? null),
            'complemento' => $this->nullableString($remote['complemento'] ?? null),
            'bairro' => $this->nullableString($remote['bairro'] ?? null),
            'municipio' => $this->nullableString($remote['municipio'] ?? null),
            'uf' => $uf !== '' ? $uf : null,
            'cep' => $this->digitsOrNull($remote['cep'] ?? null),
            'ibge' => $this->digitsOrNull($remote['ibge'] ?? ($remote['codigo_municipio_ibge'] ?? null)),
            'telefone' => $this->digitsOrNull($remote['telefone'] ?? ($remote['ddd_telefone_1'] ?? null)),
            'email' => $this->nullableString($remote['email'] ?? null),
            'regime' => is_string($regime) && $regime !== '' ? $regime : null,
            'cnae' => $cnae,
            'cnaes_secundarios' => $this->normalizeCnaesSecundariosImport($remote['cnaes_secundarios'] ?? null),
        ];

        if ($mapped['regime'] !== null) {
            $mapped['regime_desde'] = now()->toDateString();
        }

        if (ParceiroFiscalRules::suggestAreaIncentivada($mapped['uf'] ?? null, $suframa)) {
            $mapped['area_incentivada'] = true;
        }

        return $mapped;
    }

    /**
     * @param  mixed  $raw
     * @return list<array{codigo: string, descricao: string|null}>|null
     */
    private function normalizeCnaesSecundariosImport(mixed $raw): ?array
    {
        if (! is_array($raw) || $raw === []) {
            return null;
        }

        $out = [];
        foreach ($raw as $item) {
            if (! is_array($item)) {
                continue;
            }
            $codigo = preg_replace('/\D/', '', (string) ($item['codigo'] ?? '')) ?: '';
            if ($codigo === '') {
                continue;
            }
            $out[] = [
                'codigo' => $codigo,
                'descricao' => isset($item['descricao']) ? (string) $item['descricao'] : null,
            ];
        }

        return $out === [] ? null : $out;
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
            'razao' => 'razao_social',
            'razaosocial' => 'razao_social',
            'nome' => 'razao_social',
            'fantasia' => 'nome_fantasia',
            'cnpj' => 'cnpj_cpf',
            'cpf' => 'cnpj_cpf',
            'documento' => 'cnpj_cpf',
            'inscricao_estadual' => 'ie',
            'inscricao_municipal' => 'im',
            'papel' => 'papeis',
            'roles' => 'papeis',
            'cidade' => 'municipio',
            'estado' => 'uf',
        ];

        return $aliases[$header] ?? $header;
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

    public function parseBoolean(mixed $value): ?bool
    {
        if ($value === null || $value === '') {
            return null;
        }

        if (is_bool($value)) {
            return $value;
        }

        $normalized = mb_strtolower(trim((string) $value));
        $normalized = str_replace(['á', 'ã', 'â'], 'a', $normalized);

        if (in_array($normalized, ['1', 'true', 'sim', 's', 'yes', 'y', 'x'], true)) {
            return true;
        }

        if (in_array($normalized, ['0', 'false', 'nao', 'n', 'no'], true)) {
            return false;
        }

        return null;
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
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function applyPapeisColumn(array $payload): array
    {
        if (! isset($payload['papeis'])) {
            return $payload;
        }

        $raw = (string) $payload['papeis'];
        unset($payload['papeis']);

        $parts = preg_split('/[;,|\/]+/', mb_strtolower($raw)) ?: [];
        foreach ($parts as $part) {
            $papel = trim($part);
            $papel = str_replace([' ', '-'], '_', $papel);
            if (in_array($papel, self::PAPEIS, true)) {
                $payload['papel_'.$papel] = true;
            }
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function normalizeBooleans(array $payload): array
    {
        foreach (self::BOOLEAN_FIELDS as $field) {
            if (! array_key_exists($field, $payload)) {
                continue;
            }
            $parsed = $this->parseBoolean($payload[$field]);
            if ($parsed === null) {
                unset($payload[$field]);
            } else {
                $payload[$field] = $parsed;
            }
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function expandFlatRelations(array $payload): array
    {
        $contatoExtra = ['contato_telefone', 'contato_whatsapp', 'contato_email'];
        $hasContatoExtra = false;
        foreach ($contatoExtra as $key) {
            if (! empty($payload[$key])) {
                $hasContatoExtra = true;
            }
        }

        if ($hasContatoExtra || (! empty($payload['contato_nome']) && ! isset($payload['contatos']))) {
            if (! isset($payload['contatos'])) {
                $payload['contatos'] = [[
                    'nome' => $payload['contato_nome'] ?? 'Contato 1',
                    'funcao' => $payload['contato_funcao'] ?? null,
                    'telefone' => $payload['contato_telefone'] ?? ($payload['telefone'] ?? null),
                    'whatsapp' => $payload['contato_whatsapp'] ?? ($payload['whatsapp'] ?? null),
                    'email' => $payload['contato_email'] ?? ($payload['email'] ?? null),
                    'principal' => true,
                    'ordem' => 0,
                ]];
            }
        }

        unset($payload['contato_telefone'], $payload['contato_whatsapp'], $payload['contato_email']);

        $bankKeys = ['banco_codigo', 'banco_nome', 'agencia', 'conta', 'pix_chave', 'tipo_conta'];
        $hasBank = false;
        foreach ($bankKeys as $key) {
            if (! empty($payload[$key])) {
                $hasBank = true;
                break;
            }
        }

        if ($hasBank && ! isset($payload['contas_bancarias'])) {
            $tipo = strtoupper(trim((string) ($payload['tipo_conta'] ?? 'CORRENTE')));
            if (! in_array($tipo, ['CORRENTE', 'POUPANCA', 'PAGAMENTO'], true)) {
                $tipo = 'CORRENTE';
            }
            $payload['contas_bancarias'] = [[
                'banco_codigo' => $payload['banco_codigo'] ?? null,
                'banco_nome' => $payload['banco_nome'] ?? null,
                'agencia' => $payload['agencia'] ?? null,
                'conta' => $payload['conta'] ?? null,
                'pix_chave' => $payload['pix_chave'] ?? null,
                'tipo_conta' => $tipo,
                'principal' => true,
                'ordem' => 0,
            ]];
        }

        unset($payload['tipo_conta']);

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return list<string>
     */
    private function assertSoDPermissions(array $payload): array
    {
        $errors = [];
        $user = Auth::user();

        $hasBancario = array_intersect(array_keys($payload), ParceiroValidationRules::bancarioKeys()) !== [];
        $hasCredito = array_intersect(array_keys($payload), ParceiroValidationRules::creditoKeys()) !== [];

        if ($hasBancario && (! $user || ! $user->can('parceiro.bancario'))) {
            $errors[] = 'Permissão parceiro.bancario necessária para importar dados bancários.';
        }

        if ($hasCredito && (! $user || ! $user->can('credito.escrever'))) {
            $errors[] = 'Permissão credito.escrever necessária para importar limite de crédito.';
        }

        return $errors;
    }

    /**
     * @param  array<string, mixed>  $data
     */
    private function hasAnyPapel(array $data): bool
    {
        foreach (self::PAPEIS as $papel) {
            if (! empty($data['papel_'.$papel])) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return list<string>
     */
    private function listPapeis(array $data): array
    {
        $list = [];
        foreach (self::PAPEIS as $papel) {
            if (! empty($data['papel_'.$papel])) {
                $list[] = $papel;
            }
        }

        return $list;
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
