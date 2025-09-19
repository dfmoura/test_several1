import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.IntStream;
import java.util.stream.Stream;

/**
 * Classe que representa um grafo usando lista de adjacências
 * Implementa a estrutura de dados para armazenar vértices e suas conexões
 */
public class ListaAdjacencia {
    private Integer numVertices;
    private List<List<Vertice>> adjacencias;
    private List<Vertice> vertices;
    
    /**
     * Construtor que inicializa a lista de adjacências
     * @param numVertices número total de vértices no grafo
     * @param arestas matriz de arestas onde cada linha representa uma aresta [origem, destino]
     */
    public ListaAdjacencia(Integer numVertices, Integer[][] arestas) {
        this.numVertices = numVertices;
        this.vertices = new ArrayList<Vertice>();
        this.adjacencias = new ArrayList<List<Vertice>>();
        
        // Inicializa os vértices e suas listas de adjacências
        IntStream.range(0, numVertices).forEach(i -> {
            this.adjacencias.add(new ArrayList<Vertice>());
            this.vertices.add(new Vertice(i));
        });
        
        // Adiciona as arestas ao grafo
        if (arestas != null) {
            Stream.of(arestas).forEach(aresta -> {
                if (aresta.length >= 2) {
                    this.adjacencias.get(aresta[0]).add(this.vertices.get(aresta[1]));
                }
            });
        }
    }
    
    /**
     * Retorna a lista de vértices adjacentes a um vértice dado
     * @param vertice vértice para o qual se quer obter os adjacentes
     * @return lista de vértices adjacentes
     */
    public List<Vertice> obterAdjacentes(Vertice vertice) {
        var adjacentes = this.adjacencias.get(vertice.getNome());
        return Objects.nonNull(adjacentes) ? adjacentes : Collections.emptyList();
    }
    
    /**
     * Retorna um vértice pelo seu nome/índice
     * @param nomeVertice nome/índice do vértice
     * @return vértice correspondente
     */
    public Vertice obterVertice(Integer nomeVertice) {
        return this.vertices.get(nomeVertice);
    }
    
    /**
     * Retorna todos os vértices do grafo
     * @return lista de todos os vértices
     */
    public List<Vertice> obterVertices() {
        return this.vertices;
    }
    
    /**
     * Retorna o número de vértices no grafo
     * @return número de vértices
     */
    public Integer getNumVertices() {
        return numVertices;
    }
    
    /**
     * Imprime a representação do grafo em formato de lista de adjacências
     */
    public void imprimir() {
        IntStream.range(0, numVertices).forEach(i -> {
            System.out.print(i + " -> ");
            this.adjacencias.get(i).forEach(v -> System.out.print(v.getNome() + " "));
            System.out.println();
        });
    }
    
    /**
     * Reinicia o status de todos os vértices para NOVO
     * Útil para executar múltiplas buscas
     */
    public void reiniciarStatus() {
        this.vertices.forEach(v -> {
            v.setStatus(StatusVisitaVertice.NOVO);
            v.setDistancia(null);
            v.setPai(null);
        });
    }
}
