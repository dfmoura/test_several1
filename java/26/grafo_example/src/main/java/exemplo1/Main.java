package exemplo1;

public class Main {
    public static void main(String[] args) {
        // Criando o grafo
        Grafo grafo = new Grafo();

        // Adicionando vértices
        grafo.adicionarVertice("A");
        grafo.adicionarVertice("B");
        grafo.adicionarVertice("C");
        grafo.adicionarVertice("D");
        grafo.adicionarVertice("E");

        // Adicionando arestas
        grafo.adicionarAresta("A", "B");
        grafo.adicionarAresta("A", "C");
        grafo.adicionarAresta("B", "D");
        grafo.adicionarAresta("D", "E");

        // Exibindo o grafo
        grafo.exibirGrafo();
    }
}
