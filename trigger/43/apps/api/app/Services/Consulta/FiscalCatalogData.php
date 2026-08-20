<?php

namespace App\Services\Consulta;

/**
 * Catálogos fiscais estáticos (CSOSN / CFOP / CST) e seed curado de NCM/CEST
 * alinhados ao estudo tributário RLP (trigger/32).
 */
final class FiscalCatalogData
{
    /**
     * NCMs observados nas NF-e da RLP + candidatos do estudo.
     *
     * @return list<array{codigo: string, descricao: string, destaque_rlp: bool}>
     */
    public static function ncms(): array
    {
        return [
            // Confirmados em XML (compra/venda)
            ['codigo' => '32151900', 'descricao' => 'Tintas de impressão - Outras (exceto pretas)', 'destaque_rlp' => true],
            ['codigo' => '39191010', 'descricao' => 'Chapas/folhas/tiras autoadesivas de plásticos, em rolos ≤ 20 cm - De polipropileno', 'destaque_rlp' => true],
            ['codigo' => '39191090', 'descricao' => 'Chapas/folhas/tiras autoadesivas de plásticos, em rolos ≤ 20 cm - Outras', 'destaque_rlp' => true],
            ['codigo' => '39199010', 'descricao' => 'Chapas/folhas/tiras autoadesivas de plásticos - Outras - De polipropileno', 'destaque_rlp' => true],
            ['codigo' => '39199090', 'descricao' => 'Chapas/folhas/tiras autoadesivas de plásticos - Outras - Outras', 'destaque_rlp' => true],
            ['codigo' => '48114190', 'descricao' => 'Papel e cartão gomados ou adesivos - Autoadesivos - Outros', 'destaque_rlp' => true],
            ['codigo' => '96121000', 'descricao' => 'Fitas impressoras (ribbons) tintadas ou preparadas para imprimir', 'destaque_rlp' => true],

            // Candidatos do estudo (confirmar com contador)
            ['codigo' => '32121000', 'descricao' => 'Pigmentos utilizados na fabricação de tintas de impressão — cold foil (candidato)', 'destaque_rlp' => true],
            ['codigo' => '48101389', 'descricao' => 'Papel e cartão revestidos (tag) — candidato do estudo', 'destaque_rlp' => true],
            ['codigo' => '48191000', 'descricao' => 'Caixas de papel ou cartão corrugados', 'destaque_rlp' => true],
            ['codigo' => '48229000', 'descricao' => 'Tubetes e carretéis de papel/cartão', 'destaque_rlp' => true],
            ['codigo' => '39202019', 'descricao' => 'Outras placas/folhas/películas de polímeros de propileno — laminação (candidato)', 'destaque_rlp' => true],
            ['codigo' => '58063200', 'descricao' => 'Fitas estreitas de matérias têxteis sintéticas — candidato têxtil', 'destaque_rlp' => true],
            ['codigo' => '59039000', 'descricao' => 'Tecidos impregnados/revestidos de plástico — candidato têxtil', 'destaque_rlp' => true],
            ['codigo' => '59069900', 'descricao' => 'Tecidos emborrachados — candidato têxtil', 'destaque_rlp' => true],

            // Capítulos / correlatos úteis na indústria gráfica/etiquetas
            ['codigo' => '32151100', 'descricao' => 'Tintas de impressão - Pretas', 'destaque_rlp' => false],
            ['codigo' => '35069110', 'descricao' => 'Adesivos à base de polímeros / borracha', 'destaque_rlp' => false],
            ['codigo' => '35069900', 'descricao' => 'Outras colas e adesivos', 'destaque_rlp' => false],
            ['codigo' => '37013000', 'descricao' => 'Chapas fotográficas sensibilizadas (chapas CTP)', 'destaque_rlp' => false],
            ['codigo' => '39191000', 'descricao' => 'Autoadesivos de plásticos em rolos ≤ 20 cm (posição genérica)', 'destaque_rlp' => false],
            ['codigo' => '39199000', 'descricao' => 'Outras formas planas autoadesivas de plásticos (posição genérica)', 'destaque_rlp' => false],
            ['codigo' => '39201099', 'descricao' => 'Chapas/folhas/películas de polímeros de etileno - Outras', 'destaque_rlp' => false],
            ['codigo' => '39204310', 'descricao' => 'Chapas/folhas/películas de PVC rígido', 'destaque_rlp' => false],
            ['codigo' => '39206219', 'descricao' => 'Chapas/folhas de PET - Outras', 'destaque_rlp' => false],
            ['codigo' => '48025599', 'descricao' => 'Papéis/cartões não revestidos - Outros', 'destaque_rlp' => false],
            ['codigo' => '48101390', 'descricao' => 'Papel/cartão revestidos de caulim - Outros', 'destaque_rlp' => false],
            ['codigo' => '48114110', 'descricao' => 'Papel e cartão autoadesivos - Em rolos de largura ≤ 15 cm', 'destaque_rlp' => false],
            ['codigo' => '48114900', 'descricao' => 'Outros papéis/cartões gomados ou adesivos', 'destaque_rlp' => false],
            ['codigo' => '48211000', 'descricao' => 'Etiquetas de papel ou cartão, impressas', 'destaque_rlp' => false],
            ['codigo' => '48219000', 'descricao' => 'Outras etiquetas de papel ou cartão', 'destaque_rlp' => false],
            ['codigo' => '84439921', 'descricao' => 'Cartuchos de tinta para impressoras', 'destaque_rlp' => false],
            ['codigo' => '84798999', 'descricao' => 'Máquinas e aparelhos mecânicos - Outros', 'destaque_rlp' => false],
            ['codigo' => '96122000', 'descricao' => 'Carretéis, discos e almofadas para fitas impressoras', 'destaque_rlp' => false],
        ];
    }

