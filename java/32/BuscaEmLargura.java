import java.util.*;

/**
 * Classe que implementa o algoritmo de busca em largura (BFS)
 * Utilizada para verificar a conectividade de todas as páginas do portal
 */
public class BuscaEmLargura {
    private ListaAdjacencia grafo;
    
    /**
     * Construtor que recebe o grafo para realizar a busca
     * @param grafo grafo representado por lista de adjacências
     */
    public BuscaEmLargura(ListaAdjacencia grafo) {
        this.grafo = grafo;
    }
    
    /**
     * Executa a busca em largura a partir de um vértice inicial
     * @param verticeInicial vértice de onde a busca será iniciada
     * @return lista de vértices visitados na ordem da busca
     */
    public List<Vertice> executarBFS(Vertice verticeInicial) {
        // Reinicia o status de todos os vértices
        grafo.reiniciarStatus();
        
        // Lista para armazenar a ordem de visita dos vértices
        List<Vertice> ordemVisita = new ArrayList<>();
        
        // Fila para controlar a ordem de processamento (estrutura fundamental do BFS)
        Queue<Vertice> fila = new LinkedList<>();
        
        // Inicializa o vértice inicial
        verticeInicial.setStatus(StatusVisitaVertice.VISITADO);
        verticeInicial.setDistancia(0);
        verticeInicial.setPai(null);
        fila.offer(verticeInicial);
        ordemVisita.add(verticeInicial);
        
        // Processa a fila até que todos os vértices acessíveis sejam visitados
        while (!fila.isEmpty()) {
            Vertice verticeAtual = fila.poll();
            
            // Obtém todos os vértices adjacentes ao vértice atual
            List<Vertice> adjacentes = grafo.obterAdjacentes(verticeAtual);
            
            // Processa cada vértice adjacente
            for (Vertice adjacente : adjacentes) {
                if (adjacente.getStatus() == StatusVisitaVertice.NOVO) {
                    // Marca o vértice como visitado
                    adjacente.setStatus(StatusVisitaVertice.VISITADO);
                    adjacente.setDistancia(verticeAtual.getDistancia() + 1);
                    adjacente.setPai(verticeAtual);
                    
                    // Adiciona à fila para processamento posterior
                    fila.offer(adjacente);
                    ordemVisita.add(adjacente);
                }
            }
        }
        
        return ordemVisita;
    }
    
    /**
     * Verifica se todos os vértices do grafo são acessíveis a partir de um vértice inicial
     * @param verticeInicial vértice de onde a verificação será iniciada
     * @return true se todos os vértices são acessíveis, false caso contrário
     */
    public boolean verificarConectividade(Vertice verticeInicial) {
        List<Vertice> verticesVisitados = executarBFS(verticeInicial);
        return verticesVisitados.size() == grafo.getNumVertices();
    }
    
    /**
     * Encontra todos os componentes conectados do grafo
     * @return lista de listas, onde cada lista representa um componente conectado
     */
    public List<List<Vertice>> encontrarComponentesConectados() {
        List<List<Vertice>> componentes = new ArrayList<>();
        grafo.reiniciarStatus();
        
        // Para cada vértice não visitado, executa BFS para encontrar seu componente
        for (Vertice vertice : grafo.obterVertices()) {
            if (vertice.getStatus() == StatusVisitaVertice.NOVO) {
                List<Vertice> componente = executarBFS(vertice);
                componentes.add(componente);
            }
        }
        
        return componentes;
    }
    
    /**
     * Calcula a distância entre dois vértices usando BFS
     * @param origem vértice de origem
     * @param destino vértice de destino
     * @return distância entre os vértices, ou -1 se não houver caminho
     */
    public int calcularDistancia(Vertice origem, Vertice destino) {
        executarBFS(origem);
        return destino.getDistancia() != null ? destino.getDistancia() : -1;
    }
    
    /**
     * Encontra o caminho mais curto entre dois vértices
     * @param origem vértice de origem
     * @param destino vértice de destino
     * @return lista de vértices representando o caminho, ou lista vazia se não houver caminho
     */
    public List<Vertice> encontrarCaminhoMaisCurto(Vertice origem, Vertice destino) {
        executarBFS(origem);
        
        if (destino.getDistancia() == null) {
            return new ArrayList<>(); // Não há caminho
        }
        
        // Reconstrói o caminho seguindo os vértices pais
        List<Vertice> caminho = new ArrayList<>();
        Vertice atual = destino;
        
        while (atual != null) {
            caminho.add(0, atual); // Adiciona no início da lista
            atual = atual.getPai();
        }
        
        return caminho;
    }
    
    /**
     * Imprime informações detalhadas sobre a busca em largura
     * @param verticeInicial vértice de onde a busca foi iniciada
     */
    public void imprimirResultadoBFS(Vertice verticeInicial) {
        System.out.println("=== Resultado da Busca em Largura ===");
        System.out.println("Vértice inicial: " + verticeInicial.getNome());
        
        List<Vertice> ordemVisita = executarBFS(verticeInicial);
        
        System.out.println("\nOrdem de visita dos vértices:");
        for (int i = 0; i < ordemVisita.size(); i++) {
            Vertice v = ordemVisita.get(i);
            System.out.println((i + 1) + ". Vértice " + v.getNome() + 
                             " (distância: " + v.getDistancia() + 
                             ", pai: " + (v.getPai() != null ? v.getPai().getNome() : "null") + ")");
        }
        
        System.out.println("\nConectividade: " + 
                         (verificarConectividade(verticeInicial) ? "Todos os vértices são acessíveis" : 
                          "Existem vértices inacessíveis"));
    }
}
