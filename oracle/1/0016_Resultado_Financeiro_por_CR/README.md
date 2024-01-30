# Objetivos
```markdown
Objetivo: Criar dash resultado financeiro por C.R

Grafico de resultado financeiro por C.R
- Para desenvolvimento, pode-se basear no dash Gestão por Centro de Resultado
- Consolidar o resultado de receita e despesa por nível de hierarquia
- Deve viabilizar a apresentação do resultado sintetizado por natureza
- Apresentar gráfico de evolução por C.R
- A despesas, são as baixas (VLRBAIXA) no periodo, com exceção para as comissões, que seriam as provisionadas e não as baixadas. 
- As receitas, são obtidas pela data de negociação (utilizar select do realizado dos indiradores comerciais, como metas e rel. de vendas), utilizar (VLRDESDOB)
- EXEMPLO CONSULTA COMISSÕES: ( SELECT * FROM TGFFIN WHERE CODNAT = 2020202 AND PROVISAO = 'S' AND DTNEG BETWEEN '01/11/2023' AND '30/11/2023' )
- Permitir comparar periodos diferentes (talvez seja necessário criar um dash com essa finalidade)

```

### 1. Log's Execução

#### 1.1. 29/01/2024 09:30 as 12:00

Satis - Resultado financeiro por C.R - 1)Desenvolvimento de um dashboard com um componente inicial fundamentado na funcionalidade "Dash Gestão por CR", preservando os campos de código CR, descrição CR e valor de baixa durante a atualização efetuada na SELECT desse componente.


#### 1.2. 29/01/2024 13:00 as 18:00

Satis - Resultado financeiro por C.R - 2)Desenvolvemos um novo componente de tabela localizado na parte inferior, modelado a partir do componente de detalhamento do "Dash Gestão por CR". Este novo componente utiliza uma estrutura de seleção para agrupar as naturezas contábeis e apresentar os campos correspondentes, incluindo código da natureza, descrição e valor de baixa. 3)Além disso, implementamos um gráfico que ilustra a evolução do comportamento do CR ao longo dos últimos 12 meses. Para isso, elaboramos a estrutura de seleção com base no componente de tabela inferior do "Dash Gestão por CR". O filtro aplicado considera a data final do período selecionado e os 12 meses anteriores a essa data. 4)Por fim, realizamos ajustes no componente principal do dashboard para garantir que, ao ser clicado, ele atualize automaticamente os demais componentes, proporcionando uma experiência de usuário mais dinâmica e eficiente.
