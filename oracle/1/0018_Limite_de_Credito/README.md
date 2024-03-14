# Objetivos
```markdown

Dash Limite de Credito

Objetivo: 


Segue as premissas levantadas junto a Graziele para entrega do dash de limite de crédito:

* Pontualidade
Títulos financeiros REAIS  (tgffin.provisao = 'N') com quantidade de dias em atraso ou antecipação

* Análise de vencimento do cadastro

* Limite de crédito
Apresentar: Parceiro | Limite de Crédito Total | Limite de Crédito Consumido | Limite de Crédito Disponível
Botão para atualizar o limite de crédito
Apresentar os títulos que estão consumindo o limite de crédito

* Apresentar informações da tela Análise de Crédito



    MVP - NÍVEL PRINCIPAL



    MVP - NÍVEL INFERIOR (1)
        Acessado com duplo clique sobre a tabela de parceiros do nível principal
        Apresenta uma tabela com os títulos que compõem o limite consumido
        Criar evento para que com duplo clique, o usuário seja direcionado a movimentação financeira

    MVP  - NÍVEL INFERIOR (2)
        A essado com duplo clique sobre o cartão de pontualidade
        Apresenta uma tabela com os títulos financeiros REAIS (tgffin.provisao = 'N') do cliente
        Apresentar campo com a pontualidade (dias em atraso ou antecipação)

    Criar campo adicional calculado na tela movimentação financeira (TGFFIN)
        CRIAR CAMPO DE DIAS DE ATRASO/ANTECIPAÇÃO NA MOVIMENTAÇÃO FINANCEIRA    
    

```

### 1. Log's Execução

#### 1.1. 06/02/2024 13:00 as 18:30
```markdown

Satis - Limite de Credito - 1) Desenvolvimento de um select principal que apresenta o limite de crédito registrado para o parceiro, juntamente com o limite utilizado, permitindo filtrar por notas confirmadas ou valores não reconciliados.  2) Implementação de um nível secundário, no qual, ao realizar um duplo clique no parceiro, o usuário é redirecionado para uma visualização detalhada do crédito utilizado, organizado por notas.  3) Introdução de um cartão para exibir a média de dias de pontualidade por parceiro. Nesta implementação, foram considerados os seguintes tipos de recebimento no select: a) "Aberto Vencido" b) "Antecipação" c) "Pago em atraso" d) "Pago no dia".  4) Estabelecimento de uma formatação para o cartão, onde, para pontualidade >= 0, a cor será azul, enquanto para pontualidade < 0, a cor será vermelha.


```

#### 1.2. 06/02/2024 20:30 as 23:30
```markdown

Satis - Limite de Credito - 5) Foi desenvolvido um recurso de nível inferior para proporcionar uma visualização detalhada dos documentos que compõem o índice de pontualidade indicado no cartão. Esse recurso oferece a mesma amplitude de opções de filtro que os recebimentos e pode ser acessado através de um clique no cartão. As opções de filtro incluem: a) 'Aberto Vencido', b) 'Antecipação', c) 'Pago em Atraso' e d) 'Pago no Dia'. 6) Foi criado um novo cartão para identificar os parceiros com cadastros desatualizados, baseado nos seguintes critérios: 'Cadastro Não Vencido', 'Cadastro Vencido' e 'Sem Data de Cadastro'.

```

#### 1.3. 07/02/2024 07:00 as 11:30
```markdown
Satis - Limite de Credito - 6) Uma adição significativa à interface principal foi concebida, visando proporcionar aos usuários um resumo dos dados destacados na tela de 'Análise de Crédito'. Este componente foi meticulosamente configurado para atualizar de forma dinâmica sempre que um parceiro for selecionado na tabela principal. Essa sinergia entre os elementos da interface possibilita uma visualização mais eficiente e ágil das informações críticas, elevando assim a experiência do usuário a um novo patamar de fluidez e intuição. 7) Na tabela financeira TGFFIN, foi introduzido um campo calculado que espelha a funcionalidade de pontualidade implementada no dashboard 'Análise de Crédito'. Este campo, apresenta, a quantidade de dias a partir da situação de recebimento, conforme: a) "Aberto Vencido", b) "Antecipação", c) "Pago em atraso" e d) "Pago no dia", fornecendo uma representação visual clara da pontualidade associada aos registros financeiros.

```

#### 1.4. 07/02/2024 13:00 as 15:30
```markdown
Satis - Limite de Credito - 8) Desenvolvemos uma procedure para permitir a atualização dinâmica do limite de crédito diretamente através do botão de ação incorporado na tabela principal do nosso painel. Este recurso oferece maior agilidade e praticidade aos usuários, permitindo que eles ajustem os limites de crédito de forma rápida e intuitiva, sem a necessidade de navegar por múltiplas telas ou formulários.

```

#### 1.5. 12/02/2024 08:00 as 12:30
```markdown
Satis - Limite de Credito - 9) Criado atalho para abrir a tela de analise de credito. A utilização do atalho ocorre a partir de click sobre o card de análise de crédito. 10) Criado campos na tabela de limite de crédito (nível principal): a) Campo data de vencimento do cadastro b) Campo status do vencimento do cadastro. 11) Feita atualização no select para considerar as filiais na composição do limite de crédito consumido.


```

#### 1.6. 13/03/2024 09:30 as 11:30
```markdown
Satis - Limite de Credito - 10) Inciamos um correção onde foi apontado que a filial de uma matriz com saldo em aberto no financeiro não estava sendo apresentado no Dash de Análise de Credito. Repassamos o select do dash, verificando passo a passo, limite de credito cadastrado por parceiro, saldo consumido com base na movimentação financeira em aberto, e saldo disponivel de acordo com a diferença do saldo cadastrado pelo saldo consumido, toda esta abrangencia foi revisada estabelecedo o grupo de parceiro matriz e filial, onde a liberação do credito fica na matriz, e toda movimentação influencia na composição do saldo. Detectamos uma falhama no relacionamento criado para nomear a matriz e corrigimos.


```
