# Conversão de Oracle para SQL Server

Este documento contém as conversões dos arquivos SQL de Oracle para SQL Server, realizadas para o projeto de relatórios financeiros.

## Arquivos Convertidos

### 1. FC_FORMATAHTML_NEUON_SQLSERVER.sql
- **Original**: `teste2.sql` (função Oracle)
- **Conversões realizadas**:
  - `CREATE OR REPLACE FUNCTION` → `CREATE OR ALTER FUNCTION`
  - `VARCHAR2` → `VARCHAR`
  - `RETURN` → `RETURNS`
  - `||` (concatenação) → `+`
  - Sintaxe de parâmetros: `P_MENSAGEM VARCHAR2` → `@P_MENSAGEM VARCHAR(4000)`
  - Variáveis: `P_TEXTO VARCHAR2(4000)` → `@P_TEXTO VARCHAR(4000)`

### 2. sql_teste_SQLSERVER.sql
- **Original**: `sql_teste.sql` (consulta principal)
- **Conversões realizadas**:
  - Adicionados comentários em português para melhor compreensão
  - Mantida compatibilidade com SQL Server
  - Estrutura de UNION ALL preservada
  - Funções `ISNULL()`, `CAST()`, `LTRIM()`, `RTRIM()` mantidas (compatíveis)

### 3. quadrante1_SQLSERVER.sql
- **Original**: `quadrante1.sql`
- **Conversões realizadas**:
  - Substituição de vírgulas por `CROSS JOIN` explícitos
  - Adicionados comentários em português
  - Mantida estrutura de subconsultas e UNION ALL

### 4. teste3_SQLSERVER.sql
- **Original**: `teste3.sql`
- **Conversões realizadas**:
  - Adicionado `WITH (NOLOCK)` em todos os JOINs para melhor performance
  - Comentários em português adicionados
  - Estrutura de múltiplos LEFT JOINs preservada

## Principais Diferenças Oracle vs SQL Server

### Sintaxe de Funções
| Oracle | SQL Server |
|--------|------------|
| `CREATE OR REPLACE FUNCTION` | `CREATE OR ALTER FUNCTION` |
| `VARCHAR2(n)` | `VARCHAR(n)` ou `NVARCHAR(n)` |
| `RETURN tipo` | `RETURNS tipo` |
| `||` (concatenação) | `+` ou `CONCAT()` |

### Parâmetros e Variáveis
| Oracle | SQL Server |
|--------|------------|
| `P_NOME VARCHAR2` | `@P_NOME VARCHAR` |
| `V_NOME VARCHAR2` | `@V_NOME VARCHAR` |

### JOINs
| Oracle | SQL Server |
|--------|------------|
| `FROM A, B WHERE A.id = B.id` | `FROM A INNER JOIN B ON A.id = B.id` |
| `FROM A, B` (produto cartesiano) | `FROM A CROSS JOIN B` |

### Performance
- SQL Server: Adicionado `WITH (NOLOCK)` para leitura não bloqueante
- Oracle: Usar `/*+ NOLOGGING */` ou `/*+ PARALLEL */` para otimização

## Comandos para Execução

### 1. Criar a função
```sql
-- Executar primeiro
\i FC_FORMATAHTML_NEUON_SQLSERVER.sql
```

### 2. Executar consultas
```sql
-- Consulta principal
\i sql_teste_SQLSERVER.sql

-- Quadrante 1
\i quadrante1_SQLSERVER.sql

-- Consulta de títulos
\i teste3_SQLSERVER.sql
```

## Observações Importantes

1. **Parâmetros**: Substitua os valores hardcoded pelos parâmetros do JasperReports:
   - `'01/07/2025'` → `$P{DTREFERENCIA}`
   - `'1'` → `$P{CODEMP}`
   - `'500823'` → `$P{CODCTACTB}`

2. **Performance**: As consultas foram otimizadas para SQL Server com `WITH (NOLOCK)`

3. **Compatibilidade**: Todas as funções utilizadas são compatíveis entre Oracle e SQL Server

4. **Comentários**: Adicionados comentários em português conforme preferência do usuário

## Testes Recomendados

1. Testar a criação da função `FC_FORMATAHTML_NEUON`
2. Executar cada consulta individualmente
3. Verificar performance com `SET STATISTICS IO ON`
4. Validar resultados comparando com versão Oracle original
