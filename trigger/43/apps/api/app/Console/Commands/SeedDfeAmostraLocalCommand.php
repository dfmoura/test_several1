<?php

namespace App\Console\Commands;

use App\Models\DfeDocumento;
use App\Models\DfeSyncEstado;
use App\Models\Empresa;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Storage;

/**
 * Amostra local da caixa DF-e (XML no cofre) — só ERP_STAGE=local.
 * Não fala com SEFAZ. Uso: testar lista + Baixar XML no notebook.
 */
class SeedDfeAmostraLocalCommand extends Command
{
    protected $signature = 'dfe:amostra-local {--empresa= : ID da EMP (default: primeira ATIVA)}';

    protected $description = 'Insere 1 NF-e fake com XML no cofre (somente stage local)';

    public function handle(): int
    {
        if (strtolower((string) config('erp.stage', 'local')) !== 'local') {
            $this->error('Comando só permitido com ERP_STAGE=local (não roda em homolog/production).');

            return self::FAILURE;
        }

        $empresa = $this->option('empresa')
            ? Empresa::query()->find((int) $this->option('empresa'))
            : Empresa::query()->where('situacao', 'ATIVA')->orderBy('id')->first();

        if ($empresa === null) {
            $this->error('Nenhuma EMP encontrada.');

            return self::FAILURE;
        }

        $chave = '312609'.str_pad(preg_replace('/\D/', '', (string) $empresa->cnpj) ?: '0', 14, '0', STR_PAD_LEFT)
            .'55100000000111100000001';
        $chave = substr($chave.str_repeat('0', 44), 0, 44);

        $xml = '<?xml version="1.0" encoding="UTF-8"?>'
            .'<nfeProc xmlns="http://www.portalfiscal.inf.br/nfe" versao="4.00">'
            .'<NFe><infNFe Id="NFe'.$chave.'" versao="4.00">'
            .'<ide><cUF>31</cUF><natOp>Compra local ensaio</natOp><mod>55</mod><serie>1</serie><nNF>9001</nNF>'
            .'<dhEmi>'.now()->format('Y-m-d').'T10:00:00-03:00</dhEmi><tpNF>1</tpNF><idDest>1</idDest>'
            .'<cMunFG>3106200</cMunFG><tpImp>1</tpImp><tpEmis>1</tpEmis><cDV>1</cDV><tpAmb>2</tpAmb>'
            .'<finNFe>1</finNFe><indFinal>0</indFinal><indPres>1</indPres></ide>'
            .'<emit><CNPJ>12345678000199</CNPJ><xNome>Fornecedor Amostra Local</xNome>'
            .'<enderEmit><UF>MG</UF></enderEmit><IE>ISENTO</IE></emit>'
            .'<dest><CNPJ>'.preg_replace('/\D/', '', (string) $empresa->cnpj).'</CNPJ>'
            .'<xNome>'.htmlspecialchars((string) $empresa->razao_social, ENT_XML1).'</xNome></dest>'
            .'<det nItem="1"><prod><cProd>MP-LARG-320</cProd><xProd>Papel adesivo largura 320mm</xProd>'
            .'<NCM>39199090</NCM><CFOP>5102</CFOP><uCom>KG</uCom><qCom>10.0000</qCom>'
            .'<vUnCom>25.075000</vUnCom><vProd>250.75</vProd><uTrib>KG</uTrib><qTrib>10.0000</qTrib>'
            .'<vUnTrib>25.075000</vUnTrib><indTot>1</indTot></prod></det>'
            .'<total><ICMSTot><vBC>0.00</vBC><vICMS>0.00</vICMS><vProd>250.75</vProd>'
            .'<vNF>250.75</vNF></ICMSTot></total>'
            .'</infNFe></NFe>'
            .'<protNFe versao="4.00"><infProt><chNFe>'.$chave.'</chNFe><cStat>100</cStat>'
            .'<xMotivo>Autorizado o uso da NF-e (amostra local)</xMotivo></infProt></protNFe>'
            .'</nfeProc>';

        $path = sprintf('dfe-documentos/%d/%s.xml', $empresa->id, $chave);
        Storage::disk((string) config('erp.dfe.xml_disk', 'local'))->put($path, $xml);

        $doc = DfeDocumento::query()->updateOrCreate(
            [
                'empresa_id' => $empresa->id,
                'chave' => $chave,
            ],
            [
                'nsu' => '000000000000001',
                'schema_dfe' => 'procNFe_v4.00.xsd',
                'modelo' => '55',
                'serie' => '1',
                'numero' => '9001',
                'data_emissao' => now()->toDateString(),
                'emit_cnpj' => '12345678000199',
                'emit_nome' => 'Fornecedor Amostra Local',
                'valor_total' => '250.75',
                'situacao' => DfeDocumento::SITUACAO_DISPONIVEL,
                'xml_path' => $path,
                'xml_sha256' => hash('sha256', $xml),
                'resumo' => [
                    'schema' => 'procNFe_v4.00.xsd',
                    'origem' => 'amostra-local',
                ],
            ],
        );

        DfeSyncEstado::query()->firstOrCreate(
            ['empresa_id' => $empresa->id],
            [
                'ultimo_nsu' => '000000000000001',
                'max_nsu' => '000000000000001',
                'sync_status' => DfeSyncEstado::STATUS_IDLE,
                'sync_mensagem' => 'Amostra local pronta — use Baixar XML (sync SEFAZ desligado em local).',
                'ultima_sync_em' => now(),
                'primeira_hidratacao_completa' => true,
                'ano_alvo_hidratacao' => (int) now()->year,
            ],
        );

        $this->info("EMP {$empresa->id} ({$empresa->codigo}): doc #{$doc->id} com XML.");
        $this->line('Abra http://localhost:8043/compras/nfe-destinadas → coluna XML → Baixar.');
        $this->comment('Atualizar do fisco permanece bloqueado em ERP_STAGE=local (norma).');

        return self::SUCCESS;
    }
}
