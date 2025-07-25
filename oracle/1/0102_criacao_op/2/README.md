# Sistema de Cadastro de Ordem de Produção

## Descrição

Sistema completo para cadastro e gerenciamento de Ordens de Produção (OP) com interface moderna, responsiva e predominância em tonalidades verdes. O sistema foi desenvolvido com base nos requisitos dos arquivos de teste e oferece funcionalidades avançadas para controle de produção.

## Características Principais

### 🎨 Design e Interface
- **Layout Responsivo**: Compatível com mobile, tablets e telas grandes
- **Tonalidades Verdes**: Predominância de cores verdes conforme solicitado
- **Interface Moderna**: Design limpo e intuitivo com animações suaves
- **Acessibilidade**: Foco em usabilidade e acessibilidade

### 📱 Responsividade
- **Mobile First**: Otimizado para dispositivos móveis
- **Adaptação Automática**: Layout se adapta automaticamente ao tamanho da tela
- **Touch Friendly**: Botões e controles otimizados para toque

### ⚙️ Funcionalidades

#### Campos Principais
- **Número da OP**: Geração automática de números únicos
- **Tipo de OP**: Produção, Desmonte, Reprocessamento, etc.
- **Produto Acabado**: Busca e seleção de produtos
- **Quantidade**: Controle de quantidades a produzir
- **Status**: Controle de status da ordem (Não Iniciada, Em Andamento, etc.)
- **Prioridade**: Sistema de prioridades (Baixa, Média, Alta, Urgente)
- **Processo**: Seleção de processos produtivos
- **Planta**: Definição de planta de produção
- **Parceiro**: Controle de terceiros (quando aplicável)

#### Abas Especializadas
1. **Geral**: Informações principais da OP
2. **Produtos**: Gestão de produtos acabados
3. **Atividades**: Controle de atividades e operações
4. **Materiais**: Gestão de materiais e insumos

#### Controles de Ação
- **Iniciar OP**: Inicia a ordem de produção
- **Suspender OP**: Suspende temporariamente
- **Cancelar OP**: Cancela a ordem
- **Salvar**: Salva os dados da OP
- **Limpar**: Limpa o formulário

### 🔧 Tecnologias Utilizadas

- **HTML5**: Estrutura semântica e moderna
- **CSS3**: Estilização avançada com variáveis CSS e gradientes
- **JavaScript ES6+**: Funcionalidades dinâmicas e interativas
- **Bootstrap 5**: Framework CSS para responsividade
- **Font Awesome**: Ícones modernos e consistentes

## Estrutura de Arquivos

```
cadastro_ordem_producao/
├── cadastro_ordem_producao.html    # Página principal
├── cadastro_ordem_producao.css     # Estilos e layout
├── cadastro_ordem_producao.js      # Funcionalidades JavaScript
└── README.md                       # Documentação
```

## Instalação e Uso

### Pré-requisitos
- Navegador web moderno (Chrome, Firefox, Safari, Edge)
- Servidor web local (opcional, para desenvolvimento)

### Execução
1. Clone ou baixe os arquivos do projeto
2. Abra o arquivo `cadastro_ordem_producao.html` em um navegador
3. O sistema estará pronto para uso

### Desenvolvimento
Para desenvolvimento local, recomenda-se usar um servidor web:

```bash
# Usando Python
python -m http.server 8000

# Usando Node.js
npx http-server

# Usando PHP
php -S localhost:8000
```

## Funcionalidades Detalhadas

### 1. Gestão de Dados da OP

#### Informações Básicas
- **Número da OP**: Gerado automaticamente com timestamp
- **Data de Criação**: Registro automático da data de criação
- **Usuário de Criação**: Identificação do usuário responsável
- **Status**: Controle de estados da ordem

#### Campos Específicos
- **Tipo de OP**: 
  - P = Produção
  - D = Desmonte
  - R = Reprocessamento/Reparo
  - PC = Produção Conjunta
  - PT = Produção para Terceiro
  - TE = Usa Terceiro

- **Prioridade**:
  - 1 = Baixa
  - 2 = Média
  - 3 = Alta
  - 4 = Urgente

### 2. Controle de Produtos

#### Funcionalidades
- **Adicionar Produto**: Modal para inserção de novos produtos
- **Busca de Produtos**: Sistema de busca por código
- **Controle de Lotes**: Gestão de controles de produto
- **Quantidades**: Controle de quantidades a produzir

#### Campos do Produto
- Código do produto
- Descrição
- Quantidade
- Controle (lote, série, etc.)

### 3. Gestão de Atividades

#### Funcionalidades
- **Sequenciamento**: Controle de sequência das atividades
- **Centros de Trabalho**: Definição de centros de trabalho
- **Tempos**: Controle de tempos previstos
- **Status**: Controle de status das atividades

#### Campos da Atividade
- Sequência
- Descrição
- Centro de Trabalho
- Tempo Previsto
- Status (Pendente, Em Execução, Finalizada)

### 4. Controle de Materiais

