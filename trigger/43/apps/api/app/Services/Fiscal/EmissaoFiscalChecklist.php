<?php

namespace App\Services\Fiscal;

use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\Pedido;
use App\Services\Cadastros\EmpresaFiscalRules;
use App\Services\Cadastros\ParceiroFiscalRules;
use App\Services\Estoque\EstoqueSaidaVendaService;
use App\Services\Fiscal\Sefaz\NfeAutorizacaoService;
use App\Support\PadraoDecimal;

/**
 * Plano dual NF-e / NFS-e e checklist pré-emissão.
 * Não bloqueia o FAT — só decide se a emissão SEFAZ (NF-e) pode sair.
 */
class EmissaoFiscalChecklist
{
    public function __construct(
        private readonly FiscalHubResolver $hubs,
        private readonly FiscalEmissorPolicy $emissorPolicy,
        private readonly EstoqueSaidaVendaService $saidaVenda,
        private readonly NfeAutorizacaoService $nfeSefaz,
    ) {}

    /**
     * @param  list<array<string, mixed>>  $itensFat
     * @return array<string, mixed>
     */
    public function paraPedido(Empresa $empresa, Pedido $pedido, array $itensFat): array
    {
        $planos = $this->planar($itensFat);
        $hub = $this->hubs->diagnostico($empresa); // legado UI
        $parceiro = $pedido->parceiro;
        $pendencias = [];
        $avisos = [];

        $precisaNfe = $this->temTipo($planos, 'NFE');
        $precisaNfse = $this->temTipo($planos, 'NFSE');

        $empEval = EmpresaFiscalRules::evaluate($empresa->attributesToFiscalArray());
        if ($precisaNfe && ! $empEval['apto_emissao_nfe']) {
            $pendencias = array_merge(
                $pendencias,
                $this->prefixar('Emitente NF-e', array_merge($empEval['pendencias'], $empEval['pendencias_emissao']))
            );
        }
        if ($precisaNfse && ! ($empEval['apto_emissao_nfse'] ?? false)) {
            $pendencias = array_merge(
                $pendencias,
                $this->prefixar(
                    'Emitente NFS-e',
                    array_merge($empEval['pendencias_nfse'] ?? [], $empEval['pendencias_emissao_nfse'] ?? [])
                )
            );
        }

        if ($parceiro === null) {
            $pendencias[] = 'Pedido sem destinatário.';
        } else {
            $parEval = ParceiroFiscalRules::evaluate($parceiro->attributesToFiscalArray());
            if ($precisaNfe && ! ($parEval['apto_emissao_nfe'] ?? false)) {
                $pendencias = array_merge(
                    $pendencias,
                    $this->prefixar('Destinatário', array_merge($parEval['pendencias'], $parEval['pendencias_emissao']))
                );
            }
            if ($precisaNfse) {
                $doc = preg_replace('/\D/', '', (string) $parceiro->cnpj_cpf) ?: '';
                if (strlen($doc) !== 11 && strlen($doc) !== 14) {
                    $pendencias[] = 'Tomador: CNPJ ou CPF para NFS-e.';
                }
                if (trim((string) $parceiro->razao_social) === '') {
                    $pendencias[] = 'Tomador: nome / razão social.';
                }
            }
        }

        $pendenciasCadastro = array_values(array_unique(array_filter($pendencias)));

        $sefazApto = $precisaNfe
            && $this->nfeSefaz->sefazDisponivel()
            && (strtolower((string) config('erp.nfe.driver', 'sefaz')) === 'fake'
                || $this->nfeSefaz->a1Apto($empresa));

        $stub = $this->emissorPolicy->diagnostico($sefazApto);

        if ($precisaNfe && ! $sefazApto && ! $stub['ativo']) {
            if (! $this->nfeSefaz->sefazDisponivel()) {
                $pendencias[] = 'Emissão SEFAZ disponível só em homolog/produção (ou NFE_DRIVER=fake).';
            } elseif (! $this->nfeSefaz->a1Apto($empresa)) {
                $pendencias[] = 'Certificado A1 da empresa não está apto para emitir NF-e.';
            }
        }

        if ($precisaNfse) {
            $avisos[] = 'NFS-e Nacional ainda não emite nesta fatia — documento permanece planejado.';
            $pendencias[] = 'Emissão de NFS-e ainda não disponível (ADR futura).';
        }

        $pendencias = array_merge($pendencias, $this->saidaVenda->pendenciasEmissao($empresa, $pedido, $itensFat));
        $avisos = array_merge($avisos, $this->saidaVenda->avisosEmissao($empresa, $pedido, $itensFat));

        if ($precisaNfe) {
            $avisos[] = 'NF-e de produto (modelo 55) via certificado A1 da empresa na SEFAZ.';
        }
        if ($stub['ativo'] && $stub['mensagem'] !== '') {
            $avisos[] = $stub['mensagem'];
        }

        $pendencias = array_values(array_unique(array_filter($pendencias)));
        // apto_emissao para NF-e: cadastro OK + (SEFAZ ou stub); NFS-e sozinha não habilita
        $aptoCadastro = $pendenciasCadastro === [] && $planos !== [];
        $aptoNfe = $precisaNfe && $pendenciasCadastro === [] && ($sefazApto || $stub['ativo'])
            && $this->saidaVenda->pendenciasEmissao($empresa, $pedido, $itensFat) === [];
        $apto = $aptoNfe && ! $precisaNfse; // misto com NFSE bloqueia emissão automática completa
        if ($precisaNfe && ! $precisaNfse) {
            $apto = $aptoNfe;
        }

        return [
            'documentos' => $planos,
            'hub' => $hub,
            'sefaz' => [
                'apto' => $sefazApto,
                'driver' => config('erp.nfe.driver'),
                'disponivel' => $this->nfeSefaz->sefazDisponivel(),
                'a1_apto' => $this->nfeSefaz->a1Apto($empresa),
            ],
            'emissor_teste' => $stub,
            'apto_cadastro' => $aptoCadastro,
            'apto_emissao' => $apto,
            'emissao_automatica' => $aptoCadastro && ($sefazApto || $stub['ativo']) && $precisaNfe && ! $precisaNfse,
            'pendencias' => $pendencias,
            'pendencias_cadastro' => $pendenciasCadastro,
            'avisos' => $avisos,
            'precisa_nfe' => $precisaNfe,
            'precisa_nfse' => $precisaNfse,
        ];
    }

