<?php

namespace App\Services\Fiscal;

use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\Parceiro;
use App\Models\Pedido;
use App\Services\Comercial\Orcamento\OrcamentoFreteEstimadoService;
use Illuminate\Validation\ValidationException;

/**
 * Resolve modalidade Focus + transportador da NF-e de saída a partir do modo ORC/PED.
 * Espelho semântico da OC (CIF/FOB + PAR), sem inventar peso/CUB.
 *
 * @see docs/ADR_NFE_TRANSPORTE_SAIDA.md
 */
final class FiscalSaidaTransporte
{
    public const MOD_SEM = '9';

    public const MOD_CIF = '0';

    public const MOD_FOB = '1';

    /** @var list<string> */
    public const MODS = [
        self::MOD_SEM,
        self::MOD_CIF,
        self::MOD_FOB,
    ];

    public function modoEntregaDoPedido(Pedido $pedido): string
    {
        $snap = is_array($pedido->snapshot) ? $pedido->snapshot : [];
        $input = is_array($snap['input'] ?? null) ? $snap['input'] : [];
        $modo = strtoupper(trim((string) ($input['modo_entrega'] ?? OrcamentoFreteEstimadoService::MODO_RETIRAR)));

        return match ($modo) {
            OrcamentoFreteEstimadoService::MODO_ENTREGA_PROPRIA,
            OrcamentoFreteEstimadoService::MODO_ENTREGAR => OrcamentoFreteEstimadoService::MODO_ENTREGA_PROPRIA,
            OrcamentoFreteEstimadoService::MODO_ENTREGA_TERCEIROS => OrcamentoFreteEstimadoService::MODO_ENTREGA_TERCEIROS,
            default => OrcamentoFreteEstimadoService::MODO_RETIRAR,
        };
    }

    public function defaultModFrete(string $modoEntrega): string
    {
        return match ($modoEntrega) {
            OrcamentoFreteEstimadoService::MODO_ENTREGA_PROPRIA,
            OrcamentoFreteEstimadoService::MODO_ENTREGA_TERCEIROS => self::MOD_CIF,
            default => self::MOD_SEM,
        };
    }

    public function exigeTransportador(string $modoEntrega): bool
    {
        return $modoEntrega === OrcamentoFreteEstimadoService::MODO_ENTREGA_TERCEIROS;
    }

    /**
     * @param  array<string, mixed>  $data
     * @return array{mod_frete: string, transportador: ?Parceiro, modo_entrega: string}
     */
    public function resolver(Empresa $empresa, Pedido $pedido, array $data = []): array
    {
        $modo = $this->modoEntregaDoPedido($pedido);
        $modFrete = $this->resolveModFrete($modo, $data['mod_frete'] ?? null);
        $transportadorId = array_key_exists('transportador_id', $data)
            ? (isset($data['transportador_id']) && $data['transportador_id'] !== ''
                ? (int) $data['transportador_id']
                : null)
            : null;

        if ($modo === OrcamentoFreteEstimadoService::MODO_RETIRAR) {
            $modFrete = self::MOD_SEM;
            $transportadorId = null;
        } elseif ($modo === OrcamentoFreteEstimadoService::MODO_ENTREGA_PROPRIA) {
            // Frota própria: Focus 0 (por conta do emitente), sem transporta.
            if (! in_array($modFrete, [self::MOD_CIF, self::MOD_SEM], true)) {
                $modFrete = self::MOD_CIF;
            }
            $transportadorId = null;
        } elseif ($this->exigeTransportador($modo)) {
            if (! in_array($modFrete, [self::MOD_CIF, self::MOD_FOB], true)) {
                $modFrete = self::MOD_CIF;
            }
        }

        $transportador = $this->resolveTransportador(
            $empresa,
            $transportadorId,
            $this->exigeTransportador($modo)
        );

        return [
            'mod_frete' => $modFrete,
            'transportador' => $transportador,
            'modo_entrega' => $modo,
        ];
    }

