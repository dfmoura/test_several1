import java.util.ArrayList;
import java.util.List;

public class Graph {

    private int V; //declaração de variavel privada, so pode ser acessadas dentro da propria classe
    private List<List<Integer>> adj; //declara uma lista de uma lista, numero de vertices e os vertices que estao ligados a ele.
    private boolean directed; // false possui ida e volta, true so ida

    public Graph(int v, boolean directed) {
        V = v;
        this.directed = directed;
        adj = new ArrayList<>(V);
        for ( int i = 0; i<V; i++){
            adj.add(new ArrayList<>());
        }
    }


    // Adiciona uma aresta u -> v
    public void addEdge(int u, int v) {
        if (u < 0 || u >= V || v < 0 || v >= V) {
            throw new IllegalArgumentException("Vértice fora do intervalo: u=" + u + " v=" + v);
        }

        adj.get(u).add(v);
        if (!directed) {
            adj.get(v).add(u); // se não for dirigido, adiciona a volta
        }
    }


    // Imprime a lista de adjacência
    public void printGraph() {
        System.out.println("Lista de Adjacência:");
        for (int i = 0; i < V; i++) {
            System.out.print(i + " -> ");
            List<Integer> neighbors = adj.get(i);
            for (int j = 0; j < neighbors.size(); j++) {
                System.out.print(neighbors.get(j));
                if (j < neighbors.size() - 1) System.out.print(", ");
            }
            System.out.println();
        }
    }


    // Exemplo de uso
    public static void main(String[] args) {
        // 1) Criar grafo com 5 vértices (0..4), não direcionado
        Graph g = new Graph(5, false);

        // 2) Adicionar arestas (liga ponto -> ponto)
        g.addEdge(0, 1);
        g.addEdge(0, 3);
        g.addEdge(0, 4);

        g.addEdge(1, 2);
        g.addEdge(1, 3);
        g.addEdge(1, 4);
        g.addEdge(2, 3);
        g.addEdge(3, 4);

        // 3) Mostrar estrutura
        g.printGraph();
    }











}
