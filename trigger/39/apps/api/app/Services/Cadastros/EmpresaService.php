<?php

namespace App\Services\Cadastros;

use App\Models\Empresa;
use App\Models\EmpresaFiscalHistorico;
use App\Services\Audit\AuditLogger;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class EmpresaService
{
    public function __construct(private readonly AuditLogger $auditLogger) {}

    /**
     * @param  array<string, mixed>  $data
     */
    public function update(Empresa $empresa, array $data, ?string $motivoVigencia = null): Empresa
    {
        return DB::transaction(function () use ($empresa, $data, $motivoVigencia) {
            $beforeSnapshot = $empresa->load('fiscaisHistorico')->toArray();
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

            $empresa->update($incoming);
            $empresa->refresh();

            $afterFiscal = $empresa->only(EmpresaFiscalRules::vigenciaFields());
            $beforeFiscal = array_intersect_key($current, array_flip(EmpresaFiscalRules::vigenciaFields()));

            if (EmpresaFiscalRules::fiscalChanged($beforeFiscal, $afterFiscal)) {
                $this->rotateFiscalHistorico(
                    $empresa,
                    $motivoVigencia ?: 'Alteração fiscal do emitente',
                    Auth::id()
                );
            }

            $fresh = $empresa->fresh(['fiscaisHistorico']);
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
     * @param  array<string, mixed>  $incoming
     * @param  array<string, mixed>  $current
     * @return array<string, mixed>
     */
    private function applyFiscalRules(array $incoming, array $current): array
    {
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
