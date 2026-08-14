<?php

namespace App\Services\Cadastros;

use Illuminate\Validation\ValidationException;

/**
 * Regras fiscais do emitente (EMP) — o que a NF-e exige no grupo emit + preparação Lucro Real.
 *
 * CRT (Código de Regime Tributário):
 *  1 = Simples Nacional
 *  2 = Simples Nacional — excesso de sublimite da receita bruta
 *  3 = Regime Normal
 *  4 = Simples Nacional — MEI
 */
class EmpresaFiscalRules
{
    public const CRT_SIMPLES = 1;

    public const CRT_SIMPLES_SUBLIMITE = 2;

    public const CRT_NORMAL = 3;

    public const CRT_MEI = 4;

    public const REGIMES = [
        'SIMPLES_NACIONAL',
        'MEI',
        'LUCRO_PRESUMIDO',
        'LUCRO_REAL',
    ];

    public const CRTS = [
        self::CRT_SIMPLES,
        self::CRT_SIMPLES_SUBLIMITE,
        self::CRT_NORMAL,
        self::CRT_MEI,
    ];

    public const IE_STATUS_NAO_VERIFICADA = 'NAO_VERIFICADA';

    public const IE_STATUS_OK = 'OK';

    public const IE_STATUS_BAIXADA = 'BAIXADA';

    public const IE_STATUS_NAO_HABILITADA = 'NAO_HABILITADA';

    public const IE_STATUS_ISENTA = 'ISENTA';

    public const IE_STATUSES = [
        self::IE_STATUS_NAO_VERIFICADA,
        self::IE_STATUS_OK,
        self::IE_STATUS_BAIXADA,
        self::IE_STATUS_NAO_HABILITADA,
        self::IE_STATUS_ISENTA,
    ];

    public static function normalizeRegime(mixed $regime): string
    {
        $value = mb_strtoupper(trim((string) ($regime ?? '')), 'UTF-8');

        return match ($value) {
            'PRESUMIDO' => 'LUCRO_PRESUMIDO',
            'REAL' => 'LUCRO_REAL',
            default => $value !== '' ? $value : 'SIMPLES_NACIONAL',
        };
    }

    public static function defaultCrtForRegime(?string $regime): int
    {
        return match (self::normalizeRegime($regime)) {
            'MEI' => self::CRT_MEI,
            'LUCRO_PRESUMIDO', 'LUCRO_REAL' => self::CRT_NORMAL,
            default => self::CRT_SIMPLES,
        };
    }

    /**
     * @return list<int>
     */
    public static function allowedCrtsForRegime(?string $regime): array
    {
        return match (self::normalizeRegime($regime)) {
            'MEI' => [self::CRT_MEI],
            'LUCRO_PRESUMIDO', 'LUCRO_REAL' => [self::CRT_NORMAL],
            default => [self::CRT_SIMPLES, self::CRT_SIMPLES_SUBLIMITE],
        };
    }

    public static function isCrtAllowedForRegime(?string $regime, int $crt): bool
    {
        return in_array($crt, self::allowedCrtsForRegime($regime), true);
    }

    /**
     * @return array{regime: string, crt: int}
     */
    public static function syncCrt(array $data, array $current = []): array
    {
        $regime = array_key_exists('regime', $data)
            ? self::normalizeRegime($data['regime'])
            : self::normalizeRegime($current['regime'] ?? 'SIMPLES_NACIONAL');

        if (! in_array($regime, self::REGIMES, true)) {
            throw ValidationException::withMessages([
                'regime' => ["Regime tributário inválido: {$regime}."],
            ]);
        }

        $currentCrt = isset($current['crt']) ? (int) $current['crt'] : null;

        if (! array_key_exists('crt', $data) || $data['crt'] === null || $data['crt'] === '') {
            $crt = self::defaultCrtForRegime($regime);
            if (
                $crt === self::CRT_SIMPLES
                && $currentCrt === self::CRT_SIMPLES_SUBLIMITE
                && self::normalizeRegime($current['regime'] ?? null) === 'SIMPLES_NACIONAL'
            ) {
                $crt = self::CRT_SIMPLES_SUBLIMITE;
            }
        } else {
            $crt = (int) $data['crt'];
            if (! in_array($crt, self::CRTS, true)) {
                throw ValidationException::withMessages([
                    'crt' => ['CRT deve ser 1, 2, 3 ou 4.'],
                ]);
            }
            if (! self::isCrtAllowedForRegime($regime, $crt)) {
                $allowed = implode(', ', self::allowedCrtsForRegime($regime));
                throw ValidationException::withMessages([
                    'crt' => [
                        "CRT {$crt} incompatível com o regime {$regime}. Valores permitidos: {$allowed}.",
                    ],
                ]);
            }
        }

        return [
            'regime' => $regime,
            'crt' => $crt,
        ];
    }

