# Objetivos
```markdown

Fazer relatorio pdf de acompanhamento de metas:

	SA - DASH FORMATADO (PDF) METAS
	* AGRUPAMENTO
	VENDEDOR
		-> CLIENTE
			-> MARCA
				-> REFERêNCIA

	* NO FINAL DO RELATÓRIO, APRESENTAR UMA POSIÇÃO SINTÉTICA (RESUMO)
	- VENDEDOR
	- CLIENTE
	- MARCA


	- USAR COMO BASE: DASH ORÇADO VS REALIZADO V2
	
	---Novas atualizações no relatorio:
	
	
	1.1) Implementar os filtros abaixo ao relatório "Orçado x Realizado"

		1.1.1) POSSIBILITAR FILTRAR MÚLTIPLOS VENDEDORES
		1.1.2) FILTRAR POR MARCA
		1.1.3) FILTRAR POR GRUPO DE MARCA
		1.1.4) FILTRAR TOP 10 CLIENTES E ANALISAR O RESULTADO

	1.2) No cabeçalho do grupo "Clientes", adicionar dois gráficos de pizza:

		1.2.1) % de conclusão em volume 
		1.2.2) % de conclusão em valor financeiro

	1.3) Criar agendadores de envio (ativá-los apenas após validar comigo)

		1.3.1) ENVIAR SEMANAL A POSIÇÃO DA META DO VENDEDOR DO MÊS
		1.3.2) ENVIAR POSIÇÃO DA SAFRA
		1.3.3) ENVIAR POSIÇÃO PARA OS COORDENADORES (CÉSAR E ALEXANDRE)
	
	
	

	1.4) Criar uma coluna de % para qtd. e reposicionar ambas colunas de %, o primeiro ao final da qtd. real e outro ao final do vlr. real.
	1.5) Colocar juntos litro e valor da meta e litros e valor do realizado, assim fica com uma melhor visualização.
	
	1.6) Criar totalizador por vendedor e cliente.
	
```
     
### 1. Log's Execução
#### 1.1. 05/01/2024 12:50 as 17:55
```markdown
SATIS - Relatorio Orçados x Realizado - 1.1) Aprimoramento do SELECT para proporcionar uma análise mais abrangente dos dados, destacando a comparação entre o orçamento e a realização no contexto de 'DASH ORÇADO x REALIZADO'. Este aprimoramento inclui a inclusão dos campos de vendedores, clientes e marcas, visando fornecer uma visão mais completa e detalhada.  1.2) Desenvolvimento de um relatório no iReport que se fundamenta no SELECT aprimorado mencionado anteriormente. O objetivo é criar um documento robusto que reflita de maneira precisa e visualmente apelativa as nuances do 'DASH ORÇADO x REALIZADO', destacando os elementos cruciais dos vendedores, clientes e marcas.  1.3) Elaboração de um design otimizado para o relatório, priorizando a disposição estratégica das informações. A ênfase será dada à clareza visual e à facilidade de interpretação, garantindo que os dados sejam apresentados de forma eficiente e intuitiva.  1.4) Implementação de agrupamentos pertinentes no relatório, organizando os dados de acordo com as categorias relevantes, tais como 'VENDEDOR', 'CLIENTE' e 'MARCA'. Essa abordagem permitirá uma análise mais aprofundada e segmentada, facilitando a identificação de padrões e tendências específicos.  1.5) Ajuste dos parâmetros existentes para alinhar-se de forma precisa aos requisitos específicos do relatório. Essa adaptação garantirá que os usuários possam personalizar a visualização conforme necessário, tornando o relatório mais flexível e adequado às diferentes necessidades de análise.

```
#### 1.2. 06/01/2024 16:30 as 19:30
```markdown
SATIS - Relatorio Orçados x Realizado - 1.5) Conclusão bem-sucedida da atualização dos parâmetros, agora integralmente refletidos no relatório em conformidade com a plataforma 'DASH'. Essa aprimorada configuração proporciona uma representação mais precisa e abrangente dos dados.  1.6) Implementação de um lançador dedicado ao relatório, com a inclusão de um link acessível diretamente a partir do 'DASH'. Essa estratégia não apenas facilita a navegação, mas também otimiza a experiência do usuário, proporcionando acesso rápido e intuitivo às informações cruciais contidas no relatório recém-atualizado.
```
#### 1.3. 07/01/2024 10:30 as 11:30
```markdown
SATIS - Relatorio Orçados x Realizado -1.7) Desenvolvimento de sub-relatórios de síntese dedicados a cada agrupamento significativo, nomeadamente 'VENDEDOR', 'CLIENTE' e 'MARCA'. Realizou-se uma meticulosa formatação desses sub-relatórios, destacando as informações essenciais de forma organizada e visualmente apelativa. Posteriormente, procedeu-se à consolidação desses sub-relatórios, integrando com relatório principal.
```
#### 1.4. 07/01/2024 14:00 as 15:30
```markdown
SATIS - Relatorio Orçados x Realizado -1.7) Finalização dos sub-relatórios no agrupamento e formatação.
```

#### 1.5. 09/01/2024 07:00 as 12:10:30
```markdown
SATIS - Relatorio Orçados x Realizado - FEITO AS SEGUINTES ATUALIZAÇÕES NO RELATÓRIO: 1.1.1) CRIADO FILTROS MULTIPLOS POR VENDEDOR (3 OPÇÕES) 1.1.2) CRIADO FILTRO MARCA 1.1.3) CRIADO FILTRO GRUPO PROD SATIS (SAFRA E PREMIAÇÃO) 1.1.4) CRIADO FILTRO POR EMPRESA 1.1.5) CRIADO FILTRO POR GRUPO DE PRODUTOS 1.1.6) CRIADO FILTRO POR CR.
```

#### 1.6. 09/01/2024 13:50 as 18:20
```markdown
SATIS - Relatorio Orçados x Realizado - FEITO AS SEGUINTES ATUALIZAÇÕES NO RELATÓRIO: 1.1.4) Criação de select para FILTRAR TOP 10 CLIENTES E ANALISAR O RESULTADO (Não finalizado). 1.2) Criação no cabeçalho do grupo "Clientes", adicionar dois gráficos de pizza (Não finalizado). 1.2.1) % de conclusão em volume  (Não finalizado). 1.2.2) % de conclusão em valor financeiro (Não finalizado). 1.4) Criar uma coluna de % para qtd. e reposicionar ambas colunas de %, o primeiro ao final da qtd. real e outro ao final do vlr. real. 1.6) Criar totalizador por vendedor e cliente.

```

#### 1.7. 10/01/2024 07:20 as 12:20
```markdown
Revisão do SELECT relacionado aos os filtros implementados, na sequência efetuação de testes com validação.

```

#### 1.8. 10/01/2024 13:35 as 18:15
```markdown
CONTINUAÇÃO na Revisão do SELECT relacionado aos os filtros implementados, na sequência efetuação de testes com validação, e ajuste no GRUPO MARCAS.

```
