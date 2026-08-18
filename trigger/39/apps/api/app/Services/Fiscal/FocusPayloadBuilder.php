<?php

namespace App\Services\Fiscal;

use App\Models\Empresa;
use App\Models\Faturamento;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Services\Cadastros\ParceiroFiscalRules;
use App\Support\PadraoDecimal;

/**
 * Monta o JSON Focus (NF-e / NFS-e Nacional) a partir do FAT.
 * `_meta` fica só na cópia persistida — o HTTP envia o payload limpo.
 *
 * @see ../28/docs/FOCUS_NFE_MAPEAMENTO.md
 */
class FocusPayloadBuilder
{
    /**
     * @param  list<array<string, mixed>>  $itens
     * @return array{payload: array<string, mixed>, http: array<string, mixed>}
     */
    public function nfe(Empresa $empresa, Parceiro $dest, Faturamento $fat, array $itens, string $ref): array
    {
        $ufEmp = strtoupper(trim((string) $empresa->uf));
        $ufDest = strtoupper(trim((string) $dest->uf));
        $familia = (string) ($itens[0]['familia_fiscal'] ?? 'PA-ETQ');
        $doc = preg_replace('/\D/', '', (string) $dest->cnpj_cpf) ?: '';
        $ie = ParceiroFiscalRules::normalizeIe($dest->ie);
        $ind = (int) ($dest->ind_ie_dest ?: ParceiroFiscalRules::deriveIndIeDest($ie));
        $saldoZero = bccomp((string) $fat->valor_a_cobrar, '0', PadraoDecimal::SCALE_MONEY) <= 0;
        $valor = $this->soma($itens);
        $emissao = now()->timezone('America/Sao_Paulo')->format('Y-m-d\TH:i:sP');

        $mapped = [];
        $n = 0;
        foreach ($itens as $linha) {
            $n++;
            $produto = $this->produtoDaLinha($linha);
            $qtde = (float) PadraoDecimal::roundHalfUp((string) $linha['qtde'], PadraoDecimal::SCALE_QTY);
            $unit = (float) PadraoDecimal::roundHalfUp((string) $linha['preco_unitario'], PadraoDecimal::SCALE_NF_UNIT);
            $bruto = (float) PadraoDecimal::roundHalfUp((string) $linha['valor'], PadraoDecimal::SCALE_MONEY);
            $un = strtoupper(trim((string) ($linha['unidade'] ?: $produto?->unidade_comercial ?: 'UN')));
            $cfop = FiscalSaidaDefaults::cfopSaida(
                (string) ($linha['familia_fiscal'] ?? $familia),
                $ufEmp,
                $ufDest,
                $produto?->cfop_saida_padrao
            );
            $item = [
                'numero_item' => $n,
                'codigo_produto' => $produto?->codigo ?: 'FAT'.$n,
                'descricao' => mb_substr((string) $linha['descricao'], 0, 120),
                'codigo_ncm' => $this->ncm($produto),
                'cfop' => $cfop,
                'unidade_comercial' => $un,
                'quantidade_comercial' => $qtde,
                'valor_unitario_comercial' => $unit,
                'valor_bruto' => $bruto,
                'unidade_tributavel' => $un,
                'quantidade_tributavel' => $qtde,
                'valor_unitario_tributavel' => $unit,
                'icms_origem' => (int) ($produto?->origem ?? 0),
                'icms_situacao_tributaria' => $produto?->csosn ?: FiscalSaidaDefaults::CSOSN_SIMPLES,
                'pis_situacao_tributaria' => $produto?->cst_pis ?: FiscalSaidaDefaults::CST_PIS,
                'cofins_situacao_tributaria' => $produto?->cst_cofins ?: FiscalSaidaDefaults::CST_COFINS,
            ];
            $cest = preg_replace('/\D/', '', (string) ($produto?->cest ?? '')) ?: '';
            if ($cest !== '') {
                $item['codigo_cest'] = $cest;
            }
            $ean = preg_replace('/\D/', '', (string) ($produto?->gtin ?? '')) ?: '';
            if ($ean !== '') {
                $item['codigo_barras_comercial'] = $ean;
            }
            $mapped[] = $item;
        }

        $payload = $this->compact([
            'natureza_operacao' => FiscalSaidaDefaults::natureza($familia),
            'data_emissao' => $emissao,
            'tipo_documento' => 1,
            'finalidade_emissao' => 1,
            'local_destino' => $ufEmp === $ufDest ? 1 : 2,
            'consumidor_final' => $dest->consumidor_final ? 1 : 0,
            'presenca_comprador' => FiscalSaidaDefaults::PRESENCA_COMPRADOR,
            'cnpj_emitente' => preg_replace('/\D/', '', (string) $empresa->cnpj),
            'nome_destinatario' => $dest->razao_social,
            'cnpj_destinatario' => strlen($doc) === 14 ? $doc : null,
            'cpf_destinatario' => strlen($doc) === 11 ? $doc : null,
            'inscricao_estadual_destinatario' => ParceiroFiscalRules::isIeNumerica($ie)
                ? preg_replace('/\D/', '', (string) $ie)
                : null,
            'indicador_inscricao_estadual_destinatario' => $ind,
            'email_destinatario' => $dest->email_xml ?: $dest->email,
            'logradouro_destinatario' => $dest->logradouro,
            'numero_destinatario' => $dest->numero ?: 'S/N',
            'complemento_destinatario' => $dest->complemento,
            'bairro_destinatario' => $dest->bairro,
            'municipio_destinatario' => $dest->municipio,
            'uf_destinatario' => $ufDest,
            'cep_destinatario' => preg_replace('/\D/', '', (string) $dest->cep),
            'codigo_municipio_destinatario' => preg_replace('/\D/', '', (string) $dest->ibge),
            'pais_destinatario' => FiscalSaidaDefaults::PAIS,
            'serie' => FiscalSaidaDefaults::SERIE_NFE,
            'items' => $mapped,
            'valor_produtos' => $valor,
            'valor_total' => $valor,
            'modalidade_frete' => FiscalSaidaDefaults::MODALIDADE_FRETE_SEM,
            'informacoes_adicionais_contribuinte' => $this->infAdicionais($fat),
            'formas_pagamento' => [[
                'indicador_pagamento' => count($fat->titulos ?? []) > 1 ? 1 : 0,
                'forma_pagamento' => FiscalSaidaDefaults::formaPagamentoFocus($fat->forma_pagamento, $saldoZero),
                'valor_pagamento' => $valor,
            ]],
            '_meta' => [
                'ref' => $ref,
                'hub' => 'focusnfe',
                'doc' => 'nfe',
                'faturamento' => $fat->codigo,
            ],
        ]);

        $duplicatas = $this->duplicatas($fat);
        if ($duplicatas !== []) {
            $payload['duplicatas'] = $duplicatas;
        }

        return ['payload' => $payload, 'http' => $this->paraEnvio($payload)];
    }

