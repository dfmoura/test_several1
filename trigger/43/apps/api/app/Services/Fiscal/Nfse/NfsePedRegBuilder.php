<?php

namespace App\Services\Fiscal\Nfse;

use RuntimeException;

/**
 * Pedido de registro de evento da NFS-e Nacional (cancelamento e101101).
 * Forma alinhada ao emissor que já registra o evento na SEFIN.
 */
final class NfsePedRegBuilder
{
    public const CODIGOS = ['1', '2', '9'];

    public function xml(string $chave, string $cnpj, string $codigoMotivo, string $motivo, int $tpAmb): string
    {
        $chave = preg_replace('/\D/', '', $chave) ?: '';
        $cnpj = preg_replace('/\D/', '', $cnpj) ?: '';
        if (strlen($chave) !== 50) {
            throw new RuntimeException('A chave da NFS-e precisa ter 50 dígitos para o cancelamento.');
        }
        if (strlen($cnpj) !== 14) {
            throw new RuntimeException('CNPJ do autor do cancelamento inválido.');
        }
        if (! in_array($codigoMotivo, self::CODIGOS, true)) {
            throw new RuntimeException('Código de motivo inválido. Use 1, 2 ou 9.');
        }
        $motivo = $this->motivo($motivo);
        $id = 'PRE'.$chave.'101101';
        $dh = now()->timezone('America/Sao_Paulo')->format('Y-m-d\TH:i:sP');
        $amb = $tpAmb === 1 ? '1' : '2';

        return '<?xml version="1.0" encoding="UTF-8"?>'
            .'<pedRegEvento xmlns="http://www.sped.fazenda.gov.br/nfse" versao="1.00">'
            .'<infPedReg Id="'.$id.'">'
            .'<tpAmb>'.$amb.'</tpAmb>'
            .'<verAplic>FLEXOERP-NFSE-1</verAplic>'
            .'<dhEvento>'.$dh.'</dhEvento>'
            .'<CNPJAutor>'.$cnpj.'</CNPJAutor>'
            .'<chNFSe>'.$chave.'</chNFSe>'
            .'<e101101>'
            .'<xDesc>Cancelamento de NFS-e</xDesc>'
            .'<cMotivo>'.$codigoMotivo.'</cMotivo>'
            .'<xMotivo>'.$this->escape($motivo).'</xMotivo>'
            .'</e101101>'
            .'</infPedReg>'
            .'</pedRegEvento>';
    }

    public function motivo(string $motivo): string
    {
        $motivo = trim($motivo);
        $len = mb_strlen($motivo);
        if ($len < 15 || $len > 255) {
            throw new RuntimeException('O motivo do cancelamento precisa ter entre 15 e 255 caracteres.');
        }

        return $motivo;
    }

    private function escape(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
