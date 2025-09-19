import java.util.ArrayList;
import java.util.List;

class Grafo {
    private int numVertices;
    private List<List<Integer>> adjList;

    // Construtor
    public Grafo(int numVertices) {
        this.numVertices = numVertices;
        adjList = new ArrayList<>();
        for (int i = 0; i < numVertices; i++) {
            adjList.add(new ArrayList<>());
        }
    }

    // Adiciona uma aresta (não direcionada)
    public void adicionarAresta(int origem, int destino) {
        if (origem == destino) {
            System.out.println("Loops não são permitidos.");
            return;
        }
        if (!adjList.get(origem).contains(destino)) {
            adjList.get(origem).add(destino);
            adjList.get(destino).add(origem);
        } else {
            System.out.println("Aresta já existe.");
        }
    }

    // Exibe o grafo
    public void imprimirGrafo() {
        for (int i = 0; i < numVertices; i++) {
            System.out.print("Vértice " + i + ": ");
            for (int j : adjList.get(i)) {
                System.out.print(j + " ");
            }
            System.out.println();
        }
    }

    public static void main(String[] args) {
        Grafo g = new Grafo(5); // grafo com 5 vértices
        g.adicionarAresta(0, 1);
        g.adicionarAresta(0, 4);
        g.adicionarAresta(1, 2);
        g.adicionarAresta(1, 3);
        g.adicionarAresta(1, 4);
        g.adicionarAresta(2, 3);
        g.adicionarAresta(3, 4);

        g.imprimirGrafo();
    }
}