    /**
     * CESTs relevantes ao catálogo RLP (Convênio 142/18).
     * Observação: 1001000 existe para 3919 mas só "para construções" — geralmente NÃO aplica a etiquetas.
     *
     * @return list<array{codigo: string, descricao: string, segmento: ?string, observacao: ?string, ncms: list<string>}>
     */
    public static function cests(): array
    {
        return [
            [
                'codigo' => '1001000',
                'descricao' => 'Chapas, folhas, tiras, fitas, películas autoadesivas de plásticos, PARA CONSTRUÇÕES',
                'segmento' => '10',
                'observacao' => 'Convênio 142/18 — finalidade CONSTRUÇÕES. Etiquetas industriais/comerciais da RLP tipicamente NÃO se enquadram; manter CEST vazio salvo orientação do contador.',
                'ncms' => ['39191010', '39191090', '39199010', '39199090', '39191000', '39199000'],
            ],
            [
                'codigo' => '2400100',
                'descricao' => 'Tintas e vernizes - Tintas à base de água',
                'segmento' => '24',
                'observacao' => 'Segmento tintas: verificar se NCM específico entra na tabela ST aplicável.',
                'ncms' => ['32151100', '32151900'],
            ],
            [
                'codigo' => '2400200',
                'descricao' => 'Tintas e vernizes - Outras tintas',
                'segmento' => '24',
                'observacao' => 'Segmento tintas: conferir enquadramento ST por UF/finalidade.',
                'ncms' => ['32151100', '32151900'],
            ],
            [
                'codigo' => '2805700',
                'descricao' => 'Papéis e cartões revestidos / autoadesivos (conferir tabela atual do Convênio)',
                'segmento' => '28',
                'observacao' => 'Manter como referência; validar vigência e finalidade antes de informar na NF-e.',
                'ncms' => ['48114190', '48114110', '48114900'],
            ],
        ];
    }

