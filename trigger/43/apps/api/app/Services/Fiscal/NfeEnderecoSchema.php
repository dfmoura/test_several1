<?php

namespace App\Services\Fiscal;

/**
 * Endereço no leiaute da NF-e 4.00 (enderEmit / enderDest).
 *
 * Campo vazio não vira tag vazia: o schema recusa e a SEFAZ só responde
 * "Falha no Schema XML". S/N só entra quando rua, bairro, município, UF, CEP e IBGE já fecham.
 */
final class NfeEnderecoSchema
{
    public const MAX_TEXTO = 60;

    /** @var list<string> */
    public const UFS = [
        'AC', 'AL', 'AM', 'AP', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MG', 'MS', 'MT',
        'PA', 'PB', 'PE', 'PI', 'PR', 'RJ', 'RN', 'RO', 'RR', 'RS', 'SC', 'SE', 'SP', 'TO',
        'EX',
    ];

    /**
     * @param  array<string, mixed>|object  $fonte
     * @return array{
     *     logradouro: mixed,
     *     numero: mixed,
     *     complemento: mixed,
     *     bairro: mixed,
     *     municipio: mixed,
     *     uf: mixed,
     *     cep: mixed,
     *     ibge: mixed
     * }
     */
    public static function ler(array|object $fonte): array
    {
        $get = static function (string $campo) use ($fonte): mixed {
            if (is_array($fonte)) {
                return $fonte[$campo] ?? null;
            }

            return $fonte->{$campo} ?? null;
        };

        return [
            'logradouro' => $get('logradouro'),
            'numero' => $get('numero'),
            'complemento' => $get('complemento'),
            'bairro' => $get('bairro'),
            'municipio' => $get('municipio'),
            'uf' => $get('uf'),
            'cep' => $get('cep'),
            'ibge' => $get('ibge'),
        ];
    }

    /**
     * @param  array<string, mixed>  $raw
     * @return list<string>
     */
    public static function pendencias(array $raw): array
    {
        $logradouro = self::texto($raw['logradouro'] ?? null);
        $numero = self::texto($raw['numero'] ?? null);
        $bairro = self::texto($raw['bairro'] ?? null);
        $municipio = self::texto($raw['municipio'] ?? null);
        $uf = strtoupper(self::texto($raw['uf'] ?? null));
        $cep = preg_replace('/\D/', '', (string) ($raw['cep'] ?? '')) ?: '';
        $ibge = preg_replace('/\D/', '', (string) ($raw['ibge'] ?? '')) ?: '';

        $faltaLogradouro = mb_strlen($logradouro) < 2;
        $faltaBairro = mb_strlen($bairro) < 2;
        $faltaMunicipio = mb_strlen($municipio) < 2;
        $faltaUf = ! in_array($uf, self::UFS, true);
        $faltaCep = strlen($cep) !== 8;
        $faltaIbge = strlen($ibge) !== 7;
        $restoIncompleto = $faltaLogradouro || $faltaBairro || $faltaMunicipio || $faltaUf || $faltaCep || $faltaIbge;

        $pendencias = [];
        if ($faltaLogradouro) {
            $pendencias[] = 'Logradouro';
        }
        if ($numero === '' && $restoIncompleto) {
            $pendencias[] = 'Número';
        }
        if ($faltaBairro) {
            $pendencias[] = 'Bairro';
        }
        if ($faltaMunicipio) {
            $pendencias[] = 'Município';
        }
        if ($faltaUf) {
            $pendencias[] = 'UF';
        }
        if ($faltaCep) {
            $pendencias[] = 'CEP (8 dígitos)';
        }
        if ($faltaIbge) {
            $pendencias[] = 'Código IBGE do município (7 dígitos)';
        }

        return $pendencias;
    }

    /**
     * Endereço pronto para o XML, ou null quando o schema recusaria o lote.
     *
     * @param  array<string, mixed>  $raw
     * @return array{
     *     logradouro: string,
     *     numero: string,
     *     complemento: ?string,
     *     bairro: string,
     *     municipio: string,
     *     uf: string,
     *     cep: string,
     *     ibge: string
     * }|null
     */
    public static function paraXml(array $raw): ?array
    {
        if (self::pendencias($raw) !== []) {
            return null;
        }

        $numero = self::texto($raw['numero'] ?? null);
        $complemento = mb_substr(self::texto($raw['complemento'] ?? null), 0, self::MAX_TEXTO);

        return [
            'logradouro' => mb_substr(self::texto($raw['logradouro'] ?? null), 0, self::MAX_TEXTO),
            'numero' => $numero === '' ? 'S/N' : mb_substr($numero, 0, self::MAX_TEXTO),
            'complemento' => $complemento !== '' ? $complemento : null,
            'bairro' => mb_substr(self::texto($raw['bairro'] ?? null), 0, self::MAX_TEXTO),
            'municipio' => mb_substr(self::texto($raw['municipio'] ?? null), 0, self::MAX_TEXTO),
            'uf' => strtoupper(self::texto($raw['uf'] ?? null)),
            'cep' => preg_replace('/\D/', '', (string) ($raw['cep'] ?? '')) ?: '',
            'ibge' => preg_replace('/\D/', '', (string) ($raw['ibge'] ?? '')) ?: '',
        ];
    }

    /**
     * @param  array<string, mixed>|object  $fonte
     */
    public static function mensagemBloqueio(array|object $fonte, string $quem): string
    {
        $pendencias = self::pendencias(self::ler($fonte));
        $lista = implode(', ', $pendencias);

        return 'NF-e não enviada. O endereço do '.$quem.' não fecha o schema da SEFAZ: '.$lista.'.';
    }

    private static function texto(mixed $valor): string
    {
        return trim((string) ($valor ?? ''));
    }
}
