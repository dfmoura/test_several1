# Documentação do Projeto - Observação de Bem (Sankhya)

## Visão Geral

Este projeto implementa uma funcionalidade para atualizar observações em registros da tabela `TCIBEM` do Sankhya, utilizando um botão de ação personalizado desenvolvido em Java 8. O módulo permite selecionar um registro específico na tela e adicionar uma observação através de um parâmetro configurável.

## Estrutura do Projeto

```
Modulos_jar_sankhya/
├── src/
│   └── br/com/triggerint/
│       └── ObservacaoBem1BT.java    # Classe principal do botão de ação
├── out/
│   ├── artifacts/
│   │   └── ObservacaoBem/
│   │       └── ObservacaoBem.jar    # JAR compilado
│   └── production/
│       └── Modulos_jar_sankhya/
│           └── br/com/triggerint/
│               └── ObservacaoBem1BT.class
└── DOCUMENTACAO_PROJETO.md          # Esta documentação
```

## Funcionalidade Principal

### Objetivo
Permitir que o usuário selecione um registro na tela `TCIBEM` e adicione uma observação através de um botão de ação, atualizando o campo `AD_OBSERVACAO` na base de dados.

### Fluxo de Execução

1. **Validação de Seleção**: Verifica se exatamente um registro foi selecionado
2. **Extração de Chaves**: Obtém as chaves primárias (`CODBEM` e `CODPROD`) do registro
3. **Validação de Parâmetros**: Confirma se o parâmetro `P_OBSERVACAO` foi fornecido
4. **Verificação de Existência**: Confirma se o registro existe na base de dados
5. **Atualização**: Executa o UPDATE no campo `AD_OBSERVACAO`
6. **Feedback**: Exibe mensagem de sucesso ou erro para o usuário

## Classes e Métodos Nativos do Sankhya Utilizados

### 1. Interface AcaoRotinaJava
```java
import br.com.sankhya.extensions.actionbutton.AcaoRotinaJava;
```
- **Propósito**: Interface obrigatória para implementar botões de ação personalizados
- **Método Principal**: `doAction(ContextoAcao contexto)`

### 2. Classe ContextoAcao
```java
import br.com.sankhya.extensions.actionbutton.ContextoAcao;
```
- **Propósito**: Fornece acesso ao contexto da ação executada
- **Métodos Utilizados**:
  - `getLinhas()`: Retorna array de registros selecionados
  - `getParam(String nome)`: Obtém parâmetros configurados
  - `mostraErro(String mensagem)`: Exibe mensagem de erro
  - `setMensagemRetorno(String mensagem)`: Define mensagem de sucesso
  - `getQuery()`: Obtém instância do QueryExecutor

### 3. Classe QueryExecutor
```java
import br.com.sankhya.extensions.actionbutton.QueryExecutor;
```
- **Propósito**: Executa queries SQL de forma segura e parametrizada
- **Métodos Utilizados**:
  - `setParam(String nome, Object valor)`: Define parâmetros para a query
  - `nativeSelect(String sql)`: Executa SELECT nativo
  - `update(String sql)`: Executa UPDATE
  - `next()`: Navega para o próximo resultado
  - `getInt(String campo)`: Obtém valor inteiro do resultado
  - `close()`: Fecha o executor

### 4. Classe Registro
```java
import br.com.sankhya.extensions.actionbutton.Registro;
```
- **Propósito**: Representa um registro da grid/tabela
- **Métodos Utilizados**:
  - `getCampo(String nome)`: Obtém valor de um campo específico

### 5. Classe StringUtils
```java
import com.sankhya.util.StringUtils;
```
- **Propósito**: Utilitários para manipulação de strings
- **Métodos Utilizados**:
  - `isEmpty(String str)`: Verifica se a string é nula ou vazia

## Detalhamento do Código

### Validações Implementadas

#### 1. Validação de Registros Selecionados
```java
Registro[] linhas = contexto.getLinhas();
if (linhas.length == 0) {
    contexto.mostraErro("Nenhum registro foi selecionado na tabela TCIBEM.");
    return;
}
if (linhas.length > 1) {
    contexto.mostraErro("Apenas um registro deve ser selecionado. Registros selecionados: " + linhas.length);
    return;
}
```

#### 2. Validação de Chaves Primárias
```java
String codBem = (String) registroSelecionado.getCampo("CODBEM");
Object codProdObj = registroSelecionado.getCampo("CODPROD");

if (StringUtils.isEmpty(codBem)) {
    contexto.mostraErro("Campo CODBEM não encontrado ou vazio no registro selecionado.");
    return;
}
```

#### 3. Validação de Parâmetros
```java
String observacao = (String) contexto.getParam("P_OBSERVACAO");
if (StringUtils.isEmpty(observacao)) {
    contexto.mostraErro("O parâmetro 'P_OBSERVACAO' é obrigatório e não pode estar vazio.");
    return;
}
```

### Execução da Query

