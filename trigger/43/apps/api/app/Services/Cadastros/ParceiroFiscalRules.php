<?php

namespace App\Services\Cadastros;

/**
 * Regras fiscais do cadastro de parceiro (NF-e dest / preparação Lucro Real).
 *
 * indIEDest (NT 2015/003):
 *  1 = Contribuinte ICMS (com IE)
 *  2 = Contribuinte isento
 *  9 = Não contribuinte
 */
class ParceiroFiscalRules
{
    public const IND_CONTRIBUINTE = 1;

    public const IND_ISENTO = 2;

    public const IND_NAO_CONTRIBUINTE = 9;

    public const IE_STATUS_NAO_VERIFICADA = 'NAO_VERIFICADA';

    public const IE_STATUS_OK = 'OK';

    public const IE_STATUS_BAIXADA = 'BAIXADA';

    public const IE_STATUS_NAO_HABILITADA = 'NAO_HABILITADA';

    public const IE_STATUS_ISENTA = 'ISENTA';

    public const FINALIDADES = ['REVENDA', 'INDUSTRIALIZACAO', 'USO_CONSUMO'];

    public const REGIMES = ['SIMPLES_NACIONAL', 'MEI', 'PRESUMIDO', 'REAL', 'ISENTO', 'OUTRO'];

    /** UFs com ZFM / ALC relevantes para flag de área incentivada. */
    public const UFS_AREA_INCENTIVADA = ['AM', 'AC', 'RO', 'RR', 'AP'];

    /**
     * Normaliza IE para comparação (trim + maiúsculas; preserva dígitos).
     */
    public static function normalizeIe(mixed $ie): ?string
    {
        if ($ie === null) {
            return null;
        }

        $value = trim((string) $ie);

        return $value === '' ? null : mb_strtoupper($value, 'UTF-8');
    }

    public static function isIeIsento(?string $ie): bool
    {
        $normalized = self::normalizeIe($ie);
        if ($normalized === null) {
            return false;
        }

        $compact = preg_replace('/\s+/', ' ', $normalized) ?? $normalized;

        return in_array($compact, ['ISENTO', 'ISENTA', 'IE ISENTO', 'IE ISENTA'], true);
    }

    public static function isIeNumerica(?string $ie): bool
    {
        $normalized = self::normalizeIe($ie);
        if ($normalized === null || self::isIeIsento($normalized)) {
            return false;
        }

        return (bool) preg_match('/\d/', $normalized);
    }

    /**
     * Deriva indIEDest a partir da IE cadastrada.
     */
    public static function deriveIndIeDest(?string $ie): int
    {
        if (self::isIeIsento($ie)) {
            return self::IND_ISENTO;
        }

        if (self::isIeNumerica($ie)) {
            return self::IND_CONTRIBUINTE;
        }

        return self::IND_NAO_CONTRIBUINTE;
    }

