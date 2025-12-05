# Análise dos Processos Java e Banco de Dados para Iniciar Produção

**Data da Análise:** 2025-01-11  
**Fonte:** Logs de Monitoramento (Monitor_Consulta.log, Monitor_Processos.log, server.log)

## 1. RESUMO EXECUTIVO

Esta análise identifica os processos Java e operações de banco de dados executados durante a inicialização da produção no sistema Sankhya MGE. Os logs foram analisados de forma criteriosa para mapear o fluxo completo de execução, desde a requisição HTTP até as operações no banco Oracle.

## 2. ARQUITETURA JAVA

### 2.1 Classes Principais Identificadas

#### 2.1.1 OperacaoProducaoSPBean

- **Pacote:** `br.com.sankhya.mgeprod.model.services`
- **Método Principal:** `iniciarInstanciaAtividades(OperacaoProducaoSPBean.java:212)`
- **Função:** Bean de serviço que coordena a inicialização das atividades de produção
- **Ponto de Entrada:** Linha 212 - método principal que inicia o processo
- **Fluxo de Execução:** Linha 228 - processamento iterativo das atividades

#### 2.1.2 OperacaoProducaoHelper

- **Pacote:** `br.com.sankhya.mgeprod.model.helper`
- **Métodos Críticos:**
  - `iniciarInstanciaAtividade(OperacaoProducaoHelper.java:175)` - Método principal
  - `validaExecutanteAtividade(OperacaoProducaoHelper.java:895)` - Validação de executante
  - `validaDisponibilidadeWorkCenter(OperacaoProducaoHelper.java:733)` - Validação de Work Center
  - `aceitarInstanciaAtividade(OperacaoProducaoHelper.java:111)` - Aceitação de atividade
  - `isManagerManufatura(OperacaoProducaoHelper.java:996)` - Verificação de permissões

### 2.2 Fluxo de Execução Java

```
1. Requisição HTTP → HttpServiceBroker.doPost()
2. ServiceWrapperHandler.handle() → Deserialização
3. OperacaoProducaoSPBean.iniciarInstanciaAtividades()
   ├─ Linha 212: Inicialização da sessão JDBC
   ├─ Linha 228: Loop de processamento de atividades
   └─ Para cada atividade:
      ├─ OperacaoProducaoHelper.iniciarInstanciaAtividade() (linha 175)
      │  ├─ validaExecutanteAtividade() (linhas 895, 899, 903, 984)
      │  ├─ isManagerManufatura() (linhas 996, 1011)
      │  ├─ validaDisponibilidadeWorkCenter() (linha 733)
      │  └─ aceitarInstanciaAtividade() (linhas 111, 118)
      └─ Operações no banco de dados
```

### 2.3 Camadas de Infraestrutura

- **Conexão JDBC:** `br.com.sankhya.jape.core.JapeSession.openJDBCConnection()`
- **Entity Container:** `br.com.sankhya.jape.ejbcontainer.EntityContainer.executeWithRecovery()`
- **DAO:** `br.com.sankhya.jape.dao.EntityDAO.findEntity()`
- **Proxy Connection:** `br.com.sankhya.jape.dao.ConnectionProxy`
- **Logging SQL:** `br.com.sankhya.jape.dao.JDBCSpy.logSql()`

## 3. OPERAÇÕES DE BANCO DE DADOS

### 3.1 Tabelas Principais

#### 3.1.1 TPRIPROC - Instância de Processo

**Propósito:** Armazena informações da instância do processo de produção

**Query Principal Identificada:**

```sql
SELECT TPRIPROC.*,
       (SELECT SUM(ESTOQUE-RESERVADO) FROM TGFEST
        WHERE CONTROLE = TPRIPROC.NROLOTE
        AND CODPROD = (SELECT CODPRODPA FROM TPRIPA WHERE IDIPROC = TPRIPROC.IDIPROC)
        AND CODEMP = TPRIPROC.CODPLP) AS AD_ESTOQUE,
       (SELECT IDIPROCPI FROM TPRIDEP WHERE IDIPROCPA = TPRIPROC.IDIPROC) AS AD_IDIPROCPI
FROM TPRIPROC
WHERE TPRIPROC.IDIPROC = ?
```

**Campos Relevantes:**

- `IDIPROC` - Identificador da instância
- `IDPROC` - Identificador do processo
- `STATUSPROC` - Status do processo
- `NROLOTE` - Número do lote
- `DHINST` - Data/hora de instanciação
- `DHTERMINO` - Data/hora de término

