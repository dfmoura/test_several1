<?php

namespace App\Services\Fiscal;

use App\Models\Empresa;
use App\Models\FiscalHub;
use RuntimeException;

/**
 * Resolve o hub vinculado à empresa para operações fiscais futuras.
 * Kill-switch: hub inativo ou sem token do ambiente ativo → null / exceção controlada.
 */
class FiscalHubResolver
{
    public function __construct(
        private readonly FiscalHubCrypto $crypto,
    ) {}

    public function padraoAtivo(Empresa $empresa): ?FiscalHub
    {
        return FiscalHub::query()
            ->where('empresa_id', $empresa->id)
            ->where('ativo', true)
            ->where('padrao', true)
            ->first();
    }

    /**
     * Runtime seguro para emissão/consulta: base URL + token descriptografado do ambiente ativo.
     *
     * @return array{hub: FiscalHub, ambiente: string, base_url: string, token: string, provedor: string}
     */
    public function runtime(Empresa $empresa, ?string $ambiente = null): array
    {
        $hub = $this->padraoAtivo($empresa);
        if ($hub === null) {
            throw new RuntimeException(
                'Nenhum hub fiscal padrão ativo para a empresa '.$empresa->codigo.'. Cadastre em Administração → Hubs fiscais.'
            );
        }

        $ambiente = $ambiente ?: $hub->ambiente_ativo;
        if (! in_array($ambiente, FiscalHub::AMBIENTES, true)) {
            throw new RuntimeException('Ambiente fiscal inválido: '.$ambiente);
        }

        if (! $hub->temToken($ambiente)) {
            throw new RuntimeException(
                "Hub {$hub->codigo}: token de {$ambiente} não cadastrado."
            );
        }

        $cipher = $ambiente === 'producao'
            ? (string) $hub->token_producao_criptografada
            : (string) $hub->token_homologacao_criptografada;

        return [
            'hub' => $hub,
            'ambiente' => $ambiente,
            'base_url' => $hub->baseUrlPara($ambiente),
            'token' => $this->crypto->descriptografar($cipher),
            'provedor' => $hub->provedor,
        ];
    }
}
