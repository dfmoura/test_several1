# Objetivos
```markdown

O objetivo é criar uma rotina personalizada que identifique o valor de despesa prevista nos orçamentos e gere provisões (despesa financeira provisionada) para cada mês de referência do orçamento, centro de resultado, projeto e natureza.

    A rotina deve contemplar uma tela que permita cadastrar os orçamentos que serão provisionados
        Informativo: Orçamentos são configurados na tela 'Configuração da Estrutura de Metas/Orçamentos' e são nativamente visualizados (previsto e realizado) na tela 'Planejamento de metas/Orçamentos'. A tabela onde a meta prevista e realizada grava seus dados é a TGMMET.
        A tela desenvolvida deve permitir vincular o orçamento que será provisionado e a partir dele gerar uma pré-visualização do provisionamento por referência, centro de resultado, projeto e natureza, sendo que o orçamento pode não conter todas essas variáveis.
        Pré-Visualização
            Pode ser uma aba (tabela detalhe) que será alimentada por uma ação agendada e/ou botão de ação.
            Essa aba deve apresentar um registro para cada provisionamento devido e o nro único financeiro que foi gerado para atender essa provisão
            A provisão gerada no financeiro deve deve ser subtrair o valor de despesas já provisionadas ou realizadas na referência, para o mesmo projeto, centro de resultado e natureza.
                A aba de pré-visualização deve apresentar o valor previsto no orçamento, o valor já realizado (despesas provisionadas e realizadas já lançadas na referência) e o saldo à provisionar.
                Esse valor de saldo que será utilizado para gerar o financeiro (despesas provisionada)
        Atualização das provisões
            Uma ação agendada deverá ser executada no mínimo a cada 2 horas para atualizar o saldo das provisões geradas pela rotina.
            Quando o saldo for 0 ou quando o mês atual for maior que o mês referência do orçamento, a provisão financeira deverá ser ocultada (TGFFIN.RECDESP= 0) e seu valor deverá ser zerado (TGFFIN.VLRDESDOB = 0)






```

### 1. Log's Execução

#### 1.1. 12/02/2024 13:00 as 18:30
```markdown

Satis - Controle de Acesso - Foram implantadas medidas de controle de acesso para as seguintes ferramentas comerciais: - Dash Comparativo Metas Comerciais - Relatório Orçado x Realizado (Metas) - Dash Análise de Metas Comerciais O mecanismo de controle de acesso segue uma hierarquia definida da seguinte forma: 1) Acesso Completo: Os usuários marcados como 'Gestor de Meta' = 'S' (ativado) na guia geral do cadastro de usuários possuem acesso completo às funcionalidades das ferramentas.   
2) Acesso de Gerente: Os usuários gerentes têm permissão para visualizar a movimentação com base nos vendedores que estão sob sua gestão. 3) Acesso de Vendedor: Os usuários vendedores têm acesso restrito e podem visualizar apenas sua própria movimentação. É importante ressaltar que é necessário que tanto os vendedores quanto os gerentes estejam devidamente vinculados ao cadastro de usuários para garantir o correto funcionamento dessas medidas de controle de acesso.

```
