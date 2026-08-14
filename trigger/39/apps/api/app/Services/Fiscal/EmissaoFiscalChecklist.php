<?php

namespace App\Services\Fiscal;

use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\Pedido;
use App\Services\Cadastros\EmpresaFiscalRules;
use App\Services\Cadastros\ParceiroFiscalRules;
use App\Support\PadraoDecimal;

/**
 * Plano dual NF-e / NFS-e e checklist pré-emissão.
 * Não bloqueia o FAT — só decide se o POST Focus pode sair.
 */
class EmissaoFiscalChecklist
{
    public function __construct(
        private readonly FiscalHubResolver $hubs,
    ) {}

    /**
     * @param  list<array<string, mixed>>  $itensFat
     * @return array<string, mixed>
     */
    public function paraPedido(Empresa $empresa, Pedido $pedido, array $itensFat): array
    {
        $planos = $this->planar($itensFat);
        $hub = $this->hubs->diagnostico($empresa);
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

        if (! ($hub['apto'] ?? false)) {
            $pendencias[] = $hub['mensagem'] ?? 'Hub fiscal ainda não está apto a emitir.';
        }

        if ($precisaNfe) {
            $avisos[] = 'NF-e de produto (mercadoria) via Focus, modelo 55.';
        }
        if ($precisaNfse) {
            $avisos[] = 'NFS-e de serviço via Focus (Nacional).';
            if (! $empresa->im_obrigatoria_nfse && trim((string) $empresa->im) === '') {
                $avisos[] = 'Inscrição municipal omitida — este município não exige IM para NFS-e.';
            }
        }

        $pendencias = array_values(array_unique(array_filter($pendencias)));
        $apto = $pendencias === [] && $planos !== [];

        return [
            'documentos' => $planos,
            'hub' => $hub,
            'apto_emissao' => $apto,
            'emissao_automatica' => $apto && (bool) ($hub['apto'] ?? false),
            'pendencias' => $pendencias,
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