#### 3.1.2 TPRIPA - Instância de Produto Acabado

**Propósito:** Armazena produtos acabados associados à instância de processo

**Query Principal Identificada:**

```sql
SELECT TPRIPA.*,
       (SELECT REFERENCIA FROM TGFPRO WHERE CODPROD = TPRIPA.CODPRODPA) AS REFERENCIA,
       (TPRIPA.QTDPRODUZIR - NVL(SUM(NOTA.QTDNEG), 0) -
        (SELECT NVL(SUM(APA.QTDPERDA), 0)
         FROM TPRAPA APA
         INNER JOIN TPRAPO APO ON(APO.NUAPO = APA.NUAPO)
         WHERE APA.CODPRODPA = TPRIPA.CODPRODPA
           AND NVL(APA.CONTROLEPA, ' ') = TPRIPA.CONTROLEPA
           AND APO.IDIATV IN (SELECT IDIATV FROM TPRIATV WHERE IDIPROC = TPRIPA.IDIPROC)
        )) AS SALDOOP
FROM TPRIPA
WHERE TPRIPA.IDIPROC = ?
```

**Campos Relevantes:**

- `IDIPROC` - FK para TPRIPROC
- `CODPRODPA` - Código do produto acabado
- `QTDPRODUZIR` - Quantidade a produzir
- `CONTROLEPA` - Controle do produto acabado
- `NROLOTE` - Número do lote

#### 3.1.3 TPRAPO - Apontamento

**Propósito:** Registra apontamentos de atividades de produção

**Query Principal Identificada:**

```sql
SELECT TPRAPO.CODUSU, TPRAPO.DHAPO, TPRAPO.IDIATV, TPRAPO.NUAPO,
       TPRAPO.OBSERVACAO, TPRAPO.SITUACAO,
       Usuario.NOMEUSU
FROM TPRAPO
LEFT JOIN (SELECT CODUSU, NOMEUSU FROM TSIUSU) Usuario
  ON(TPRAPO.CODUSU = Usuario.CODUSU)
WHERE TPRAPO.IDIATV = ?
```

**Campos Relevantes:**

- `NUAPO` - Número do apontamento
- `IDIATV` - FK para atividade
- `CODUSU` - Código do usuário
- `DHAPO` - Data/hora do apontamento
- `SITUACAO` - Situação do apontamento

#### 3.1.4 TPRAPA - Apontamento de Produto Acabado

**Propósito:** Relaciona apontamentos com produtos acabados

**Query de Validação Identificada:**

```sql
SELECT 1
FROM TPRAPA PA
WHERE PA.QTDAPONTADA = 0
  AND PA.NUAPO = ?
```

#### 3.1.5 TPRROPE - Roteiro de Operação

**Propósito:** Vincula notas fiscais com processos de produção

**Uso em JOINs:**

```sql
INNER JOIN TPRROPE ROPE ON (ROPE.NUNOTA = CAB.NUNOTA)
```

### 3.2 Queries de Suporte

#### 3.2.1 Consulta de Parâmetros do Sistema

```sql
SELECT TSIPAR.*
FROM TSIPAR
WHERE TSIPAR.CHAVE = ? AND TSIPAR.CODUSU = ?
```

**Parâmetros consultados:**

- `MAXROWEXECQUERY` - Limite de linhas em queries
- `APRES.TPRIPROC` - Apresentação da tabela TPRIPROC
- `DESABPAGINA` - Desabilitação de página
- `EVITJOINTELA` - Evitar join na tela

#### 3.2.2 Consulta de Usuário

```sql
SELECT TSIUSU.*
FROM TSIUSU
WHERE TSIUSU.CODUSU = ?
```

**Propósito:** Validação de permissões e dados do usuário que inicia a produção

#### 3.2.3 Consulta de Formulários

```sql
SELECT FORMU.CARDINALIDADE, FORMU.DESCRICAO, FORMULARIO.NOMEINSTANCIA,
       FRME.TIPOACESSO, FORMU.ESCOPO, FORMU.TIPOFORM
FROM TPRFORM FORMU
INNER JOIN (SELECT NOMEINSTANCIA, TIPOFORM FROM TDDINS INS
            WHERE TIPOFORM IS NOT NULL) FORMULARIO
  ON (FORMULARIO.NOMEINSTANCIA = FORMU.NOMEINSTANCIAREF)
INNER JOIN TPRFRME FRME ON (FORMU.IDFORM = FRME.IDFORM)
LEFT JOIN TPRFPA FPA ON (FORMU.IDFORM = FPA.IDFORM AND FORMU.IDPROC = FPA.IDPROC)
WHERE FORMU.IDPROC = ?
  AND FRME.IDEFX = ?
  AND (FPA.CODPRODPA IS NULL OR FPA.CODPRODPA = ?)
  AND (NVL(FPA.CONTROLEPA, ' ') = ' ' OR FPA.CONTROLEPA = ' ')
ORDER BY FRME.ORDEM
```

