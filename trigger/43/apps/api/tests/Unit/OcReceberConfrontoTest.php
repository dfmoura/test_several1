<?php

namespace Tests\Unit;

use App\Models\Empresa;
use App\Models\OrdemCompra;
use App\Models\OrdemCompraItem;
use App\Models\OrdemCompraItemComposicao;
use App\Models\Parceiro;
use App\Models\Produto;
use App\Support\OcReceberConfronto;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\Test;
use Tests\TestCase;

class OcReceberConfrontoTest extends TestCase
{
    use RefreshDatabase;

    #[Test]
    public function ribbon_com_lote_e_so_qcom_nao_abre_confronto(): void
    {
        [$item, $linhas] = $this->ocItemComLinhaXml(
            codigo: 'REV-RIB-011',
            familia: 'REV',
            grupo: 'REV-RIB',
            unidade: 'UN',
            controlaLote: true,
            qCom: '960.0000',
            uCom: 'UN',
            infAdProd: 'DCR No. 2017062175',
            rastros: [],
            comFaixa: false,
        );

        $out = OcReceberConfronto::montar(collect([$item]), $linhas);

        $this->assertSame([], $out);
    }

    #[Test]
    public function substrato_com_faixa_abre_confronto_mesmo_sem_rastro(): void
    {
        [$item, $linhas] = $this->ocItemComLinhaXml(
            codigo: 'MP-PAP-CONF',
            familia: 'MP',
            grupo: 'MP-PAP',
            unidade: 'M2',
            controlaLote: true,
            qCom: '250.0000',
            uCom: 'M2',
            infAdProd: null,
            rastros: [],
            comFaixa: true,
        );

        $out = OcReceberConfronto::montar(collect([$item]), $linhas);

        $this->assertCount(1, $out);
        $this->assertSame(1, $out[0]['pedido']['volumes']);
        $this->assertNull($out[0]['nf']['volumes']);
        $this->assertSame('250.0000', $out[0]['nf']['q_com']);
    }

    #[Test]
    public function rastro_na_nf_abre_confronto_sem_faixa_pedido(): void
    {
        [$item, $linhas] = $this->ocItemComLinhaXml(
            codigo: 'MP-PAP-RAS',
            familia: 'MP',
            grupo: 'MP-PAP',
            unidade: 'M2',
            controlaLote: true,
            qCom: '100.0000',
            uCom: 'M2',
            infAdProd: null,
            rastros: [
                ['codigo' => 'R1', 'qtde' => '40.0000'],
                ['codigo' => 'R2', 'qtde' => '60.0000'],
            ],
            comFaixa: false,
        );

        $out = OcReceberConfronto::montar(collect([$item]), $linhas);

        $this->assertCount(1, $out);
        $this->assertSame(0, $out[0]['pedido']['volumes']);
        $this->assertSame(2, $out[0]['nf']['volumes']);
        $this->assertSame('rastro', $out[0]['nf']['fonte']);
    }

    /**
     * @param  list<array{codigo: string, qtde: string}>  $rastros
     * @return array{0: OrdemCompraItem, 1: list<array<string, mixed>>}
     */
    private function ocItemComLinhaXml(
        string $codigo,
        string $familia,
        string $grupo,
        string $unidade,
        bool $controlaLote,
        string $qCom,
        string $uCom,
        ?string $infAdProd,
        array $rastros,
        bool $comFaixa,
    ): array {
        $suffix = substr(md5($codigo.$unidade.$qCom), 0, 6);
        $empresa = Empresa::query()->create([
            'codigo' => 'EMP-CF'.$suffix,
            'razao_social' => 'Confronto Teste',
            'nome_fantasia' => 'CF',
            'cnpj' => str_pad((string) (10000000000000 + hexdec($suffix) % 8999999999999), 14, '0', STR_PAD_LEFT),
            'situacao' => 'ATIVA',
            'venda_ativa' => true,
            'estoque_ativo' => true,
        ]);

        $fornecedor = Parceiro::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'FORN-CF'.$suffix,
            'tipo_pessoa' => 'PJ',
            'cnpj_cpf' => '21309396000123',
            'razao_social' => 'Fornecedor CF',
            'papel_fornecedor' => true,
            'situacao' => 'ATIVO',
        ]);

        $produto = Produto::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => $codigo,
            'familia' => $familia,
            'grupo' => $grupo,
            'descricao_fiscal' => $codigo,
            'descricao_comercial' => $codigo,
            'ncm' => '96121000',
            'unidade_comercial' => $unidade,
            'unidade_interna' => $unidade,
            'fator_conversao' => '1',
            'custo_medio' => '0',
            'situacao' => 'ATIVO',
            'controla_lote' => $controlaLote,
            'controla_validade' => false,
        ]);

        $oc = OrdemCompra::query()->create([
            'empresa_id' => $empresa->id,
            'codigo' => 'OC-CF-'.$suffix,
            'fornecedor_id' => $fornecedor->id,
            'origem' => OrdemCompra::ORIGEM_DIRETA,
            'status' => OrdemCompra::STATUS_ABERTA,
            'valor_total' => '0',
        ]);

        $item = OrdemCompraItem::query()->create([
            'ordem_compra_id' => $oc->id,
            'produto_id' => $produto->id,
            'ordem' => 1,
            'qtde_pedida' => $qCom,
            'qtde_recebida' => '0',
            'unidade' => $unidade,
            'valor_unitario' => '1.000000',
            'valor_total' => $qCom,
        ]);
        $item->setRelation('produto', $produto);

        if ($comFaixa) {
            $comp = OrdemCompraItemComposicao::query()->create([
                'ordem_compra_item_id' => $item->id,
                'largura_mm' => '250.00',
                'quantidade' => '1.0000',
                'comprimento_m' => '1000.00',
                'area_m2' => '250.0000',
            ]);
            $item->setRelation('composicoes', collect([$comp]));
        } else {
            $item->setRelation('composicoes', collect());
        }

        $linhas = [[
            'n_item' => 1,
            'c_prod' => 'Z11074108',
            'x_prod' => $codigo,
            'q_com' => $qCom,
            'u_com' => $uCom,
            'inf_ad_prod' => $infAdProd,
            'rastros' => $rastros,
            'match' => [
                'ordem_compra_item_id' => $item->id,
                'motivo' => 'de-para cProd',
            ],
        ]];

        return [$item, $linhas];
    }
}
