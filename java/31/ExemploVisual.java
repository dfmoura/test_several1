/**
 * Classe que demonstra visualmente como o algoritmo do caixeiro viajante funciona
 * através de diagramas em texto e explicações passo a passo.
 */
public class ExemploVisual {
    
    /**
     * Demonstra visualmente o problema com 3 cidades
     */
    public static void demonstrarVisualmente3Cidades() {
        System.out.println("🎨 DEMONSTRAÇÃO VISUAL - 3 CIDADES");
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println();
        
        // Desenha o mapa das cidades
        desenharMapa3Cidades();
        
        System.out.println();
        System.out.println("📋 TODAS AS POSSÍVEIS ROTAS (3! = 6):");
        System.out.println();
        
        // Lista todas as rotas possíveis
        String[] rotas = {
            "1. A → B → C → A",
            "2. A → C → B → A", 
            "3. B → A → C → B",
            "4. B → C → A → B",
            "5. C → A → B → C",
            "6. C → B → A → C"
        };
        
        for (String rota : rotas) {
            System.out.println("   " + rota);
        }
        
        System.out.println();
        System.out.println("🔍 O ALGORITMO TESTA CADA UMA DESSAS ROTAS");
        System.out.println("   E ESCOLHE A QUE TEM MENOR DISTÂNCIA TOTAL!");
        System.out.println();
    }
    
    /**
     * Desenha um mapa simples das 3 cidades
     */
    private static void desenharMapa3Cidades() {
        System.out.println("🗺️  MAPA DAS CIDADES:");
        System.out.println();
        System.out.println("     C (1,2)");
        System.out.println("      *");
        System.out.println("     / \\");
        System.out.println("    /   \\");
        System.out.println("   /     \\");
        System.out.println("  /       \\");
        System.out.println(" *---------*");
        System.out.println("A (0,0)   B (3,0)");
        System.out.println();
        System.out.println("📏 DISTÂNCIAS:");
        System.out.println("   A → B: 3.0 km");
        System.out.println("   A → C: 2.2 km");
        System.out.println("   B → C: 2.8 km");
        System.out.println();
    }
    
    /**
     * Demonstra como o algoritmo funciona passo a passo
     */
    public static void demonstrarPassoAPasso() {
        System.out.println("🔬 COMO O ALGORITMO FUNCIONA - PASSO A PASSO");
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println();
        
        System.out.println("1️⃣  INÍCIO: Lista vazia de cidades visitadas");
        System.out.println("    Cidades restantes: [A, B, C]");
        System.out.println("    Distância atual: 0 km");
        System.out.println();
        
        System.out.println("2️⃣  ESCOLHA 1: Começar por A");
        System.out.println("    Rota atual: [A]");
        System.out.println("    Cidades restantes: [B, C]");
        System.out.println("    Distância: 0 km");
        System.out.println();
        
        System.out.println("3️⃣  ESCOLHA 2A: Ir para B");
        System.out.println("    Rota atual: [A, B]");
        System.out.println("    Cidades restantes: [C]");
        System.out.println("    Distância: 3.0 km (A→B)");
        System.out.println();
        
        System.out.println("4️⃣  ESCOLHA 3A: Ir para C");
        System.out.println("    Rota atual: [A, B, C]");
        System.out.println("    Cidades restantes: []");
        System.out.println("    Distância: 5.8 km (A→B→C)");
        System.out.println("    + Volta para A: 2.2 km");
        System.out.println("    = TOTAL: 8.0 km");
        System.out.println();
        
        System.out.println("5️⃣  VOLTA E TESTA OUTRAS POSSIBILIDADES...");
        System.out.println("    (O algoritmo testa TODAS as combinações)");
        System.out.println();
        
        System.out.println("6️⃣  RESULTADO: Escolhe a rota com menor distância total");
        System.out.println();
    }
    
    /**
     * Mostra a diferença entre poucas e muitas cidades
     */
    public static void demonstrarCrescimentoExponencial() {
        System.out.println("📈 CRESCIMENTO EXPONENCIAL - POR QUE FICA LENTO?");
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println();
        
        System.out.println("🔢 NÚMERO DE ROTAS POSSÍVEIS:");
        System.out.println();
        
        int[] cidades = {3, 4, 5, 6, 7, 8, 9, 10};
        long[] rotas = {6, 24, 120, 720, 5040, 40320, 362880, 3628800};
        
        System.out.println("┌─────────────┬─────────────────┬─────────────────────┐");
        System.out.println("│ Cidades (n) │ Rotas (n!)      │ Tempo Estimado      │");
        System.out.println("├─────────────┼─────────────────┼─────────────────────┤");
        
        for (int i = 0; i < cidades.length; i++) {
            String tempo = calcularTempoEstimado(rotas[i]);
            System.out.printf("│ %-11d │ %-15d │ %-19s │%n", 
                cidades[i], rotas[i], tempo);
        }
        
        System.out.println("└─────────────┴─────────────────┴─────────────────────┘");
        System.out.println();
        
        System.out.println("⚠️  OBSERVAÇÃO:");
        System.out.println("   Com apenas 20 cidades, teríamos mais de");
        System.out.println("   2 QUINTILHÕES de rotas para testar!");
        System.out.println("   Isso levaria mais de 77.000 anos!");
        System.out.println();
    }
    
    /**
     * Calcula o tempo estimado baseado no número de operações
     */
    private static String calcularTempoEstimado(long operacoes) {
        if (operacoes < 1000) {
            return "< 1 ms";
        } else if (operacoes < 1000000) {
            return operacoes / 1000 + " ms";
        } else if (operacoes < 1000000000L) {
            return operacoes / 1000000 + " segundos";
        } else if (operacoes < 3600000000L) {
            return operacoes / 1000000000L + " minutos";
        } else {
            return "MUITO LONGO!";
        }
    }
    
    /**
     * Demonstra algoritmos alternativos
     */
    public static void demonstrarAlgoritmosAlternativos() {
        System.out.println("🚀 ALGORITMOS ALTERNATIVOS PARA MUITAS CIDADES");
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println();
        
        System.out.println("🎯 ALGORITMO GENÉTICO:");
        System.out.println("   • Simula evolução natural");
        System.out.println("   • Cria 'população' de rotas");
        System.out.println("   • 'Cruza' as melhores rotas");
        System.out.println("   • 'Muta' para criar variações");
        System.out.println("   • Repete até encontrar boa solução");
        System.out.println();
        
        System.out.println("🌡️  SIMULATED ANNEALING:");
        System.out.println("   • Inspirado no processo de recozimento do metal");
        System.out.println("   • Começa com soluções aleatórias");
        System.out.println("   • 'Esfria' gradualmente para encontrar ótimo");
        System.out.println("   • Aceita soluções piores no início");
        System.out.println();
        
        System.out.println("🧠 HEURÍSTICAS:");
        System.out.println("   • Regras práticas para encontrar boas soluções");
        System.out.println("   • Exemplo: 'Sempre vá para a cidade mais próxima'");
        System.out.println("   • Rápido, mas não garante a melhor solução");
        System.out.println();
        
        System.out.println("💡 PROGRAMAÇÃO DINÂMICA:");
        System.out.println("   • Para casos específicos do TSP");
        System.out.println("   • Mais eficiente que força bruta");
        System.out.println("   • Ainda exponencial, mas melhor que O(n!)");
        System.out.println();
    }
}
