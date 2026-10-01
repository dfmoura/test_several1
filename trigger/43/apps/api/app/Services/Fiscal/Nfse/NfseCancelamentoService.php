<?php

namespace App\Services\Fiscal\Nfse;

use App\Models\DocumentoFiscalSaida;
use App\Models\Empresa;
use App\Services\Cadastros\EmpresaCertificadoA1Materializer;
use App\Services\Cadastros\EmpresaCertificadoA1Service;
use App\Services\Fiscal\Sefaz\NfeXmlSigner;
use RuntimeException;

/**
 * Cancelamento e101101 na SEFIN. Não mexe em estoque nem desfaz o faturamento.
 */
final class NfseCancelamentoService
{
    public function __construct(
        private readonly NfsePedRegBuilder $xml,
        private readonly NfseSefinClient $sefin,
        private readonly NfeXmlSigner $signer,
        private readonly EmpresaCertificadoA1Service $a1,
        private readonly EmpresaCertificadoA1Materializer $materializer,
    ) {}

    public function elegivel(DocumentoFiscalSaida $doc): bool
    {
        if ($doc->tipo !== DocumentoFiscalSaida::TIPO_NFSE) {
            return false;
        }
        if ($doc->status !== DocumentoFiscalSaida::STATUS_AUTORIZADO) {
            return false;
        }
        if ($doc->autorizacao_origem !== DocumentoFiscalSaida::ORIGEM_SEFIN) {
            return false;
        }
        $chave = preg_replace('/\D/', '', (string) $doc->chave) ?: '';
        if (strlen($chave) !== 50) {
            return false;
        }
        $prot = (string) $doc->protocolo;

        return ! str_starts_with($prot, 'FAKE') && ! str_starts_with($prot, 'SIM');
    }

    /**
     * @return array{ok: bool, mensagem: string, sequencial: ?int}
     */
    public function cancelar(Empresa $empresa, DocumentoFiscalSaida $doc, string $motivo, string $codigo): array
    {
        if (! $this->elegivel($doc)) {
            throw new RuntimeException('Não há NFS-e autorizada na SEFIN para cancelar.');
        }
        if (! NfseCanal::falaComFisco()) {
            throw new RuntimeException('Cancelamento de NFS-e não roda neste stage.');
        }
        if (! $this->a1->aptoParaOperar($empresa)) {
            throw new RuntimeException('Certificado A1 desta empresa não está apto para cancelar a NFS-e.');
        }

        $producao = in_array((string) $doc->ambiente, ['production', 'prod', 'producao'], true);
        $pedido = $this->xml->xml(
            (string) $doc->chave,
            (string) $empresa->cnpj,
            $codigo,
            $motivo,
            $producao ? 1 : 2,
        );

        $material = null;
        try {
            $material = $this->materializer->materializar($empresa);
            $cert = ['path' => $material['path'], 'senha' => $material['senha']];
            $assinado = $this->signer->assinarInfPedReg($pedido, $cert);
            $resp = $this->sefin->registrarEvento(
                preg_replace('/\D/', '', (string) $doc->chave) ?: '',
                $assinado,
                $cert,
                $producao,
            );
        } finally {
            $this->materializer->liberar($material);
        }

        return $this->interpretar($resp);
    }

    /**
     * @param  array{http: int, body: array<string, mixed>, raw: string}  $resp
     * @return array{ok: bool, mensagem: string, sequencial: ?int}
     */
    private function interpretar(array $resp): array
    {
        $http = (int) $resp['http'];
        $body = $resp['body'];
        $evento = (string) ($body['eventoXmlGZipB64'] ?? '');
        $seq = isset($body['nSeqEvento']) ? (int) $body['nSeqEvento'] : null;
        if ($http >= 200 && $http < 300 && $evento !== '') {
            return [
                'ok' => true,
                'mensagem' => 'NFS-e cancelada na SEFIN Nacional.',
                'sequencial' => $seq,
            ];
        }

        $erros = $body['erros'] ?? $body['Erros'] ?? null;
        $detalhe = '';
        if (is_array($erros) && isset($erros[0]) && is_array($erros[0])) {
            $detalhe = trim((string) ($erros[0]['Descricao'] ?? $erros[0]['descricao'] ?? ''));
        }
        if ($detalhe === '') {
            $detalhe = 'SEFIN não registrou o cancelamento.';
        }

        return [
            'ok' => false,
            'mensagem' => mb_substr($detalhe, 0, 500),
            'sequencial' => $seq,
        ];
    }
}