    /**
     * @return array<string, mixed>
     */
    public function paraFaturamento(Empresa $empresa, Faturamento $fat): array
    {
        $fat->loadMissing(['pedido.parceiro', 'itens.pedidoItem.produtoPa']);
        $itens = [];
        foreach ($fat->itens as $i) {
            $itens[] = [
                'descricao' => $i->descricao,
                'valor' => (string) $i->valor,
                'familia_fiscal' => $i->familia_fiscal ?: $i->pedidoItem?->familia_fiscal,
                'qtde' => (string) $i->qtde,
                'unidade' => $i->unidade,
                'preco_unitario' => (string) $i->preco_unitario,
                'pedido_item_id' => $i->pedido_item_id,
            ];
        }
        $pedido = $fat->pedido ?? new Pedido;
        if ($fat->pedido === null) {
            $pedido->parceiro = $fat->parceiro;
        }

        return $this->paraPedido($empresa, $fat->pedido ?? $pedido, $itens);
    }

    /**
     * @param  list<array<string, mixed>>  $itensFat
     * @return list<array{tipo: string, rotulo: string, valor: string, itens: int}>
     */
    public function planar(array $itensFat): array
    {
        $acc = ['NFE' => '0.00', 'NFSE' => '0.00'];
        $qtd = ['NFE' => 0, 'NFSE' => 0];
        foreach ($itensFat as $linha) {
            $tipo = FiscalSaidaDefaults::tipoDeFamilia($linha['familia_fiscal'] ?? null);
            $valor = PadraoDecimal::roundHalfUp((string) ($linha['valor'] ?? '0'), PadraoDecimal::SCALE_MONEY);
            $acc[$tipo] = bcadd($acc[$tipo], $valor, PadraoDecimal::SCALE_MONEY);
            $qtd[$tipo]++;
        }

        $out = [];
        foreach (['NFE' => 'NF-e de produto', 'NFSE' => 'NFS-e de serviço'] as $tipo => $rotulo) {
            if ($qtd[$tipo] === 0) {
                continue;
            }
            $out[] = [
                'tipo' => $tipo,
                'rotulo' => $rotulo,
                'valor' => $acc[$tipo],
                'itens' => $qtd[$tipo],
            ];
        }

        return $out;
    }

    /**
     * @param  list<array<string, mixed>>  $planos
     */
    private function temTipo(array $planos, string $tipo): bool
    {
        foreach ($planos as $p) {
            if (($p['tipo'] ?? '') === $tipo) {
                return true;
            }
        }

        return false;
    }

    /**
     * @param  list<string>  $msgs
     * @return list<string>
     */
    private function prefixar(string $prefixo, array $msgs): array
    {
        $out = [];
        foreach ($msgs as $m) {
            $m = trim((string) $m);
            if ($m === '') {
                continue;
            }
            $out[] = $prefixo.': '.$m;
        }

        return $out;
    }
}