    /**
     * @return list<array{codigo: string, descricao: string, regime: string, destaque?: bool}>
     */
    public static function csosn(): array
    {
        return [
            ['codigo' => '101', 'descricao' => 'Tributada pelo Simples Nacional com permissão de crédito', 'regime' => 'SIMPLES', 'destaque' => true],
            ['codigo' => '102', 'descricao' => 'Tributada pelo Simples Nacional sem permissão de crédito', 'regime' => 'SIMPLES', 'destaque' => true],
            ['codigo' => '103', 'descricao' => 'Isenção do ICMS no Simples Nacional para faixa de receita bruta', 'regime' => 'SIMPLES'],
            ['codigo' => '201', 'descricao' => 'Tributada pelo SN com permissão de crédito e com cobrança do ICMS-ST', 'regime' => 'SIMPLES'],
            ['codigo' => '202', 'descricao' => 'Tributada pelo SN sem permissão de crédito e com cobrança do ICMS-ST', 'regime' => 'SIMPLES'],
            ['codigo' => '203', 'descricao' => 'Isenção do ICMS no SN para faixa de receita bruta e com cobrança do ICMS-ST', 'regime' => 'SIMPLES'],
            ['codigo' => '300', 'descricao' => 'Imune', 'regime' => 'SIMPLES'],
            ['codigo' => '400', 'descricao' => 'Não tributada pelo Simples Nacional', 'regime' => 'SIMPLES'],
            ['codigo' => '500', 'descricao' => 'ICMS cobrado anteriormente por ST (substituído) ou por antecipação', 'regime' => 'SIMPLES'],
            ['codigo' => '900', 'descricao' => 'Outros', 'regime' => 'SIMPLES'],
        ];
    }

    /**
     * @return list<array{codigo: string, descricao: string, tipo: string, destaque?: bool}>
     */
    public static function cfops(): array
    {
        return [
            // Entrada
            ['codigo' => '1101', 'descricao' => 'Compra para industrialização', 'tipo' => 'ENTRADA', 'destaque' => true],
            ['codigo' => '1102', 'descricao' => 'Compra para comercialização', 'tipo' => 'ENTRADA', 'destaque' => true],
            ['codigo' => '1111', 'descricao' => 'Compra para industrialização de mercadoria recebida anteriormente com ST', 'tipo' => 'ENTRADA'],
            ['codigo' => '1113', 'descricao' => 'Compra para comercialização de mercadoria recebida anteriormente com ST', 'tipo' => 'ENTRADA'],
            ['codigo' => '1124', 'descricao' => 'Industrialização efetuada por outra empresa', 'tipo' => 'ENTRADA'],
            ['codigo' => '1403', 'descricao' => 'Compra para industrialização em operação com mercadoria sujeita ao regime ST', 'tipo' => 'ENTRADA'],
            ['codigo' => '1556', 'descricao' => 'Compra de material para uso ou consumo', 'tipo' => 'ENTRADA', 'destaque' => true],
            ['codigo' => '2101', 'descricao' => 'Compra para industrialização (interestadual)', 'tipo' => 'ENTRADA', 'destaque' => true],
            ['codigo' => '2102', 'descricao' => 'Compra para comercialização (interestadual)', 'tipo' => 'ENTRADA', 'destaque' => true],
            ['codigo' => '2556', 'descricao' => 'Compra de material para uso ou consumo (interestadual)', 'tipo' => 'ENTRADA'],
            // Saída
            ['codigo' => '5101', 'descricao' => 'Venda de produção do estabelecimento', 'tipo' => 'SAIDA', 'destaque' => true],
            ['codigo' => '5102', 'descricao' => 'Venda de mercadoria adquirida ou recebida de terceiros', 'tipo' => 'SAIDA', 'destaque' => true],
            ['codigo' => '5405', 'descricao' => 'Venda de mercadoria adquirida/recebida de terceiros em operação com ST (cobrança prévia)', 'tipo' => 'SAIDA'],
            ['codigo' => '5901', 'descricao' => 'Remessa para industrialização por encomenda', 'tipo' => 'SAIDA'],
            ['codigo' => '5902', 'descricao' => 'Retorno de mercadoria utilizada na industrialização por encomenda', 'tipo' => 'SAIDA'],
            ['codigo' => '5915', 'descricao' => 'Remessa para conserto ou reparo', 'tipo' => 'SAIDA'],
            ['codigo' => '5949', 'descricao' => 'Outra saída de mercadoria ou prestação de serviço não especificado', 'tipo' => 'SAIDA'],
            ['codigo' => '6101', 'descricao' => 'Venda de produção do estabelecimento (interestadual)', 'tipo' => 'SAIDA', 'destaque' => true],
            ['codigo' => '6102', 'descricao' => 'Venda de mercadoria de terceiros (interestadual)', 'tipo' => 'SAIDA', 'destaque' => true],
            ['codigo' => '6107', 'descricao' => 'Venda de produção a não contribuinte (interestadual)', 'tipo' => 'SAIDA', 'destaque' => true],
            ['codigo' => '6108', 'descricao' => 'Venda de mercadoria de terceiros a não contribuinte (interestadual)', 'tipo' => 'SAIDA'],
            ['codigo' => '6901', 'descricao' => 'Remessa para industrialização por encomenda (interestadual)', 'tipo' => 'SAIDA'],
        ];
    }

