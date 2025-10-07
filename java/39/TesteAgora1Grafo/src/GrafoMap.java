import java.util.*;


public class GrafoMap {
    private Map<String, List<String>> adj;
    private boolean directed;

    //Construtor
    public GrafoMap(Boolean directed){
        this.directed = directed;
        this.adj = new HashMap<>();
        }
    // Adiciona um vértice (se não existir ainda)
    public void addVertex(String v){
        adj.putIfAbsent(v,new ArrayList<>());
    }

    // Adiciona uma aresta entre u e v
    public void addEdge(String u, String v){
        // garante que os vértices existem
        addVertex(u);
        addVertex(v);

        // adiciona ligação u -> v
        adj.get(u).add(v);

        // se não for direcionado , também adiciona v -> u
        if(!directed){
            adj.get(v).add(u);
        }

    }

     // imprime lista de adjacencia
     public void printGraph(){
         System.out.println("Lista de Adjacência:");
         for (String vertex : adj.keySet()) {
             System.out.println(vertex + " -> " + adj.get(vertex));
         }
    }


    // Exemplo de uso
    public static void main(String[] args) {
        GrafoMap g = new GrafoMap(false); // false = não direcionado

        // Adicionando arestas (os vértices são criados dinamicamente)
        g.addEdge("A", "B");
        g.addEdge("A", "C");
        g.addEdge("B", "D");
        g.addEdge("C", "D");
        g.addEdge("D", "E");

        g.printGraph();
    }


}
