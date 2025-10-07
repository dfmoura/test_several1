# Oracle Query App

Sistema Java 17 (Spring Boot) para salvar e executar queries Oracle com interface web dinâmica.

## Funcionalidades

- **Cadastro de Conexões**: Salve configurações de acesso ao Oracle (host, porta, SID/Service Name, usuário, senha)
- **Salvamento de Queries**: Armazene queries SQL para reutilização
- **Execução Dinâmica**: Execute queries salvas ou SQL customizado
- **Resultados com Filtros**: Visualize resultados em tabela com DataTables (busca, ordenação, paginação)

## Como Acessar

### 1. Iniciar a Aplicação
```bash
cd /home/diogo/Documents/Git/test_several1/java/42/oracle-query-app
mvn spring-boot:run
```

### 2. Acessar no Navegador
- **Home**: http://localhost:8081/
- **Conexões**: http://localhost:8081/connections
- **Queries**: http://localhost:8081/queries  
- **Executar**: http://localhost:8081/run

## Passo a Passo de Uso

### 1. Cadastrar Conexão Oracle
1. Acesse **Conexões** no menu
2. Preencha o formulário:
   - **Nome**: Nome amigável (ex: "Oracle XE Local")
   - **Host**: localhost (para seu container)
   - **Porta**: 1521
   - **Tipo**: SERVICE_NAME (recomendado) ou SID
   - **Service Name/SID**: XEPDB1 (ou XE se usar SID)
   - **Usuário**: system (ou outro usuário do seu container)
   - **Senha**: senha do usuário
3. Clique em **Salvar**

### 2. Salvar Queries
1. Acesse **Queries** no menu
2. Preencha:
   - **Nome**: Nome da query (ex: "Listar usuários")
   - **Descrição**: Descrição opcional
   - **SQL**: Sua query SQL
3. Clique em **Salvar**

### 3. Executar Queries
1. Acesse **Executar** no menu
2. Selecione a **Conexão** cadastrada
3. Escolha uma opção:
   - **Query salva**: Selecione uma query da lista
   - **SQL customizado**: Digite SQL diretamente
4. Clique em **Executar**
5. Os resultados aparecerão em tabela com filtros automáticos

## Configuração para seu Container Oracle

Para o container `oracle-xe-sankhya` que você tem rodando:

- **Host**: localhost
- **Porta**: 1521  
- **Tipo**: SERVICE_NAME
- **Service Name**: XEPDB1 (padrão do Oracle XE 21c)
- **Usuário/Senha**: Use as credenciais que você configurou no container

## Exemplos de Queries

```sql
-- Teste básico
SELECT * FROM dual;

-- Listar tabelas do usuário
SELECT table_name FROM user_tables;

-- Informações do banco
SELECT * FROM v$version;

-- Listar usuários
SELECT username FROM all_users;
```

## Tecnologias

- **Backend**: Java 17, Spring Boot 3.3.3, Spring Data JPA, H2 Database
- **Frontend**: Thymeleaf, Bootstrap 5, DataTables, jQuery
- **Oracle**: JDBC Oracle (ojdbc11)
- **Porta**: 8081

## Estrutura do Projeto

```
src/main/java/br/com/diogo/oraclequeryapp/
├── model/           # Entidades JPA
├── repository/      # Repositórios Spring Data
├── service/         # Serviços de negócio
├── web/            # Controladores MVC
└── OracleQueryAppApplication.java
```

## Banco de Dados Interno

O app usa H2 (arquivo) para armazenar:
- Configurações de conexão Oracle
- Queries salvas
- Localização: `./data/oracle-query-app.mv.db`