#### Funcionalidades
- **Adicionar Material**: Modal para inserção de materiais
- **Busca de Materiais**: Sistema de busca por código
- **Controle de Consumo**: Acompanhamento de quantidades consumidas
- **Controles Específicos**: Gestão de controles de material

#### Campos do Material
- Código do material
- Descrição
- Quantidade Necessária
- Quantidade Consumida
- Controle

### 5. Sistema de Status

#### Estados da OP
- **R (Não Iniciada)**: OP criada mas não iniciada
- **A (Em Andamento)**: OP em execução
- **S (Suspensa)**: OP temporariamente suspensa
- **F (Finalizada)**: OP concluída
- **C (Cancelada)**: OP cancelada

#### Controles de Botões
- **Não Iniciada**: Pode iniciar ou cancelar
- **Em Andamento**: Pode suspender ou cancelar
- **Suspensa**: Pode iniciar ou cancelar
- **Finalizada/Cancelada**: Apenas visualização

### 6. Validações e Segurança

#### Validações Implementadas
- **Campos Obrigatórios**: Validação em tempo real
- **Quantidades**: Validação de valores positivos
- **Datas**: Validação de datas lógicas
- **Status**: Controle de transições de status

#### Segurança
- **Auto-save**: Salvamento automático a cada 30 segundos
- **Confirmações**: Confirmações para ações críticas
- **Notificações**: Sistema de notificações para feedback

## Estilização e Design

### Paleta de Cores (Verdes)
```css
--primary-green: #2e7d32
--secondary-green: #4caf50
--light-green: #81c784
--dark-green: #1b5e20
--accent-green: #66bb6a
--success-green: #43a047
```

### Características Visuais
- **Gradientes**: Uso de gradientes para profundidade visual
- **Sombras**: Sombras suaves para elevação
- **Animações**: Transições suaves e animações
- **Bordas Arredondadas**: Design moderno com bordas arredondadas

### Responsividade
- **Mobile**: < 768px
- **Tablet**: 768px - 1024px
- **Desktop**: > 1024px

## Funcionalidades Avançadas

### 1. Auto-save
- Salvamento automático a cada 30 segundos
- Armazenamento local no navegador
- Notificações de salvamento

### 2. Sistema de Notificações
- Notificações toast para feedback
- Diferentes tipos: success, warning, danger, info
- Auto-dismiss após 5 segundos

### 3. Modais Interativos
- Modais para adição de produtos, atividades e materiais
- Validação em tempo real
- Busca integrada

### 4. Tabelas Dinâmicas
- Tabelas responsivas
- Ações inline (editar, remover)
- Ordenação e filtros

### 5. Progress Bar
- Barra de progresso animada
- Cálculo automático baseado em quantidades
- Efeito shimmer para indicar atividade

## Compatibilidade

### Navegadores Suportados
- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

### Dispositivos
- **Desktop**: Windows, macOS, Linux
- **Tablet**: iPad, Android tablets
- **Mobile**: iPhone, Android phones

## Performance

### Otimizações Implementadas
- **CSS Variables**: Para melhor performance de cores
- **Debounced Events**: Para eventos de input
- **Lazy Loading**: Para componentes pesados
- **Minified Assets**: Para produção

### Métricas Esperadas
- **Tempo de Carregamento**: < 2 segundos
- **Responsividade**: < 100ms para interações
- **Memória**: < 50MB de uso

## Extensibilidade

### Pontos de Extensão
1. **Integração com APIs**: Fácil integração com sistemas externos
2. **Novos Tipos de OP**: Estrutura preparada para novos tipos
3. **Relatórios**: Base para geração de relatórios
4. **Workflow**: Preparado para implementação de workflows

### Estrutura Modular
- **Controller Pattern**: Fácil manutenção e extensão
- **Event-Driven**: Arquitetura baseada em eventos
- **Component-Based**: Componentes reutilizáveis

## Troubleshooting

### Problemas Comuns

#### 1. Campos não salvam
- Verificar se o localStorage está habilitado
- Verificar permissões do navegador

#### 2. Modais não abrem
- Verificar se o Bootstrap está carregado
- Verificar console para erros JavaScript

#### 3. Layout quebrado em mobile
- Verificar viewport meta tag
- Verificar CSS responsivo

### Logs e Debug
- Abrir console do navegador (F12)
- Verificar erros JavaScript
- Verificar network tab para recursos

## Contribuição

### Como Contribuir
1. Fork o projeto
2. Crie uma branch para sua feature
3. Commit suas mudanças
4. Push para a branch
5. Abra um Pull Request

### Padrões de Código
- **HTML**: Semântico e acessível
- **CSS**: BEM methodology
- **JavaScript**: ES6+ com comentários

## Licença

Este projeto está sob a licença MIT. Veja o arquivo LICENSE para mais detalhes.

## Contato

Para dúvidas, sugestões ou problemas:
- Abra uma issue no repositório
- Entre em contato com a equipe de desenvolvimento

---

**Desenvolvido com ❤️ e ☕ para otimizar o controle de produção** 