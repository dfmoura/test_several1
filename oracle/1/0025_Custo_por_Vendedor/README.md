# Objetivos
```markdown
Segue o escopo de entrega que foi alinhado:

    Adicionar o botão 'Análise de Custo' no painel principal do dash 'Análise de Metas Comerciais'
        O clique no botão acima, deverá direcionar o usuário a um nível que apresente o custo por vendedor:
            Tabela com os vendedores que tem meta, o valor de meta prevista, valor de meta realizada, custo dos vendedores e % de representabilidade do custo frente ao faturamento realizado.
            Painel lateral que detalhe as despesas do vendedor selecionado por natureza
                Esse painel deve apresentar a natureza, valor e percentual de representatividade frente ao faturamento realizado.
            Obtenção do custo do vendedor
                Para tanto, o vendedor que tem meta, deverá ser vinculado aos C.R do qual ele é responsável (campo adicional que será criado)
                Buscar o custo (Despesas) dos C.R vinculados ao vendedor
                    Despesa de devolução de venda não deve ser considerada
                    Comissões devem ser consideradas pela data de negociação (comissões provisionadas no faturamento)
                    Demais despesas são obtidas pela data de baixa (liquidação)
        O duplo clique sobre o vendedor deverá direcionar o usuário a um nível inferior que detalhe a meta prevista, realizada, custo pela equipe do vendedor e percentual de representabilidade.
            Esse nível deve apresentar uma tabela com os C.R que estão vinculados ao vendedor selecionado
            O valor de meta prevista, deve ser obtido a partir da meta vinculada aos clientes, para tanto, será necessário vincular o C.R analítico que atende o cliente (campo adicional a ser criado na tela  de parceiros).
            O valor da meta realizada será obtido a partir das notas vinculadas ao C.R.
            O custo será obtido da mesma forma que o custo do vendedor, porém considerando apenas o C.R analítico.
            Painel lateral que detalha as despesas do vendedor selecionado por natureza, da mesma forma que o nível de custo por vendedores.

```

### 1. Log's Execução

#### 1.1. 18/03/2024 8:30 as 11:30
```markdown

Satis - Análise de Meta / Custo por Vendedor e Equipe - 1) Iniciou-se o desenvolvimento da estrutura inicial do comando SELECT para a visualização de vendas.
2) Dando início à atualização do conjunto de relatórios para a Gestão de Vendas, com foco no arquivo GV-Vendedores.jrxml. Este processo envolve revisão e aprimoramento das consultas SQL, bem como a implementação de novos elementos visuais e funcionalidades conforme as necessidades identificadas.

```
