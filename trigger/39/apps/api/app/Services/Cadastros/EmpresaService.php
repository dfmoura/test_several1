<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\EmpresaContaFinanceira;
use App\Models\EmpresaFiscalHistorico;
use App\Services\Audit\AuditLogger;
use App\Services\Codigo\CodigoGenerator;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EmpresaService
{
    public function __construct(
        private readonly AuditLogger $auditLogger,
        private readonly CodigoGenerator $codigoGenerator,
    ) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Empresa $empresa, array $data, ?string $motivoVigencia = null): Empresa
    {
        return DB::transaction(function () use ($empresa, $data, $motivoVigencia) {
            $hasContas = array_key_exists('contas_financeiras', $data);
            $contas = $hasContas ? $this->normalizeContas($data['contas_financeiras']) : null;
            unset($data['contas_financeiras']);

            $beforeSnapshot = $empresa->load(['fiscaisHistorico', 'contasFinanceiras'])->toArray();
            $current = $empresa->only([
                'cnpj', 'razao_social', 'nome_fantasia', 'ie', 'im', 'iest',
                'ie_status', 'ie_consultado_em', 'regime', 'crt', 'regime_desde',
                'cnae', 'cnaes_secundarios', 'email', 'telefone',
                'logradouro', 'numero', 'complemento', 'bairro', 'municipio',
                'uf', 'cep', 'ibge', 'venda_ativa', 'estoque_ativo',
                'logo_path', 'situacao', 'cadastro_fiscal_completo',
            ]);

            $incoming = $this->mapAttributes($data);
            $incoming = $this->applyFiscalRules($incoming, $current);

            if ($incoming !== []) {
                $empresa->update($incoming);
                $empresa->refresh();
            }

            if ($hasContas && $contas !== null) {
                $this->syncContas($empresa, $contas);
            }

            $afterFiscal = $empresa->only(EmpresaFiscalRules::vigenciaFields());
            $beforeFiscal = array_intersect_key($current, array_flip(EmpresaFiscalRules::vigenciaFields()));

            if ($incoming !== [] && EmpresaFiscalRules::fiscalChanged($beforeFiscal, $afterFiscal)) {
                $this->rotateFiscalHistorico(
                    $empresa,
                    $motivoVigencia ?: 'Alteração fiscal do emitente',
                    Auth::id()
                );
            }

            $fresh = $empresa->fresh(['fiscaisHistorico', 'contasFinanceiras', ...Empresa::userStampWith()]);
            $this->auditLogger->log(
                'ATUALIZAR',
                'empresa',
                $empresa->id,
                $beforeSnapshot,
                $fresh?->toArray()
            );

            return $fresh ?? $empresa;
        });
    }

    /**
     * @param  mixed  $raw
     * @return list<array<string, mixed>>
     */
    private function normalizeContas(mixed $raw): array
    {
        if ($raw === null) {
            return [];
        }
        if (! is_array($raw)) {
            throw ValidationException::withMessages([
                'contas_financeiras' => ['Contas financeiras devem ser uma lista.'],
            ]);
        }

        $normalized = [];
        foreach ($raw as $index => $row) {
            if (! is_array($row)) {
                continue;
            }

            $tipo = strtoupper(trim((string) ($row['tipo'] ?? EmpresaContaFinanceira::TIPO_BANCO)));
            if (! in_array($tipo, EmpresaContaFinanceira::TIPOS, true)) {
                throw ValidationException::withMessages([
                    "contas_financeiras.$index.tipo" => ['Tipo inválido. Use BANCO, CAIXA ou APLICACAO.'],
                ]);
            }

            $descricao = trim((string) ($row['descricao'] ?? ''));
            $bancoCodigo = $this->nullableString($row['banco_codigo'] ?? null);
            $bancoNome = $this->nullableString($row['banco_nome'] ?? null);
            $agencia = $this->nullableString($row['agencia'] ?? null);
            $conta = $this->nullableString($row['conta'] ?? null);
            $pix = $this->nullableString($row['pix_chave'] ?? null);
            $tipoConta = $this->nullableString($row['tipo_conta'] ?? null);
            $observacao = $this->nullableString($row['observacao'] ?? null);
            $ativa = array_key_exists('ativa', $row) ? (bool) $row['ativa'] : true;

            if ($tipoConta !== null && ! in_array($tipoConta, EmpresaContaFinanceira::TIPOS_CONTA, true)) {
                throw ValidationException::withMessages([
                    "contas_financeiras.$index.tipo_conta" => ['Tipo de conta inválido.'],
                ]);
            }

            $saldoAbertura = $this->nullableDecimal($row['saldo_abertura'] ?? null, "contas_financeiras.$index.saldo_abertura");
            $saldoEm = $this->nullableDate($row['saldo_abertura_em'] ?? null);

            if ($saldoAbertura !== null && $saldoEm === null) {
                throw ValidationException::withMessages([
                    "contas_financeiras.$index.saldo_abertura_em" => [
                        'Informe a data do saldo de abertura junto com o valor.',
                    ],
                ]);
            }
            if ($saldoEm !== null && $saldoAbertura === null) {
                throw ValidationException::withMessages([
                    "contas_financeiras.$index.saldo_abertura" => [
                        'Informe o valor do saldo de abertura junto com a data.',
                    ],
                ]);
            }

            $empty = $descricao === ''
                && $bancoCodigo === null
                && $bancoNome === null
                && $agencia === null
                && $conta === null
                && $pix === null
                && $saldoAbertura === null;

            if ($empty) {
                continue;
            }

            if ($descricao === '') {
                $descricao = match ($tipo) {
                    EmpresaContaFinanceira::TIPO_CAIXA => 'Caixa',
                    EmpresaContaFinanceira::TIPO_APLICACAO => 'Aplicação',
                    default => $bancoNome
                        ? trim(($bancoCodigo ? $bancoCodigo.' — ' : '').$bancoNome)
                        : 'Conta bancária',
                };
            }

            if ($tipo === EmpresaContaFinanceira::TIPO_BANCO && $bancoCodigo === null && $bancoNome === null) {
                throw ValidationException::withMessages([
                    "contas_financeiras.$index.banco_codigo" => [
                        'Conta do tipo BANCO exige banco (código ou nome).',
                    ],
                ]);
            }

            if ($tipo !== EmpresaContaFinanceira::TIPO_BANCO) {
                // Caixa/aplicação podem não ter banco; limpa tipo_conta bancário se vazio
                if ($tipo === EmpresaContaFinanceira::TIPO_CAIXA && $bancoCodigo === null && $bancoNome === null) {
                    $tipoConta = null;
                }
            }

            $id = isset($row['id']) && is_numeric($row['id']) ? (int) $row['id'] : null;

            $normalized[] = [
                'id' => $id,
                'tipo' => $tipo,
                'descricao' => $descricao,
                'banco_codigo' => $bancoCodigo,
                'banco_nome' => $bancoNome,
                'agencia' => $agencia,
                'conta' => $conta,
                'tipo_conta' => $tipoConta,
                'pix_chave' => $pix,
                'principal' => (bool) ($row['principal'] ?? false),
                'ativa' => $ativa,
                'ordem' => (int) ($row['ordem'] ?? $index),
                'saldo_abertura' => $saldoAbertura,
                'saldo_abertura_em' => $saldoEm,
                'observacao' => $observacao,
            ];
        }

        return $this->ensureSinglePrincipal($normalized);
    }

    /**
     * @param  list<array<string, mixed>>  $rows
     * @return list<array<string, mixed>>
     */
    private function ensureSinglePrincipal(array $rows): array
    {
        if ($rows === []) {
            return [];
        }

        $principalIndex = null;
        foreach ($rows as $index => $row) {
            if (($row['ativa'] ?? true) === true && ($row['principal'] ?? false) === true) {
                $principalIndex = $index;
                break;
            }
        }

        if ($principalIndex === null) {
            foreach ($rows as $index => $row) {
                if (($row['ativa'] ?? true) === true) {
                    $principalIndex = $index;
                    break;
                }
            }
        }

        if ($principalIndex === null) {
            $principalIndex = 0;
        }

        foreach ($rows as $index => &$row) {
            $row['principal'] = $index === $principalIndex;
            $row['ordem'] = $index;
        }
        unset($row);

        return $rows;
    }

    /**
     * Sync por id: atualiza, cria novas, soft-delete as removidas (preserva histórico para M06).
     *
     * @param  list<array<string, mixed>>  $contas
     */
    private function syncContas(Empresa $empresa, array $contas): void
    {
        $keepIds = [];

        foreach ($contas as $row) {
            $id = $row['id'] ?? null;
            unset($row['id']);

            if ($id !== null) {
                $existing = EmpresaContaFinanceira::query()
                    ->where('empresa_id', $empresa->id)
                    ->where('id', $id)
                    ->first();

                if ($existing === null) {
                    throw ValidationException::withMessages([
                        'contas_financeiras' => ["Conta financeira #{$id} não pertence a esta empresa."],
                    ]);
                }

                $existing->update($row);
                $keepIds[] = $existing->id;
                continue;
            }

            $codigo = $this->codigoGenerator->nextCode(null, 'CFIN');
            $created = $empresa->contasFinanceiras()->create([
                ...$row,
                'codigo' => $codigo,
            ]);
            $keepIds[] = $created->id;
        }

        $query = EmpresaContaFinanceira::query()->where('empresa_id', $empresa->id);
        if ($keepIds !== []) {
            $query->whereNotIn('id', $keepIds);
        }
        $query->get()->each->delete();
    }

    private function nullableString(mixed $value): ?string
    {
        if ($value === null) {
            return null;
        }
        $s = trim((string) $value);

        return $s === '' ? null : $s;
    }

    private function nullableDecimal(mixed $value, string $field): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_string($value)) {
            $trimmed = trim(str_replace(' ', '', $value));
            if (str_contains($trimmed, ',')) {
                $trimmed = str_replace('.', '', $trimmed);
                $trimmed = str_replace(',', '.', $trimmed);
            }
            $value = $trimmed;
        }
        if (! is_numeric($value)) {
            throw ValidationException::withMessages([
                $field => ['Valor numérico inválido.'],
            ]);
        }

        return number_format((float) $value, 2, '.', '');
    }

    private function nullableDate(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        $s = trim((string) $value);
        if ($s === '') {
            return null;
        }

        return substr($s, 0, 10);
    }

    /**
     * @param  array<string, mixed>  $incoming
     * @param  array<string, mixed>  $current
     * @return array<string, mixed>
     */
    private function applyFiscalRules(array $incoming, array $current): array
    {
        if ($incoming === []) {
            return [];
        }

        if (array_key_exists('cnpj', $incoming)) {
            $digits = preg_replace('/\D/', '', (string) $incoming['cnpj']) ?? '';
            if (strlen($digits) !== 14) {
                throw ValidationException::withMessages([
                    'cnpj' => ['CNPJ deve conter 14 dígitos.'],
                ]);
            }
            if (! EmpresaFiscalRules::isValidCnpj($digits)) {
                throw ValidationException::withMessages([
                    'cnpj' => ['CNPJ com dígito verificador inválido.'],
                ]);
            }
            $incoming['cnpj'] = $digits;
        }

        if (array_key_exists('ie', $incoming)) {
            $incoming['ie'] = EmpresaFiscalRules::normalizeIe($incoming['ie']);
        }
        if (array_key_exists('im', $incoming)) {
            $im = trim((string) ($incoming['im'] ?? ''));
            $incoming['im'] = $im === '' ? null : $im;
        }
        if (array_key_exists('iest', $incoming)) {
            $iest = EmpresaFiscalRules::normalizeIe($incoming['iest']);
            $incoming['iest'] = $iest;
        }

        if (array_key_exists('regime', $incoming) || array_key_exists('crt', $incoming)) {
            $synced = EmpresaFiscalRules::syncCrt($incoming, $current);
            $incoming['regime'] = $synced['regime'];
            $incoming['crt'] = $synced['crt'];
        }

        $prevStatus = (string) ($current['ie_status'] ?? EmpresaFiscalRules::IE_STATUS_NAO_VERIFICADA);
        if (array_key_exists('ie_status', $incoming)) {
            $newStatus = (string) $incoming['ie_status'];
            if (! in_array($newStatus, EmpresaFiscalRules::IE_STATUSES, true)) {
                throw ValidationException::withMessages([
                    'ie_status' => ['Status da IE inválido.'],
                ]);
            }
            if (
                $newStatus !== $prevStatus
                && in_array($newStatus, [
                    EmpresaFiscalRules::IE_STATUS_OK,
                    EmpresaFiscalRules::IE_STATUS_BAIXADA,
                    EmpresaFiscalRules::IE_STATUS_NAO_HABILITADA,
                    EmpresaFiscalRules::IE_STATUS_ISENTA,
                ], true)
            ) {
                $incoming['ie_consultado_em'] = now();
            }
        }

        $ie = array_key_exists('ie', $incoming)
            ? EmpresaFiscalRules::normalizeIe($incoming['ie'])
            : EmpresaFiscalRules::normalizeIe($current['ie'] ?? null);

        if (EmpresaFiscalRules::isIeIsento($ie)) {
            $incoming['ie_status'] = $incoming['ie_status']
                ?? EmpresaFiscalRules::IE_STATUS_ISENTA;
        }

        $prevRegime = $current['regime'] ?? null;
        $newRegime = array_key_exists('regime', $incoming) ? $incoming['regime'] : $prevRegime;
        if ($newRegime !== $prevRegime) {
            $incoming['regime_desde'] = $incoming['regime_desde'] ?? now()->toDateString();
        }
        if ($newRegime && empty($incoming['regime_desde'] ?? $current['regime_desde'] ?? null)) {
            $incoming['regime_desde'] = now()->toDateString();
        }

        if (array_key_exists('cnaes_secundarios', $incoming)) {
            $incoming['cnaes_secundarios'] = $this->normalizeCnaesSecundarios($incoming['cnaes_secundarios']);
        }

        $evalAttrs = array_merge($current, $incoming);
        $evaluation = EmpresaFiscalRules::evaluate($evalAttrs);
        $incoming['cadastro_fiscal_completo'] = $evaluation['completo'];

        unset(
            $incoming['apto_emissao_nfe'],
            $incoming['fiscal_pendencias'],
            $incoming['fiscal_pendencias_emissao'],
            $incoming['motivo_vigencia_fiscal'],
        );

        return $incoming;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array<string, mixed>
     */
    private function mapAttributes(array $data): array
    {
        $fields = [
            'cnpj', 'razao_social', 'nome_fantasia', 'ie', 'im', 'iest',
            'ie_status', 'ie_consultado_em', 'regime', 'crt', 'regime_desde',
            'cnae', 'cnaes_secundarios', 'email', 'telefone',
            'logradouro', 'numero', 'complemento', 'bairro', 'municipio',
            'uf', 'cep', 'ibge', 'venda_ativa', 'estoque_ativo',
            'logo_path', 'situacao',
        ];

        $mapped = [];
        foreach ($fields as $field) {
            if (! array_key_exists($field, $data)) {
                continue;
            }
            $value = $data[$field];
            if (in_array($field, ['cep', 'cnae', 'ibge', 'telefone'], true) && is_string($value)) {
                $value = preg_replace('/\D/', '', $value) ?: null;
            }
            if ($field === 'uf' && is_string($value)) {
                $value = mb_strtoupper(trim($value), 'UTF-8');
            }
            if ($field === 'regime_desde' && $value === '') {
                $value = null;
            }
            $mapped[$field] = $value;
        }

        return $mapped;
    }

    /**
     * @param  mixed  $raw
     * @return list<array{codigo: string, descricao: string|null}>|null
     */
    private function normalizeCnaesSecundarios(mixed $raw): ?array
    {
        if ($raw === null || $raw === '') {
            return null;
        }
        if (! is_array($raw)) {
            throw ValidationException::withMessages([
                'cnaes_secundarios' => ['CNAEs secundários devem ser uma lista.'],
            ]);
        }

        $out = [];
        foreach ($raw as $item) {
            if (! is_array($item)) {
                continue;
            }
            $codigo = preg_replace('/\D/', '', (string) ($item['codigo'] ?? '')) ?? '';
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

    private function rotateFiscalHistorico(Empresa $empresa, string $motivo, ?int $userId): void
    {
        $hoje = now()->toDateString();

        EmpresaFiscalHistorico::query()
            ->where('empresa_id', $empresa->id)
            ->whereNull('vigencia_fim')
            ->update(['vigencia_fim' => $hoje]);

        EmpresaFiscalHistorico::query()->create([
            'empresa_id' => $empresa->id,
            'vigencia_inicio' => $hoje,
            'vigencia_fim' => null,
            'ie' => $empresa->ie,
            'im' => $empresa->im,
            'iest' => $empresa->iest,
            'ie_status' => $empresa->ie_status,
            'regime' => $empresa->regime,
            'crt' => $empresa->crt,
            'motivo' => $motivo,
            'alterado_por' => $userId,
        ]);
    }
}
