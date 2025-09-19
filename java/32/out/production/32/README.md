# Implementação de Busca em Largura (BFS) para Verificação de Conectividade de Portal

## Descrição

Este projeto implementa uma solução completa para verificar a conectividade de páginas de um portal web utilizando o algoritmo de busca em largura (BFS - Breadth-First Search). A implementação foi desenvolvida em Java e inclui todas as estruturas de dados necessárias para representar e analisar grafos.

## Estruturas Implementadas

### 1. StatusVisitaVertice.java
Enum que representa o status de visita de um vértice durante a busca:
- `NOVO`: Vértice ainda não visitado
- `VISITADO`: Vértice já visitado

### 2. Vertice.java
Classe que representa um vértice do grafo com as seguintes propriedades:
- `nome`: Identificador único do vértice
- `status`: Status de visita (NOVO ou VISITADO)
- `distancia`: Distância do vértice inicial
- `pai`: Vértice pai na árvore de busca

### 3. ListaAdjacencia.java
Classe que implementa a representação do grafo usando lista de adjacências:
- Armazena todos os vértices e suas conexões
- Fornece métodos para obter vértices adjacentes
- Inclui funcionalidade para reiniciar o status dos vértices

### 4. BuscaEmLargura.java
Classe principal que implementa o algoritmo BFS com as seguintes funcionalidades:
- `executarBFS()`: Executa a busca em largura a partir de um vértice inicial
- `verificarConectividade()`: Verifica se todos os vértices são acessíveis
- `encontrarComponentesConectados()`: Identifica todos os componentes conectados
- `calcularDistancia()`: Calcula a distância entre dois vértices
- `encontrarCaminhoMaisCurto()`: Encontra o caminho mais curto entre dois vértices

### 5. PortalConectividade.java
Classe principal que demonstra o uso do sistema com exemplos práticos:
- Portal totalmente conectado
- Portal com páginas desconectadas
- Cálculo de caminhos mais curtos
- Relatório de integridade do portal

## Estruturas de Dados Utilizadas

### Fila (Queue)
- **Uso**: Estrutura fundamental do algoritmo BFS para controlar a ordem de processamento dos vértices
- **Implementação**: `LinkedList<Vertice>` como `Queue<Vertice>`
- **Justificativa**: A fila garante que os vértices sejam processados em ordem de distância (primeiro os mais próximos)

### Lista de Adjacências
- **Uso**: Representação eficiente do grafo para armazenar as conexões entre vértices
- **Implementação**: `List<List<Vertice>>`
- **Justificativa**: Permite acesso rápido aos vértices adjacentes e é eficiente em memória para grafos esparsos

## Como Executar

1. Compile todos os arquivos Java:
```bash
javac *.java
```

2. Execute o programa principal:
```bash
java PortalConectividade
```

## Exemplo de Saída

O programa demonstra:
- Estrutura do grafo em formato de lista de adjacências
- Ordem de visita dos vértices durante a busca
- Verificação de conectividade
- Identificação de componentes conectados
- Cálculo de caminhos mais curtos
- Relatório de integridade do portal

## Aplicação Prática

Esta implementação resolve o problema real de verificar se todas as páginas de um portal web são acessíveis, identificando:
- Páginas com links quebrados
- Componentes desconectados do portal
- Caminhos mais eficientes entre páginas
- Problemas de conectividade que podem afetar a experiência do usuário

## Complexidade

- **Tempo**: O(V + E), onde V é o número de vértices e E é o número de arestas
- **Espaço**: O(V) para a fila e estruturas auxiliares
- **Eficiência**: O algoritmo BFS é ótimo para encontrar caminhos mais curtos em grafos não ponderados
