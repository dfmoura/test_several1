# Objetivos
```markdown

Gerenciar entrega a partir do faturamento.

	1) Criar campo em 'Local Estoque Padrão' na TGFTOP.
	2) Desenvolver uma trigger que será acionada sempre que um registro for inserido ou atualizado na tabela TGFITE. A função desta trigger é assegurar que o campo referente ao local de registro na tabela TGFITE seja automaticamente preenchido com o valor padrão definido na tabela TOP.
	3) DUPLICAR OS BOTÕES ‘CRIAR VIAGEM’ E ‘ATUALIZAR VIAGEM’ DA TGFCAB E DISPONIBILIZAR APENAS NO PORTAL DE VENDAS
	4) CRIAR CAMPOS ADICIONAIS NA TGFVAR, SENDO: o	NOME DO PRODUTO / o	REFERENCIA DO PRODUTO / o	TOP DE DESTINO
	5) CRIAR STATUS DO CABEÇALHO (TGFCAB) PARA APRESENTAR OS DETALHES DAS O.C QUE ATENDERAM O PEDIDO

```


### 1. Log's Execução


#### 1.1. 16/05/2024 17:30 as 23:30
```
GUI - ENTREGAS A PARTIR DO FATURAMENTO - 1)Adicionado campo 'Local Estoque Padrão' na tabela TGFTOP. 2)Implementada trigger que será acionada sempre que um registro for inserido ou atualizado na tabela TGFITE. A função desta trigger é garantir que o campo referente ao local de estoque na tabela TGFITE seja automaticamente preenchido com o valor padrão definido na tabela TGFTOP. 3) Duplicada a procedure do botão 'CRIAR VIAGEM' do dashboard de ordem de carga. 4) Duplicada a procedure do botão 'ATUALIZAR VIAGEM' do dashboard de ordem de carga. Verificação em andamento para finalização. 5) Criados campos adicionais calculados na tabela TGFVAR, sendo: Nome do Produto/Referência do Produto/TOP de Destino. 6)Criado o campo de status do cabeçalho (TGFCAB) para apresentar os detalhes das ordens de carga que atenderam o pedido. Verificação em andamento para finalização.

```