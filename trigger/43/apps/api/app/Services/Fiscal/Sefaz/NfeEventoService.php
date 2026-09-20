<?php

namespace App\Services\Fiscal\Sefaz;

use App\Models\DocumentoFiscalSaida;
use App\Models\DocumentoFiscalSaidaEvento;
use App\Models\Empresa;
use App\Services\Cadastros\EmpresaCertificadoA1Materializer;
use Illuminate\Support\Facades\Auth;
use Illuminate\Validation\ValidationException;
use RuntimeException;

/**
 * Cancelamento (110111) e Carta de Correção (110110).
 */
final class NfeEventoService
{
    public function __construct(
        private readonly NfeSefazClient $client,
        private readonly NfeXmlSigner $signer,
        private readonly NfeAutorizacaoService $autorizacao,
        private readonly EmpresaCertificadoA1Materializer $materializer,
        private readonly SefazNfeUrlResolver $urls,
    ) {}

    /**
     * @return array{evento: DocumentoFiscalSaidaEvento, resultado: array<string, mixed>}
     */
    public function cancelar(Empresa $empresa, DocumentoFiscalSaida $doc, string $justificativa): array
    {
        $justificativa = trim($justificativa);
        if (mb_strlen($justificativa) < 15) {
            throw ValidationException::withMessages([
                'justificativa' => ['Informe a justificativa do cancelamento (mínimo 15 caracteres).'],
            ]);
        }
        $this->assertDocOficialNfe($doc);

        if ($doc->autorizado_em && $doc->autorizado_em->lt(now()->subHours(24))) {
            throw ValidationException::withMessages([
                'justificativa' => ['Prazo legal de cancelamento (24h) expirado para esta NF-e.'],
            ]);
        }

        $nSeq = 1;
        $xml = $this->montarEventoCancelamento($empresa, $doc, $justificativa, $nSeq);
        $evento = $this->criarEvento($empresa, $doc, DocumentoFiscalSaidaEvento::TIPO_CANCELAMENTO, DocumentoFiscalSaidaEvento::TP_CANCELAMENTO, $nSeq, $justificativa, $xml);
        $resultado = $this->enviar($empresa, $xml);
        $this->aplicarNoEvento($evento, $resultado);

        return ['evento' => $evento->fresh(), 'resultado' => $resultado->toArray()];
    }

    /**
     * @return array{evento: DocumentoFiscalSaidaEvento, resultado: array<string, mixed>}
     */
    public function cartaCorrecao(Empresa $empresa, DocumentoFiscalSaida $doc, string $texto, ?int $nSeq = null): array
    {
        $texto = trim($texto);
        if (mb_strlen($texto) < 15) {
            throw ValidationException::withMessages([
                'texto' => ['Informe o texto da carta de correção (mínimo 15 caracteres).'],
            ]);
        }
        $this->assertDocOficialNfe($doc);

        $ultimo = DocumentoFiscalSaidaEvento::query()
            ->where('documento_fiscal_saida_id', $doc->id)
            ->where('tipo', DocumentoFiscalSaidaEvento::TIPO_CCE)
            ->where('status', DocumentoFiscalSaidaEvento::STATUS_AUTORIZADO)
            ->max('n_seq_evento');
        $nSeq = $nSeq ?? ((int) $ultimo + 1);
        if ($nSeq < 1 || $nSeq > 20) {
            throw ValidationException::withMessages([
                'n_seq_evento' => ['Sequência da CC-e deve estar entre 1 e 20.'],
            ]);
        }

        $xml = $this->montarEventoCce($empresa, $doc, $texto, $nSeq);
        $evento = $this->criarEvento($empresa, $doc, DocumentoFiscalSaidaEvento::TIPO_CCE, DocumentoFiscalSaidaEvento::TP_CCE, $nSeq, $texto, $xml);
        $resultado = $this->enviar($empresa, $xml);
        $this->aplicarNoEvento($evento, $resultado);

        return ['evento' => $evento->fresh(), 'resultado' => $resultado->toArray()];
    }

    private function assertDocOficialNfe(DocumentoFiscalSaida $doc): void
    {
        if ($doc->tipo !== DocumentoFiscalSaida::TIPO_NFE || ! $doc->eOficial() || ! $doc->chave) {
            throw ValidationException::withMessages([
                'documento' => ['Somente NF-e autorizada oficialmente pode receber este evento.'],
            ]);
        }
    }

    private function criarEvento(
        Empresa $empresa,
        DocumentoFiscalSaida $doc,
        string $tipo,
        string $tp,
        int $nSeq,
        string $texto,
        string $xml,
    ): DocumentoFiscalSaidaEvento {
        return DocumentoFiscalSaidaEvento::query()->create([
            'empresa_id' => $empresa->id,
            'documento_fiscal_saida_id' => $doc->id,
            'tipo' => $tipo,
            'tp_evento' => $tp,
            'n_seq_evento' => $nSeq,
            'status' => DocumentoFiscalSaidaEvento::STATUS_PROCESSANDO,
            'justificativa' => $texto,
            'xml_envio' => $xml,
            'criado_por' => Auth::id(),
        ]);
    }

    private function enviar(Empresa $empresa, string $xmlEvento): NfeSefazResultado
    {
        $material = null;
        try {
            if (strtolower((string) config('erp.nfe.driver', 'sefaz')) === 'fake') {
                $cert = ['path' => '', 'senha' => ''];
                $assinado = $xmlEvento;
            } else {
                $material = $this->materializer->materializar($empresa);
                $cert = ['path' => $material['path'], 'senha' => $material['senha']];
                $assinado = $this->signer->assinarEvento($xmlEvento, $cert);
            }

            return $this->client->enviarEvento(
                strtoupper(trim((string) $empresa->uf)),
                $this->autorizacao->tpAmb(),
                $assinado,
                $cert
            );
        } finally {
            $this->materializer->liberar($material);
        }
    }

