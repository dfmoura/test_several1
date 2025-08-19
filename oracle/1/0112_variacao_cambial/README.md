# 📊 Análise de Exposição Cambial - Insumos Importados

Sistema profissional para monitoramento e análise da exposição cambial de insumos importados, desenvolvido em HTML, CSS e JavaScript puro.

## 🎯 Funcionalidades

### 📋 Listagem de Produtos
- **Visualização completa** dos produtos importados
- **Informações detalhadas**: data de compra, valor em USD, data de pagamento, fornecedor e categoria
- **Interface interativa** com seleção visual dos produtos
- **Dados de exemplo** incluídos para demonstração

### 📈 Gráfico de Exposição Cambial
- **Três linhas de dados**:
  - 🔴 **PTAX de Compra**: Taxa de câmbio no momento da compra
  - 🔵 **Dólar Spot Diário**: Cotação atual do dólar
  - 🟢 **PTAX de Pagamento**: Taxa de câmbio no momento do pagamento
- **Timeline completa** desde a data de compra até hoje
- **Indicadores visuais** para datas de pagamento
- **Tooltips informativos** com valores detalhados

### 🔗 Integração com APIs
- **API do Banco Central**: Busca automática de PTAX histórica
- **API AwesomeAPI**: Cotação atual do dólar em tempo real
- **Fallback inteligente**: Busca PTAX mais recente quando não há dados para a data específica

## 🚀 Como Usar

### 1. Abrir a Aplicação
```bash
# Abra o arquivo index4.html em qualquer navegador moderno
open index4.html
```

### 2. Navegar pelos Produtos
- Clique em qualquer produto na lista lateral
- O gráfico será atualizado automaticamente
- Visualize a exposição cambial ao longo do tempo

### 3. Interpretar os Dados
- **Linha Vermelha**: PTAX no momento da compra (referência)
- **Linha Azul**: Variação do dólar ao longo do tempo
- **Ponto Verde**: PTAX no momento do pagamento (quando aplicável)

## 📁 Estrutura do Projeto

```
0112_variacao_cambial/
├── index4.html          # Interface principal da aplicação
├── dados_exemplo.js     # Dados de exemplo e funções utilitárias
├── README.md           # Documentação do projeto
└── testes.txt          # Arquivo de testes (se aplicável)
```

## 🔧 Configuração de Dados

### Adicionar Novos Produtos
Edite o arquivo `dados_exemplo.js`:

```javascript
// Exemplo de estrutura de produto
{
    id: 9,
    nome: "Novo Produto",
    dataCompra: "2024-04-01",
    valorUSD: 100000,
    dataPagamento: "2024-06-01",
    fornecedor: "Novo Fornecedor",
    categoria: "Nova Categoria",
    descricao: "Descrição do produto"
}
```

### Funções Disponíveis
```javascript
// Adicionar produto
adicionarProduto(novoProduto);

// Remover produto
removerProduto(id);

// Atualizar produto
atualizarProduto(id, dadosAtualizados);

// Filtrar por categoria
filtrarPorCategoria("Químicos");

// Calcular valor total
calcularValorTotalUSD();
```

## 🌐 APIs Utilizadas

### Banco Central do Brasil
- **Endpoint**: `https://olinda.bcb.gov.br/olinda/servico/PTAX/versao/v1/odata/CotacaoDolarDia`
- **Formato da data**: MM-DD-YYYY
- **Função**: Buscar PTAX histórica

### AwesomeAPI
- **Endpoint**: `https://economia.awesomeapi.com.br/last/USD-BRL`
- **Função**: Cotação atual do dólar
- **Gratuita**: Sim, sem necessidade de API key

## 🎨 Características da Interface

### Design Responsivo
- **Layout adaptativo** para diferentes tamanhos de tela
- **Grid system** moderno com CSS Grid
- **Backdrop blur** para efeito visual profissional

### Animações e Transições
- **Hover effects** nos produtos
- **Loading spinner** durante carregamento
- **Transições suaves** entre estados

### Cores e Tipografia
- **Paleta profissional** com gradientes
- **Tipografia moderna** (Segoe UI)
- **Contraste adequado** para acessibilidade

## 🔍 Funcionalidades Técnicas

### Busca Inteligente de PTAX
```javascript
// Busca PTAX para data específica
const ptax = await buscarPTAX("2024-01-15");

// Busca PTAX mais recente disponível
const ptaxRecente = await buscarPTAXRecente("2024-01-15");
```

### Geração de Dados do Gráfico
- **Timeline completa** desde a compra até hoje
- **Dados simulados** para datas passadas (em produção, usar histórico real)
- **Integração automática** com APIs

### Tratamento de Erros
- **Fallback para PTAX** quando não há dados
- **Indicadores de status** em tempo real
- **Mensagens de erro** informativas

## 📊 Interpretação dos Resultados

### Exposição Cambial
- **Valor alto**: Maior risco cambial
- **Variação grande**: Instabilidade na moeda
- **Convergência**: Estabilidade cambial

### Pontos de Atenção
- **Gap entre PTAX e Spot**: Diferença entre taxa oficial e mercado
- **Data de pagamento**: Momento crítico para exposição
- **Tendência**: Direção da variação cambial

## 🛠️ Desenvolvimento

### Tecnologias Utilizadas
- **HTML5**: Estrutura semântica
- **CSS3**: Estilização moderna com Grid e Flexbox
- **JavaScript ES6+**: Funcionalidades dinâmicas
- **Chart.js**: Gráficos interativos
- **Fetch API**: Comunicação com APIs

### Compatibilidade
- **Navegadores modernos**: Chrome, Firefox, Safari, Edge
- **Dispositivos**: Desktop, tablet, mobile
- **Sem dependências**: Funciona offline (exceto APIs)

## 📈 Próximas Melhorias

### Funcionalidades Planejadas
- [ ] **Histórico real** de cotações diárias
- [ ] **Alertas** de exposição cambial
- [ ] **Relatórios** em PDF
- [ ] **Dashboard** com métricas agregadas
- [ ] **Integração** com sistemas ERP

### Melhorias Técnicas
- [ ] **Cache** de dados de API
- [ ] **WebSocket** para atualizações em tempo real
- [ ] **PWA** para instalação offline
- [ ] **Testes automatizados**

## 🤝 Contribuição

Para contribuir com o projeto:

1. **Fork** o repositório
2. **Crie** uma branch para sua feature
3. **Implemente** as mudanças
4. **Teste** a funcionalidade
5. **Envie** um pull request

## 📄 Licença

Este projeto está sob licença MIT. Veja o arquivo LICENSE para mais detalhes.

## 📞 Suporte

Para dúvidas ou sugestões:
- **Issues**: Abra uma issue no repositório
- **Documentação**: Consulte este README
- **Exemplos**: Veja o arquivo `dados_exemplo.js`

---

**Desenvolvido com ❤️ para análise profissional de exposição cambial**
