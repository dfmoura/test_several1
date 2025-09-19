import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Objects;
import java.util.stream.IntStream;
import java.util.stream.Stream;


public class ListaAdjacencia {

    private Integer numVertices;
    private List<List<Vertice>> adjacencias;
    private List<Vertice> vertices;

    public ListaAdjacencia (Integer numVertices, Integer[][] arestas){
        this.numVertices = numVertices;
        this.vertices = new ArrayList<Vertice>();
        this.adjacencias = new ArrayList<List<Vertice>>();

        IntStream.range(0,numVertices).forEach(i ->{
            this.adjacencias.add(new ArrayList<Vertice>());
            this.vertices.add(new Vertice(i));
        });

        this. adjacencias.stream().forEach(a -> a = new ArrayList<Vertice>());
        Stream.of(arestas).forEach(a -> this.adjacencias.get(a[0]).add(this.vertices.get(a[1])));
    }

    public List<Vertice> obterAdjacentes(Vertice vertice){
        var adjacentes = this.adjacencias.get(vertice.getNome());
        return Objects.nonNull(adjacentes) ? adjacentes : Collections.emptyList();
    }

    public Vertice obterVertice (Integer nomeVertice){
        return this.vertices.get(nomeVertice);
    }

    public List<Vertice> obterVertices(){
        return this.vertices;
    }

    public void imprimir(){
        IntStream.range(0,numVertices).forEach(i -> {
            System.out.print(i + " -> ");
            this.adjacencias.get(i).forEach(v ->
                    System.out.print(v.getNome()+" - "));
            System.out.println();
        });
    }
}
