# Documentação do Sistema de Simulação de Preços

## Visão Geral

O **Sistema de Simulação de Preços** é uma ferramenta desenvolvida para permitir que usuários realizem simulações de preços de produtos de forma eficiente e organizada. Este dashboard oferece uma interface intuitiva que facilita a análise e o planejamento de estratégias de precificação.

## Objetivo Principal

O sistema foi criado para possibilitar a realização de simulações de preços de produtos, permitindo que os usuários analisem diferentes cenários de precificação antes de implementar mudanças reais na tabela de preços da empresa.

## Estrutura da Tela

### 1. Filtros de Entrada

A tela é composta por filtros que permitem refinar a busca e análise dos dados:

#### **Filtros Obrigatórios:**
- **Empresa**: Permite selecionar a empresa matriz ou suas filiais
- **Período**: Define a data de referência que será utilizada para buscar o último custo e preço disponível

#### **Filtros Opcionais:**
- **Marca**: Permite filtrar uma ou mais marcas através de uma lista múltipla
- **Tabela de Preço**: Permite selecionar uma das tabelas de preços existentes
- **Código do Produto**: Permite filtrar um produto específico
- **Parceiro**: Permite filtrar um parceiro específico

### 2. Área de Simulação

Logo abaixo dos filtros, encontra-se uma área dedicada à simulação que inclui:

- **Cabeçalho**: Contém informações gerais sobre a simulação
- **Filtro de Tabela**: Permite filtrar os dados da tabela gerada por qualquer contexto
- **Campos de Preenchimento em Lote**: Permitem definir:
  - **Novo Preço**: Valor do novo preço a ser simulado
  - **Nova Margem**: Nova margem de lucro a ser aplicada
  - **Nova Data de Vigor**: Data em que os novos preços entrarão em vigor

### 3. Tabela de Resultados

A tabela principal exibe informações detalhadas sobre os produtos, incluindo:

#### **Informações Básicas:**
- **Produtos**: Lista de produtos disponíveis
- **Peso**: Baseado na quantidade faturada nos últimos 12 meses, utilizado para ponderar valores dos produtos para a marca, no custo, preço e margem

#### **Dados de Custos e Preços:**
- **Custo Satis Atual**: Custo atual do produto
- **Preço Atual**: Preço vigente na tabela
- **Preço Consumidor (-15%)**: Preço com desconto de 15% para consumidor final
- **Margem com base no preço consumidor**: Margem calculada sobre o preço consumidor
- **Preço Revenda (-35%)**: Preço com desconto de 35% para revendedores
- **Margem com base no preço revenda**: Margem calculada sobre o preço revenda

#### **Ticket Médio:**
- **Objetivo**: Meta atual estabelecida
- **Últimos 12 meses**: Calculado de acordo com o período do filtro padrão
- **Safra**: Calculado de acordo com o período do filtro padrão

#### **Colunas de Simulação:**
- **Nova Margem**: Campo para inserir a nova margem desejada
- **Novo Preço**: Campo para inserir o novo preço
- **Nova Data de Vigor**: Data em que os novos preços entrarão em vigor

### 4. Botões de Ação

No canto inferior direito da tela, encontram-se os botões de ação:

#### **Inserir no Banco:**
- Processa as informações simuladas
- Permite que o usuário atualize a tabela de preços com os novos valores
- Confirma as alterações no sistema

#### **Exportar para Excel:**
- Exporta os dados da simulação para uma planilha Excel
- Permite análise detalhada dos dados em formato de planilha
- Facilita a criação de relatórios e apresentações

## Funcionalidades Principais

### 1. Simulação de Cenários
O sistema permite criar diferentes cenários de precificação, testando:
- Novos preços
- Novas margens de lucro
- Diferentes datas de vigência

### 2. Análise de Performance
Através dos dados de ticket médio, o sistema oferece insights sobre:
- Performance atual dos produtos
- Comparação com metas estabelecidas
- Análise histórica dos últimos 12 meses
- Análise por safra

### 3. Cálculos Automáticos
O sistema realiza cálculos automáticos para:
- Margens de lucro
- Preços com diferentes descontos
- Ponderação por volume de vendas
- Custos atualizados

### 4. Filtros Flexíveis
Os filtros permitem análises específicas por:
- Empresa ou filial
- Período de referência
- Marcas específicas
- Produtos individuais
- Parceiros específicos

## Benefícios do Sistema

### Para o Usuário:
- **Facilidade de Uso**: Interface intuitiva e organizada
- **Flexibilidade**: Múltiplas opções de filtros e simulações
- **Precisão**: Cálculos automáticos que reduzem erros
- **Eficiência**: Processamento em lote de alterações

### Para a Empresa:
- **Tomada de Decisão**: Análise detalhada antes de implementar mudanças
- **Controle**: Rastreamento de alterações e simulações
- **Relatórios**: Exportação de dados para análises externas
- **Padronização**: Processo uniforme de simulação de preços

## Considerações Técnicas

### Base de Dados:
O sistema utiliza consultas SQL complexas que:
- Agregam dados de vendas dos últimos 12 meses
- Calculam custos e preços atualizados
- Determinam ponderações por volume de vendas
- Processam informações de metas e objetivos

### Segurança:
- Controle de acesso por empresa
- Validação de dados de entrada
- Rastreamento de alterações

## Conclusão

O Sistema de Simulação de Preços é uma ferramenta essencial para empresas que precisam gerenciar estratégias de precificação de forma eficiente e segura. Através de sua interface intuitiva e funcionalidades robustas, permite que os usuários tomem decisões informadas sobre preços, sempre com base em dados históricos e metas estabelecidas.

A combinação de filtros flexíveis, cálculos automáticos e opções de exportação torna o sistema uma solução completa para o gerenciamento de preços, oferecendo tanto a flexibilidade necessária para análises detalhadas quanto a simplicidade para uso diário. 