    /**
     * @param  list<array<string, mixed>>  $itens
     * @return array{payload: array<string, mixed>, http: array<string, mixed>}
     */
    public function nfse(Empresa $empresa, Parceiro $toma, Faturamento $fat, array $itens, string $ref): array
    {
        $doc = preg_replace('/\D/', '', (string) $toma->cnpj_cpf) ?: '';
        $munEmp = preg_replace('/\D/', '', (string) $empresa->ibge) ?: '';
        $munToma = preg_replace('/\D/', '', (string) $toma->ibge) ?: '';
        $imPrest = preg_replace('/\D/', '', (string) ($empresa->im ?? '')) ?: '';
        $imToma = preg_replace('/\D/', '', (string) ($toma->im ?? '')) ?: '';
        $valor = $this->soma($itens);
        $desc = implode('; ', array_map(
            fn (array $i) => (string) $i['descricao'],
            $itens
        ));
        $emissao = now()->timezone('America/Sao_Paulo')->format('Y-m-d\TH:i:sP');
        $crt = (int) ($empresa->crt ?? 1);
        $opSimp = in_array($crt, [1, 2, 4], true) ? 3 : 1;
        $espec = is_array($itens[0]['especificacao'] ?? null) ? $itens[0]['especificacao'] : [];
        $cTrib = preg_replace('/\D/', '', (string) ($espec['codigo_tributacao_nacional_iss'] ?? '')) ?: FiscalSaidaDefaults::C_TRIB_NAC;
        $nbs = preg_replace('/\D/', '', (string) ($espec['codigo_nbs'] ?? '')) ?: FiscalSaidaDefaults::C_NBS;

        $payload = $this->compact([
            'data_emissao' => $emissao,
            'serie_dps' => FiscalSaidaDefaults::SERIE_DPS,
            'data_competencia' => now()->timezone('America/Sao_Paulo')->toDateString(),
            'emitente_dps' => 1,
            'codigo_municipio_emissora' => (int) $munEmp,
            'cnpj_prestador' => preg_replace('/\D/', '', (string) $empresa->cnpj),
            'inscricao_municipal_prestador' => $imPrest !== '' ? $imPrest : null,
            'codigo_opcao_simples_nacional' => $opSimp,
            'cnpj_tomador' => strlen($doc) === 14 ? $doc : null,
            'cpf_tomador' => strlen($doc) === 11 ? $doc : null,
            'nome_tomador' => $toma->razao_social,
            'email_tomador' => $toma->email_xml ?: $toma->email,
            'inscricao_municipal_tomador' => $imToma !== '' ? $imToma : null,
            'logradouro_tomador' => $toma->logradouro,
            'numero_tomador' => $toma->numero ?: 'S/N',
            'bairro_tomador' => $toma->bairro,
            'cep_tomador' => preg_replace('/\D/', '', (string) $toma->cep),
            'codigo_municipio_tomador' => $munToma !== '' ? $munToma : null,
            'uf_tomador' => strtoupper(trim((string) $toma->uf)),
            'codigo_municipio_prestacao' => $munEmp,
            'codigo_tributacao_nacional_iss' => $cTrib,
            'codigo_nbs' => $nbs,
            'descricao_servico' => mb_substr($desc !== '' ? $desc : 'Serviço', 0, 2000),
            'valor_servico' => $valor,
            'tributacao_iss' => FiscalSaidaDefaults::TRIBUTACAO_ISS,
            'informacoes_complementares' => $this->infAdicionais($fat),
            '_meta' => [
                'ref' => $ref,
                'hub' => 'focusnfe',
                'doc' => 'nfsen',
                'faturamento' => $fat->codigo,
            ],
        ]);

        return ['payload' => $payload, 'http' => $this->paraEnvio($payload)];
    }

