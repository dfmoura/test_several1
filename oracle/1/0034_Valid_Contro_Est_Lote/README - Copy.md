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


ANTES DE GERAR UM PEDIDO NO SISTEMA A REGRA IRA VERIFICAR
SE CA
		
		Exemplo:
		Pedido 1
		
		Cursor
		codprod | descrprod        | qtdtotal | lote_valido
		1       | porcelanato a111 | 100      | porc5444


	UPDATE TGFITE SET CONTROLE=P_LOTE_VALIDADO WHERE CODPROD = P_CODPROD AND NUNOTA = P_NUNOTA


	Observações:
	Filtrar um lote disponivel, ou seja, não vale esses que tem o CONTROLE = NULL
	
	Disponível é ESTOQUE - RESERVADO
	
	
	A partir do momento que o pedido é confirmado ele fica reservado no sistema, tendo estoque ou não. 
	Quando eu emito a nf do mesmo o estoque eh consumido e o reservado tb na quantidade da nota.

		
		SELECT 
		CODPROD,
		CONTROLE,
		ROW_NUMBER() OVER (PARTITION BY CODPROD ORDER BY CONTROLE) AS SEQ_CONTROLE,
		SUM(RESERVADO) AS RESERVADO,
		SUM(ESTOQUE) AS ESTOQUE
		FROM TGFEST
		WHERE CONTROLE <> ' ' /*POIS TODO ESTOQUE TEM CONTROLE DE LOTE*/
		GROUP BY CODPROD,CONTROLE
		ORDER BY 1,3S

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

#### 1.1. 11/04/2024 8:00 as 12:00
```markdown

Ogunja - Alocação de Itens sem Lote informado - Realização de procedure para Alocação de Itens com Lote Especificado, na qual criamos a condição de a quantidade disponível no lote especificado for suficiente para atender à demanda do pedido, a alocação do item é permitida.  E também, criamos caso o estoque do lote especificado não seja suficiente para atender à demanda do pedido, a alocação nesse lote é bloqueada, optando-se por reservar o item sem especificação do lote. Procedure criada: STP_ALOCA_MULT_LOTES_OGUNJA.

```

#### 1.2. 11/04/2024 13:30 as 18:00
```markdown

Ogunja - Alocação de itens com lote informado - Implementação de uma restrição para a inclusão de múltiplos lotes do mesmo produto em um único pedido, com a verificação de modo que a inclusão do primeiro lote não será bloqueada, porém a adição de um segundo lote será impedida. Este evento foi incorporado por meio de uma Procedure na Tabela de Itens, visando garantir a consistência e integridade dos dados durante o processo de alocação de lotes em pedidos.

```


#### 1.2. 12/04/2024 08:00 as 12:00
```markdown

Ogunja - Alocação de itens com lote informado - Foi desenvolvida uma procedure que automatiza o processo de alocação de um único lote por produto durante a confirmação de pedidos. Esta procedimento garante que, ao confirmar um pedido, se um único lote for capaz de atender completamente à quantidade negociada para um determinado item, ele será automaticamente alocado. No caso de nenhum lote satisfazer integralmente a quantidade negociada para um item específico, a reserva desse item será mantida, sem a necessidade de intervenção personalizada por parte do usuário.Procedure criada: STP_VALIDA_MULT_LOTES_OGUNJA.

```

#### 1.2. 12/04/2024 13:00 as 18:30
```markdown

Ogunja - Libera Alocação de itens Multiplos Lotes - Desenvolvemos uma procedure que aprimora significativamente a funcionalidade de vendas, permitindo a gestão eficiente de vendas com lotes diversos. Agora, quando o estoque não é suficiente para atender a um pedido com um único lote, os vendedores têm a flexibilidade de negociar a venda utilizando múltiplos lotes, contando com a concordância do cliente. Além disso, implementamos a funcionalidade de Venda sob Encomenda, proporcionando aos clientes a opção de adquirir produtos que não estão disponíveis em estoque imediato. Com essa configuração, garantimos a alocação de um único lote para satisfazer integralmente o pedido do cliente, reforçando nossa capacidade de atender às demandas de forma personalizada e eficaz. Como parte dessas melhorias, introduzimos um botão de ação intuitivo que permite aos usuários liberar o pedido para ser alocado em lotes distintos, simplificando ainda mais o processo de vendas e aumentando a eficiência operacional da nossa plataforma. Essas atualizações representam um avanço significativo em nossa capacidade de atender às necessidades variadas dos clientes e garantir uma experiência de compra satisfatória. Procedure criada: STP_LIB_MULT_LOTES_OGUNJA.

```

