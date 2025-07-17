# Sistema de Simulação de Preços - Guia do Usuário

## O que é este sistema?

Este é um sistema que ajuda empresas a analisar e simular preços de produtos. Imagine que você tem uma loja e quer saber:
- Quanto custa cada produto
- Qual margem de lucro você está ganhando
- Como ficaria seu lucro se você mudasse os preços
- Qual seria o preço ideal para diferentes tipos de clientes

O sistema faz todos esses cálculos automaticamente e mostra os resultados em uma tabela fácil de entender.

## Como funciona?

### 1. Coleta de Informações
O sistema busca no banco de dados da empresa:
- **Custos** de cada produto
- **Preços atuais** de venda
- **Histórico de vendas** dos últimos 12 meses
- **Metas** de vendas por marca
- **Informações** sobre clientes e parceiros

### 2. Cálculos Automáticos
Com essas informações, o sistema calcula:
- **Margem de lucro** atual de cada produto
- **Preços sugeridos** para diferentes cenários:
  - Preço atual (como está hoje)
  - Preço para consumidor final (-15% de desconto)
  - Preço para revendedores (-35% de desconto)
- **Ponderação** de cada produto dentro da marca (baseado nas vendas)

### 3. Interface Visual
Os resultados aparecem em uma tabela colorida onde:
- **Linhas verdes claras** = produtos de uma marca
- **Linhas brancas** = produtos de outra marca
- **Linhas destacadas** = resumo por marca
- **Setas** indicam se o novo preço é maior (↑), menor (↓) ou igual (=) ao atual

## Como usar o sistema

### Passo 1: Acessar o Sistema
1. Abra o navegador
2. Digite o endereço do sistema
3. Faça login com suas credenciais

### Passo 2: Configurar os Filtros
Na tela inicial, você verá campos para preencher:
- **Período**: Qual mês/ano você quer analisar
- **Empresa**: Qual empresa do grupo (se houver várias)
- **Marca**: Quais marcas de produtos analisar
- **Produto**: Produto específico (opcional)
- **Cliente**: Cliente específico (opcional)

### Passo 3: Analisar os Resultados
A tabela mostrará:
- **Códigos** dos produtos e tabelas de preços
- **Descrição** dos produtos
- **Marca** de cada produto
- **Preços atuais** e margens
- **Preços sugeridos** para diferentes cenários
- **Campos editáveis** para você inserir novos preços

### Passo 4: Simular Novos Preços
Você pode:
1. **Digitar um novo preço** no campo "Novo Preço"
   - A margem será calculada automaticamente
2. **Digitar uma nova margem** no campo "Nova Margem"
   - O preço será calculado automaticamente
3. **Usar os controles globais** para aplicar o mesmo preço ou margem a todos os produtos

### Passo 5: Definir Data de Vigor
Para cada produto que você alterar, digite a **data de vigor** (quando o novo preço entra em vigor) no formato dd/mm/aaaa.

### Passo 6: Salvar as Alterações
1. Clique no botão **"Inserir no Banco"**
2. O sistema salvará os novos preços
3. Uma mensagem confirmará o sucesso da operação

## Funcionalidades Especiais

### Filtros de Busca
- **Busca por texto**: Digite qualquer palavra para filtrar os produtos
- **Busca múltipla**: Use "|" para buscar por vários termos (ex: "arroz|feijão")
- **Busca em tempo real**: Os resultados aparecem conforme você digita

### Controles Globais
- **Preço Global**: Aplica o mesmo preço a todos os produtos
- **Margem Global**: Aplica a mesma margem a todos os produtos

### Exportação de Dados
- **Exportar para Excel**: Salva todos os dados em um arquivo Excel
- **Apenas linhas visíveis**: Só exporta os produtos que estão sendo mostrados (considerando filtros)

### Indicadores Visuais
- **Setas**: Mostram se o novo preço é maior (↑), menor (↓) ou igual (=) ao atual
- **Cores**: Diferentes cores para diferentes marcas e cenários
- **Resumos**: Linhas destacadas mostram totais por marca

## Cenários de Preços

### 1. Preço Atual (Tabela)
- **O que é**: O preço que está sendo cobrado hoje
- **Cor**: Rosa
- **Uso**: Para comparar com os novos preços

### 2. Preço Consumidor (-15%)
- **O que é**: Preço com 15% de desconto para consumidor final
- **Cor**: Azul
- **Uso**: Para produtos vendidos diretamente ao consumidor

### 3. Preço Revenda (-35%)
- **O que é**: Preço com 35% de desconto para revendedores
- **Cor**: Verde
- **Uso**: Para produtos vendidos a outras empresas

## Dicas de Uso

### Para Análise Rápida
1. Configure apenas o período e a marca
2. Use os filtros para focar em produtos específicos
3. Observe as margens atuais para identificar oportunidades

### Para Simulação de Preços
1. Use os controles globais para testar cenários
2. Ajuste individualmente os produtos que precisam de atenção especial
3. Compare as margens antes e depois das mudanças

### Para Implementação
1. Defina datas de vigor realistas
2. Teste com poucos produtos primeiro
3. Use a exportação para Excel para documentar as mudanças

## Mensagens do Sistema

### Mensagens de Sucesso
- **"X registros foram salvos com sucesso!"**: Os preços foram salvos no banco
- **"X linhas exportadas para Excel"**: Arquivo Excel foi criado

### Mensagens de Aviso
- **"Nenhum dado para exportar"**: Não há produtos visíveis para exportar
- **"Nenhum dado válido encontrado"**: Preencha preços e datas de vigor

### Mensagens de Erro
- **"Erro ao salvar dados"**: Problema técnico, verifique o console
- **"Todos os registros devem ter..."**: Preencha todos os campos obrigatórios

## Solução de Problemas

### A página não carrega
- Verifique sua conexão com a internet
- Confirme se o endereço está correto
- Tente recarregar a página (F5)

### Os dados não aparecem
- Verifique se os filtros estão configurados corretamente
- Confirme se o período selecionado tem dados
- Tente um período mais recente

### Os cálculos estão errados
- Verifique se os custos estão atualizados no sistema
- Confirme se as vendas dos últimos 12 meses estão corretas
- Entre em contato com o suporte técnico

### Não consigo salvar os dados
- Verifique se todos os campos obrigatórios estão preenchidos
- Confirme se as datas estão no formato correto (dd/mm/aaaa)
- Verifique se você tem permissão para alterar preços

## Contato e Suporte

Se você encontrar problemas ou tiver dúvidas:
1. **Documentação técnica**: Consulte a versão técnica deste documento
2. **Suporte técnico**: Entre em contato com a equipe de TI
3. **Treinamento**: Solicite treinamento para novos usuários

## Glossário

- **Margem**: Percentual de lucro sobre o preço de venda
- **Custo**: Valor que a empresa paga pelo produto
- **Tabela de preços**: Conjunto de preços para uma data específica
- **Vigor**: Data em que um preço entra em vigor
- **Ponderação**: Peso de cada produto baseado nas vendas
- **CTE**: Abreviação técnica para consultas complexas no banco
- **JSP**: Tecnologia usada para criar páginas web dinâmicas
- **Trigger**: Processo automático que executa quando dados são salvos

---

*Este sistema foi desenvolvido para facilitar a análise e simulação de preços, permitindo tomadas de decisão mais informadas e estratégicas.* 