    /**
     * JSON que o POST Focus recebe — sem `_meta` interno.
     *
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    public function paraEnvio(array $payload): array
    {
        $copy = $payload;
        unset($copy['_meta']);

        return $copy;
    }

    /**
     * @param  list<FaturamentoItem>  $rows
     * @return list<array<string, mixed>>
     */
    public function itensParaPayload(iterable $rows): array
    {
        $out = [];
        foreach ($rows as $i) {
            $pedidoItem = $i->pedidoItem;
            $out[] = [
                'id' => $i->id,
                'pedido_item_id' => $i->pedido_item_id,
                'descricao' => $i->descricao,
                'unidade' => $i->unidade,
                'qtde' => (string) $i->qtde,
                'preco_unitario' => (string) $i->preco_unitario,
                'valor' => (string) $i->valor,
                'familia_fiscal' => $i->familia_fiscal ?: $pedidoItem?->familia_fiscal,
                'especificacao' => is_array($pedidoItem?->especificacao) ? $pedidoItem->especificacao : [],
                'produto_pa_id' => $pedidoItem?->produto_pa_id,
                'produto' => $pedidoItem?->produtoPa,
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $linha
     */
    private function produtoDaLinha(array $linha): ?Produto
    {
        $p = $linha['produto'] ?? null;

        return $p instanceof Produto ? $p : null;
    }

    private function ncm(?Produto $produto): string
    {
        $ncm = preg_replace('/\D/', '', (string) ($produto?->ncm ?? '')) ?: '';

        return strlen($ncm) >= 8 ? substr($ncm, 0, 8) : FiscalSaidaDefaults::NCM_ETIQUETA;
    }

    /**
     * @param  list<array<string, mixed>>  $itens
     */
    private function soma(array $itens): float
    {
        $acc = '0.00';
        foreach ($itens as $i) {
            $acc = bcadd($acc, (string) $i['valor'], PadraoDecimal::SCALE_MONEY);
        }

        return (float) $acc;
    }

    private function infAdicionais(Faturamento $fat): string
    {
        $ped = $fat->pedido?->codigo ?? '';
        $parts = array_filter([
            $ped !== '' ? 'Pedido '.$ped : null,
            'Fatura '.$fat->codigo,
        ]);

        return implode(' · ', $parts);
    }

    /**
     * @return list<array{numero: string, data_vencimento: string, valor: float}>
     */
    private function duplicatas(Faturamento $fat): array
    {
        $out = [];
        foreach ($fat->titulos ?? [] as $t) {
            if ($t->origem !== 'FATURA') {
                continue;
            }
            $out[] = [
                'numero' => (string) ($t->parcela ?: count($out) + 1),
                'data_vencimento' => optional($t->vencimento)->toDateString() ?? substr((string) $t->vencimento, 0, 10),
                'valor' => (float) PadraoDecimal::roundHalfUp((string) $t->valor, PadraoDecimal::SCALE_MONEY),
            ];
        }

        return $out;
    }

    /**
     * @param  array<string, mixed>  $payload
     * @return array<string, mixed>
     */
    private function compact(array $payload): array
    {
        $out = [];
        foreach ($payload as $k => $v) {
            if ($v === null || $v === '') {
                continue;
            }
            $out[$k] = $v;
        }

        return $out;
    }
}