    private function aplicarNoEvento(DocumentoFiscalSaidaEvento $evento, NfeSefazResultado $resultado): void
    {
        $evento->response_json = $resultado->body;
        $evento->xml_retorno = $resultado->xmlRetorno;
        $evento->mensagem = mb_substr($resultado->mensagem, 0, 500);
        $evento->protocolo = $resultado->protocolo;
        if (in_array($resultado->status, [NfeSefazResultado::STATUS_AUTORIZADO, NfeSefazResultado::STATUS_CANCELADO], true)) {
            $evento->status = DocumentoFiscalSaidaEvento::STATUS_AUTORIZADO;
            $evento->autorizado_em = now();
        } elseif ($resultado->status === NfeSefazResultado::STATUS_ERRO) {
            $evento->status = DocumentoFiscalSaidaEvento::STATUS_ERRO;
        } else {
            $evento->status = DocumentoFiscalSaidaEvento::STATUS_REJEITADO;
        }
        $evento->save();
    }

    private function montarEventoCancelamento(Empresa $empresa, DocumentoFiscalSaida $doc, string $xJust, int $nSeq): string
    {
        $cnpj = str_pad(preg_replace('/\D/', '', (string) $empresa->cnpj) ?: '0', 14, '0', STR_PAD_LEFT);
        $chave = preg_replace('/\D/', '', (string) $doc->chave) ?: '';
        $tpAmb = $this->autorizacao->tpAmb();
        $cOrgao = $this->urls->cuf((string) $empresa->uf);
        $id = 'ID'.DocumentoFiscalSaidaEvento::TP_CANCELAMENTO.$chave.str_pad((string) $nSeq, 2, '0', STR_PAD_LEFT);
        $dh = now()->timezone('America/Sao_Paulo')->format('Y-m-d\TH:i:sP');
        $nProt = $this->esc((string) $doc->protocolo);

        $det = '<detEvento versao="1.00">'
            .'<descEvento>Cancelamento</descEvento>'
            .'<nProt>'.$nProt.'</nProt>'
            .'<xJust>'.$this->esc($xJust).'</xJust>'
            .'</detEvento>';

        return $this->envelopeEvento($id, $cOrgao, $tpAmb, $cnpj, $chave, DocumentoFiscalSaidaEvento::TP_CANCELAMENTO, 'Cancelamento', $nSeq, $dh, $det);
    }

    private function montarEventoCce(Empresa $empresa, DocumentoFiscalSaida $doc, string $xCorrecao, int $nSeq): string
    {
        $cnpj = str_pad(preg_replace('/\D/', '', (string) $empresa->cnpj) ?: '0', 14, '0', STR_PAD_LEFT);
        $chave = preg_replace('/\D/', '', (string) $doc->chave) ?: '';
        $tpAmb = $this->autorizacao->tpAmb();
        $cOrgao = $this->urls->cuf((string) $empresa->uf);
        $id = 'ID'.DocumentoFiscalSaidaEvento::TP_CCE.$chave.str_pad((string) $nSeq, 2, '0', STR_PAD_LEFT);
        $dh = now()->timezone('America/Sao_Paulo')->format('Y-m-d\TH:i:sP');

        $det = '<detEvento versao="1.00">'
            .'<descEvento>Carta de Correcao</descEvento>'
            .'<xCorrecao>'.$this->esc($xCorrecao).'</xCorrecao>'
            .'<xCondUso>A Carta de Correcao e disciplinada pelo paragrafo 1o-A do art. 7o do Convenio S/N, de 15 de dezembro de 1970 e pode ser utilizada para regularizacao de erro ocorrido na emissao de documento fiscal, desde que o erro nao esteja relacionado com: I - as variaveis que determinam o valor do imposto tais como: base de calculo, aliquota, diferenca de preco, quantidade, valor da operacao ou da prestacao; II - a correcao de dados cadastrais que implique mudanca do remetente ou do destinatario; III - a data de emissao ou de saida.</xCondUso>'
            .'</detEvento>';

        return $this->envelopeEvento($id, $cOrgao, $tpAmb, $cnpj, $chave, DocumentoFiscalSaidaEvento::TP_CCE, 'Carta de Correcao', $nSeq, $dh, $det);
    }

    private function envelopeEvento(
        string $id,
        string $cOrgao,
        int $tpAmb,
        string $cnpj,
        string $chave,
        string $tpEvento,
        string $desc,
        int $nSeq,
        string $dh,
        string $det,
    ): string {
        return '<?xml version="1.0" encoding="UTF-8"?>'
            .'<evento xmlns="http://www.portalfiscal.inf.br/nfe" versao="1.00">'
            .'<infEvento Id="'.$id.'">'
            .'<cOrgao>'.$cOrgao.'</cOrgao>'
            .'<tpAmb>'.$tpAmb.'</tpAmb>'
            .'<CNPJ>'.$cnpj.'</CNPJ>'
            .'<chNFe>'.$chave.'</chNFe>'
            .'<dhEvento>'.$dh.'</dhEvento>'
            .'<tpEvento>'.$tpEvento.'</tpEvento>'
            .'<nSeqEvento>'.$nSeq.'</nSeqEvento>'
            .'<verEvento>1.00</verEvento>'
            .$det
            .'</infEvento>'
            .'</evento>';
    }

    private function esc(string $s): string
    {
        return htmlspecialchars($s, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