    public static function crtLabel(int $crt): string
    {
        return match ($crt) {
            self::CRT_SIMPLES => '1 — Simples Nacional',
            self::CRT_SIMPLES_SUBLIMITE => '2 — Simples Nacional (sublimite)',
            self::CRT_NORMAL => '3 — Regime Normal',
            self::CRT_MEI => '4 — MEI',
            default => (string) $crt,
        };
    }

    public static function normalizeIe(mixed $ie): ?string
    {
        return ParceiroFiscalRules::normalizeIe($ie);
    }

    public static function isIeIsento(?string $ie): bool
    {
        return ParceiroFiscalRules::isIeIsento($ie);
    }

    public static function isIeNumerica(?string $ie): bool
    {
        return ParceiroFiscalRules::isIeNumerica($ie);
    }

    /**
     * Validação do dígito verificador do CNPJ (RFB).
     */
    public static function isValidCnpj(mixed $cnpj): bool
    {
        $digits = preg_replace('/\D/', '', (string) ($cnpj ?? '')) ?? '';
        if (strlen($digits) !== 14 || preg_match('/^(\d)\1{13}$/', $digits)) {
            return false;
        }

        $weights1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
        $weights2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

        $sum = 0;
        for ($i = 0; $i < 12; $i++) {
            $sum += (int) $digits[$i] * $weights1[$i];
        }
        $rest = $sum % 11;
        $d1 = $rest < 2 ? 0 : 11 - $rest;
        if ((int) $digits[12] !== $d1) {
            return false;
        }

        $sum = 0;
        for ($i = 0; $i < 13; $i++) {
            $sum += (int) $digits[$i] * $weights2[$i];
        }
        $rest = $sum % 11;
        $d2 = $rest < 2 ? 0 : 11 - $rest;

        return (int) $digits[13] === $d2;
    }

