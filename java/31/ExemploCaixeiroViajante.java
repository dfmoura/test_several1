import java.util.*;

/**
 * Classe de exemplo que demonstra o problema do caixeiro viajante
 * com cidades reais do Brasil para facilitar o entendimento.
 * 
 * Este exemplo usa 4 cidades principais do Brasil para mostrar
 * como o algoritmo funciona de forma didática.
 */
public class ExemploCaixeiroViajante {
    
    /**
     * Cria um exemplo com cidades brasileiras reais
     * @return Lista de cidades para o problema
     */
    public static List<Cidade> criarExemploBrasileiro() {
        List<Cidade> cidades = new ArrayList<>();
        
        // Coordenadas aproximadas de cidades brasileiras
        // (em um sistema de coordenadas simplificado para o exemplo)
        cidades.add(new Cidade("São Paulo", 0.0, 0.0));      // Centro do mapa
        cidades.add(new Cidade("Rio de Janeiro", 2.0, 1.0)); // Leste
        cidades.add(new Cidade("Belo Horizonte", 1.5, 2.0)); // Norte
        cidades.add(new Cidade("Brasília", 3.0, 1.5));       // Nordeste
        
        return cidades;
    }
    
    /**
     * Cria um exemplo menor com apenas 3 cidades para demonstração rápida
     * @return Lista com 3 cidades
     */
    public static List<Cidade> criarExemploSimples() {
        List<Cidade> cidades = new ArrayList<>();
        
        cidades.add(new Cidade("Casa", 0.0, 0.0));
        cidades.add(new Cidade("Trabalho", 3.0, 0.0));
        cidades.add(new Cidade("Mercado", 1.5, 2.0));
        
        return cidades;
    }
    
    /**
     * Demonstra o problema com explicações detalhadas
     */
    public static void demonstrarProblema() {
        System.out.println("🚚 PROBLEMA DO CAIXEIRO VIAJANTE");
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println();
        
        System.out.println("📖 O QUE É O PROBLEMA?");
        System.out.println("Um caixeiro viajante precisa entregar encomendas em várias cidades.");
        System.out.println("Ele quer visitar cada cidade exatamente uma vez e voltar para casa.");
        System.out.println("O objetivo é encontrar o caminho mais curto possível!");
        System.out.println();
        
        System.out.println("🤔 POR QUE É DIFÍCIL?");
        System.out.println("• Com 3 cidades: 6 rotas possíveis");
        System.out.println("• Com 4 cidades: 24 rotas possíveis");
        System.out.println("• Com 5 cidades: 120 rotas possíveis");
        System.out.println("• Com 10 cidades: 3.628.800 rotas possíveis!");
        System.out.println("• Com 20 cidades: mais de 2 quintilhões de rotas!");
        System.out.println();
        
        System.out.println("💡 NOSSA SOLUÇÃO:");
        System.out.println("Vamos testar TODAS as possibilidades e escolher a melhor.");
        System.out.println("(Isso funciona bem para poucas cidades, mas fica lento com muitas)");
        System.out.println();
    }
    
    /**
     * Executa um exemplo prático com as cidades
     * @param cidades Lista de cidades para resolver
     * @param nomeExemplo Nome do exemplo para exibição
     */
    public static void executarExemplo(List<Cidade> cidades, String nomeExemplo) {
        System.out.println("🏙️  EXEMPLO: " + nomeExemplo);
        System.out.println("═══════════════════════════════════════════════════════════");
        
        // Mostra as cidades do problema
        System.out.println("📍 CIDADES DO PROBLEMA:");
        for (int i = 0; i < cidades.size(); i++) {
            System.out.printf("%d. %s%n", i + 1, cidades.get(i));
        }
        System.out.println();
        
        // Cria o solver e resolve o problema
        CaixeiroViajante solver = new CaixeiroViajante(cidades);
        
        long tempoInicio = System.currentTimeMillis();
        List<Cidade> melhorRota = solver.resolver();
        long tempoFim = System.currentTimeMillis();
        
        // Mostra o resultado
        solver.imprimirMelhorRota();
        System.out.println();
        System.out.printf("⏱️  TEMPO DE CÁLCULO: %d milissegundos%n", tempoFim - tempoInicio);
        System.out.println();
    }
    
    /**
     * Explica a complexidade do algoritmo
     */
    public static void explicarComplexidade() {
        System.out.println("🧮 COMPLEXIDADE DO ALGORITMO");
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println();
        System.out.println("📊 NOTAÇÃO BIG O: O(n!)");
        System.out.println("• n! = n × (n-1) × (n-2) × ... × 2 × 1");
        System.out.println("• Cresce MUITO rapidamente!");
        System.out.println();
        
        System.out.println("⏰ TEMPO ESTIMADO (assumindo 1 milhão de operações por segundo):");
        System.out.println("• 3 cidades: 0.000006 segundos");
        System.out.println("• 4 cidades: 0.000024 segundos");
        System.out.println("• 5 cidades: 0.00012 segundos");
        System.out.println("• 10 cidades: 3.6 segundos");
        System.out.println("• 15 cidades: 43 minutos");
        System.out.println("• 20 cidades: 77.000 anos!");
        System.out.println();
        
        System.out.println("🎯 SOLUÇÕES PRÁTICAS:");
        System.out.println("• Para poucas cidades: força bruta (nosso algoritmo)");
        System.out.println("• Para muitas cidades: algoritmos aproximados");
        System.out.println("• Exemplos: Algoritmo Genético, Simulated Annealing");
        System.out.println();
    }
}
