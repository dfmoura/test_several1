<?php

namespace App\Services\Fiscal\Sefaz;

use App\Models\DocumentoFiscalSaida;
use App\Models\DocumentoFiscalSaidaEvento;
use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\Parceiro;
use App\Services\Cadastros\EmpresaCertificadoA1Materializer;
use App\Services\Cadastros\EmpresaCertificadoA1Service;
use App\Services\Fiscal\FiscalSaidaDefaults;
use App\Services\Fiscal\FocusPayloadBuilder;
use RuntimeException;

/**
 * Orquestra emissão NF-e: numeração → XML → assinatura → SEFAZ.
 */
final class NfeAutorizacaoService
{
    public function __construct(
        private readonly NfeSefazClient $client,
        private readonly NfeXmlBuilder $builder,
        private readonly NfeXmlSigner $signer,
        private readonly NfeNumeracaoService $numeracao,
        private readonly EmpresaCertificadoA1Materializer $materializer,
        private readonly EmpresaCertificadoA1Service $a1,
        private readonly FocusPayloadBuilder $payloads,
    ) {}

    public function tpAmb(): int
    {
        $stage = strtolower(trim((string) config('erp.stage', 'local')));

        return in_array($stage, ['production', 'prod', 'producao'], true) ? 1 : 2;
    }

    public function sefazDisponivel(): bool
    {
        $driver = strtolower((string) config('erp.nfe.driver', 'sefaz'));
        if ($driver === 'fake') {
            return true;
        }
        $stage = strtolower(trim((string) config('erp.stage', 'local')));

        return in_array($stage, config('erp.nfe.stages_permitidos', ['homolog', 'production']), true);
    }

    public function a1Apto(Empresa $empresa): bool
    {
        return $this->a1->aptoParaOperar($empresa);
    }

    /**
     * @return array<string, mixed>
     */
    public function emitir(Empresa $empresa, Faturamento $fat, DocumentoFiscalSaida $doc, Parceiro $dest): array
    {
        if ($doc->tipo !== DocumentoFiscalSaida::TIPO_NFE) {
            throw new RuntimeException('NfeAutorizacaoService só emite NF-e.');
        }
        if (! $this->sefazDisponivel()) {
            throw new RuntimeException('Emissão SEFAZ indisponível neste ambiente.');
        }

        $fat->loadMissing(['itens.pedidoItem.produtoPa', 'titulos', 'pedido', 'transportador']);
        $itens = array_values(array_filter(
            $this->payloads->itensParaPayload($fat->itens),
            fn (array $i) => FiscalSaidaDefaults::tipoDeFamilia($i['familia_fiscal'] ?? null) === 'NFE'
        ));
        if ($itens === []) {
            throw new RuntimeException('Sem itens de mercadoria para NF-e.');
        }
        $num = $this->numeracao->reservar($empresa);
        $built = $this->builder->montar($empresa, $dest, $fat, $itens, $num, $this->tpAmb());

        $doc->serie = $num['serie'];
        $doc->numero = $num['numero'];
        $doc->chave = $built['chave'];
        $doc->ambiente = $this->tpAmb() === 1 ? 'production' : 'homolog';
        $doc->enviado_em = now();
        $doc->status = DocumentoFiscalSaida::STATUS_PROCESSANDO;
        $doc->payload_json = array_merge(
            is_array($doc->payload_json) ? $doc->payload_json : [],
            [
                '_meta' => [
                    'canal' => 'sefaz',
                    'chave' => $built['chave'],
                    'serie' => $num['serie'],
                    'numero' => $num['numero'],
                    'faturamento' => $fat->codigo,
                ],
            ]
        );
        $doc->save();

        $material = null;
        try {
            if (strtolower((string) config('erp.nfe.driver', 'sefaz')) === 'fake') {
                $cert = ['path' => '', 'senha' => ''];
                $assinado = $built['xml']; // fake não exige assinatura real
            } else {
                if (! $this->a1Apto($empresa)) {
                    throw new RuntimeException('Certificado A1 desta empresa não está apto para emissão NF-e.');
                }
                $material = $this->materializer->materializar($empresa);
                $cert = ['path' => $material['path'], 'senha' => $material['senha']];
                $assinado = $this->signer->assinarNfe($built['xml'], $cert);
            }

            $doc->payload_json = array_merge(
                is_array($doc->payload_json) ? $doc->payload_json : [],
                ['_xml_assinado' => $assinado]
            );
            $doc->save();

            $resultado = $this->client->autorizar(
                strtoupper(trim((string) $empresa->uf)),
                $this->tpAmb(),
                $assinado,
                $cert
            );

            // Síncrono / recibo: backoff antes de desistir (SEFAZ costuma responder 105 no 1º poll)
            if ($resultado->status === NfeSefazResultado::STATUS_PROCESSANDO && $resultado->recibo) {
                $recibo = $resultado->recibo;
                foreach ([1_000_000, 2_000_000, 3_000_000] as $waitUs) {
                    usleep($waitUs);
                    $resultado = $this->client->consultarRecibo(
                        strtoupper(trim((string) $empresa->uf)),
                        $this->tpAmb(),
                        $recibo,
                        $cert,
                        $assinado
                    );
                    if ($resultado->status !== NfeSefazResultado::STATUS_PROCESSANDO) {
                        break;
                    }
                }
            }

            return $resultado->toArray();
        } finally {
            $this->materializer->liberar($material);
        }
    }

    /**
     * @return array<string, mixed>
     */
    public function consultarProcessando(Empresa $empresa, DocumentoFiscalSaida $doc): array
    {
        $recibo = is_array($doc->response_json) ? ($doc->response_json['nRec'] ?? $doc->response_json['recibo'] ?? null) : null;
        if (! is_string($recibo) || $recibo === '') {
            return (new NfeSefazResultado(
                status: NfeSefazResultado::STATUS_PROCESSANDO,
                mensagem: 'Sem recibo para consultar.',
            ))->toArray();
        }

        $xmlAssinado = is_array($doc->payload_json) ? ($doc->payload_json['_xml_assinado'] ?? null) : null;
        $xmlAssinado = is_string($xmlAssinado) ? $xmlAssinado : null;

        $material = null;
        try {
            if (strtolower((string) config('erp.nfe.driver', 'sefaz')) === 'fake') {
                $cert = ['path' => '', 'senha' => ''];
            } else {
                $material = $this->materializer->materializar($empresa);
                $cert = ['path' => $material['path'], 'senha' => $material['senha']];
            }

            return $this->client->consultarRecibo(
                strtoupper(trim((string) $empresa->uf)),
                $this->tpAmb(),
                $recibo,
                $cert,
                $xmlAssinado
            )->toArray();
        } finally {
            $this->materializer->liberar($material);
        }
    }
}
