# Sistema de Controle de Operações de Produção (OP's)

## 📋 Descrição

Sistema web responsivo para controle de operações de produção, desenvolvido especificamente para uso em dispositivos móveis na orientação vertical. A aplicação permite gerenciar o ciclo completo de vida das OP's, desde a criação até a finalização.

## ✨ Funcionalidades Principais

### 🏠 Tela Inicial
- **Lista de OP's** com informações essenciais
- **Filtros por status** (Todas, Aguardando, Iniciada, Finalizada)
- **Cards responsivos** com dados da operação
- **Botões de ação** contextuais baseados no status

### 🔄 Fluxo de Status
1. **Aguardando Aceite** → OP criada, aguardando aprovação
2. **Iniciada** → Produção em andamento
3. **Parada** → Produção interrompida temporariamente
4. **Finalizada** → Produção concluída

### 📊 Gestão de Insumos
- **Lista de materiais** para cada OP
- **Quantidade apontada** vs **quantidade pesada**
- **Sistema de pesagem** com memória de cálculo
- **Controles de edição** para quantidades

### 🎛️ Controles de Produção
- **Iniciar** produção de OP aguardando
- **Parar/Continuar** produção com motivo
- **Finalizar** produção

## 🎨 Design e Interface

### Paleta de Cores
Baseada na paleta fornecida:
- **Verde Floresta** (#00695e) - Cabeçalho e elementos principais
- **Turquesa** (#00afa0) - Botões de ação
- **Verde Claro** (#a2c73b) - Destaques e filtros ativos
- **Laranja** (#ffb914) - Status aguardando
- **Folha** (#50af32) - Status iniciada

### Características da Interface
- **Mobile-first** design otimizado para telas pequenas
- **Overlay responsivo** para navegação entre níveis
- **Animações suaves** e feedback visual
- **Layout adaptativo** para diferentes tamanhos de tela

## 🛠️ Tecnologias Utilizadas

- **HTML5** - Estrutura semântica
- **CSS3** - Estilos e responsividade
- **JavaScript ES6+** - Lógica da aplicação
- **LocalStorage** - Persistência de dados
- **CSS Grid/Flexbox** - Layout moderno

## 📱 Responsividade

### Breakpoints
- **Mobile**: < 480px - Layout otimizado para telas pequenas
- **Tablet**: 480px - 768px - Layout intermediário
- **Desktop**: > 768px - Layout expandido

### Características Mobile
- **Navegação por overlay** para economizar espaço
- **Botões otimizados** para toque
- **Scroll horizontal** nos filtros
- **Cards empilhados** verticalmente

## 💾 Persistência de Dados

### Estrutura JSON
```json
{
  "id": 1,
  "codigo": 4,
  "produto": "PI - FULLAND",
  "tamanhoLote": "5.040,00",
  "numeroLote": "040422-0001",
  "unidadeLote": "LT",
  "status": "finalizada",
  "qtdProduzir": 5040,
  "qtdApontada": 5040,
  "qtdPerda": 0,
  "qtdBaixada": 5040
}
```

### Armazenamento
- **LocalStorage** do navegador
- **Sincronização automática** das alterações
- **Backup local** dos dados

## 🚀 Como Usar

### 1. Acessar a Aplicação
- Abra o arquivo `index.html` em um navegador web
- A aplicação carrega automaticamente com dados de exemplo

### 2. Navegar pelas OP's
- Use os **filtros** para visualizar OP's por status
- Clique em uma **OP** para ver detalhes
- Use o botão **Atualizar** para recarregar dados

### 3. Gerenciar Status
- **Iniciar** produção de OP's aguardando aprovação
- **Parar/Continuar** produção conforme necessário
- **Finalizar** produção concluída

### 4. Controlar Insumos
- Visualizar **quantidades apontadas** vs **pesadas**
- Editar **quantidades pesadas** diretamente
- Usar **sistema de pesagem** com memória

## 📁 Estrutura de Arquivos

```
0104_novo_cria_op/
├── index.html          # Página principal
├── styles.css          # Estilos CSS
├── app.js             # Lógica JavaScript
├── README.md          # Documentação
├── paleta.txt         # Paleta de cores
└── test.txt           # Especificações originais
```

## 🔧 Personalização

### Cores
Edite as variáveis CSS em `styles.css`:
```css
:root {
  --verde-escuro: #00695e;
  --verde-medio: #00afa0;
  /* ... outras cores */
}
```

### Dados
Modifique o array `operacoes` em `app.js` para incluir suas OP's:
```javascript
let operacoes = [
  {
    id: 1,
    produto: "Seu Produto",
    // ... outros campos
  }
];
```

## 📋 Requisitos do Sistema

### Navegadores Suportados
- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Dispositivos
- **Mobile**: Android 6+, iOS 12+
- **Tablet**: iPadOS 12+, Android 6+
- **Desktop**: Windows 10+, macOS 10.14+

## 🤝 Contribuição

Para contribuir com o projeto:
1. Faça um fork do repositório
2. Crie uma branch para sua feature
3. Implemente as mudanças
4. Teste em diferentes dispositivos
5. Envie um pull request

## 📄 Licença

Este projeto é de uso livre para fins educacionais e comerciais.

## 📞 Suporte

Para dúvidas ou sugestões, entre em contato através dos canais disponibilizados pelo projeto.

---

**Desenvolvido com ❤️ para otimizar o controle de operações de produção**