## 4. PROCESSO DE VALIDAÇÃO

### 4.1 Validações Java Executadas

1. **Validação de Executante (linhas 895, 899, 903, 984)**

   - Verifica se o usuário tem permissão para executar a atividade
   - Consulta perfil de usuário e permissões

2. **Validação de Manager Manufatura (linhas 996, 1011)**

   - Verifica se o usuário é gestor de manufatura
   - Permite bypass de algumas validações

3. **Validação de Disponibilidade de Work Center (linha 733)**

   - Verifica disponibilidade do centro de trabalho
   - Valida capacidade e recursos

4. **Aceitação de Instância de Atividade (linhas 111, 118)**
   - Processa aceitação da atividade antes de iniciar
   - Registra dados do usuário responsável

### 4.2 Validações de Banco de Dados

1. **Verificação de Apontamentos com QtdApontada = 0**

   ```sql
   SELECT 1 FROM TPRAPA PA
   WHERE PA.QTDAPONTADA = 0 AND PA.NUAPO = ?
   ```

2. **Cálculo de Saldo de Ordem de Produção**

   - Considera quantidade produzida
   - Subtrai perdas
   - Subtrai quantidades já baixadas em notas fiscais

3. **Verificação de Estoque**
   - Consulta estoque disponível (estoque - reservado)
   - Vinculado ao lote e produto acabado

## 5. FLUXO COMPLETO DE INICIALIZAÇÃO

### 5.1 Fase 1: Preparação

1. Requisição HTTP recebida via `/mge/service.sbr`
2. Deserialização do serviço `ExecQuerySP.execQuery` ou `OperacaoProducaoSPBean.iniciarInstanciaAtividades`
3. Abertura de sessão JDBC
4. Configuração de contexto de usuário (`Stp_Set_Session2`)

### 5.2 Fase 2: Validação Inicial

1. Consulta de parâmetros do sistema (TSIPAR)
2. Consulta de dados do usuário (TSIUSU)
3. Consulta de instância de processo (TPRIPROC)
4. Consulta de produtos acabados (TPRIPA)
5. Validação de permissões e regras de negócio

### 5.3 Fase 3: Processamento de Atividades

Para cada atividade:

1. Validação de executante
2. Validação de disponibilidade de Work Center
3. Aceitação de atividade (se necessário)
4. Inicialização da atividade
5. Atualização de status no banco

### 5.4 Fase 4: Finalização

1. Commit de transações
2. Retorno de resultado ao cliente
3. Logging de operações

## 6. PERFORMANCE E OTIMIZAÇÕES

### 6.1 Tempos Identificados

- **Stp_Set_Session2:** 1-2 ms
- **Queries simples (TSIPAR, TSIUSU):** 1-2 ms
- **Queries complexas (TPRIPROC, TPRIPA):** 2-6 ms
- **Processamento completo:** Dependente do número de atividades

### 6.2 Pontos de Atenção

1. Queries com múltiplos JOINs podem impactar performance
2. Subconsultas aninhadas em TPRIPA calculando saldo
3. Validações iterativas por atividade podem ser otimizadas

## 7. CONCLUSÕES

### 7.1 Processos Java

- O sistema utiliza uma arquitetura em camadas bem definida
- Separação clara entre serviços (SPBean) e helpers
- Validações robustas em múltiplos níveis
- Tratamento de erros com recovery automático

### 7.2 Operações de Banco

- Uso extensivo de tabelas específicas de produção (TPR\*)
- Consultas otimizadas com índices apropriados
- Cálculos complexos de saldo e estoque
- Integração com tabelas de sistema (TSI*) e produção (TGF*)

### 7.3 Recomendações

1. Monitorar performance das queries com JOINs complexos
2. Considerar cache para parâmetros do sistema (TSIPAR)
3. Implementar logging estruturado para facilitar análise
4. Avaliar índices nas tabelas TPR\* para otimização

---

**Documento gerado a partir da análise dos logs:**

- Monitor_Consulta.log (14.368 linhas)
- Monitor_Processos.log (95.061 linhas)
- server.log (13.907 linhas)
