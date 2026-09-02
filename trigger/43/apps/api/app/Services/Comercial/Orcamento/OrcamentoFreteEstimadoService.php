<?php

namespace App\Services\Comercial\Orcamento;

use App\Models\Empresa;
use App\Models\Parceiro;
use App\Models\ParceiroEnderecoEntrega;
use App\Support\PadraoDecimal;

/**
 * Modo de entrega + frete opcional no fechamento do ORC.
 * Não altera o motor R1–R20. Não chama ORS. Não inventa R$.
 * Frete nunca compõe valor_total_proposta / adiantamento / PED / FAT
 * (informação comercial “a definir” até haver valor após produção).
 */
final class OrcamentoFreteEstimadoService
{
    public const MODO_RETIRAR = 'RETIRAR';

    public const MODO_ENTREGA_PROPRIA = 'ENTREGA_PROPRIA';

    public const MODO_ENTREGA_TERCEIROS = 'ENTREGA_TERCEIROS';

    /** @deprecated Legado em snapshots anteriores à trinca de modos. */
    public const MODO_ENTREGAR = 'ENTREGAR';

    public const DESTINO_FISCAL = 'fiscal';

    public const DESTINO_ENTREGA = 'entrega';

    /** @var list<string> */
    public const MODOS = [
        self::MODO_RETIRAR,
        self::MODO_ENTREGA_PROPRIA,
        self::MODO_ENTREGA_TERCEIROS,
    ];

    /** @var list<string> */
    public const MODOS_COM_FRETE = [
        self::MODO_ENTREGA_PROPRIA,
        self::MODO_ENTREGA_TERCEIROS,
        self::MODO_ENTREGAR,
    ];

    /**
     * @param  array<string, mixed>  $result  saída do motor (+ faca nova)
     * @param  array<string, mixed>  $data    payload do wizard
     * @return array<string, mixed>
     */
    public function aplicar(array $result, array $data, Parceiro $parceiro, Empresa $empresa): array
    {
        $modo = $this->normalizarModo($data['modo_entrega'] ?? null);
        $destino = $this->resolverDestino($parceiro, $empresa);
        $comFrete = $this->modoComFrete($modo);
        $valor = $comFrete
            ? $this->moneyCeilOrNull($data['valor_frete_manual'] ?? null)
            : PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_MONEY);

        $frete = [
            'modo' => $modo,
            'km' => $destino['km'],
            'destino' => $destino['tipo'],
            'destino_label' => $destino['label'],
            'valor_informado' => $comFrete ? $valor : null,
            'a_definir' => $comFrete && $valor === null,
            'motivo' => $modo === self::MODO_RETIRAR
                ? 'retirar'
                : ($valor === null ? 'a_definir' : 'manual'),
        ];

