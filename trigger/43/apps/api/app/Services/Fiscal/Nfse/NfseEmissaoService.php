<?php

namespace App\Services\Fiscal\Nfse;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\Parceiro;
use App\Services\Cadastros\EmpresaCertificadoA1Materializer;
use App\Services\Cadastros\EmpresaCertificadoA1Service;
use App\Services\Fiscal\FiscalSaidaDefaults;
use App\Services\Fiscal\FocusPayloadBuilder;
use App\Services\Fiscal\Sefaz\NfeXmlSigner;
use RuntimeException;

/**
 * Emite a NFS-e do faturamento na SEFIN Nacional.
 * Retorna null quando o documento deve permanecer planejado.
 *
 * @phpstan-type Resultado array<string, mixed>
 */
final class NfseEmissaoService
{
    public function __construct(
        private readonly FocusPayloadBuilder $payloads,
        private readonly NfseDpsBuilder $dps,
        private readonly NfseNumeracaoService $numeracao,
        private readonly NfseSefinClient $sefin,
        private readonly NfeXmlSigner $signer,
        private readonly EmpresaCertificadoA1Service $a1,
        private readonly EmpresaCertificadoA1Materializer $materializer,
    ) {}

    public function driver(): string
    {
        return strtolower(trim((string) config('erp.nfse.driver', 'off')));
    }

    /**
     * @return array<string, mixed>|null
     */
    public function emitir(Empresa $empresa, Faturamento $fat, DocumentoFiscalSaida $doc): ?array
    {
        if ($doc->tipo !== DocumentoFiscalSaida::TIPO_NFSE) {
            throw new RuntimeException('NfseEmissaoService só emite NFS-e.');
        }

        $driver = $this->driver();
        if ($driver === 'off' || $driver === '') {
            $doc->mensagem = 'Emissão de NFS-e ainda não disponível nesta fatia.';
            $doc->save();

            return null;
        }

        if ($driver === 'fake') {
            return $this->resultadoFake($doc);
        }

        if ($driver !== 'sefin') {
            $doc->mensagem = 'Canal de NFS-e não reconhecido. O documento permanece planejado.';
            $doc->save();

            return null;
        }

        if (! $this->sefinDisponivel()) {
            $doc->mensagem = 'Emissão de NFS-e Nacional aguarda homologação ou produção com certificado A1 apto.';
            $doc->save();

            return null;
        }
        if (! $this->a1->aptoParaOperar($empresa)) {
            $doc->mensagem = 'Certificado A1 desta empresa não está apto para emitir NFS-e.';
            $doc->save();

            return null;
        }

        $parceiro = $fat->parceiro ?? $fat->pedido?->parceiro;
        if (! $parceiro instanceof Parceiro) {
            $doc->status = DocumentoFiscalSaida::STATUS_ERRO;
            $doc->mensagem = 'Faturamento sem tomador.';
            $doc->save();

            return null;
        }

        $fat->loadMissing(['itens.pedidoItem']);
        $itens = array_values(array_filter(
            $this->payloads->itensParaPayload($fat->itens),
            fn (array $i) => FiscalSaidaDefaults::tipoDeFamilia($i['familia_fiscal'] ?? null) === 'NFSE'
        ));
        if ($itens === []) {
            $doc->status = DocumentoFiscalSaida::STATUS_ERRO;
            $doc->mensagem = 'Sem itens de serviço para a NFS-e.';
            $doc->save();

            return null;
        }

        $builtPayload = $this->payloads->nfse($empresa, $parceiro, $fat, $itens, (string) $doc->ref);
        $num = $this->numeracao->reservar($empresa);
        $tpAmb = $this->tpAmb();
        $montada = $this->dps->montar($empresa, $parceiro, $builtPayload['payload'], $num['numero'], $tpAmb);

        $material = null;
        try {
            $material = $this->materializer->materializar($empresa);
            $cert = ['path' => $material['path'], 'senha' => $material['senha']];
            $assinada = $this->signer->assinarInfDps($montada['xml'], $cert);
            $doc->serie = $num['serie'];
            $doc->numero = $num['numero'];
            $doc->ambiente = $tpAmb === 1 ? 'production' : 'homolog';
            $doc->enviado_em = now();
            $doc->status = DocumentoFiscalSaida::STATUS_PROCESSANDO;
            $doc->payload_json = array_merge(
                is_array($doc->payload_json) ? $doc->payload_json : $builtPayload['payload'],
                ['_xml_assinado' => $assinada, '_id_dps' => $montada['id_dps']]
            );
            $doc->save();

            $resp = $this->sefin->emitir($assinada, $cert);
        } finally {
            $this->materializer->liberar($material);
        }

        return $this->interpretar($resp, $montada['numero'], (string) $num['serie']);
    }