    /**
     * Avalia completude fiscal do emitente e aptidão para emitir NF-e.
     *
     * @param  array<string, mixed>  $attrs
     * @return array{
     *   completo: bool,
     *   apto_emissao_nfe: bool,
     *   apto_emissao_nfse: bool,
     *   pendencias: list<string>,
     *   pendencias_emissao: list<string>,
     *   pendencias_nfse: list<string>,
     *   pendencias_emissao_nfse: list<string>
     * }
     */
    public static function evaluate(array $attrs): array
    {
        $pendencias = [];
        $pendenciasEmissao = [];

        $cnpj = preg_replace('/\D/', '', (string) ($attrs['cnpj'] ?? '')) ?: '';
        if (strlen($cnpj) !== 14) {
            $pendencias[] = 'CNPJ (14 dígitos)';
        } elseif (! self::isValidCnpj($cnpj)) {
            $pendencias[] = 'CNPJ com dígito verificador inválido';
        }

        if (trim((string) ($attrs['razao_social'] ?? '')) === '') {
            $pendencias[] = 'Razão social';
        }

        $ie = self::normalizeIe($attrs['ie'] ?? null);
        if (! self::isIeNumerica($ie) && ! self::isIeIsento($ie)) {
            $pendencias[] = 'Inscrição estadual (IE) do emitente';
        }

        $regime = self::normalizeRegime($attrs['regime'] ?? null);
        if (! in_array($regime, self::REGIMES, true)) {
            $pendencias[] = 'Regime tributário';
        }

        $crt = (int) ($attrs['crt'] ?? 0);
        if (! in_array($crt, self::CRTS, true)) {
            $pendencias[] = 'CRT (código de regime tributário da NF-e)';
        } elseif (! self::isCrtAllowedForRegime($regime, $crt)) {
            $pendencias[] = 'CRT incompatível com o regime tributário';
        }

        $cnae = preg_replace('/\D/', '', (string) ($attrs['cnae'] ?? '')) ?: '';
        if (strlen($cnae) < 7) {
            $pendencias[] = 'CNAE principal';
        }

        foreach ([
            'logradouro' => 'Logradouro',
            'numero' => 'Número',
            'bairro' => 'Bairro',
            'municipio' => 'Município',
        ] as $field => $label) {
            if (trim((string) ($attrs[$field] ?? '')) === '') {
                $pendencias[] = $label;
            }
        }

        $uf = trim((string) ($attrs['uf'] ?? ''));
        $cep = preg_replace('/\D/', '', (string) ($attrs['cep'] ?? '')) ?: '';
        $ibge = preg_replace('/\D/', '', (string) ($attrs['ibge'] ?? '')) ?: '';

        if (strlen($uf) !== 2) {
            $pendencias[] = 'UF';
        }
        if (strlen($cep) !== 8) {
            $pendencias[] = 'CEP (8 dígitos)';
        }
        if (strlen($ibge) !== 7) {
            $pendencias[] = 'Código IBGE do município (7 dígitos)';
        }

        $completo = $pendencias === [];

        $ieStatus = (string) ($attrs['ie_status'] ?? self::IE_STATUS_NAO_VERIFICADA);
        $situacao = (string) ($attrs['situacao'] ?? 'ATIVA');
        $vendaAtiva = array_key_exists('venda_ativa', $attrs)
            ? (bool) $attrs['venda_ativa']
            : true;

        if (self::isIeNumerica($ie) && $ieStatus !== self::IE_STATUS_OK) {
            $pendenciasEmissao[] = 'IE validada no cadastro estadual (SINTEGRA/CCC) — status OK';
        }
        if (in_array($ieStatus, [self::IE_STATUS_BAIXADA, self::IE_STATUS_NAO_HABILITADA], true)) {
            $pendenciasEmissao[] = 'IE baixada ou não habilitada — emissão bloqueada';
        }
        if ($situacao !== 'ATIVA') {
            $pendenciasEmissao[] = 'Empresa precisa estar ATIVA';
        }
        if (! $vendaAtiva) {
            $pendenciasEmissao[] = 'Venda desligada nesta empresa (EMP-00002 até parecer Contador+Direção)';
        }

        $pendenciasNfse = [];
        foreach ($pendencias as $p) {
            if (! str_contains($p, 'Inscrição estadual')) {
                $pendenciasNfse[] = $p;
            }
        }
        $im = trim((string) ($attrs['im'] ?? ''));
        $imObrigatoria = (bool) ($attrs['im_obrigatoria_nfse'] ?? false);
        if ($imObrigatoria && $im === '') {
            $pendenciasNfse[] = 'Inscrição municipal (este município exige IM para NFS-e)';
        }

        $pendenciasEmissaoNfse = [];
        foreach ($pendenciasEmissao as $p) {
            if (! str_contains($p, 'IE ')) {
                $pendenciasEmissaoNfse[] = $p;
            }
        }
        if ($imObrigatoria && $im === '') {
            $pendenciasEmissaoNfse[] = 'Inscrição municipal exigida neste município para NFS-e';
        }

        return [
            'completo' => $completo,
            'apto_emissao_nfe' => $completo && $pendenciasEmissao === [],
            'apto_emissao_nfse' => $pendenciasNfse === [] && $pendenciasEmissaoNfse === [],
            'pendencias' => $pendencias,
            'pendencias_emissao' => $pendenciasEmissao,
            'pendencias_nfse' => $pendenciasNfse,
            'pendencias_emissao_nfse' => $pendenciasEmissaoNfse,
        ];
    }

    /**
     * @return list<string>
     */
    public static function vigenciaFields(): array
    {
        return ['ie', 'im', 'iest', 'ie_status', 'regime', 'crt'];
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     */
    public static function fiscalChanged(array $before, array $after): bool
    {
        foreach (self::vigenciaFields() as $field) {
            if ((string) ($before[$field] ?? '') !== (string) ($after[$field] ?? '')) {
                return true;
            }
        }

        return false;
    }
}