        $faixas = is_array($result['faixas'] ?? null) ? $result['faixas'] : [];
        foreach ($faixas as $i => $fx) {
            $faixas[$i] = $this->anexarFaixa($fx, [
                'valor_frete' => $comFrete ? $valor : PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_MONEY),
                'frete_somavel' => false,
            ]);
        }

        $result['faixas'] = $faixas;
        $result['frete'] = $frete;

        return $result;
    }

    public function normalizarModo(mixed $value): string
    {
        $s = strtoupper(trim((string) ($value ?? '')));

        return match ($s) {
            self::MODO_ENTREGA_PROPRIA => self::MODO_ENTREGA_PROPRIA,
            self::MODO_ENTREGA_TERCEIROS => self::MODO_ENTREGA_TERCEIROS,
            // Legado: Entregar único → entrega própria (frota).
            self::MODO_ENTREGAR => self::MODO_ENTREGA_PROPRIA,
            default => self::MODO_RETIRAR,
        };
    }

    public function modoComFrete(string $modo): bool
    {
        return in_array($modo, self::MODOS_COM_FRETE, true);
    }

    /**
     * Frete opcional: vazio = a definir. R$ 0 informado = sem cobrança.
     */
    public function valorFreteManualSnapshot(string $modo, mixed $value): ?string
    {
        if (! $this->modoComFrete($modo)) {
            return null;
        }

        return $this->moneyCeilOrNull($value);
    }

    /**
     * @return array{tipo: string, label: string, km: string|null}
     */
    public function resolverDestino(Parceiro $parceiro, Empresa $empresa): array
    {
        $parceiro->loadMissing('enderecosEntrega');
        $entrega = $parceiro->enderecosEntrega
            ->first(fn (ParceiroEnderecoEntrega $e) => (bool) $e->principal)
            ?? $parceiro->enderecosEntrega->first();

        $kmFiscal = $this->kmDaEmp(
            $parceiro->distancia_km,
            $parceiro->distancia_empresa_id,
            $empresa->id,
        );
        $fiscal = [
            'tipo' => self::DESTINO_FISCAL,
            'label' => $this->labelEndereco(null, $parceiro->municipio, $parceiro->uf),
            'km' => $kmFiscal,
        ];

        if ($entrega === null) {
            return $fiscal;
        }

        $kmEntrega = $this->kmDaEmp(
            $entrega->distancia_km,
            $entrega->distancia_empresa_id,
            $empresa->id,
        );
        if ($kmEntrega !== null) {
            return [
                'tipo' => self::DESTINO_ENTREGA,
                'label' => $this->labelEndereco(
                    $entrega->apelido,
                    $entrega->municipio,
                    $entrega->uf,
                ),
                'km' => $kmEntrega,
            ];
        }

        return $fiscal;
    }

    /**
     * Total comercial da faixa: motor (+ faca nova). Frete nunca soma.
     * Prefere a fotografia `valor_total_proposta` (ORCs gravados); senão recompõe.
     *
     * @param  array<string, mixed>  $fx
     */
    public static function totalPropostaFaixa(array $fx): string
    {
        $gravado = self::moneyOrNull($fx['valor_total_proposta'] ?? null);
        if ($gravado !== null) {
            return $gravado;
        }

        return self::comporTotalProposta($fx);
    }

    /**
     * Recalcula o total comercial sem ler `valor_total_proposta`.
     * Frete não entra (informativo / a definir após produção).
     *
     * @param  array<string, mixed>  $fx
     */
    public static function comporTotalProposta(array $fx): string
    {
        $comFaca = self::moneyOrNull($fx['valor_total_com_faca'] ?? null);
        $motor = self::moneyOrNull($fx['valor_total'] ?? null)
            ?? PadraoDecimal::roundHalfUp('0', PadraoDecimal::SCALE_MONEY);

        return $comFaca ?? $motor;
    }

    /**
     * @param  array<string, mixed>  $fx
     * @param  array<string, mixed>  $frete
     * @return array<string, mixed>
     */
    private function anexarFaixa(array $fx, array $frete): array
    {
        $merged = array_merge($fx, $frete);
        $merged['valor_total_proposta'] = self::comporTotalProposta($merged);

        return $merged;
    }

    private function moneyCeilOrNull(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_bool($value)) {
            return null;
        }

        try {
            if (is_int($value)) {
                $parsed = (string) $value;
            } elseif (is_float($value)) {
                $parsed = number_format($value, 8, '.', '');
            } else {
                $parsed = PadraoDecimal::parse(trim((string) $value));
            }
        } catch (\InvalidArgumentException) {
            return null;
        }

        if ($parsed === null || $parsed === '') {
            return null;
        }

        return PadraoDecimal::roundCeil($parsed, PadraoDecimal::SCALE_MONEY);
    }

    private function kmDaEmp(mixed $km, mixed $empresaId, int $empresaAtual): ?string
    {
        if ($empresaId === null || (int) $empresaId !== $empresaAtual) {
            return null;
        }
        $canonical = $this->dec($km);
        if ($canonical === null || bccomp($canonical, '0', PadraoDecimal::SCALE_DISTANCE) <= 0) {
            return null;
        }

        return PadraoDecimal::roundHalfUp($canonical, PadraoDecimal::SCALE_DISTANCE);
    }

    private function labelEndereco(?string $apelido, mixed $municipio, mixed $uf): string
    {
        $cidade = trim((string) $municipio);
        $ufTxt = strtoupper(trim((string) $uf));
        $local = $cidade !== ''
            ? ($ufTxt !== '' ? $cidade.'/'.$ufTxt : $cidade)
            : ($ufTxt !== '' ? $ufTxt : 'destino');
        $apelido = trim((string) $apelido);

        return $apelido !== '' ? $apelido.' · '.$local : $local;
    }

    private static function moneyOrNull(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }
        if (is_bool($value)) {
            return null;
        }
        if (is_int($value)) {
            return PadraoDecimal::roundHalfUp((string) $value, PadraoDecimal::SCALE_MONEY);
        }
        if (is_float($value)) {
            return PadraoDecimal::roundHalfUp(number_format($value, 8, '.', ''), PadraoDecimal::SCALE_MONEY);
        }
        $s = trim((string) $value);
        if ($s === '') {
            return null;
        }
        try {
            return PadraoDecimal::roundHalfUp(PadraoDecimal::parse($s), PadraoDecimal::SCALE_MONEY);
        } catch (\InvalidArgumentException) {
            return null;
        }
    }

    private function dec(mixed $value): ?string
    {
        if ($value === null || $value === '') {
            return null;
        }

        try {
            return PadraoDecimal::parse((string) $value);
        } catch (\InvalidArgumentException) {
            return null;
        }
    }
}
