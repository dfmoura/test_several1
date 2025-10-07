import java.util.ArrayList;
import java.util.List;


class Edge {
    int destino;
    int peso;

    Edge(int destino, int peso){
        this.destino = destino;
        this.peso = peso;
    }
}

    public class GrafoPonderado {

        private int V;                       // número de vértices
        private List<List<Edge>> adj;        // lista de adjacência
        private boolean directed;            // se o grafo é direcionado

        // Construtor
        public GrafoPonderado(int V, boolean directed){
            this.V = V;
            this.directed = directed;
            adj = new ArrayList<>(V);
            for(int i=0;i<V;i++){
                adj.add(new ArrayList<>());
            }
        }

        // Adiciona uma aresta com peso
        public void addEdge(int u, int v, int peso){
            if(u<0||u>=V||v<0||v>=V){
                throw new IllegalArgumentException("Vértice fora do intervalo: u="+u+" v="+v);
            }
            adj.get(u).add(new Edge(v,peso));
            if(!directed){
                adj.get(v).add(new Edge(u,peso)); // adiciona a volta se nao for direcionado
            }
        }


        // Impressao
        public void printGraph(){
            System.out.println("Lista de Adjacência (com pesos): ");
            for(int i =0; i<V;i++){
                System.out.print(i+" -> ");
                List<Edge> vizinhos = adj.get(i);
                for(int j = 0; j <vizinhos.size(); j++){
                    Edge e = vizinhos.get(j);
                    System.out.print(e.destino+"("+e.peso+")");
                    if(j<vizinhos.size()-1) System.out.print(", ");
                }
                System.out.println();
            }

        }

        // Exemplo
        public static void main(String[] args) {
            // Grafo com 5 vertices (0...4), nao direcionado
            GrafoPonderado g = new GrafoPonderado(5,false);

            // Adicionar arestas com peso

            g.addEdge(0,1,10);
            g.addEdge(0,4,20);
            g.addEdge(1,2,30);
            g.addEdge(1,3,40);
            g.addEdge(1,4,50);
            g.addEdge(2,3,60);
            g.addEdge(3,4,70);


            // Imprimir grafo
            g.printGraph();

        }



    }