#### 1. Verificação de Existência
```java
query.nativeSelect("SELECT COUNT(*) AS TOTAL FROM TCIBEM WHERE CODBEM = {CODBEM_CHECK} AND CODPROD = {CODPROD_CHECK}");
```

#### 2. Atualização do Registro
```java
query.update("UPDATE TCIBEM SET AD_OBSERVACAO = {OBSERVACAO} WHERE CODBEM = {CODBEM} AND CODPROD = {CODPROD}");
```

## Configuração no Sankhya

### 1. Criação do Botão de Ação

1. Acesse o Sankhya como administrador
2. Vá em **Configurações** → **Botões de Ação**
3. Clique em **Novo**
4. Configure os seguintes campos:
   - **Nome**: `ObservacaoBem1BT`
   - **Descrição**: `Atualizar Observação de Bem`
   - **Classe Java**: `br.com.triggerint.ObservacaoBem1BT`
   - **Parâmetros**: `P_OBSERVACAO`

### 2. Configuração do Parâmetro

- **Nome do Parâmetro**: `P_OBSERVACAO`
- **Tipo**: String
- **Obrigatório**: Sim
- **Descrição**: Observação a ser adicionada ao registro

### 3. Associação à Tela

1. Acesse a tela `TCIBEM` (Cadastro de Bens)
2. Clique com botão direito na grid
3. Selecione **Configurar Botões**
4. Adicione o botão `ObservacaoBem1BT`

## Exemplo de Uso

### Cenário
Usuário precisa adicionar a observação "Bem em processo de transferência" para um bem específico.

### Passos
1. Na tela de cadastro de bens (`TCIBEM`), localize o registro desejado
2. Selecione **apenas um registro** clicando na linha correspondente
3. Clique no botão de ação configurado
4. Na janela de parâmetros, digite: `Bem em processo de transferência`
5. Clique em **OK**

### Resultado Esperado
- Mensagem de sucesso será exibida
- Campo `AD_OBSERVACAO` será atualizado na base de dados
- Log será registrado no console do Sankhya

## Tratamento de Erros

### Tipos de Erro Tratados

1. **Nenhum registro selecionado**
2. **Múltiplos registros selecionados**
3. **Chaves primárias ausentes ou inválidas**
4. **Parâmetro de observação não fornecido**
5. **Registro não encontrado na base de dados**
6. **Múltiplos registros com as mesmas chaves**
7. **Erros de execução SQL**

### Logs de Debug

O sistema registra logs detalhados para facilitar a depuração:
```java
System.out.println("br.com.triggerint.ObservacaoBem1BT - INICIO");
System.out.println("Observação atualizada - CODBEM: " + codBem + ", CODPROD: " + codProdObj);
System.out.println("br.com.triggerint.ObservacaoBem1BT - FIM");
```

## Considerações Técnicas

### Compatibilidade
- **Java**: Versão 8 ou superior
- **Sankhya**: Versões que suportam botões de ação Java
- **Base de Dados**: Oracle, SQL Server, PostgreSQL (conforme configuração do Sankhya)

### Performance
- Utiliza `QueryExecutor` para execução otimizada de queries
- Implementa verificação de existência antes da atualização
- Fecha recursos adequadamente no bloco `finally`

### Segurança
- Utiliza parâmetros nomeados para evitar SQL Injection
- Valida todas as entradas antes do processamento
- Implementa transações implícitas do Sankhya

## Estrutura da Tabela TCIBEM

### Campos Utilizados
- `CODBEM`: Código do bem (chave primária)
- `CODPROD`: Código do produto (chave primária)
- `AD_OBSERVACAO`: Campo de observação personalizado (atualizado pelo sistema)

### Relacionamentos
- A tabela `TCIBEM` está relacionada com a tabela de produtos
- As chaves primárias composta (`CODBEM`, `CODPROD`) garantem unicidade

## Extensões Possíveis

### Funcionalidades Adicionais
1. **Histórico de Observações**: Criar tabela para rastrear mudanças
2. **Validação de Permissões**: Verificar se usuário pode alterar observações
3. **Formatação de Texto**: Suporte a formatação HTML ou Markdown
4. **Anexos**: Possibilidade de anexar arquivos às observações
5. **Notificações**: Alertar usuários sobre mudanças em observações

### Melhorias Técnicas
1. **Cache de Validações**: Implementar cache para verificações frequentes
2. **Batch Updates**: Suporte para atualização de múltiplos registros
3. **Templates**: Sistema de templates para observações padrão
4. **Auditoria**: Log detalhado de todas as alterações

## Conclusão

Este projeto demonstra como utilizar as APIs nativas do Sankhya para criar funcionalidades personalizadas de forma segura e eficiente. A implementação segue as melhores práticas de desenvolvimento Java e integração com o Sankhya, proporcionando uma base sólida para extensões futuras.

A solução é robusta, com tratamento adequado de erros e validações, garantindo a integridade dos dados e uma boa experiência do usuário.
