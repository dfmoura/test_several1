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

#### 1.1. 22/02/2024 08:00 as 11:30
```markdown

Satis - Provisionamento Financeiro - 1)Foi desenvolvido um comando SELECT base que, com base nos valores registrados nas despesas e comparando-os com o orçamento estabelecido, determina o montante a ser provisionado. Este comando considera as seguintes condições: a) Se o valor real das despesas for maior que o valor previsto, o montante a ser provisionado será zero. b) Se o mês de competência for anterior ao mês atual, o montante a ser provisionado será zero. c) Caso nenhuma das condições anteriores seja satisfeita, o montante a ser provisionado será a diferença entre o valor previsto e o valor real das despesas. Este SELECT base foi elaborado para otimizar o processo de provisionamento financeiro, garantindo uma alocação precisa dos recursos de acordo com a performance das despesas em relação ao orçamento.

```

#### 1.1. 22/02/2024 13:00 as 15:00
```markdown

Satis - Provisionamento Financeiro - 2) Prosseguindo, iniciou-se a elaboração das tabelas que serão preenchidas a partir do SELECT anteriormente desenvolvido, utilizando uma rotina que será implementada posteriormente. Este conjunto de tabelas tem como objetivo armazenar de forma estruturada as informações derivadas da análise comparativa entre as despesas reais e orçamentárias.

```