    /**
     * @return list<array{codigo: string, descricao: string, grupo: string}>
     */
    public static function cstIcms(): array
    {
        return [
            ['codigo' => '00', 'descricao' => 'Tributada integralmente', 'grupo' => 'ICMS'],
            ['codigo' => '10', 'descricao' => 'Tributada e com cobrança do ICMS por ST', 'grupo' => 'ICMS'],
            ['codigo' => '20', 'descricao' => 'Com redução de base de cálculo', 'grupo' => 'ICMS'],
            ['codigo' => '30', 'descricao' => 'Isenta ou não tributada e com cobrança do ICMS por ST', 'grupo' => 'ICMS'],
            ['codigo' => '40', 'descricao' => 'Isenta', 'grupo' => 'ICMS'],
            ['codigo' => '41', 'descricao' => 'Não tributada', 'grupo' => 'ICMS'],
            ['codigo' => '50', 'descricao' => 'Suspensão', 'grupo' => 'ICMS'],
            ['codigo' => '51', 'descricao' => 'Diferimento', 'grupo' => 'ICMS'],
            ['codigo' => '60', 'descricao' => 'ICMS cobrado anteriormente por ST', 'grupo' => 'ICMS'],
            ['codigo' => '70', 'descricao' => 'Com redução de BC e cobrança do ICMS por ST', 'grupo' => 'ICMS'],
            ['codigo' => '90', 'descricao' => 'Outras', 'grupo' => 'ICMS'],
        ];
    }

    /**
     * @return list<array{codigo: string, descricao: string, grupo: string}>
     */
    public static function cstPisCofins(): array
    {
        return [
            ['codigo' => '01', 'descricao' => 'Operação tributável com alíquota básica', 'grupo' => 'PIS_COFINS'],
            ['codigo' => '02', 'descricao' => 'Operação tributável com alíquota diferenciada', 'grupo' => 'PIS_COFINS'],
            ['codigo' => '04', 'descricao' => 'Operação tributável monofásica — alíquota zero', 'grupo' => 'PIS_COFINS'],
            ['codigo' => '05', 'descricao' => 'Operação tributável por ST', 'grupo' => 'PIS_COFINS'],
            ['codigo' => '06', 'descricao' => 'Operação tributável a alíquota zero', 'grupo' => 'PIS_COFINS'],
            ['codigo' => '07', 'descricao' => 'Operação isenta da contribuição', 'grupo' => 'PIS_COFINS'],
            ['codigo' => '08', 'descricao' => 'Operação sem incidência da contribuição', 'grupo' => 'PIS_COFINS'],
            ['codigo' => '09', 'descricao' => 'Operação com suspensão da contribuição', 'grupo' => 'PIS_COFINS'],
            ['codigo' => '49', 'descricao' => 'Outras operações de saída', 'grupo' => 'PIS_COFINS'],
            ['codigo' => '50', 'descricao' => 'Operação com direito a crédito — vinculada exclusivamente a receita tributada no mercado interno', 'grupo' => 'PIS_COFINS'],
            ['codigo' => '51', 'descricao' => 'Operação com direito a crédito — vinculada exclusivamente a receita não tributada no mercado interno', 'grupo' => 'PIS_COFINS'],
            ['codigo' => '70', 'descricao' => 'Operação de aquisição sem direito a crédito', 'grupo' => 'PIS_COFINS'],
            ['codigo' => '98', 'descricao' => 'Outras operações de entrada', 'grupo' => 'PIS_COFINS'],
            ['codigo' => '99', 'descricao' => 'Outras operações', 'grupo' => 'PIS_COFINS'],
        ];
    }