    public function sefinDisponivel(): bool
    {
        $stage = strtolower(trim((string) config('erp.stage', 'local')));

        return in_array($stage, config('erp.nfse.stages_permitidos', ['homolog', 'production']), true);
    }

    public function tpAmb(): int
    {
        $stage = strtolower(trim((string) config('erp.stage', 'local')));

        return in_array($stage, ['production', 'prod', 'producao'], true) ? 1 : 2;
    }

    /**
     * @return array<string, mixed>
     */
    private function resultadoFake(DocumentoFiscalSaida $doc): array
    {
        $chave = str_pad((string) $doc->id, 50, '9', STR_PAD_LEFT);

        return [
            'ok' => true,
            'status_focus' => 'autorizado',
            'http_status' => 201,
            'chave' => $chave,
            'numero' => (string) max(1, (int) $doc->id),
            'serie' => (string) FiscalSaidaDefaults::SERIE_DPS,
            'protocolo' => 'FAKE-NFSE',
            'mensagem' => 'Autorização de teste (NFSE_DRIVER=fake) — sem valor fiscal.',
            'origem' => DocumentoFiscalSaida::ORIGEM_SEFIN,
            'body' => ['chaveAcesso' => $chave, 'driver' => 'fake'],
        ];
    }

    /**
     * @param  array{http: int, body: array<string, mixed>, raw: string}  $resp
     * @return array<string, mixed>
     */
    private function interpretar(array $resp, int $numero, string $serie): array
    {
        $http = (int) $resp['http'];
        $body = $resp['body'];
        $chave = preg_replace('/\D/', '', (string) ($body['chaveAcesso'] ?? '')) ?: '';
        $erros = $body['erros'] ?? $body['Erros'] ?? null;
        $detalhe = '';
        if (is_array($erros) && isset($erros[0]) && is_array($erros[0])) {
            $detalhe = (string) ($erros[0]['Descricao'] ?? $erros[0]['descricao'] ?? $erros[0]['mensagem'] ?? '');
        }

        if ($http >= 200 && $http < 300 && strlen($chave) === 50) {
            return [
                'ok' => true,
                'status_focus' => 'autorizado',
                'http_status' => $http,
                'chave' => $chave,
                'numero' => (string) $numero,
                'serie' => $serie,
                'protocolo' => (string) ($body['idDps'] ?? ''),
                'mensagem' => 'NFS-e autorizada na SEFIN Nacional.',
                'origem' => DocumentoFiscalSaida::ORIGEM_SEFIN,
                'body' => $body,
            ];
        }

        $mensagem = $detalhe !== '' ? $detalhe : 'SEFIN não autorizou a NFS-e.';

        return [
            'ok' => false,
            'status_focus' => $http >= 500 || $http === 0 ? 'erro' : 'rejeitado',
            'http_status' => $http === 0 ? 500 : $http,
            'mensagem' => mb_substr($mensagem, 0, 500),
            'origem' => DocumentoFiscalSaida::ORIGEM_SEFIN,
            'numero' => (string) $numero,
            'serie' => $serie,
            'body' => $body,
        ];
    }
}
