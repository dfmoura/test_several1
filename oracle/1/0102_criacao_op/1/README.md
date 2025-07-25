# Sistema de Cadastro de Ordem de Produção

## Visão Geral

Este projeto implementa uma tela completa de cadastro de Ordem de Produção (OP) com interface moderna e responsiva, baseada na estrutura do sistema Sankhya analisada no arquivo `teste.txt`.

## Características Principais

### 🎨 Interface Moderna
- Design responsivo com Bootstrap 5
- Animações suaves e transições elegantes
- Layout em cards com gradientes modernos
- Ícones Font Awesome para melhor UX

### 📋 Funcionalidades Implementadas

#### Campos Principais
- **Tipo de OP**: Produção, Desmonte, Reprocessamento, etc.
- **Produto Acabado**: Código e descrição do produto
- **Quantidade a Produzir**: Campo numérico com validação
- **Processo Produtivo**: Integração com processos existentes
- **Planta**: Seleção da planta de produção
- **Prioridade**: Níveis de prioridade da OP
- **Parceiro**: Para OPs de terceiros

#### Abas Organizadas
1. **Geral**: Informações básicas da OP
2. **Produtos**: Gestão de produtos da OP
3. **Atividades**: Controle de atividades/operações
4. **Materiais**: Gestão de materiais necessários
5. **Planejamento**: Datas e tempos previstos

#### Controles de Status
- **Não Iniciada** (padrão)
- **Em Andamento**
- **Finalizada**
- **Suspensa**
- **Cancelada**

### 🔧 Funcionalidades Avançadas

#### Validação em Tempo Real
- Campos obrigatórios destacados
- Validação de quantidade positiva
- Feedback visual imediato

#### Auto-save
- Salvamento automático a cada 30 segundos
- Armazenamento local para recuperação

#### Gestão de Dados
- Adição/remoção de produtos
- Controle de atividades
- Gestão de materiais
- Histórico de alterações

#### Responsividade
- Layout adaptável para mobile
- Navegação otimizada para touch
- Modais responsivos

## Estrutura de Arquivos

```
0102_criacao_op/
├── cadastro_ordem_producao.html    # Tela principal
├── cadastro_ordem_producao.js      # Lógica JavaScript
├── cadastro_ordem_producao.css     # Estilos adicionais
├── README.md                       # Documentação
└── teste.txt                       # Código fonte de referência
```

## Tecnologias Utilizadas

### Frontend
- **HTML5**: Estrutura semântica
- **CSS3**: Estilos modernos com variáveis CSS
- **JavaScript ES6+**: Lógica de negócio
- **Bootstrap 5**: Framework CSS responsivo
- **Font Awesome**: Ícones

### Recursos Especiais
- **Animações CSS**: Transições suaves
- **Validação**: Campos obrigatórios e formatos
- **Local Storage**: Persistência de dados
- **Modais**: Interface para adicionar itens

## Como Usar

### 1. Abrir a Tela
```bash
# Abrir o arquivo HTML no navegador
open cadastro_ordem_producao.html
```

### 2. Preencher Dados Básicos
1. Selecionar o **Tipo de OP**
2. Informar o **Produto Acabado**
3. Definir a **Quantidade a Produzir**
4. Escolher a **Prioridade**

### 3. Adicionar Produtos
1. Ir para aba **Produtos**
2. Clicar em **"Adicionar Produto"**
3. Preencher código, descrição e quantidade
4. Confirmar

### 4. Configurar Atividades
1. Ir para aba **Atividades**
2. Clicar em **"Adicionar Atividade"**
3. Definir sequência, atividade e centro de trabalho
4. Confirmar

### 5. Gerenciar Materiais
1. Ir para aba **Materiais**
2. Clicar em **"Adicionar Material"**
3. Informar código, descrição e quantidade necessária
4. Confirmar

### 6. Salvar OP
- Clicar em **"Salvar"** para persistir os dados
- Usar **"Iniciar OP"** para começar a produção
- **"Suspender"** ou **"Cancelar"** conforme necessário

## Campos Obrigatórios

### Aba Geral
- ✅ Tipo de OP
- ✅ Produto Acabado
- ✅ Quantidade a Produzir

### Validações Específicas
- Quantidade deve ser maior que zero
- Códigos de produtos devem ser únicos
- Datas de início devem ser posteriores à data atual

## Estados da OP

| Status | Código | Descrição | Ações Disponíveis |
|--------|--------|-----------|-------------------|
| Não Iniciada | R | OP criada, aguardando início | Iniciar, Cancelar |
| Em Andamento | A | OP em produção | Suspender, Cancelar |
| Finalizada | F | OP concluída | - |
| Suspensa | S | OP pausada | Iniciar, Cancelar |
| Cancelada | C | OP cancelada | - |

## Integração com Sistema Existente

### Baseado no Código Sankhya
A implementação foi baseada na estrutura encontrada em `teste.txt`, incluindo:

- **Campos principais**: IDIPROC, CODPRODPA, QTDPRODUZIR, SALDOOP
- **Status**: STATUSPROC (R, A, F, S, C)
- **Tipos**: P (Produção), D (Desmonte), R (Reprocessamento)
- **Validações**: Campos obrigatórios e regras de negócio

### Compatibilidade
- Estrutura de dados compatível com o sistema existente
- Campos mapeados conforme entidade `CabecalhoInstanciaProcesso`
- Validações baseadas nas regras do sistema original

## Personalização

### Cores e Temas
As cores podem ser personalizadas através das variáveis CSS:

```css
:root {
    --primary-color: #2c3e50;
    --secondary-color: #3498db;
    --success-color: #27ae60;
    --warning-color: #f39c12;
    --danger-color: #e74c3c;
}
```

### Adicionar Novos Campos
1. Adicionar campo no HTML
2. Implementar validação no JavaScript
3. Atualizar objeto `opData`
4. Testar funcionalidade

## Melhorias Futuras

### Funcionalidades Sugeridas
- [ ] Integração com API REST
- [ ] Upload de arquivos anexos
- [ ] Histórico de alterações
- [ ] Impressão de relatórios
- [ ] Notificações em tempo real
- [ ] Dashboard de métricas

### Otimizações
- [ ] Lazy loading de dados
- [ ] Cache de consultas
- [ ] Compressão de assets
- [ ] Service Worker para offline

## Suporte

### Navegadores Suportados
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Requisitos Mínimos
- JavaScript habilitado
- CSS3 suportado
- Resolução mínima: 320px

## Licença

Este projeto foi desenvolvido como demonstração técnica baseada no sistema Sankhya existente.

---

**Desenvolvido com base na estrutura do sistema Sankhya para gestão de Ordens de Produção.** 