    /**
     * Garante coerência IE ↔ indIEDest. Preferência: IE manda (sempre deriva).
     * Se o cliente enviar ind explícito incompatível, retorna erro de validação.
     *
     * @return array{ie: ?string, ind_ie_dest: int, ie_status: string}
     */
    public static function syncIeInd(array $data, array $current = []): array
    {
        $ie = array_key_exists('ie', $data)
            ? self::normalizeIe($data['ie'])
            : self::normalizeIe($current['ie'] ?? null);

        $derived = self::deriveIndIeDest($ie);

        $sentInd = array_key_exists('ind_ie_dest', $data) ? $data['ind_ie_dest'] : null;
        if ($sentInd !== null && $sentInd !== '' && (int) $sentInd !== $derived) {
            // Permite override apenas nos limítrofes ISENTO (2) vs vazio (9) se usuário forçou ISENTO no ind mas deixou IE vazia → grava ISENTO.
            if ((int) $sentInd === self::IND_ISENTO && $ie === null) {
                $ie = 'ISENTO';
                $derived = self::IND_ISENTO;
            } elseif ((int) $sentInd === self::IND_NAO_CONTRIBUINTE && self::isIeIsento($ie)) {
                $ie = null;
                $derived = self::IND_NAO_CONTRIBUINTE;
            } else {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'ind_ie_dest' => [
                        "indIEDest informado ({$sentInd}) diverge da IE. Para IE \"{$ie}\" o valor correto é {$derived}.",
                    ],
                ]);
            }
        }

        $ieStatus = array_key_exists('ie_status', $data)
            ? (string) $data['ie_status']
            : (string) ($current['ie_status'] ?? self::IE_STATUS_NAO_VERIFICADA);

        if ($derived === self::IND_ISENTO && $ieStatus === self::IE_STATUS_NAO_VERIFICADA) {
            $ieStatus = self::IE_STATUS_ISENTA;
        }

        if ($derived === self::IND_NAO_CONTRIBUINTE) {
            // Não contribuinte não exige SINTEGRA.
            if (in_array($ieStatus, [self::IE_STATUS_BAIXADA, self::IE_STATUS_NAO_HABILITADA], true)) {
                $ieStatus = self::IE_STATUS_NAO_VERIFICADA;
            }
        }

        return [
            'ie' => $ie,
            'ind_ie_dest' => $derived,
            'ie_status' => $ieStatus,
        ];
    }

    public static function suggestAreaIncentivada(?string $uf, ?string $suframa = null): bool
    {
        if ($suframa !== null && trim($suframa) !== '') {
            return true;
        }

        $uf = $uf ? mb_strtoupper(trim($uf), 'UTF-8') : null;

        return $uf !== null && in_array($uf, self::UFS_AREA_INCENTIVADA, true);
    }

    /**
     * Avalia completude fiscal e aptidão para emissão de NF-e.
     *
     * @param  array<string, mixed>  $attrs
     * @return array{completo: bool, apto_emissao_nfe: bool, pendencias: list<string>, pendencias_emissao: list<string>}
     */
    public static function evaluate(array $attrs): array
    {
        $pendencias = [];
        $pendenciasEmissao = [];

        $papelCliente = (bool) ($attrs['papel_cliente'] ?? false);
        $papelFornecedor = (bool) ($attrs['papel_fornecedor'] ?? false);
        $papelTransportadora = (bool) ($attrs['papel_transportadora'] ?? false);
        $needsTradeFiscal = $papelCliente || $papelFornecedor || $papelTransportadora;
        $emite = array_key_exists('emite_documento_fiscal', $attrs)
            ? (bool) $attrs['emite_documento_fiscal']
            : true;

        $tipo = (string) ($attrs['tipo_pessoa'] ?? 'PJ');
        $doc = preg_replace('/\D/', '', (string) ($attrs['cnpj_cpf'] ?? '')) ?: '';
        $razao = trim((string) ($attrs['razao_social'] ?? ''));

        if ($razao === '') {
            $pendencias[] = 'Razão social / nome';
        }

        // Cadastro leve (colaborador/banco/entidade sem papel comercial).
        if (! $needsTradeFiscal) {
            return [
                'completo' => $razao !== '',
                'apto_emissao_nfe' => false,
                'pendencias' => $razao === '' ? ['Razão social / nome'] : [],
                'pendencias_emissao' => [],
            ];
        }

        if (! $emite) {
            return [
                'completo' => $razao !== '',
                'apto_emissao_nfe' => false,
                'pendencias' => $razao === '' ? ['Razão social / nome'] : [],
                'pendencias_emissao' => ['Parceiro marcado como não emitente/destinatário de NF-e'],
            ];
        }

        if ($tipo === 'PJ' && strlen($doc) !== 14) {
            $pendencias[] = 'CNPJ (14 dígitos)';
        }
        if ($tipo === 'PF' && strlen($doc) !== 11) {
            $pendencias[] = 'CPF (11 dígitos)';
        }
        if ($tipo === 'ESTRANGEIRO' && $doc === '' && trim((string) ($attrs['nome_fantasia'] ?? '')) === '') {
            $pendencias[] = 'Identificação do estrangeiro (documento ou nome)';
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

        $ie = self::normalizeIe($attrs['ie'] ?? null);
        $ind = (int) ($attrs['ind_ie_dest'] ?? self::deriveIndIeDest($ie));

        if ($ind === self::IND_CONTRIBUINTE && ! self::isIeNumerica($ie)) {
            $pendencias[] = 'IE numérica (contribuinte ICMS)';
        }
        if ($ind === self::IND_ISENTO && ! self::isIeIsento($ie)) {
            $pendencias[] = 'IE deve ser ISENTO quando indIEDest=2';
        }

        if ($papelCliente) {
            $finalidade = (string) ($attrs['finalidade'] ?? '');
            if (! in_array($finalidade, self::FINALIDADES, true)) {
                $pendencias[] = 'Finalidade (revenda / industrialização / uso e consumo)';
            }
            if (trim((string) ($attrs['email_xml'] ?? '')) === '') {
                $pendencias[] = 'E-mail para envio de XML/DANFE';
            }
        }

        if ($papelFornecedor && trim((string) ($attrs['regime'] ?? '')) === '') {
            $pendencias[] = 'Regime tributário do fornecedor';
        }

        $completo = $pendencias === [];
        $situacao = (string) ($attrs['situacao'] ?? 'ATIVO');
        $ieStatus = (string) ($attrs['ie_status'] ?? self::IE_STATUS_NAO_VERIFICADA);

        if ($ind === self::IND_CONTRIBUINTE && $ieStatus !== self::IE_STATUS_OK) {
            $pendenciasEmissao[] = 'IE validada no cadastro estadual (SINTEGRA/CCC) — status OK';
        }
        if (in_array($ieStatus, [self::IE_STATUS_BAIXADA, self::IE_STATUS_NAO_HABILITADA], true)) {
            $pendenciasEmissao[] = 'IE baixada ou não habilitada — emissão bloqueada';
        }
        if ($situacao !== 'ATIVO') {
            $pendenciasEmissao[] = 'Parceiro precisa estar ATIVO';
        }

        $apto = $completo && $pendenciasEmissao === [];

        return [
            'completo' => $completo,
            'apto_emissao_nfe' => $apto,
            'pendencias' => $pendencias,
            'pendencias_emissao' => $pendenciasEmissao,
        ];
    }

    /**
     * Campos que, ao mudar, abrem nova vigência no histórico fiscal.
     *
     * @return list<string>
     */
    public static function vigenciaFields(): array
    {
        return [
            'ie', 'im', 'ind_ie_dest', 'ie_status', 'regime', 'finalidade',
            'consumidor_final', 'suframa', 'area_incentivada',
        ];
    }

    /**
     * @param  array<string, mixed>  $before
     * @param  array<string, mixed>  $after
     */
    public static function fiscalChanged(array $before, array $after): bool
    {
        foreach (self::vigenciaFields() as $field) {
            $a = $before[$field] ?? null;
            $b = $after[$field] ?? null;
            if (is_bool($a)) {
                $a = $a ? '1' : '0';
            }
            if (is_bool($b)) {
                $b = $b ? '1' : '0';
            }
            if ((string) $a !== (string) $b) {
                return true;
            }
        }

        return false;
    }
}
