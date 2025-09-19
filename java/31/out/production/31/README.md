# 🚚 Problema do Caixeiro Viajante - Tutorial Didático

Este projeto demonstra de forma didática e detalhada o famoso **Problema do Caixeiro Viajante** (Traveling Salesman Problem - TSP) em Java.

## 📖 O que é o Problema?

Imagine que você é um caixeiro viajante que precisa entregar encomendas em várias cidades. Você quer:
- Visitar cada cidade exatamente uma vez
- Retornar ao ponto de partida
- Fazer isso gastando o menor tempo/combustível possível

**O desafio:** Encontrar a rota mais curta que atenda a todos esses requisitos!

## 🎯 Objetivos do Tutorial

Este projeto foi criado para ensinar conceitos de algoritmos de forma acessível, mostrando:
- Como funciona um algoritmo de força bruta
- Por que alguns problemas são difíceis de resolver
- O que é complexidade computacional
- Como a quantidade de dados afeta o tempo de execução

## 🏗️ Estrutura do Projeto

```
📁 Projeto Caixeiro Viajante
├── 📄 Cidade.java                    # Representa uma cidade com coordenadas
├── 📄 CaixeiroViajante.java         # Algoritmo principal (força bruta)
├── 📄 ExemploCaixeiroViajante.java  # Exemplos e demonstrações
├── 📄 Main.java                     # Programa principal interativo
└── 📄 README.md                     # Este arquivo
```

## 🚀 Como Executar

### Pré-requisitos
- Java 8 ou superior instalado
- Terminal/linha de comando

### Compilação e Execução

```bash
# 1. Compilar todos os arquivos Java
javac *.java

# 2. Executar o programa principal
java Main
```

## 🎮 O que o Programa Faz

1. **Explica o problema** de forma didática
2. **Mostra exemplos práticos** com cidades brasileiras
3. **Demonstra o algoritmo** passo a passo
4. **Permite interação** - você pode escolher quantas cidades testar
5. **Explica a complexidade** computacional envolvida

## 📊 Exemplos Incluídos

### Exemplo Simples (3 cidades)
- Casa → Trabalho → Mercado
- Mostra como o algoritmo funciona rapidamente

### Exemplo Brasileiro (4 cidades)
- São Paulo, Rio de Janeiro, Belo Horizonte, Brasília
- Usa cidades reais para facilitar o entendimento

### Exemplo Interativo
- Você escolhe quantas cidades testar (3-6)
- Gera cidades aleatórias
- Mostra o tempo de execução

## 🧮 Complexidade do Algoritmo

- **Notação:** O(n!)
- **Crescimento:** Muito rápido!
- **3 cidades:** 6 rotas possíveis
- **4 cidades:** 24 rotas possíveis  
- **10 cidades:** 3.628.800 rotas possíveis
- **20 cidades:** Mais de 2 quintilhões de rotas!

## 💡 Conceitos Ensinados

- **Algoritmos de força bruta**
- **Complexidade computacional**
- **Problemas NP-completo**
- **Recursão e backtracking**
- **Otimização combinatória**

## 🎓 Para Estudantes

Este projeto é ideal para:
- Entender algoritmos de forma visual
- Aprender sobre complexidade computacional
- Ver como problemas reais são modelados
- Experimentar com diferentes tamanhos de entrada

## 🔧 Personalização

Você pode facilmente:
- Adicionar suas próprias cidades
- Modificar as coordenadas
- Alterar o número de cidades nos exemplos
- Experimentar com diferentes algoritmos

## 📚 Próximos Passos

Após entender este exemplo, explore:
- Algoritmos genéticos
- Simulated annealing
- Programação dinâmica
- Heurísticas de otimização

---

**Divirta-se aprendendo! 🎉**
