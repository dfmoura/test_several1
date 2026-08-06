<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Services\Audit\AuditLogger;
use App\Services\Consulta\BrasilApiClient;
use App\Services\Fiscal\NfeEmitenteExtractor;
use App\Support\ParceiroValidationRules;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Throwable;
use ZipArchive;

class ParceiroXmlImportService
{
    public const MAX_FILES = 20;

    public const MAX_FILE_KB = 5120;

    /** @var list<string> */
    private const ADDRESS_FIELDS = [
        'logradouro',
        'numero',
        'complemento',
        'bairro',
        'municipio',
        'uf',
        'cep',
        'ibge',
    ];

    /** @var list<string> */
    private const MERGE_FIELDS = [
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
        'cnae',
        'cnaes_secundarios',
        'ie',
    ];

    /** @var array<string, array|null> */
    private array $cnpjLookupCache = [];

    /** @var array<string, array|null> */
    private array $cepLookupCache = [];

    public function __construct(
        private readonly NfeEmitenteExtractor $extractor,
        private readonly ParceiroService $parceiroService,
        private readonly BrasilApiClient $brasilApiClient,
        private readonly AuditLogger $auditLogger,
    ) {}

    /**
     * @param  list<UploadedFile>  $files
     * @return array{total: int, ok: int, info: int, erro: int, rows: list<array<string, mixed>>}
     */
    public function preview(Empresa $empresa, array $files): array
    {
        $xmlBlobs = $this->collectXmlBlobs($files);
        $rows = [];
        $seenCnpj = [];
        $line = 0;

        foreach ($xmlBlobs as $blob) {
            $line++;
            $rows[] = $this->previewOne($empresa, $blob['content'], $blob['name'], $line, $seenCnpj);
            $cnpj = $this->digitsOrNull($rows[array_key_last($rows)]['preview']['cnpj_cpf'] ?? null);
            if ($cnpj !== null && ! isset($seenCnpj[$cnpj])) {
                $seenCnpj[$cnpj] = $line;
            }
        }

        return $this->buildReport($rows);
    }

