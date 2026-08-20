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
     * Hub padrão pronto para emitir (teste OK do ambiente ativo).
     *
     * @return array{apto: bool, mensagem: string, codigo: ?string, ambiente: ?string, emissao_habilitada: bool}
     */
    public function diagnostico(Empresa $empresa): array
    {
        $hub = $this->padraoAtivo($empresa);
        if ($hub === null) {
            return [
                'apto' => false,
                'mensagem' => 'Cadastre um hub fiscal padrão (Focus NFe) e teste a conexão.',
                'codigo' => null,
                'ambiente' => null,
                'emissao_habilitada' => false,
            ];
        }

        $ambiente = $hub->ambiente_ativo;
        if (! $hub->temToken($ambiente)) {
            return [
                'apto' => false,
                'mensagem' => "Hub {$hub->codigo}: cadastre o token de {$ambiente}.",
                'codigo' => $hub->codigo,
                'ambiente' => $ambiente,
                'emissao_habilitada' => false,
            ];
        }

        $testeOk = $hub->ultimo_teste_ok === true
            && $hub->ultimo_teste_ambiente === $ambiente
            && $hub->emissao_habilitada;

        if (! $testeOk) {
            return [
                'apto' => false,
                'mensagem' => "Hub {$hub->codigo}: teste a conexão de {$ambiente} para ativar a emissão automática.",
                'codigo' => $hub->codigo,
                'ambiente' => $ambiente,
                'emissao_habilitada' => (bool) $hub->emissao_habilitada,
            ];
        }

        return [
            'apto' => true,
            'mensagem' => "Hub {$hub->codigo} apto em {$ambiente}.",
            'codigo' => $hub->codigo,
            'ambiente' => $ambiente,
            'emissao_habilitada' => true,
        ];
    }

    /**
     * @return array{hub: FiscalHub, ambiente: string, base_url: string, token: string, provedor: string}|null
     */
    public function runtimeSeApto(Empresa $empresa): ?array
    {
        if (! $this->diagnostico($empresa)['apto']) {
            return null;
        }

        try {
            return $this->runtime($empresa);
        } catch (RuntimeException) {
            return null;
        }
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
