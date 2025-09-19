public class Main {
    public static void main(String[] args) {
        Integer[][] arestas = {
                {0,1},{0,2},{1,3},{2,3},{3,4}
        };

        ListaAdjacencia grafo = new ListaAdjacencia(5, arestas);
        BuscaLargura bfs = new BuscaLargura();

        Vertice origem = grafo.obterVertice(0);
        bfs.executar(grafo, origem);

        grafo.obterVertices().forEach(v -> {
            System.out.println("Vértice: " + v.getNome() +
                    " | Distância: " + v.getDistancia() +
                    " | Pai: " + (v.getPai() != null ? v.getPai().getNome() : "null"));
        });
    }
}
