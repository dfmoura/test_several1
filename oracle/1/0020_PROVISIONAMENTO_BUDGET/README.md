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

#### 1.2. 22/02/2024 13:00 as 15:00
```markdown

Satis - Provisionamento Financeiro - 2) Prosseguindo, iniciou-se a elaboração das tabelas que serão preenchidas a partir do SELECT anteriormente desenvolvido, utilizando uma rotina que será implementada posteriormente. Este conjunto de tabelas tem como objetivo armazenar de forma estruturada as informações derivadas da análise comparativa entre as despesas reais e orçamentárias.

```


#### 1.3. 26/02/2024 13:00 as 18:30
```markdown
Satis - Provisionamento Financeiro - 1) Foram criadas as tabelas que servirão de base para a execução do provisionamento. Uma tabela cabeçalho contendo os campos: CODIGO (chave primária da tabela), CODMETA (para relacionamento com a tabela de orçamento) e REF (ano de referência informado pelo usuário). A segunda tabela é uma tabela detalhe relacionada à tabela cabeçalho através do campo CODIGO, com os demais campos sendo: REF, CODNAT, CODCENCUS, CODPROJ, VLRPREV, VLRREAL, SALDO, VLRAPROV, e NUFIN. 2) Foi elaborado o select base para o provisionamento, utilizando as tabelas criadas anteriormente. Trata-se de uma consulta na tabela TGFMET, trazendo os campos CODNAT, CODCENCUS, CODPROJ, DTREF, PREVREC e PREVDESP. O valor previsto é calculado como a diferença entre PREVREC e PREVDESP, enquanto o valor real é obtido através de um sub-select na view financeira VGF_RESULTADO_SATIS, com filtro para valores não baixados. Neste sub-select, foi estabelecido um relacionamento 1 para 1 entre o código da natureza, código do projeto, código do centro de custo e o mês do orçamento com o mês da view. Para o código do projeto e centro de custo, foi permitida a flexibilização para trazer 0 quando não informados. Além disso, o select principal contemplou uma ligação da tabela de orçamento com a tabela adicional criada AD_PROVIFINAN, ligando os campos código da meta e o ano obtido a partir da data de referência da tabela de metas e o ano da tabela adicional. Os campos resultantes deste select incluem: CODIGO (chave obtida a partir da tabela adicional criada AD_PROVIFINAN conforme o relacionamento estabelecido), CODNAT, CODCENCUS, CODPROJ, ANO, MES, REF, VLRREAL, VLRPREV, SALDO (diferença entre VLRPREV e VLRREAL), e VLRAPROV (valor a ser provisionado, calculado como VLRPREV - VLRREAL quando VLRPREV > VLRREAL e 0 caso contrário). 

```

#### 1.4. 26/02/2024 19:30 as 22:00
```markdown
Satis - Provisionamento Financeiro - 3) Continuando a rotina de provisionamento, foi criada uma procedure que executa três cursores. O primeiro cursor realiza uma sequência de procedimentos que armazenam dados nas variáveis V_CODIGO, V_REF, V_CODNAT, V_CODCENCUS, V_CODPROJ, V_VLRPREV, V_VLRREAL, V_SALDO e V_VLRAPROV, utilizando o select criado anteriormente. Em seguida, é feita uma contagem de registros na tabela adicional de detalhe AD_DETPROVFINAN usando os filtros CODIGO = V_CODIGO, REF = V_REF, CODNAT = V_CODNAT, CODCENCUS = V_CODCENCUS e CODPROJ = V_CODPROJ. Se a contagem for igual a 0, é executado um comando de insert na tabela AD_DETPROVFINAN utilizando os dados armazenados nas variáveis. Caso contrário, é feito um update na tabela AD_DETPROVFINAN apenas nos campos VLRPREV, VLRREAL, SALDO e VLRAPROV. 4) Em seguida, foi criado o segundo cursor realizando um select na tabela de detalhe AD_DETPROVFINAN com o campo NUFIN nulo e o campo VLRAPROV > 0. Este cursor armazena os dados nas variáveis V_CODIGO2, V_ID2, V_REF, V_CODNAT2, V_CODCENCUS2, V_CODPROJ2 e V_VLRAPROV2, e em seguida executa um insert na tabela TGFFIN com os dados armazenados nas variáveis e nos demais campos. Simultaneamente, o campo NUFIN na tabela adicional AD_DETPROVFINAN é atualizado com base no insert realizado.
```