# Sistema de Solicitações de Desenvolvimento

Sistema completo para gerenciamento de solicitações de atividades de desenvolvimento de sistemas, com controle de custos, prazos e aprovações.

## Funcionalidades

### 🔐 Autenticação e Cadastros
- **Login com empresa, usuário e senha**
- **Cadastro de empresas** com dados completos
- **Cadastro de usuários** associados a empresas
- **Tipos de usuário**: Solicitante e Executante

### 📋 Gestão de Solicitações
- **Criar solicitações** com título, descrição, prioridade e área
- **Editar solicitações** pendentes
- **Excluir solicitações** pendentes
- **Visualizar detalhes** completos das solicitações

### 💰 Controle de Custos e Prazos
- **Definir custo e prazo** pelos executantes
- **Aprovar/rejeitar** propostas pelos solicitantes
- **Acompanhar status** das solicitações

### 👥 Visões Diferenciadas
- **Solicitantes**: Gerenciam suas solicitações
- **Executantes**: Visualizam e executam solicitações aprovadas

## Estrutura do Projeto

```
72/
├── index.html          # Página principal do sistema
├── styles.css          # Estilos CSS responsivos
├── script.js           # Lógica JavaScript completa
├── README.md           # Documentação
└── como sera           # Especificações originais
```

## Como Usar

### 1. Acesso Inicial
1. Abra o arquivo `index.html` no navegador
2. O sistema iniciará na tela de login

### 2. Primeiro Acesso
1. **Cadastre uma empresa**:
   - Clique em "Cadastrar Empresa"
   - Preencha os dados da empresa
   - Clique em "Cadastrar"

2. **Cadastre um usuário**:
   - Clique em "Cadastrar Usuário"
   - Selecione a empresa
   - Preencha os dados do usuário
   - Escolha o tipo (Solicitante ou Executante)
   - Clique em "Cadastrar"

### 3. Login
1. Selecione a empresa
2. Digite o usuário e senha
3. Clique em "Entrar"

### 4. Usando o Sistema

#### Como Solicitante:
1. **Nova Solicitação**:
   - Clique em "Nova Solicitação"
   - Preencha título, descrição, prioridade e área
   - Clique em "Enviar Solicitação"

2. **Gerenciar Solicitações**:
   - Visualize suas solicitações em "Minhas Solicitações"
   - Clique em "Ver Detalhes" para ver propostas de custo/prazo
   - Aprove ou rejeite as propostas

#### Como Executante:
1. **Ver Solicitações Pendentes**:
   - Acesse "Minhas Solicitações"
   - Clique em "Ver Detalhes" nas solicitações pendentes
   - Defina custo e prazo

2. **Executar Solicitações**:
   - Acesse "Execução"
   - Visualize solicitações aprovadas
   - Clique em "Iniciar Execução"

## Dados de Exemplo

O sistema inclui dados de exemplo para teste:

### Empresas:
- **Empresa A**: contato@empresaa.com
- **Empresa B**: contato@empresab.com

### Usuários:
- **João Silva** (Empresa A, Solicitante): joao / 123456
- **Maria Santos** (Empresa A, Executante): maria / 123456
- **Pedro Costa** (Empresa B, Solicitante): pedro / 123456

### Solicitações de Exemplo:
- Sistema de Gestão de Vendas (pendente)
- App Mobile para Clientes (aprovada)

## Status das Solicitações

- **Pendente**: Aguardando definição de custo/prazo
- **Aprovada**: Custo e prazo aprovados pelo solicitante
- **Em Execução**: Trabalho iniciado pelo executante
- **Concluída**: Trabalho finalizado
- **Rejeitada**: Proposta rejeitada pelo solicitante

## Prioridades

- **Baixa**: Verde
- **Média**: Amarelo
- **Alta**: Vermelho claro
- **Urgente**: Vermelho escuro

## Tecnologias Utilizadas

- **HTML5**: Estrutura semântica
- **CSS3**: Estilos modernos e responsivos
- **JavaScript ES6+**: Lógica completa do sistema
- **LocalStorage**: Persistência temporária de dados

## Integração com PostgreSQL

O sistema está preparado para integração com PostgreSQL. As funções de conexão estão comentadas no código:

```javascript
// Configuração do banco
const DB_CONFIG = {
    host: 'localhost',
    port: 5432,
    database: 'sistema_solicitacoes',
    user: 'postgres',
    password: 'postgres'
};
```

### Para implementar a integração:

1. **Instalar dependências**:
   ```bash
   npm install pg
   ```

2. **Criar banco de dados**:
   ```sql
   CREATE DATABASE sistema_solicitacoes;
   ```

3. **Criar tabelas**:
   ```sql
   CREATE TABLE empresas (
       id SERIAL PRIMARY KEY,
       nome VARCHAR(255) NOT NULL,
       cnpj VARCHAR(18) UNIQUE NOT NULL,
       email VARCHAR(255) NOT NULL,
       telefone VARCHAR(20) NOT NULL
   );

   CREATE TABLE usuarios (
       id SERIAL PRIMARY KEY,
       empresa_id INTEGER REFERENCES empresas(id),
       nome VARCHAR(255) NOT NULL,
       email VARCHAR(255) NOT NULL,
       login VARCHAR(50) UNIQUE NOT NULL,
       senha VARCHAR(255) NOT NULL,
       tipo VARCHAR(20) NOT NULL
   );

   CREATE TABLE solicitacoes (
       id SERIAL PRIMARY KEY,
       titulo VARCHAR(255) NOT NULL,
       descricao TEXT NOT NULL,
       prioridade VARCHAR(20) NOT NULL,
       area VARCHAR(100) NOT NULL,
       solicitante_id INTEGER REFERENCES usuarios(id),
       data_criacao TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
       status VARCHAR(20) DEFAULT 'pendente',
       custo DECIMAL(10,2),
       prazo INTEGER
   );
   ```

## Responsividade

O sistema é totalmente responsivo e funciona em:
- Desktop (1024px+)
- Tablet (768px - 1023px)
- Mobile (até 767px)

## Segurança

- Senhas são armazenadas em texto simples (em produção, usar hash)
- Autenticação baseada em localStorage (em produção, usar JWT)
- Validação de formulários no frontend

## Melhorias Futuras

1. **Backend Node.js** com Express
2. **Autenticação JWT**
3. **Hash de senhas** com bcrypt
4. **Upload de arquivos** para anexos
5. **Notificações** em tempo real
6. **Relatórios** e dashboards
7. **API REST** completa
8. **Testes automatizados**

## Suporte

Para dúvidas ou problemas, verifique:
1. Console do navegador (F12) para erros
2. Dados no localStorage
3. Configuração do PostgreSQL (se implementado)

---

**Desenvolvido com ❤️ para gerenciamento eficiente de solicitações de desenvolvimento** 