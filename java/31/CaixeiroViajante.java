import java.util.*;

/**
 * Classe que implementa o algoritmo para resolver o problema do caixeiro viajante.
 * 
 * O PROBLEMA: Um caixeiro viajante precisa visitar várias cidades e retornar
 * ao ponto de partida, mas quer fazer isso gastando o menor tempo/combustível possível.
 * 
 * A SOLUÇÃO: Testamos todas as possíveis rotas e escolhemos a mais curta.
 * (Para muitas cidades, isso fica muito lento - é um problema NP-completo!)
 */
public class CaixeiroViajante {
    private List<Cidade> cidades;
    private List<Cidade> melhorRota;
    private double menorDistancia;
    
    /**
     * Construtor que recebe a lista de cidades a serem visitadas
     * @param cidades Lista de cidades para o problema
     */
    public CaixeiroViajante(List<Cidade> cidades) {
        this.cidades = new ArrayList<>(cidades);
        this.melhorRota = new ArrayList<>();
        this.menorDistancia = Double.MAX_VALUE;
    }
    
    /**
     * Resolve o problema do caixeiro viajante usando força bruta.
     * 
     * COMO FUNCIONA:
     * 1. Geramos todas as possíveis permutações das cidades
     * 2. Para cada rota, calculamos a distância total
    3. Guardamos a rota com menor distância
     * 
     * ATENÇÃO: Este método é O(n!) - muito lento para muitas cidades!
     * 
     * @return A melhor rota encontrada
     */
    public List<Cidade> resolver() {
        System.out.println("🔍 Iniciando busca pela melhor rota...");
        System.out.println("📊 Total de cidades: " + cidades.size());
        System.out.println("⚡ Possíveis rotas: " + calcularFatorial(cidades.size()));
        System.out.println();
        
        // Começamos com uma lista vazia para construir a rota
        List<Cidade> rotaAtual = new ArrayList<>();
        List<Cidade> cidadesRestantes = new ArrayList<>(cidades);
        
        // Chamamos o método recursivo que testa todas as possibilidades
        resolverRecursivo(rotaAtual, cidadesRestantes, 0.0);
        
        return new ArrayList<>(melhorRota);
    }
    
    /**
     * Método recursivo que testa todas as possíveis rotas
     * @param rotaAtual A rota sendo construída atualmente
     * @param cidadesRestantes Cidades ainda não visitadas
     * @param distanciaAtual Distância percorrida até agora
     */
    private void resolverRecursivo(List<Cidade> rotaAtual, List<Cidade> cidadesRestantes, double distanciaAtual) {
        // CASO BASE: Se não há mais cidades para visitar
        if (cidadesRestantes.isEmpty()) {
            // Adicionamos a distância de volta à cidade inicial
            if (!rotaAtual.isEmpty()) {
                double distanciaTotal = distanciaAtual + 
                    rotaAtual.get(rotaAtual.size() - 1).calcularDistancia(rotaAtual.get(0));
                
                // Se esta rota é melhor que a anterior, guardamos ela
                if (distanciaTotal < menorDistancia) {
                    menorDistancia = distanciaTotal;
                    melhorRota = new ArrayList<>(rotaAtual);
                }
            }
            return;
        }
        
        // CASO RECURSIVO: Para cada cidade restante, tentamos adicioná-la à rota
        for (int i = 0; i < cidadesRestantes.size(); i++) {
            Cidade proximaCidade = cidadesRestantes.get(i);
            
            // Calculamos a distância até esta cidade
            double novaDistancia = distanciaAtual;
            if (!rotaAtual.isEmpty()) {
                Cidade ultimaCidade = rotaAtual.get(rotaAtual.size() - 1);
                novaDistancia += ultimaCidade.calcularDistancia(proximaCidade);
            }
            
            // Adicionamos a cidade à rota atual
            rotaAtual.add(proximaCidade);
            cidadesRestantes.remove(i);
            
            // Recursivamente testamos as possibilidades restantes
            resolverRecursivo(rotaAtual, cidadesRestantes, novaDistancia);
            
            // IMPORTANTE: Desfazemos as mudanças para testar outras possibilidades
            rotaAtual.remove(rotaAtual.size() - 1);
            cidadesRestantes.add(i, proximaCidade);
        }
    }
    
    /**
     * Calcula o fatorial de um número (para mostrar quantas rotas são possíveis)
     * @param n O número
     * @return n!
     */
    private long calcularFatorial(int n) {
        if (n <= 1) return 1;
        return n * calcularFatorial(n - 1);
    }
    
    /**
     * Retorna a menor distância encontrada
     * @return A distância da melhor rota
     */
    public double getMenorDistancia() {
        return menorDistancia;
    }
    
    /**
     * Imprime a melhor rota encontrada de forma formatada
     */
    public void imprimirMelhorRota() {
        if (melhorRota.isEmpty()) {
            System.out.println("❌ Nenhuma rota foi encontrada!");
            return;
        }
        
        System.out.println("🎯 MELHOR ROTA ENCONTRADA:");
        System.out.println("═══════════════════════════════════════");
        
        double distanciaTotal = 0.0;
        
        for (int i = 0; i < melhorRota.size(); i++) {
            Cidade cidadeAtual = melhorRota.get(i);
            System.out.printf("%d. %s%n", i + 1, cidadeAtual);
            
            if (i < melhorRota.size() - 1) {
                Cidade proximaCidade = melhorRota.get(i + 1);
                double distancia = cidadeAtual.calcularDistancia(proximaCidade);
                distanciaTotal += distancia;
                System.out.printf("   ↓ %.2f km%n", distancia);
            }
        }
        
        // Distância de volta ao início
        if (melhorRota.size() > 1) {
            Cidade ultimaCidade = melhorRota.get(melhorRota.size() - 1);
            Cidade primeiraCidade = melhorRota.get(0);
            double distanciaVolta = ultimaCidade.calcularDistancia(primeiraCidade);
            distanciaTotal += distanciaVolta;
            System.out.printf("   ↓ %.2f km (volta ao início)%n", distanciaVolta);
            System.out.printf("1. %s (retorno)%n", primeiraCidade);
        }
        
        System.out.println("═══════════════════════════════════════");
        System.out.printf("📏 DISTÂNCIA TOTAL: %.2f km%n", distanciaTotal);
    }
}
