import java.util.LinkedList;
import java.util.Queue;

public class BuscaLargura {

    public void executar(ListaAdjacencia grafo, Vertice origem) {
        // Inicializa todos os vértices como não visitados
        grafo.obterVertices().forEach(v -> {
            v.setStatus(StatusVisitaVertice.NOVO);
            v.setDistancia(Integer.MAX_VALUE);
            v.setPai(null);
        });

        // Configura o vértice de origem
        origem.setStatus(StatusVisitaVertice.VISITADO);
        origem.setDistancia(0);
        origem.setPai(null);

        // Cria a fila e insere a origem
        Queue<Vertice> fila = new LinkedList<>();
        fila.add(origem);

        // Loop da BFS
        while (!fila.isEmpty()) {
            Vertice u = fila.poll();

            // Para cada vizinho do vértice atual
            for (Vertice v : grafo.obterAdjacentes(u)) {
                if (v.getStatus() == StatusVisitaVertice.NOVO) {
                    v.setStatus(StatusVisitaVertice.VISITADO);
                    v.setDistancia(u.getDistancia() + 1);
                    v.setPai(u);
                    fila.add(v);
                }
            }
        }
    }
}