    /**
     * CST IBS/CBS (IT NF-e 2025.002 / LC 214/2025) — catálogo curado.
     * Código compartilhado IBS+CBS no grupo UB da NF-e; aqui parametriza CBS no produto.
     *
     * @return list<array{codigo: string, descricao: string, grupo: string, destaque?: bool}>
     */
    public static function cstCbs(): array
    {
        return [
            ['codigo' => '000', 'descricao' => 'Tributação integral', 'grupo' => 'CBS', 'destaque' => true],
            ['codigo' => '010', 'descricao' => 'Tributação com alíquotas uniformes', 'grupo' => 'CBS', 'destaque' => true],
            ['codigo' => '011', 'descricao' => 'Tributação com alíquotas uniformes reduzidas', 'grupo' => 'CBS'],
            ['codigo' => '200', 'descricao' => 'Alíquota zero', 'grupo' => 'CBS'],
            ['codigo' => '210', 'descricao' => 'Alíquota reduzida (demais hipóteses)', 'grupo' => 'CBS'],
            ['codigo' => '220', 'descricao' => 'Alíquota fixa', 'grupo' => 'CBS'],
            ['codigo' => '221', 'descricao' => 'Alíquota fixa proporcional', 'grupo' => 'CBS'],
            ['codigo' => '222', 'descricao' => 'Redução de base de cálculo', 'grupo' => 'CBS'],
            ['codigo' => '400', 'descricao' => 'Isenção', 'grupo' => 'CBS'],
            ['codigo' => '410', 'descricao' => 'Imunidade e não incidência', 'grupo' => 'CBS'],
            ['codigo' => '510', 'descricao' => 'Diferimento', 'grupo' => 'CBS'],
            ['codigo' => '550', 'descricao' => 'Suspensão', 'grupo' => 'CBS'],
            ['codigo' => '620', 'descricao' => 'Tributação monofásica', 'grupo' => 'CBS'],
            ['codigo' => '800', 'descricao' => 'Transferência de crédito', 'grupo' => 'CBS'],
            ['codigo' => '810', 'descricao' => 'Ajuste de IBS/CBS', 'grupo' => 'CBS'],
            ['codigo' => '820', 'descricao' => 'Tributação em documento específico', 'grupo' => 'CBS'],
            ['codigo' => '830', 'descricao' => 'Exclusão da base de cálculo', 'grupo' => 'CBS'],
        ];
    }

