import java.util.*;

/**
 * Classe principal que demonstra o problema do caixeiro viajante
 * de forma didática e completa para leigos.
 * 
 * Este programa mostra:
 * 1. O que é o problema do caixeiro viajante
 * 2. Por que é difícil de resolver
 * 3. Como nosso algoritmo funciona
 * 4. Exemplos práticos com cidades reais
 * 5. A complexidade computacional envolvida
 */
public class Main {
    
    public static void main(String[] args) {
        System.out.println("🎓 TUTORIAL COMPLETO: PROBLEMA DO CAIXEIRO VIAJANTE");
        System.out.println("═══════════════════════════════════════════════════════════════════════════════════════");
        System.out.println();
        
        // 1. Explicação teórica do problema
        ExemploCaixeiroViajante.demonstrarProblema();
        
        // 2. Exemplo simples (3 cidades) - rápido de executar
        System.out.println("🔬 TESTE SIMPLES (3 cidades):");
        List<Cidade> cidadesSimples = ExemploCaixeiroViajante.criarExemploSimples();
        ExemploCaixeiroViajante.executarExemplo(cidadesSimples, "Casa → Trabalho → Mercado");
        
        // 3. Exemplo mais complexo (4 cidades) - ainda executável
        System.out.println("🌎 TESTE REAL (4 cidades brasileiras):");
        List<Cidade> cidadesBrasileiras = ExemploCaixeiroViajante.criarExemploBrasileiro();
        ExemploCaixeiroViajante.executarExemplo(cidadesBrasileiras, "Capitais do Brasil");
        
        // 4. Explicação da complexidade
        ExemploCaixeiroViajante.explicarComplexidade();
        
        // 5. Demonstração visual
        ExemploVisual.demonstrarVisualmente3Cidades();
        ExemploVisual.demonstrarPassoAPasso();
        ExemploVisual.demonstrarCrescimentoExponencial();
        ExemploVisual.demonstrarAlgoritmosAlternativos();
        
        // 7. Demonstração interativa
        demonstrarInterativamente();
        
        // 8. Conclusão
        concluirTutorial();
    }
    
    /**
     * Demonstra o problema de forma interativa, mostrando como
     * o número de cidades afeta o tempo de cálculo
     */
    private static void demonstrarInterativamente() {
        System.out.println("🎮 DEMONSTRAÇÃO INTERATIVA");
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println();
        
        Scanner scanner = new Scanner(System.in);
        
        System.out.println("Vamos testar com diferentes números de cidades!");
        System.out.println("(Digite um número entre 3 e 6 para não demorar muito)");
        System.out.print("Quantas cidades você quer testar? ");
        
        try {
            int numCidades = scanner.nextInt();
            
            if (numCidades < 3 || numCidades > 6) {
                System.out.println("⚠️  Número inválido! Usando 4 cidades como padrão.");
                numCidades = 4;
            }
            
            // Cria cidades aleatórias
            List<Cidade> cidadesAleatorias = criarCidadesAleatorias(numCidades);
            
            System.out.println();
            System.out.println("🎲 CIDADES ALEATÓRIAS GERADAS:");
            for (int i = 0; i < cidadesAleatorias.size(); i++) {
                System.out.printf("%d. %s%n", i + 1, cidadesAleatorias.get(i));
            }
            System.out.println();
            
            // Resolve o problema
            CaixeiroViajante solver = new CaixeiroViajante(cidadesAleatorias);
            
            long tempoInicio = System.currentTimeMillis();
            List<Cidade> melhorRota = solver.resolver();
            long tempoFim = System.currentTimeMillis();
            
            solver.imprimirMelhorRota();
            System.out.printf("⏱️  TEMPO: %d ms%n", tempoFim - tempoInicio);
            
        } catch (Exception e) {
            System.out.println("❌ Entrada inválida! Continuando com exemplo padrão...");
        }
        
        System.out.println();
    }
    
    /**
     * Cria uma lista de cidades com coordenadas aleatórias
     * @param quantidade Número de cidades a criar
     * @return Lista de cidades aleatórias
     */
    private static List<Cidade> criarCidadesAleatorias(int quantidade) {
        List<Cidade> cidades = new ArrayList<>();
        Random random = new Random();
        
        String[] nomesCidades = {
            "Alpha", "Beta", "Gamma", "Delta", "Epsilon", "Zeta",
            "Eta", "Theta", "Iota", "Kappa", "Lambda", "Mu"
        };
        
        for (int i = 0; i < quantidade; i++) {
            String nome = nomesCidades[i % nomesCidades.length] + (i + 1);
            double x = random.nextDouble() * 10; // Coordenadas entre 0 e 10
            double y = random.nextDouble() * 10;
            cidades.add(new Cidade(nome, x, y));
        }
        
        return cidades;
    }
    
    /**
     * Conclui o tutorial com resumo e próximos passos
     */
    private static void concluirTutorial() {
        System.out.println("🎯 RESUMO DO QUE APRENDEMOS");
        System.out.println("═══════════════════════════════════════════════════════════");
        System.out.println();
        
        System.out.println("✅ O PROBLEMA DO CAIXEIRO VIAJANTE:");
        System.out.println("   • Encontrar a rota mais curta que visita todas as cidades");
        System.out.println("   • Cada cidade deve ser visitada exatamente uma vez");
        System.out.println("   • Deve retornar ao ponto de partida");
        System.out.println();
        
        System.out.println("✅ NOSSA SOLUÇÃO:");
        System.out.println("   • Algoritmo de força bruta (testa todas as possibilidades)");
        System.out.println("   • Funciona bem para poucas cidades");
        System.out.println("   • Fica muito lento com muitas cidades");
        System.out.println();
        
        System.out.println("✅ CONCEITOS IMPORTANTES:");
        System.out.println("   • Complexidade O(n!) - cresce muito rapidamente");
        System.out.println("   • Problema NP-completo - difícil de resolver");
        System.out.println("   • Algoritmos aproximados para casos reais");
        System.out.println();
        
        System.out.println("🚀 PRÓXIMOS PASSOS:");
        System.out.println("   • Pesquisar algoritmos genéticos");
        System.out.println("   • Estudar simulated annealing");
        System.out.println("   • Explorar programação dinâmica");
        System.out.println("   • Aprender sobre heurísticas");
        System.out.println();
        
        System.out.println("🎉 PARABÉNS! Você agora entende o problema do caixeiro viajante!");
        System.out.println("   Este é um dos problemas mais famosos da ciência da computação.");
        System.out.println();
    }
}
