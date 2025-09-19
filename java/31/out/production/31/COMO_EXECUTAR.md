# 🚀 Como Executar o Tutorial do Caixeiro Viajante

## ⚡ Execução Rápida

```bash
# 1. Compilar
javac *.java

# 2. Executar
java Main
```

## 🎮 Modos de Execução

### Modo Completo (Recomendado)
```bash
java Main
```
- Mostra todo o tutorial
- Inclui exemplos visuais
- Permite interação
- Explica conceitos passo a passo

### Modo Rápido (Apenas exemplos)
```bash
echo "3" | java Main
```
- Executa automaticamente com 3 cidades
- Mostra resultados sem interação
- Ideal para demonstrações

### Modo Interativo
```bash
java Main
# Digite um número entre 3-6 quando solicitado
```

## 📊 O que Você Verá

1. **Explicação do Problema** - O que é o caixeiro viajante
2. **Exemplo Simples** - 3 cidades (Casa, Trabalho, Mercado)
3. **Exemplo Brasileiro** - 4 capitais do Brasil
4. **Explicação Visual** - Diagramas e mapas
5. **Passo a Passo** - Como o algoritmo funciona
6. **Complexidade** - Por que fica lento com muitas cidades
7. **Algoritmos Alternativos** - Soluções para casos reais
8. **Teste Interativo** - Você escolhe quantas cidades testar

## 🎯 Resultados Esperados

- **3 cidades**: ~15ms, 6 rotas testadas
- **4 cidades**: ~1ms, 24 rotas testadas  
- **5 cidades**: ~5ms, 120 rotas testadas
- **6+ cidades**: Pode demorar alguns segundos

## 🔧 Personalização

### Adicionar Suas Próprias Cidades

Edite o arquivo `ExemploCaixeiroViajante.java`:

```java
public static List<Cidade> criarMinhasCidades() {
    List<Cidade> cidades = new ArrayList<>();
    cidades.add(new Cidade("Minha Cidade", 0.0, 0.0));
    cidades.add(new Cidade("Cidade Vizinha", 5.0, 3.0));
    // Adicione mais cidades...
    return cidades;
}
```

### Modificar Coordenadas

As coordenadas são em um sistema simplificado:
- X: Distância horizontal (0 = oeste, 10 = leste)
- Y: Distância vertical (0 = sul, 10 = norte)

## 🐛 Solução de Problemas

### Erro de Compilação
```bash
# Verifique se tem Java instalado
java -version

# Recompile todos os arquivos
javac *.java
```

### Programa Muito Lento
- Use 3-5 cidades para testes rápidos
- Evite mais de 6 cidades (pode demorar muito)

### Erro de Memória
- O algoritmo usa força bruta
- Com muitas cidades pode consumir muita memória
- Use menos cidades ou implemente algoritmo mais eficiente

## 📚 Próximos Passos

Após executar este tutorial, explore:
- Algoritmos genéticos
- Simulated annealing  
- Programação dinâmica
- Heurísticas de otimização

---

**Divirta-se aprendendo! 🎉**