    /**
     * cClassTrib IBS/CBS — subset útil à operação RLP (indústria de etiquetas).
     * Os 3 primeiros dígitos = CST. Tabela completa: Portal Nacional NF-e / IT 2025.002.
     *
     * @return list<array{codigo: string, descricao: string, grupo: string, destaque?: bool}>
     */
    public static function cClassTrib(): array
    {
        return [
            ['codigo' => '000001', 'descricao' => 'Situações tributadas integralmente pelo IBS e pela CBS', 'grupo' => 'CBS', 'destaque' => true],
            ['codigo' => '010001', 'descricao' => 'Operações com alíquotas uniformes (padrão transição)', 'grupo' => 'CBS', 'destaque' => true],
            ['codigo' => '010002', 'descricao' => 'Operações com alíquotas uniformes — hipótese específica LC', 'grupo' => 'CBS'],
            ['codigo' => '011001', 'descricao' => 'Alíquotas uniformes reduzidas', 'grupo' => 'CBS'],
            ['codigo' => '200001', 'descricao' => 'Operações com alíquota zero', 'grupo' => 'CBS'],
            ['codigo' => '200002', 'descricao' => 'Alíquota zero — hipótese adicional da tabela oficial', 'grupo' => 'CBS'],
            ['codigo' => '210001', 'descricao' => 'Redução de alíquota — cesta básica / hipóteses legais', 'grupo' => 'CBS'],
            ['codigo' => '220001', 'descricao' => 'Alíquota fixa — combustíveis / monofasia correlata', 'grupo' => 'CBS'],
            ['codigo' => '400001', 'descricao' => 'Isenção do IBS e da CBS', 'grupo' => 'CBS'],
            ['codigo' => '410001', 'descricao' => 'Imunidade / não incidência', 'grupo' => 'CBS'],
            ['codigo' => '410021', 'descricao' => 'Imunidade / não incidência — hipótese específica', 'grupo' => 'CBS'],
            ['codigo' => '410999', 'descricao' => 'Imunidade / não incidência — residual', 'grupo' => 'CBS'],
            ['codigo' => '510001', 'descricao' => 'Diferimento', 'grupo' => 'CBS'],
            ['codigo' => '550001', 'descricao' => 'Suspensão', 'grupo' => 'CBS'],
            ['codigo' => '620001', 'descricao' => 'Tributação monofásica — hipótese 001', 'grupo' => 'CBS'],
            ['codigo' => '620002', 'descricao' => 'Tributação monofásica — hipótese 002', 'grupo' => 'CBS'],
            ['codigo' => '620003', 'descricao' => 'Tributação monofásica — hipótese 003', 'grupo' => 'CBS'],
            ['codigo' => '800001', 'descricao' => 'Transferência de crédito', 'grupo' => 'CBS'],
            ['codigo' => '820001', 'descricao' => 'Tributação em documento específico', 'grupo' => 'CBS'],
            ['codigo' => '820006', 'descricao' => 'Tributação em documento específico — hipótese 006', 'grupo' => 'CBS'],
            ['codigo' => '830001', 'descricao' => 'Exclusão da base de cálculo', 'grupo' => 'CBS'],
        ];
    }

    /**
     * @return list<array{codigo: string, descricao: string}>
     */
    public static function tiposItemSped(): array
    {
        return [
            ['codigo' => '00', 'descricao' => 'Mercadoria para revenda'],
            ['codigo' => '01', 'descricao' => 'Matéria-prima'],
            ['codigo' => '02', 'descricao' => 'Embalagem'],
            ['codigo' => '03', 'descricao' => 'Produto em processo'],
            ['codigo' => '04', 'descricao' => 'Produto acabado'],
            ['codigo' => '05', 'descricao' => 'Subproduto'],
            ['codigo' => '06', 'descricao' => 'Produto intermediário'],
            ['codigo' => '07', 'descricao' => 'Material de uso e consumo'],
            ['codigo' => '08', 'descricao' => 'Ativo imobilizado'],
            ['codigo' => '09', 'descricao' => 'Serviços'],
            ['codigo' => '10', 'descricao' => 'Outros insumos'],
            ['codigo' => '99', 'descricao' => 'Outras'],
        ];
    }

    /**
     * @return list<array{codigo: string, descricao: string}>
     */
    public static function origens(): array
    {
        return [
            ['codigo' => '0', 'descricao' => 'Nacional, exceto as indicadas nos códigos 3, 4, 5 e 8'],
            ['codigo' => '1', 'descricao' => 'Estrangeira — importação direta, exceto a indicada no código 6'],
            ['codigo' => '2', 'descricao' => 'Estrangeira — adquirida no mercado interno, exceto a indicada no código 7'],
            ['codigo' => '3', 'descricao' => 'Nacional, mercadoria ou bem com Conteúdo de Importação superior a 40% e inferior ou igual a 70%'],
            ['codigo' => '4', 'descricao' => 'Nacional, cuja produção tenha sido feita em conformidade com os processos produtivos básicos'],
            ['codigo' => '5', 'descricao' => 'Nacional, mercadoria ou bem com Conteúdo de Importação inferior ou igual a 40%'],
            ['codigo' => '6', 'descricao' => 'Estrangeira — importação direta, sem similar nacional, constante em lista da CAMEX e gás natural'],
            ['codigo' => '7', 'descricao' => 'Estrangeira — adquirida no mercado interno, sem similar nacional, constante em lista da CAMEX e gás natural'],
            ['codigo' => '8', 'descricao' => 'Nacional, mercadoria ou bem com Conteúdo de Importação superior a 70%'],
        ];
    }
}
