package exemplo1;


import java.util.*;

public class Grafo {
    // Mapa que irá armazenar os vértices e suas conexões
    private Map<String, List<String>> adjacencias;

    // Construtor
    public Grafo(){
        adjacencias = new HashMap<>();
    }

    //Método para adcionar um vértice
    public void adicionarVertice(String vertice){
        adjacencias.putIfAbsent(vertice, new ArrayList<>());
    }

    // Método para adicionar uma aresta entre dois vértice (não direcionado)
    public void adicionarAresta(String vertice1, String vertice2){
        adjacencias.get(vertice1).add(vertice2);
        adjacencias.get(vertice2).add(vertice1);
    }

    // Método para exibir o grafo
    public void exibirGrafo(){
        for (String vertice : adjacencias.keySet()){
            System.out.print(vertice + " -> ");
            List<String> conexoes = adjacencias.get(vertice);
            for (String conexao : conexoes){
                System.out.print(conexao + " ");
            }
            System.out.println();
        }
    }
}
