<?php

namespace App\Services\Fiscal\Nfse;

use App\Models\Empresa;
use App\Models\Parceiro;
use RuntimeException;

/**
 * DPS da NFS-e Nacional (layout alinhado ao emissor de referência em trigger/22).
 * O número da nota e a chave nascem na SEFIN — este XML é só a DPS.
 */
final class NfseDpsBuilder
{
    private const NS = 'http://www.sped.fazenda.gov.br/nfse';

    /**
     * @param  array<string, mixed>  $payload
     */
    public function validar(Empresa $empresa, Parceiro $toma, array $payload): void
    {
        $cMun = preg_replace('/\D/', '', (string) ($payload['codigo_municipio_emissora'] ?? $empresa->ibge)) ?: '';
        $cnpj = preg_replace('/\D/', '', (string) ($payload['cnpj_prestador'] ?? $empresa->cnpj)) ?: '';
        $doc = preg_replace('/\D/', '', (string) $toma->cnpj_cpf) ?: '';
        $cTrib = preg_replace('/\D/', '', (string) ($payload['codigo_tributacao_nacional_iss'] ?? '')) ?: '';
        if (strlen($cMun) !== 7) {
            throw new RuntimeException('Município da empresa (IBGE, 7 dígitos) é obrigatório para a DPS.');
        }
        if (strlen($cnpj) !== 14) {
            throw new RuntimeException('CNPJ da empresa é obrigatório para a DPS.');
        }
        if (! in_array(strlen($doc), [11, 14], true)) {
            throw new RuntimeException('Tomador sem CPF ou CNPJ para a NFS-e.');
        }
        if ($cTrib === '') {
            throw new RuntimeException('Código de tributação nacional do serviço ausente.');
        }
        $this->enderecoTomador($toma);
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array{xml: string, id_dps: string, numero: int, serie: string}
     */
    public function montar(Empresa $empresa, Parceiro $toma, array $payload, int $numero, int $tpAmb): array
    {
        $this->validar($empresa, $toma, $payload);
        $cMun = preg_replace('/\D/', '', (string) ($payload['codigo_municipio_emissora'] ?? $empresa->ibge)) ?: '';
        $cnpj = preg_replace('/\D/', '', (string) ($payload['cnpj_prestador'] ?? $empresa->cnpj)) ?: '';
        if ($numero < 1) {
            throw new RuntimeException('Número da DPS inválido.');
        }

        $serie = str_pad((string) ((int) ($payload['serie_dps'] ?? 1)), 5, '0', STR_PAD_LEFT);
        $nDpsId = str_pad((string) $numero, 15, '0', STR_PAD_LEFT);
        $idDps = $cMun.'2'.$cnpj.$serie.$nDpsId;
        if (strlen($idDps) !== 42) {
            throw new RuntimeException('Identificador da DPS fora do tamanho nacional (42).');
        }

        $doc = preg_replace('/\D/', '', (string) $toma->cnpj_cpf) ?: '';
        $docTag = strlen($doc) === 11 ? 'CPF' : 'CNPJ';

        $crt = (int) ($empresa->crt ?? 3);
        $opSimp = match ($crt) {
            4 => '2',
            1, 2 => '3',
            default => '1',
        };
        $optante = $opSimp !== '1';
        $regAp = $optante ? '<regApTribSN>1</regApTribSN>' : '';
        $totTrib = $optante
            ? '<pTotTribSN>6.00</pTotTribSN>'
            : '<pTotTrib><pTotTribFed>0.00</pTotTribFed><pTotTribEst>0.00</pTotTribEst><pTotTribMun>0.00</pTotTribMun></pTotTrib>';

        $im = preg_replace('/\D/', '', (string) ($payload['inscricao_municipal_prestador'] ?? '')) ?: '';
        $imXml = $im !== '' ? '<IM>'.$this->esc($im).'</IM>' : '';
        $cTrib = preg_replace('/\D/', '', (string) ($payload['codigo_tributacao_nacional_iss'] ?? '')) ?: '';
        $nbs = preg_replace('/\D/', '', (string) ($payload['codigo_nbs'] ?? '')) ?: '';
        $desc = $this->esc(mb_substr((string) ($payload['descricao_servico'] ?? 'Serviço'), 0, 2000));
        $nbsXml = $nbs !== '' ? '<cNBS>'.$this->esc($nbs).'</cNBS>' : '';
        $valor = number_format((float) ($payload['valor_servico'] ?? 0), 2, '.', '');
        $dh = now()->timezone('America/Sao_Paulo')->format('Y-m-d\TH:i:sP');
        $compet = now()->timezone('America/Sao_Paulo')->toDateString();
        $cLocPrest = preg_replace('/\D/', '', (string) ($payload['codigo_municipio_prestacao'] ?? $cMun)) ?: $cMun;
        $nomeToma = $this->esc((string) ($toma->razao_social ?: 'Tomador'));
        $end = $this->enderecoTomador($toma);
        $prestContato = $this->contato($empresa->telefone, $empresa->email);
        $tomaContato = $this->contato($toma->telefone, $toma->email_xml ?: $toma->email);

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'
            .'<DPS xmlns="'.self::NS.'" versao="1.01">'
            .'<infDPS Id="DPS'.$idDps.'">'
            .'<tpAmb>'.$tpAmb.'</tpAmb>'
            .'<dhEmi>'.$dh.'</dhEmi>'
            .'<verAplic>FLEXOERP-NFSE-1</verAplic>'
            .'<serie>'.$serie.'</serie>'
            .'<nDPS>'.$numero.'</nDPS>'
            .'<dCompet>'.$compet.'</dCompet>'
            .'<tpEmit>1</tpEmit>'
            .'<cLocEmi>'.$cMun.'</cLocEmi>'
            .'<prest><CNPJ>'.$cnpj.'</CNPJ>'.$imXml.$prestContato
            .'<regTrib><opSimpNac>'.$opSimp.'</opSimpNac>'.$regAp.'<regEspTrib>0</regEspTrib></regTrib>'
            .'</prest>'
            .'<toma><'.$docTag.'>'.$doc.'</'.$docTag.'><xNome>'.$nomeToma.'</xNome>'.$end.$tomaContato.'</toma>'
            .'<serv><locPrest><cLocPrestacao>'.$cLocPrest.'</cLocPrestacao></locPrest>'
            .'<cServ><cTribNac>'.$cTrib.'</cTribNac><xDescServ>'.$desc.'</xDescServ>'.$nbsXml.'</cServ>'
            .'</serv>'
            .'<valores><vServPrest><vServ>'.$valor.'</vServ></vServPrest>'
            .'<trib><tribMun><tribISSQN>1</tribISSQN><tpRetISSQN>1</tpRetISSQN></tribMun>'
            .'<tribFed><piscofins><CST>00</CST></piscofins></tribFed>'
            .'<totTrib>'.$totTrib.'</totTrib></trib></valores>'
            .'</infDPS></DPS>';

        return [
            'xml' => $xml,
            'id_dps' => $idDps,
            'numero' => $numero,
            'serie' => $serie,
        ];
    }

    private function enderecoTomador(Parceiro $toma): string
    {
        $cMun = preg_replace('/\D/', '', (string) $toma->ibge) ?: '';
        $cep = preg_replace('/\D/', '', (string) $toma->cep) ?: '';
        $lgr = trim((string) $toma->logradouro);
        $nro = trim((string) ($toma->numero ?: 'S/N'));
        $bairro = trim((string) $toma->bairro);
        if (strlen($cMun) !== 7 || strlen($cep) !== 8 || $lgr === '' || $bairro === '') {
            throw new RuntimeException('Tomador sem endereço completo (logradouro, bairro, CEP e IBGE) para a NFS-e.');
        }
        $cpl = trim((string) $toma->complemento);
        $cplXml = $cpl !== '' ? '<xCpl>'.$this->esc($cpl).'</xCpl>' : '';

        return '<end><endNac><cMun>'.$cMun.'</cMun><CEP>'.$cep.'</CEP></endNac>'
            .'<xLgr>'.$this->esc($lgr).'</xLgr><nro>'.$this->esc($nro).'</nro>'
            .$cplXml
            .'<xBairro>'.$this->esc($bairro).'</xBairro></end>';
    }

    private function contato(?string $telefone, ?string $email): string
    {
        $fone = preg_replace('/\D/', '', (string) $telefone) ?: '';
        $mail = trim((string) $email);
        $xml = '';
        if ($fone !== '') {
            $xml .= '<fone>'.$this->esc($fone).'</fone>';
        }
        if ($mail !== '') {
            $xml .= '<email>'.$this->esc($mail).'</email>';
        }

        return $xml;
    }

    private function esc(string $value): string
    {
        return htmlspecialchars($value, ENT_XML1 | ENT_QUOTES, 'UTF-8');
    }
}
