<?php

namespace App\Services\Cadastros;

/**
 * Catálogo canônico de naturezas gerenciais — estudo trigger/32.
 *
 * Fonte: NATUREZAS_GERENCIAIS_RECEITA_DESPESA.txt
 * Grupos 1–5 apenas. Proibido grupo 9 / LAI.
 *
 * Não confundir com produto_grupos.natureza (COMPRA|VENDA|AMBOS).
 */
final class NaturezaGerencialCatalogData
{
    /**
     * Lista plana em ordem de seed (pais antes dos filhos).
     *
     * @return list<array{
     *   codigo: string,
     *   parent_codigo: ?string,
     *   grupo: int,
     *   nome: string,
     *   descricao: ?string,
     *   aceita_lancamento: bool,
     *   ordenacao: int
     * }>
     */
    public static function itens(): array
    {
        $rows = [];
        $ord = 0;

        $add = function (
            string $codigo,
            ?string $parent,
            int $grupo,
            string $nome,
            bool $folha,
            ?string $descricao = null
        ) use (&$rows, &$ord): void {
            $ord += 10;
            $rows[] = [
                'codigo' => $codigo,
                'parent_codigo' => $parent,
                'grupo' => $grupo,
                'nome' => $nome,
                'descricao' => $descricao,
                'aceita_lancamento' => $folha,
                'ordenacao' => $ord,
            ];
        };

        // ——— 1. RECEITAS ———
        $add('1', null, 1, 'Receitas', false);
        $add('1.01', '1', 1, 'Receita operacional bruta', false);
        $add('1.01.01', '1.01', 1, 'Venda produção própria (etiquetas PA)', true);
        $add('1.01.02', '1.01', 1, 'Venda revenda (ribbon / material)', true);
        $add('1.01.03', '1.01', 1, 'Serviços (rebobinação, acerto, SVC)', true);
        $add('1.01.04', '1.01', 1, 'Ferramental / faca / clichê (1º pedido)', true);
        $add('1.01.05', '1.01', 1, 'Frete cobrado do cliente (quando receita)', true);

        $add('1.02', '1', 1, 'Deduções da receita (gerencial)', false);
        $add('1.02.01', '1.02', 1, 'Devoluções de venda', true);
        $add('1.02.02', '1.02', 1, 'Descontos condicionais concedidos', true);
        $add('1.02.03', '1.02', 1, 'Abatimentos / perdas comerciais', true);

        $add('1.03', '1', 1, 'Receitas financeiras', false);
        $add('1.03.01', '1.03', 1, 'Juros recebidos', true);
        $add('1.03.02', '1.03', 1, 'Multas recebidas', true);
        $add('1.03.03', '1.03', 1, 'Rendimento aplicação', true);

        $add('1.04', '1', 1, 'Outras receitas', false);
        $add('1.04.01', '1.04', 1, 'Venda de sucata / apara', true);
        $add('1.04.02', '1.04', 1, 'Venda de ativo imobilizado', true);
        $add('1.04.03', '1.04', 1, 'Recuperação de despesas', true);
        $add('1.04.04', '1.04', 1, 'Outras (com descrição obrigatória)', true, 'Exige descrição no lançamento futuro.');

        // ——— 2. CUSTOS OPERACIONAIS ———
        $add('2', null, 2, 'Custos operacionais', false);
        $add('2.01', '2', 2, 'Material consumido (MP/EMB)', true, 'Via estoque/OP.');
        $add('2.02', '2', 2, 'Serviço de terceiros (industrialização externa)', true);
        $add('2.03', '2', 2, 'Frete sobre compras (apropriado ao custo)', true);
        $add('2.04', '2', 2, 'Quebras / perdas de produção', true);

        // ——— 3. DESPESAS OPERACIONAIS ———
        $add('3', null, 3, 'Despesas operacionais', false);

        $add('3.01', '3', 3, 'Pessoal', false);
        $add('3.01.01', '3.01', 3, 'Salários líquidos pagos', true);
        $add('3.01.02', '3.01', 3, 'Adiantamentos salariais', true);
        $add('3.01.03', '3.01', 3, 'Vale / benefícios pagos pela empresa', true);
        $add('3.01.04', '3.01', 3, 'Pró-labore', true);
        $add('3.01.05', '3.01', 3, 'Comissões de vendedores', true);

        $add('3.02', '3', 3, 'Encargos e impostos (pagos via financeiro)', false);
        $add('3.02.01', '3.02', 3, 'DAS / impostos do Simples (guia)', true);
        $add('3.02.02', '3.02', 3, 'Guia ICMS-ST / antecipação MG', true);
        $add('3.02.03', '3.02', 3, 'ISS / outras guias', true);
        $add('3.02.04', '3.02', 3, 'Taxas cartão / tarifas bancárias', true);

        $add('3.03', '3', 3, 'Utilidades e instalação', false);
        $add('3.03.01', '3.03', 3, 'Energia', true);
        $add('3.03.02', '3.03', 3, 'Água', true);
        $add('3.03.03', '3.03', 3, 'Telecom / internet', true);
        $add('3.03.04', '3.03', 3, 'Aluguel / condomínio', true);

        $add('3.04', '3', 3, 'Manutenção e operação', false);
        $add('3.04.01', '3.04', 3, 'Manutenção de máquinas', true);
        $add('3.04.02', '3.04', 3, 'Ferramentas / consumíveis de fábrica', true);
        $add('3.04.03', '3.04', 3, 'Combustível / frota', true);

        $add('3.05', '3', 3, 'Comercial e administrativo', false);
        $add('3.05.01', '3.05', 3, 'Marketing / brindes', true);
        $add('3.05.02', '3.05', 3, 'Material de escritório', true);
        $add('3.05.03', '3.05', 3, 'Sistemas / software (Focus, ERP…)', true);
        $add('3.05.04', '3.05', 3, 'Contador / honorários', true);
        $add('3.05.05', '3.05', 3, 'Despesas de viagem', true);

        $add('3.06', '3', 3, 'Logística de saída', false);
        $add('3.06.01', '3.06', 3, 'Frete de entrega (despesa)', true);
        $add('3.06.02', '3.06', 3, 'Embalagem extraordinária', true);

        $add('3.07', '3', 3, 'Despesas financeiras', false);
        $add('3.07.01', '3.07', 3, 'Juros pagos', true);
        $add('3.07.02', '3.07', 3, 'IOF / tarifas', true);
        $add('3.07.03', '3.07', 3, 'Descontos obtidos (contra)', true, 'Pode ser classificado como receita 1.04 conforme política.');

        // ——— 4. INVESTIMENTOS ———
        $add('4', null, 4, 'Investimentos / patrimônio', false, 'Saem no caixa; não são despesa de resultado no mês da compra.');
        $add('4.01', '4', 4, 'Aquisição de máquinas / equipamentos', true);
        $add('4.02', '4', 4, 'Móveis / informática', true);
        $add('4.03', '4', 4, 'Veículos', true);
        $add('4.04', '4', 4, 'Benfeitorias', true);

        // ——— 5. NÃO-RESULTADO ———
        $add('5', null, 5, 'Movimentações não-resultado', false);
        $add('5.01', '5', 5, 'Transferência entre contas (caixa ↔ banco)', true);
        $add('5.02', '5', 5, 'Empréstimo recebido / pagamento (principal)', true);
        $add('5.03', '5', 5, 'Aporte de sócio', true);
        $add('5.04', '5', 5, 'Retirada de sócio / distribuição', true);
        $add('5.05', '5', 5, 'Aplicação / resgate (principal)', true);
        $add('5.06', '5', 5, 'Pagamento a fornecedor de estoque (MP/EMB/REV)', true, 'TIT de compra que entra estoque; custo 2.01 só no consumo (OP).');

        return $rows;
    }
}
