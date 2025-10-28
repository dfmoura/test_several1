# Sistema de Orçamento - MitraLab.ID

## Visão Geral

Sistema desenvolvido para o MitraLab.ID utilizando MySQL como banco de dados.

## Fase de Implementação

### Pré-requisitos

Após a criação das tabelas, seguir com as regras de implementação.

### Etapas de Desenvolvimento

#### 1. Cadastros Base

- **CR e Contas**: Popular os cadastros com dados aleatórios e criar tela de CRUD completa
- **Aprovadores**: Popular o cadastro com dados aleatórios e criar tela de CRUD completa

#### 2. Gestão de Versões

1. Criar uma tela de CRUD completa para a versão
2. Lançar uma versão do orçamento com status = "andamento"

#### 3. Preparação para Lançamento do Orçamento

**Após lançar a versão:**

- **Ação de Preparação**: Preencher a tabela populando todas as contas para cada CR de 1 a 12 no mês com valores aleatórios
- **Tela de Preenchimento**:
  - Primeiras colunas: versão, CR, conta
  - Demais colunas: 1 a 12 com valores embaixo
  - Funcionalidades:
    - Download em CSV
    - Upload (botões discretos)
    - Scroll horizontal na tabela para aumentar os campos de CR e contas e acrescentar a versão

#### 4. Processo de Aprovação

**Lançamento pelos Usuários Responsáveis:**
O usuário responsável faz o lançamento dos valores do orçamento para cada CR e respectiva conta na versão.

**Finalização da Versão:**

- Se o usuário entender que está OK, poderá colocar na tabela `versao_orcamento` o campo `pronto = sim`
- A partir do momento que deixa `pronto = sim`, o sistema gera um lançamento inicial para cada aprovador cadastrado na tabela `fluxo_aprovacao_orcamento`
- Começando com `status_aprovacao = pendente`
- O usuário aprovador só poderá aprovar ou reprovar
- Se aprovado, não terá mais interação

**Fluxo de Correção:**

- Ficará esta pendência para ser resolvida
- Quando resolver, atualizará o status para "corrigido"
- No mesmo instante, o sistema gera um novo lançamento para o `fluxo_aprovacao_orcamento` com os dados:
  - `id_fluxo_aprovacao` (FK)
  - `id_versao_orcamento` (FK)
  - `id_aprovador` (FK)
- Começando novamente com `status_aprovacao = pendente`
- Repetindo o fluxo até quando for necessário

**Conclusão:**
Por fim, quando todos os aprovadores para aquela versão dos respectivos fluxos de aprovação estiverem todos com `status_aprovacao = aprovado`, o processo será concluído.

## Tecnologias Utilizadas

- **Banco de Dados**: MySQL
- **Desenvolvimento**: Sistema web com funcionalidades de CRUD

## Estrutura do Sistema

O sistema contempla:

- Gestão de CRs e Contas
- Gestão de Aprovadores
- Controle de Versões de Orçamento
- Fluxo de Aprovação com múltiplos níveis
- Interface para lançamento e correção de valores
- Exportação/Importação de dados em CSV