    /**
     * @param  list<array<string, mixed>>  $rawRows
     * @return array{total: int, criados: int, atualizados: int, ignorados: int, falhas: int, rows: list<array<string, mixed>>}
     */
    public function commit(Empresa $empresa, array $rawRows): array
    {
        if (count($rawRows) > self::MAX_FILES) {
            throw ValidationException::withMessages([
                'rows' => ['O lote excede o limite de '.self::MAX_FILES.' arquivos.'],
            ]);
        }

        $results = [];
        $criados = 0;
        $atualizados = 0;
        $ignorados = 0;
        $falhas = 0;
        $createdIds = [];
        $updatedIds = [];

        foreach (array_values($rawRows) as $index => $item) {
            $line = (int) ($item['line'] ?? ($index + 1));
            $acao = (string) ($item['acao'] ?? '');
            $data = is_array($item['data'] ?? null) ? $item['data'] : [];

            try {
                if ($acao === 'criar') {
                    $payload = $this->finalizeCreatePayload($data);
                    $parceiro = $this->parceiroService->create($empresa, $payload);
                    $criados++;
                    $createdIds[] = $parceiro->id;
                    $results[] = $this->commitRow($line, 'criado', [], $parceiro);
                    continue;
                }

                if ($acao === 'adicionar_papel') {
                    $parceiroId = (int) ($item['parceiro_id'] ?? $data['parceiro_id'] ?? 0);
                    $parceiro = Parceiro::query()
                        ->where('empresa_id', $empresa->id)
                        ->where('id', $parceiroId)
                        ->first();

                    if ($parceiro === null) {
                        throw ValidationException::withMessages([
                            'parceiro_id' => ['Parceiro não encontrado nesta empresa.'],
                        ]);
                    }

                    if ($parceiro->papel_fornecedor) {
                        $ignorados++;
                        $results[] = [
                            'line' => $line,
                            'status' => 'ignorado',
                            'errors' => ['Parceiro já possui papel fornecedor.'],
                            'id' => $parceiro->id,
                            'codigo' => $parceiro->codigo,
                            'razao_social' => $parceiro->razao_social,
                            'cnpj_cpf' => $parceiro->cnpj_cpf,
                        ];
                        continue;
                    }

                    $patch = [
                        'papel_fornecedor' => true,
                    ];
                    if (empty($parceiro->tipo_fornecimento) && ! empty($data['tipo_fornecimento'])) {
                        $patch['tipo_fornecimento'] = $data['tipo_fornecimento'];
                    } elseif (empty($parceiro->tipo_fornecimento)) {
                        $patch['tipo_fornecimento'] = 'MERCADORIA';
                    }
                    if (empty($parceiro->cfop_entrada_padrao) && ! empty($data['cfop_entrada_padrao'])) {
                        $patch['cfop_entrada_padrao'] = $data['cfop_entrada_padrao'];
                    }
                    if (empty($parceiro->emite_documento_fiscal)) {
                        $patch['emite_documento_fiscal'] = true;
                    }

                    $parceiro = $this->parceiroService->update($parceiro, $patch);
                    $atualizados++;
                    $updatedIds[] = $parceiro->id;
                    $results[] = $this->commitRow($line, 'atualizado', [], $parceiro);
                    continue;
                }

                $falhas++;
                $results[] = [
                    'line' => $line,
                    'status' => 'erro',
                    'errors' => ['Ação inválida. Use criar ou adicionar_papel.'],
                    'razao_social' => $data['razao_social'] ?? null,
                    'cnpj_cpf' => $data['cnpj_cpf'] ?? null,
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
            'IMPORTAR_XML_NFE',
            'parceiro',
            null,
            null,
            [
                'total' => count($rawRows),
                'criados' => $criados,
                'atualizados' => $atualizados,
                'ignorados' => $ignorados,
                'falhas' => $falhas,
                'ids_criados' => $createdIds,
                'ids_atualizados' => $updatedIds,
            ]
        );

        return [
            'total' => count($rawRows),
            'criados' => $criados,
            'atualizados' => $atualizados,
            'ignorados' => $ignorados,
            'falhas' => $falhas,
            'rows' => $results,
        ];
    }

    /**
     * @param  array<string, int>  $seenCnpj
     * @return array<string, mixed>
     */
    public function previewOne(
        Empresa $empresa,
        string $xmlContent,
        string $fileName,
        int $line,
        array $seenCnpj = [],
    ): array {
        $warnings = [];
        $errors = [];
        $fieldSources = [];

        try {
            $extracted = $this->extractor->extract($xmlContent);
        } catch (Throwable $e) {
            return $this->errorRow($line, $fileName, [$e->getMessage()]);
        }

        $emit = $extracted['emit'];
        $cnpj = $this->digitsOrNull($emit['cnpj_cpf'] ?? null);
        if ($cnpj === null || strlen($cnpj) !== 14) {
            return $this->errorRow($line, $fileName, [
                'Emitente precisa ser PJ com CNPJ de 14 dígitos para cadastro de fornecedor via XML.',
            ], $emit['razao_social'] ?? null, $cnpj);
        }

        if (! \App\Services\Cadastros\EmpresaFiscalRules::isValidCnpj($cnpj)) {
            return $this->errorRow($line, $fileName, ['CNPJ do emitente inválido (dígitos verificadores).'], $emit['razao_social'] ?? null, $cnpj);
        }

        if (isset($seenCnpj[$cnpj])) {
            $errors[] = "CNPJ duplicado no lote (também no arquivo #{$seenCnpj[$cnpj]}).";
        }

        $empresaCnpj = $this->digitsOrNull($empresa->cnpj);
        $destCnpj = $this->digitsOrNull($extracted['dest_cnpj'] ?? null);
        $destAviso = null;
        if ($empresaCnpj !== null && $destCnpj !== null && $destCnpj !== $empresaCnpj) {
            $destAviso = 'Destinatário do XML (CNPJ '.$this->maskCnpj($destCnpj).') difere do CNPJ da empresa ativa.';
            $warnings[] = $destAviso;
        }

        if (! empty($extracted['transportadora']['cnpj']) || ! empty($extracted['transportadora']['nome'])) {
            $tNome = $extracted['transportadora']['nome'] ?? '—';
            $tDoc = $extracted['transportadora']['cnpj']
                ?? $extracted['transportadora']['cpf']
                ?? '';
            $warnings[] = 'Transportadora detectada no XML: '.$tNome.($tDoc !== '' ? ' ('.$tDoc.')' : '').'. Cadastro separado não é feito neste fluxo.';
        }

        $xmlAddress = $this->pickAddress($emit);
        $xmlPayload = $this->xmlToSeedPayload($emit, $extracted['cfop_entrada_sugerido'] ?? null);
        foreach ($xmlPayload as $field => $_) {
            $fieldSources[$field] = 'xml';
        }

        $enrichment = $this->enrichPreferBrasilApi($xmlPayload, $cnpj);
        $payload = $enrichment['payload'];
        $fieldSources = array_merge($fieldSources, $enrichment['sources']);
        if (($enrichment['status'] ?? '') === 'erro' || ($enrichment['status'] ?? '') === 'parcial') {
            if (! empty($enrichment['message'])) {
                $warnings[] = $enrichment['message'];
            }
        }

        $payload = $this->fillIbgeFromCep($payload, $fieldSources);

        $addrWarnings = $this->confrontAddresses($xmlAddress, $this->pickAddress($payload));
        $warnings = array_merge($warnings, $addrWarnings);

        $existing = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where('cnpj_cpf', $cnpj)
            ->first();

        if ($existing !== null) {
            if ($existing->papel_fornecedor) {
                return [
                    'line' => $line,
                    'file_name' => $fileName,
                    'status' => 'info',
                    'acao' => 'nenhuma',
                    'errors' => [],
                    'warnings' => $warnings,
                    'data' => [],
                    'preview' => $this->buildPreview(
                        $payload,
                        $extracted,
                        $fileName,
                        'ja_fornecedor',
                        $fieldSources,
                        $enrichment,
                        $destAviso,
                        $existing,
                    ),
                ];
            }

            $patchData = [
                'parceiro_id' => $existing->id,
                'tipo_fornecimento' => $payload['tipo_fornecimento'] ?? 'MERCADORIA',
                'cfop_entrada_padrao' => $payload['cfop_entrada_padrao'] ?? null,
                'cnpj_cpf' => $cnpj,
                'razao_social' => $existing->razao_social,
            ];

            if ($addrWarnings !== []) {
                $warnings[] = 'Endereço do XML diverge do cartão CNPJ/cadastro — dados do parceiro existente não serão sobrescritos.';
            }

            return [
                'line' => $line,
                'file_name' => $fileName,
                'status' => $errors === [] ? 'ok' : 'erro',
                'acao' => $errors === [] ? 'adicionar_papel' : null,
                'errors' => $errors,
                'warnings' => $warnings,
                'data' => $patchData,
                'parceiro_id' => $existing->id,
                'preview' => $this->buildPreview(
                    array_merge($payload, ['razao_social' => $existing->razao_social]),
                    $extracted,
                    $fileName,
                    'existe_sem_fornecedor',
                    $fieldSources,
                    $enrichment,
                    $destAviso,
                    $existing,
                ),
            ];
        }

        // Novo fornecedor — validar com as mesmas rules de criação
        $payload['papel_fornecedor'] = true;
        $payload['emite_documento_fiscal'] = true;
        $payload['tipo_pessoa'] = 'PJ';
        $payload['situacao'] = $payload['situacao'] ?? 'ATIVO';
        $payload['tipo_fornecimento'] = $payload['tipo_fornecimento'] ?? 'MERCADORIA';

        if (isset($payload['ie'])) {
            $payload['ind_ie_dest'] = ParceiroFiscalRules::deriveIndIeDest(
                is_string($payload['ie']) ? $payload['ie'] : null
            );
        }

        $rules = ParceiroValidationRules::rules(partial: false);
        $validator = Validator::make($payload, $rules);
        if ($validator->fails()) {
            foreach ($validator->errors()->all() as $message) {
                $errors[] = $message;
            }
        }

        $validated = $validator->passes() ? $validator->validated() : $payload;
        unset($validated['cadastro_fiscal_completo']);
        foreach (['papel_fornecedor', 'emite_documento_fiscal', 'tipo_pessoa', 'tipo_fornecimento', 'cfop_entrada_padrao', 'cnaes_secundarios', 'regime_desde'] as $keep) {
            if (array_key_exists($keep, $payload) && ! array_key_exists($keep, $validated)) {
                $validated[$keep] = $payload[$keep];
            }
        }

        $errors = array_values(array_unique($errors));
        $status = $errors === [] ? 'ok' : 'erro';

        return [
            'line' => $line,
            'file_name' => $fileName,
            'status' => $status,
            'acao' => $status === 'ok' ? 'criar' : null,
            'errors' => $errors,
            'warnings' => $warnings,
            'data' => $validated,
            'preview' => $this->buildPreview(
                $validated,
                $extracted,
                $fileName,
                'novo',
                $fieldSources,
                $enrichment,
                $destAviso,
                null,
            ),
        ];
    }

    /**
     * Compara endereço do XML com o preferido (BrasilAPI) e gera avisos de divergência material.
     *
     * @param  array<string, mixed>  $xmlAddr
     * @param  array<string, mixed>  $preferredAddr
     * @return list<string>
     */
    public function confrontAddresses(array $xmlAddr, array $preferredAddr): array
    {
        $warnings = [];
        $xmlCep = $this->digitsOrNull($xmlAddr['cep'] ?? null);
        $prefCep = $this->digitsOrNull($preferredAddr['cep'] ?? null);
        if ($xmlCep && $prefCep && $xmlCep !== $prefCep) {
            $warnings[] = "CEP do XML ({$xmlCep}) diverge do cartão CNPJ ({$prefCep}).";
        }

        $xmlUf = $this->upper($xmlAddr['uf'] ?? null);
        $prefUf = $this->upper($preferredAddr['uf'] ?? null);
        if ($xmlUf && $prefUf && $xmlUf !== $prefUf) {
            $warnings[] = "UF do XML ({$xmlUf}) diverge do cartão CNPJ ({$prefUf}).";
        }

        $xmlMun = $this->normalizeToken($xmlAddr['municipio'] ?? null);
        $prefMun = $this->normalizeToken($preferredAddr['municipio'] ?? null);
        if ($xmlMun !== '' && $prefMun !== '' && $xmlMun !== $prefMun && ! $this->tokenContains($xmlMun, $prefMun)) {
            $warnings[] = 'Município do XML diverge do cartão CNPJ.';
        }

        $xmlIbge = $this->digitsOrNull($xmlAddr['ibge'] ?? null);
        $prefIbge = $this->digitsOrNull($preferredAddr['ibge'] ?? null);
        if ($xmlIbge && $prefIbge && $xmlIbge !== $prefIbge) {
            $warnings[] = "Código IBGE do XML ({$xmlIbge}) diverge do cartão CNPJ ({$prefIbge}).";
        }

        $xmlLgr = $this->normalizeStreet($xmlAddr['logradouro'] ?? null);
        $prefLgr = $this->normalizeStreet($preferredAddr['logradouro'] ?? null);
        if ($xmlLgr !== '' && $prefLgr !== '' && ! $this->tokenContains($xmlLgr, $prefLgr)) {
            $xmlNum = trim((string) ($xmlAddr['numero'] ?? ''));
            $prefNum = trim((string) ($preferredAddr['numero'] ?? ''));
            if ($xmlNum !== '' && $prefNum !== '' && $xmlNum !== $prefNum) {
                $warnings[] = 'Logradouro/número do XML divergem do cartão CNPJ (divergência material).';
            } elseif ($xmlLgr !== $prefLgr && strlen($xmlLgr) > 8 && strlen($prefLgr) > 8) {
                // Só alerta se nem um contém o outro após normalizar abreviações
                $warnings[] = 'Logradouro do XML diverge do cartão CNPJ (verifique abreviações).';
            }
        }

        return $warnings;
    }

    /**
     * @param  list<UploadedFile>  $files
     * @return list<array{name: string, content: string}>
     */
    public function collectXmlBlobs(array $files): array
    {
        if ($files === []) {
            throw ValidationException::withMessages([
                'files' => ['Envie ao menos um arquivo XML ou ZIP.'],
            ]);
        }

        $blobs = [];
        foreach ($files as $file) {
            if (! $file instanceof UploadedFile) {
                continue;
            }
            $ext = strtolower((string) $file->getClientOriginalExtension());
            $name = $file->getClientOriginalName();

            if ($ext === 'zip') {
                $fromZip = $this->extractZipXmls($file);
                foreach ($fromZip as $item) {
                    $blobs[] = $item;
                    if (count($blobs) > self::MAX_FILES) {
                        throw ValidationException::withMessages([
                            'files' => ['O lote excede o limite de '.self::MAX_FILES.' XMLs.'],
                        ]);
                    }
                }
                continue;
            }

            if ($ext !== 'xml') {
                throw ValidationException::withMessages([
                    'files' => ["Arquivo \"{$name}\" inválido. Envie .xml ou .zip."],
                ]);
            }

            $content = file_get_contents($file->getRealPath() ?: '');
            if ($content === false || trim($content) === '') {
                throw ValidationException::withMessages([
                    'files' => ["Não foi possível ler \"{$name}\"."],
                ]);
            }

            $blobs[] = ['name' => $name, 'content' => $content];
            if (count($blobs) > self::MAX_FILES) {
                throw ValidationException::withMessages([
                    'files' => ['O lote excede o limite de '.self::MAX_FILES.' XMLs.'],
                ]);
            }
        }

        if ($blobs === []) {
            throw ValidationException::withMessages([
                'files' => ['Nenhum XML encontrado nos arquivos enviados.'],
            ]);
        }

        return $blobs;
    }

    /**
     * @return list<array{name: string, content: string}>
     */
    private function extractZipXmls(UploadedFile $file): array
    {
        if (! class_exists(ZipArchive::class)) {
            throw ValidationException::withMessages([
                'files' => ['Suporte a ZIP indisponível neste servidor.'],
            ]);
        }

        $zip = new ZipArchive;
        $path = $file->getRealPath();
        if ($path === false || $zip->open($path) !== true) {
            throw ValidationException::withMessages([
                'files' => ['Não foi possível abrir o arquivo ZIP.'],
            ]);
        }

        $blobs = [];
        try {
            for ($i = 0; $i < $zip->numFiles; $i++) {
                $stat = $zip->statIndex($i);
                $name = (string) ($stat['name'] ?? '');
                if ($name === '' || str_ends_with($name, '/')) {
                    continue;
                }
                if (str_contains($name, '..')) {
                    continue;
                }
                if (! str_ends_with(strtolower($name), '.xml')) {
                    continue;
                }
                $content = $zip->getFromIndex($i);
                if (! is_string($content) || trim($content) === '') {
                    continue;
                }
                $blobs[] = [
                    'name' => basename($name),
                    'content' => $content,
                ];
                if (count($blobs) > self::MAX_FILES) {
                    throw ValidationException::withMessages([
                        'files' => ['O ZIP excede o limite de '.self::MAX_FILES.' XMLs.'],
                    ]);
                }
            }
        } finally {
            $zip->close();
        }

        if ($blobs === []) {
            throw ValidationException::withMessages([
                'files' => ['O ZIP não contém arquivos .xml.'],
            ]);
        }

        return $blobs;
    }

    /**
     * Prefer BrasilAPI; XML only as fallback for empty fields.
     *
     * @param  array<string, mixed>  $xmlPayload
     * @return array{payload: array<string, mixed>, status: string, filled: list<string>, sources: array<string, string>, message: ?string}
     */
    private function enrichPreferBrasilApi(array $xmlPayload, string $cnpj): array
    {
        $sources = [];
        foreach ($xmlPayload as $field => $_) {
            $sources[$field] = 'xml';
        }

        if (! array_key_exists($cnpj, $this->cnpjLookupCache)) {
            try {
                $this->cnpjLookupCache[$cnpj] = $this->brasilApiClient->getCnpj($cnpj);
            } catch (Throwable $e) {
                $this->cnpjLookupCache[$cnpj] = null;

                return [
                    'payload' => $xmlPayload,
                    'status' => 'parcial',
                    'filled' => [],
                    'sources' => $sources,
                    'message' => 'Consulta CNPJ (BrasilAPI) falhou; mantendo dados do XML. ('.$e->getMessage().')',
                ];
            }
        }

        $remote = $this->cnpjLookupCache[$cnpj];
        if (! is_array($remote)) {
            return [
                'payload' => $xmlPayload,
                'status' => 'parcial',
                'filled' => [],
                'sources' => $sources,
                'message' => 'CNPJ não encontrado na BrasilAPI; mantendo dados do XML.',
            ];
        }

        $mapped = $this->mapBrasilApiToParceiro($remote);
        $payload = $xmlPayload;
        $filled = [];

        // BrasilAPI wins for identity/address fields when present
        foreach ($mapped as $field => $value) {
            if ($value === null || $value === '') {
                continue;
            }
            $payload[$field] = $value;
            $sources[$field] = 'brasilapi';
            $filled[] = $field;
        }

        // XML fallback for gaps (and always keep IE from XML if API não tem)
        foreach (self::MERGE_FIELDS as $field) {
            $current = $payload[$field] ?? null;
            if (($current === null || $current === '') && isset($xmlPayload[$field]) && $xmlPayload[$field] !== null && $xmlPayload[$field] !== '') {
                $payload[$field] = $xmlPayload[$field];
                $sources[$field] = 'xml';
            }
        }

        // IE: prefer XML (emit) — BrasilAPI não traz IE estadual tipicamente
        if (! empty($xmlPayload['ie'])) {
            $payload['ie'] = $xmlPayload['ie'];
            $sources['ie'] = 'xml';
        }

        if (! empty($xmlPayload['cfop_entrada_padrao']) && empty($payload['cfop_entrada_padrao'])) {
            $payload['cfop_entrada_padrao'] = $xmlPayload['cfop_entrada_padrao'];
            $sources['cfop_entrada_padrao'] = 'xml';
        }

        if (! empty($xmlPayload['tipo_fornecimento'])) {
            $payload['tipo_fornecimento'] = $xmlPayload['tipo_fornecimento'];
            $sources['tipo_fornecimento'] = 'default';
        }

        // CRT hint only if still no regime
        if (empty($payload['regime']) && ! empty($xmlPayload['regime'])) {
            $payload['regime'] = $xmlPayload['regime'];
            $sources['regime'] = 'xml_crt';
        }

        if (! empty($payload['regime']) && empty($payload['regime_desde'])) {
            $payload['regime_desde'] = now()->toDateString();
        }

        return [
            'payload' => $payload,
            'status' => $filled === [] ? 'ok_sem_lacunas' : 'atualizado',
            'filled' => $filled,
            'sources' => $sources,
            'message' => $filled === []
                ? null
                : 'Campos preferidos da BrasilAPI: '.implode(', ', array_slice($filled, 0, 12)).(count($filled) > 12 ? '…' : '').'.',
        ];
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, string>  $sources
     * @return array<string, mixed>
     */
    private function fillIbgeFromCep(array $payload, array &$sources): array
    {
        $ibge = $this->digitsOrNull($payload['ibge'] ?? null);
        $cep = $this->digitsOrNull($payload['cep'] ?? null);
        if ($ibge !== null || $cep === null || strlen($cep) !== 8) {
            return $payload;
        }

        if (! array_key_exists($cep, $this->cepLookupCache)) {
            try {
                $this->cepLookupCache[$cep] = $this->brasilApiClient->getCep($cep);
            } catch (Throwable) {
                $this->cepLookupCache[$cep] = null;
            }
        }

        $remote = $this->cepLookupCache[$cep];
        if (! is_array($remote)) {
            return $payload;
        }

        $viaIbge = $this->digitsOrNull($remote['ibge'] ?? null);
        if ($viaIbge !== null) {
            $payload['ibge'] = $viaIbge;
            $sources['ibge'] = 'viacep';
        }

        return $payload;
    }

    /**
     * @param  array<string, mixed>  $emit
     * @return array<string, mixed>
     */
    private function xmlToSeedPayload(array $emit, ?string $cfop): array
    {
        $payload = [
            'cnpj_cpf' => $this->digitsOrNull($emit['cnpj_cpf'] ?? null),
            'tipo_pessoa' => 'PJ',
            'razao_social' => $this->nullableString($emit['razao_social'] ?? null),
            'nome_fantasia' => $this->nullableString($emit['nome_fantasia'] ?? null),
            'ie' => $this->nullableString($emit['ie'] ?? null),
            'logradouro' => $this->nullableString($emit['logradouro'] ?? null),
            'numero' => $this->nullableString($emit['numero'] ?? null),
            'complemento' => $this->nullableString($emit['complemento'] ?? null),
            'bairro' => $this->nullableString($emit['bairro'] ?? null),
            'municipio' => $this->nullableString($emit['municipio'] ?? null),
            'uf' => $this->upper($emit['uf'] ?? null),
            'cep' => $this->digitsOrNull($emit['cep'] ?? null),
            'ibge' => $this->digitsOrNull($emit['ibge'] ?? null),
            'telefone' => $this->digitsOrNull($emit['telefone'] ?? null),
            'papel_fornecedor' => true,
            'emite_documento_fiscal' => true,
            'tipo_fornecimento' => 'MERCADORIA',
            'situacao' => 'ATIVO',
        ];

        if ($cfop !== null && $cfop !== '') {
            $payload['cfop_entrada_padrao'] = $cfop;
        }

        $regimeHint = $emit['regime_hint'] ?? null;
        if (is_string($regimeHint) && $regimeHint !== '') {
            $payload['regime'] = $regimeHint;
        }

        return array_filter(
            $payload,
            static fn ($v) => $v !== null && $v !== ''
        );
    }

    /**
     * @param  array<string, mixed>  $remote
     * @return array<string, mixed>
     */
    private function mapBrasilApiToParceiro(array $remote): array
    {
        $uf = isset($remote['uf']) ? strtoupper(trim((string) $remote['uf'])) : null;
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
            'cnaes_secundarios' => $this->normalizeCnaes($remote['cnaes_secundarios'] ?? null),
        ];

        if ($mapped['regime'] !== null) {
            $mapped['regime_desde'] = now()->toDateString();
        }

        if (ParceiroFiscalRules::suggestAreaIncentivada($mapped['uf'] ?? null, null)) {
            $mapped['area_incentivada'] = true;
        }

        return $mapped;
    }

    /**
     * @param  mixed  $raw
     * @return list<array{codigo: string, descricao: string|null}>|null
     */
    private function normalizeCnaes(mixed $raw): ?array
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
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function finalizeCreatePayload(array $data): array
    {
        unset($data['line'], $data['status'], $data['errors'], $data['preview'], $data['parceiro_id'], $data['acao']);

        $data['papel_fornecedor'] = true;
        $data['emite_documento_fiscal'] = $data['emite_documento_fiscal'] ?? true;
        $data['tipo_pessoa'] = 'PJ';
        $data['tipo_fornecimento'] = $data['tipo_fornecimento'] ?? 'MERCADORIA';
        $data['situacao'] = $data['situacao'] ?? 'ATIVO';

        if (isset($data['cnpj_cpf'])) {
            $data['cnpj_cpf'] = $this->digitsOrNull($data['cnpj_cpf']);
        }
        if (isset($data['cep'])) {
            $data['cep'] = $this->digitsOrNull($data['cep']);
        }
        if (isset($data['ibge'])) {
            $data['ibge'] = $this->digitsOrNull($data['ibge']);
        }
        if (isset($data['uf']) && is_string($data['uf'])) {
            $data['uf'] = strtoupper(trim($data['uf']));
        }

        $rules = ParceiroValidationRules::rules(partial: false);
        $validator = Validator::make($data, $rules);
        if ($validator->fails()) {
            throw ValidationException::withMessages($validator->errors()->toArray());
        }

        $validated = $validator->validated();
        unset($validated['cadastro_fiscal_completo']);
        foreach (['papel_fornecedor', 'emite_documento_fiscal', 'tipo_fornecimento', 'cfop_entrada_padrao', 'cnaes_secundarios', 'regime_desde', 'area_incentivada'] as $keep) {
            if (array_key_exists($keep, $data) && ! array_key_exists($keep, $validated)) {
                $validated[$keep] = $data[$keep];
            }
        }

        return $validated;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @param  array<string, mixed>  $extracted
     * @param  array<string, string>  $fieldSources
     * @param  array<string, mixed>  $enrichment
     * @return array<string, mixed>
     */
    private function buildPreview(
        array $payload,
        array $extracted,
        string $fileName,
        string $cnpjStatus,
        array $fieldSources,
        array $enrichment,
        ?string $destAviso,
        ?Parceiro $existing,
    ): array {
        $transportadora = null;
        if (! empty($extracted['transportadora'])) {
            $transportadora = [
                'cnpj' => $extracted['transportadora']['cnpj'] ?? null,
                'cpf' => $extracted['transportadora']['cpf'] ?? null,
                'nome' => $extracted['transportadora']['nome'] ?? null,
            ];
        }

        return [
            'file_name' => $fileName,
            'chave_nfe' => $extracted['chave_nfe'] ?? null,
            'razao_social' => $payload['razao_social'] ?? null,
            'nome_fantasia' => $payload['nome_fantasia'] ?? null,
            'cnpj_cpf' => $this->digitsOrNull($payload['cnpj_cpf'] ?? $extracted['emit']['cnpj_cpf'] ?? null),
            'municipio' => $payload['municipio'] ?? null,
            'uf' => $payload['uf'] ?? null,
            'ie' => $payload['ie'] ?? null,
            'regime' => $payload['regime'] ?? null,
            'tipo_fornecimento' => $payload['tipo_fornecimento'] ?? 'MERCADORIA',
            'cfop_entrada_padrao' => $payload['cfop_entrada_padrao'] ?? null,
            'cnpj_status' => $cnpjStatus,
            'parceiro_id' => $existing?->id,
            'parceiro_codigo' => $existing?->codigo,
            'field_sources' => $fieldSources,
            'enrichment' => [
                'status' => $enrichment['status'] ?? 'ignorado',
                'filled' => $enrichment['filled'] ?? [],
                'message' => $enrichment['message'] ?? null,
            ],
            'dest_aviso' => $destAviso,
            'transportadora' => $transportadora,
            'papeis' => ['fornecedor'],
        ];
    }

    /**
     * @param  array<string, mixed>  $from
     * @return array<string, mixed>
     */
    private function pickAddress(array $from): array
    {
        $out = [];
        foreach (self::ADDRESS_FIELDS as $field) {
            $out[$field] = $from[$field] ?? null;
        }

        return $out;
    }

    /**
     * @return array{line: int, status: string, errors: list<string>, id?: int, codigo?: string, razao_social?: ?string, cnpj_cpf?: ?string}
     */
    private function commitRow(int $line, string $status, array $errors, Parceiro $parceiro): array
    {
        return [
            'line' => $line,
            'status' => $status,
            'errors' => $errors,
            'id' => $parceiro->id,
            'codigo' => $parceiro->codigo,
            'razao_social' => $parceiro->razao_social,
            'cnpj_cpf' => $parceiro->cnpj_cpf,
        ];
    }

    /**
     * @param  list<string>  $errors
     * @return array<string, mixed>
     */
    private function errorRow(
        int $line,
        string $fileName,
        array $errors,
        ?string $razao = null,
        ?string $cnpj = null,
    ): array {
        return [
            'line' => $line,
            'file_name' => $fileName,
            'status' => 'erro',
            'acao' => null,
            'errors' => $errors,
            'warnings' => [],
            'data' => [],
            'preview' => [
                'file_name' => $fileName,
                'chave_nfe' => null,
                'razao_social' => $razao,
                'cnpj_cpf' => $cnpj,
                'municipio' => null,
                'uf' => null,
                'cnpj_status' => 'erro',
                'field_sources' => [],
                'enrichment' => ['status' => 'ignorado', 'filled' => [], 'message' => null],
                'papeis' => [],
            ],
        ];
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return array{total: int, ok: int, info: int, erro: int, rows: list<array<string, mixed>>}
     */
    private function buildReport(array $rows): array
    {
        $ok = 0;
        $info = 0;
        $erro = 0;
        foreach ($rows as $row) {
            match ($row['status'] ?? '') {
                'ok' => $ok++,
                'info' => $info++,
                default => $erro++,
            };
        }

        return [
            'total' => count($rows),
            'ok' => $ok,
            'info' => $info,
            'erro' => $erro,
            'rows' => $rows,
        ];
    }

    private function normalizeStreet(?string $value): string
    {
        $token = $this->normalizeToken($value);
        $replacements = [
            'rua' => 'r',
            'avenida' => 'av',
            'alameda' => 'al',
            'travessa' => 'tv',
            'doutor' => 'dr',
            'presidente' => 'pres',
            'professor' => 'prof',
        ];
        foreach ($replacements as $from => $to) {
            $token = preg_replace('/\b'.preg_quote($from, '/').'\b/', $to, $token) ?? $token;
        }

        return trim(preg_replace('/\s+/', ' ', $token) ?? $token);
    }

    private function normalizeToken(mixed $value): string
    {
        if ($value === null) {
            return '';
        }
        $s = mb_strtolower(trim((string) $value));
        $translated = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $s);
        if (is_string($translated) && $translated !== '') {
            $s = $translated;
        }
        $s = preg_replace('/[^a-z0-9\s]/', ' ', $s) ?? $s;

        return trim(preg_replace('/\s+/', ' ', $s) ?? $s);
    }

    private function tokenContains(string $a, string $b): bool
    {
        return str_contains($a, $b) || str_contains($b, $a);
    }

    private function maskCnpj(string $digits): string
    {
        if (strlen($digits) !== 14) {
            return $digits;
        }

        return substr($digits, 0, 2).'.'.substr($digits, 2, 3).'.'.substr($digits, 5, 3)
            .'/'.substr($digits, 8, 4).'-'.substr($digits, 12, 2);
    }

    private function exceptionMessage(Throwable $e): string
    {
        if ($e instanceof ValidationException) {
            return implode(' ', $e->validator->errors()->all());
        }

        return $e->getMessage() !== '' ? $e->getMessage() : 'Falha ao importar o XML.';
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

    private function upper(mixed $value): ?string
    {
        $s = $this->nullableString($value);

        return $s === null ? null : strtoupper($s);
    }
}
