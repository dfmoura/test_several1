# Objetivos
```markdown
Dia 15/01 

    Dashboard DRE gerencial
    Esse dash apresenta valores obtidos da TCBPLA, da mesma forma que o custos indiretos de produção do dash de rentabilidade
    1)A demanda está em criar uma forma para detalhar o resultado, assim como fizemos no dash de rentabilidade
    Criar nível inferior com os dados análiticos, esse nível pode ser acesso atravez do clique no gráfico de linha do nível principal
    
    
Dia 16/01 
2) Criar outro nível inferior para apresentar os dados análiticos, porém esse nível será aberto a partir do nível 2 do dash
Esse irá apresentar os registros de todo ano, porém deve haver uma coluna que apresente o mês, dessa forma, facilitando o usuário a filtrar ou agrupar os registros por mês

Dia 17/01
3) Por último seria bom ter uma forma de acessar o título de origem, porém pelo que percebi o registro analítico da contabilidade pode ter origem em nota ou no financeiro, portanto o duplo clique na tabela não atenderia. Acredito que criar dois botões de ação com lançadores resolveria, sendo um para abrir a central de notas e outro para abrir a movimentação financeira.


```
     
### 1. Log's Execução
#### 1.1. 15/01/2024 20:30 as 23:30
```markdown

GM - DRE Gerencial - 1.1) Inicialmente, realizou-se a replicação do comando "select" do gráfico no painel principal do dashboard, ajustando-o para incluir um detalhamento abrangente de todos os campos relevantes.  1.2) Em seguida, foi concebido um nível inferior, complementado por um componente de tabela, que se alimenta diretamente do comando "select" previamente elaborado, proporcionando uma visão mais detalhada e aprimorada dos dados.  1.3) Para aprimorar a interatividade do sistema, foram implementados eventos específicos, possibilitando o acesso direto ao nível inferior da tabela mediante um clique no gráfico correspondente.

```

### 1. Log's Execução
#### 1.1. 16/01/2024 20:00 as 23:30
```markdown

GM - DRE Gerencial - 2.1) Adapação de select obtido a partir de componente acessado pela tabela do nivel principal. 2.2) Criamos este novo nivel, adicionamos este select adaptado e todos os campos inerentes aos lançamento. 2.3) Adaptamos os argumentos, filtros e enventos para trazer todos os lançamentos a partir do duplo clique da conta contabil selecionada acesse o novo nivel demonstrando o detalhamentos dos ultimos 13 meses. 2.4) Criamos um campo que demonstra a data do movimento em mês/ano.

```

### 1. Log's Execução
#### 1.1. 17/01/2024 06:00 as 7:00
```markdown

GM - DRE Gerencial - Finalização - 2.1) Adapação de select obtido a partir de componente acessado pela tabela do nivel principal. 2.2) Criamos este novo nivel, adicionamos este select adaptado e todos os campos inerentes aos lançamento. 2.3) Adaptamos os argumentos, filtros e enventos para trazer todos os lançamentos a partir do duplo clique da conta contabil selecionada acesse o novo nivel demonstrando o detalhamentos dos ultimos 13 meses. 2.4) Criamos um campo que demonstra a data do movimento em mês/ano.

```



### 1. Log's Execução
#### 1.1. 19/01/2024 07:00 as 11:00
```markdown
GM - DRE Gerencial - Estruturação do select para demonstrar abertura contabil em dre gerencial.
```

### 1. Log's Execução
#### 1.1. 19/01/2024 12:00 as 15:20
```markdown
GM - DRE Gerencial - Estruturação do select para demonstrar abertura contabil em dre gerencial.
```