    /**
     * Preview / out API.
     *
     * @return array<string, mixed>
     */
    public function previewOut(Empresa $empresa, Pedido $pedido): array
    {
        $modo = $this->modoEntregaDoPedido($pedido);
        $mod = $this->defaultModFrete($modo);
        $exige = $this->exigeTransportador($modo);

        return [
            'modo_entrega' => $modo,
            'mod_frete' => $mod,
            'mod_frete_label' => Faturamento::modFreteLabel($mod),
            'exige_transportador' => $exige,
            'mods_permitidos' => $exige
                ? [self::MOD_CIF, self::MOD_FOB]
                : ($modo === OrcamentoFreteEstimadoService::MODO_ENTREGA_PROPRIA
                    ? [self::MOD_CIF]
                    : [self::MOD_SEM]),
            'aviso' => $exige
                ? 'Entrega por transportadora: informe o PAR com papel transportadora antes de faturar (vai na NF-e).'
                : ($modo === OrcamentoFreteEstimadoService::MODO_ENTREGA_PROPRIA
                    ? 'Entrega própria: NF-e com frete por conta do emitente, sem transportador terceirizado.'
                    : 'Retirada no balcão: NF-e sem ocorrência de transporte.'),
        ];
    }

    /**
     * Campos Focus `transporta*` a partir do PAR.
     *
     * @return array<string, mixed>
     */
    public function focusTransportador(?Parceiro $par): array
    {
        if ($par === null) {
            return [];
        }

        $doc = preg_replace('/\D/', '', (string) $par->cnpj_cpf) ?: '';
        $ie = preg_replace('/\D/', '', (string) ($par->ie ?? '')) ?: '';
        $enderParts = array_filter([
            trim((string) ($par->logradouro ?? '')),
            trim((string) ($par->numero ?? '')) !== '' ? trim((string) $par->numero) : null,
            trim((string) ($par->complemento ?? '')) !== '' ? trim((string) $par->complemento) : null,
            trim((string) ($par->bairro ?? '')) !== '' ? trim((string) $par->bairro) : null,
        ]);
        $ender = implode(', ', $enderParts);

        return array_filter([
            'nome_transportador' => mb_substr((string) $par->razao_social, 0, 60) ?: null,
            'cnpj_transportador' => strlen($doc) === 14 ? $doc : null,
            'cpf_transportador' => strlen($doc) === 11 ? $doc : null,
            'inscricao_estadual_transportador' => $ie !== '' ? $ie : null,
            'endereco_transportador' => $ender !== '' ? mb_substr($ender, 0, 60) : null,
            'municipio_transportador' => $par->municipio ? mb_substr((string) $par->municipio, 0, 60) : null,
            'uf_transportador' => $par->uf ? strtoupper(trim((string) $par->uf)) : null,
        ], fn ($v) => $v !== null && $v !== '');
    }

    private function resolveModFrete(string $modo, mixed $raw): string
    {
        if ($raw === null || $raw === '') {
            return $this->defaultModFrete($modo);
        }
        $mod = (string) $raw;
        if (! in_array($mod, self::MODS, true)) {
            throw ValidationException::withMessages([
                'mod_frete' => ['Modalidade de frete inválida. Use 0 (CIF), 1 (FOB) ou 9 (sem frete).'],
            ]);
        }

        return $mod;
    }

    private function resolveTransportador(Empresa $empresa, ?int $transportadorId, bool $obrigatorio): ?Parceiro
    {
        if ($obrigatorio && ($transportadorId === null || $transportadorId < 1)) {
            throw ValidationException::withMessages([
                'transportador_id' => ['Selecione o transportador cadastrado (entrega por terceiros).'],
            ]);
        }

        if ($transportadorId === null || $transportadorId < 1) {
            return null;
        }

        $parceiro = Parceiro::query()
            ->where('empresa_id', $empresa->id)
            ->where('id', $transportadorId)
            ->first();

        if (! $parceiro) {
            throw ValidationException::withMessages([
                'transportador_id' => ['Transportador inválido para a empresa.'],
            ]);
        }

        if (! $parceiro->papel_transportadora) {
            throw ValidationException::withMessages([
                'transportador_id' => ['Parceiro deve ter classificação de transportadora.'],
            ]);
        }

        return $parceiro;
    }
}
