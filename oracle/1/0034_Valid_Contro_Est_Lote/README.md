# Objetivos
```markdown
Objetivo: VALIDACAO ESTOQUE PRODUTOS CONTROLADOS POR LOTE Externa
Solução Proposta para Atendimento ao Escopo

Análise o escopo e preparei um conjunto de soluções para atendê-lo, o tempo de execução é de 16 horas, segue os detalhes da solução proposta:

Alocação de itens com lote informado
>> Permitida com estoque disponível: Se o lote especificado possuir quantidade disponível suficiente, permitir a alocação do item no pedido.

>> Indisponível: Caso o estoque do lote especificado não atenda à demanda, não permitir a alocação nesse lote, optando por reservar o item sem especificação do lote.

    Restringir a inclusão de múltiplos lotes do mesmo produto no mesmo pedido, ou seja, a inclusão do primeiro lote não será bloqueada, porém um segundo lote não será possível.
        Criar evento com procedure na tabela de itens.


////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Alocação de Itens sem Lote informado
1. Reserva até Confirmação: Manter o item reservado até a confirmação do pedido.
2. Alocação Automática: Na confirmação do pedido, se a quantidade total do item for atendida por um único lote disponível, alocar todo o item nesse lote.
3. Sem Lote Disponível: Se não existir lote que atenda totalmente a demanda, reservar a quantidade total sem alocação a um lote específico.		


    Fiz alguns testes e nativamente foi possível incluir um item com controle de lote sem informar o lote e ainda assim reservar o estoque do mesmo, portanto nativamente essa demanda será atendida.
        O teste acima foi realizado com um produto cujo grupo não valida estoque.

    Criar regra de negócio ou trigger que faça a alocação automática de um único lote por produto na confirmação do pedido, caso o lote atenda toda quantidade negociada no pedido.

    Na confirmação do pedido, caso nenhum lote atenda totalmente a quantidade negociada no item, manter a reserva do mesmo, para tanto não será necessário realizar nenhuma ação personalizada.


////////////////////////////////////////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////////////

Situação de Venda na Loja
Um cliente deseja compar um tipo específico de porcelanato. Duas situações podem ocorrer ao verificar o estoque:
1. Venda com lotes diversos: Se o estoque não for suficiente para atender o pedido com um único lote, o vendedor pode negociar a venda utilizando múltiplos lotes, caso o cliente concorde.
2. Venda sob Encomenda: Preferencialmente, o produto será vendido sob encomenda, garantindo a alocação de um único lote para satisfazer integralmente o pedido.

    Criar um botão de ação para liberar o pedido para ser alocado em lotes distintos (pode ter controle de acessos)


```

### 1. Log's Execução

#### 1.1. 11/04/2024 13:00 as 18:00
```markdown
GM - Estrutura Gerencial por CR - 1)Criação de tabela no construtor de telas para armazenar a informações desta nova apresentação gerencial por CR.
```