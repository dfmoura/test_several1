import java.util.*;

/**
 * Classe que representa o grafo do mapa brasileiro
 * Gerencia as cidades e rodovias, implementando operações de busca e navegação
 */
public class GrafoMapa {
    private Map<Cidade, List<Rodovia>> grafo;
    private List<Cidade> cidades;
    private List<Rodovia> rodovias;
    
    /**
     * Construtor da classe GrafoMapa
     * Inicializa as estruturas de dados do grafo
     */
    public GrafoMapa() {
        this.grafo = new HashMap<>();
        this.cidades = new ArrayList<>();
        this.rodovias = new ArrayList<>();
    }
    
    /**
     * Adiciona uma cidade ao grafo
     * @param cidade Cidade a ser adicionada
     */
    public void adicionarCidade(Cidade cidade) {
        if (!cidades.contains(cidade)) {
            cidades.add(cidade);
            grafo.put(cidade, new ArrayList<>());
        }
    }
    
    /**
     * Adiciona uma rodovia ao grafo
     * @param rodovia Rodovia a ser adicionada
     */
    public void adicionarRodovia(Rodovia rodovia) {
        if (!rodovias.contains(rodovia)) {
            rodovias.add(rodovia);
            
            // Adiciona as cidades se não existirem
            adicionarCidade(rodovia.getOrigem());
            adicionarCidade(rodovia.getDestino());
            
            // Conecta as cidades no grafo
            grafo.get(rodovia.getOrigem()).add(rodovia);
            grafo.get(rodovia.getDestino()).add(rodovia);
        }
    }
    
    /**
     * Retorna todas as cidades do grafo
     * @return Lista de cidades
     */
    public List<Cidade> getCidades() {
        return new ArrayList<>(cidades);
    }
    
    /**
     * Retorna todas as rodovias do grafo
     * @return Lista de rodovias
     */
    public List<Rodovia> getRodovias() {
        return new ArrayList<>(rodovias);
    }
    
    /**
     * Retorna as rodovias que partem de uma cidade específica
     * @param cidade Cidade de origem
     * @return Lista de rodovias que partem da cidade
     */
    public List<Rodovia> getRodoviasDe(Cidade cidade) {
        return grafo.getOrDefault(cidade, new ArrayList<>());
    }
    
    /**
     * Retorna as cidades conectadas diretamente a uma cidade
     * @param cidade Cidade de origem
     * @return Lista de cidades conectadas
     */
    public List<Cidade> getCidadesConectadas(Cidade cidade) {
        List<Cidade> conectadas = new ArrayList<>();
        for (Rodovia rodovia : getRodoviasDe(cidade)) {
            Cidade destino = rodovia.getDestinoDe(cidade);
            if (destino != null) {
                conectadas.add(destino);
            }
        }
        return conectadas;
    }
    
    /**
     * Busca uma cidade pelo nome
     * @param nome Nome da cidade
     * @return Cidade encontrada ou null se não existir
     */
    public Cidade buscarCidade(String nome) {
        return cidades.stream()
                .filter(cidade -> cidade.getNome().equalsIgnoreCase(nome))
                .findFirst()
                .orElse(null);
    }
    
    /**
     * Verifica se existe conexão direta entre duas cidades
     * @param cidade1 Primeira cidade
     * @param cidade2 Segunda cidade
     * @return true se existe conexão direta
     */
    public boolean temConexaoDireta(Cidade cidade1, Cidade cidade2) {
        return getRodoviasDe(cidade1).stream()
                .anyMatch(rodovia -> rodovia.conecta(cidade1, cidade2));
    }
    
    /**
     * Busca caminho entre duas cidades usando busca em largura (BFS)
     * @param origem Cidade de origem
     * @param destino Cidade de destino
     * @return Lista de cidades no caminho, ou lista vazia se não houver caminho
     */
    public List<Cidade> buscarCaminho(Cidade origem, Cidade destino) {
        if (origem.equals(destino)) {
            return Arrays.asList(origem);
        }
        
        Queue<Cidade> fila = new LinkedList<>();
        Map<Cidade, Cidade> anterior = new HashMap<>();
        Set<Cidade> visitados = new HashSet<>();
        
        fila.offer(origem);
        visitados.add(origem);
        
        while (!fila.isEmpty()) {
            Cidade atual = fila.poll();
            
            for (Cidade vizinha : getCidadesConectadas(atual)) {
                if (!visitados.contains(vizinha)) {
                    visitados.add(vizinha);
                    anterior.put(vizinha, atual);
                    fila.offer(vizinha);
                    
                    if (vizinha.equals(destino)) {
                        return reconstruirCaminho(anterior, origem, destino);
                    }
                }
            }
        }
        
        return new ArrayList<>(); // Caminho não encontrado
    }
    
    /**
     * Reconstrói o caminho a partir do mapa de predecessores
     * @param anterior Mapa de predecessores
     * @param origem Cidade de origem
     * @param destino Cidade de destino
     * @return Lista do caminho reconstruído
     */
    private List<Cidade> reconstruirCaminho(Map<Cidade, Cidade> anterior, Cidade origem, Cidade destino) {
        List<Cidade> caminho = new ArrayList<>();
        Cidade atual = destino;
        
        while (atual != null) {
            caminho.add(0, atual);
            atual = anterior.get(atual);
        }
        
        return caminho;
    }
    
    /**
     * Retorna estatísticas do grafo
     * @return String com estatísticas do grafo
     */
    public String getEstatisticas() {
        return String.format("Grafo do Mapa Brasileiro:\n" +
                "- Total de cidades: %d\n" +
                "- Total de rodovias: %d\n" +
                "- Média de conexões por cidade: %.2f",
                cidades.size(),
                rodovias.size(),
                cidades.isEmpty() ? 0.0 : (double) rodovias.size() * 2 / cidades.size());
    }
    
    /**
     * Retorna uma representação em string do grafo
     * @return String formatada com todas as conexões
     */
    @Override
    public String toString() {
        StringBuilder sb = new StringBuilder();
        sb.append("=== MAPA DO BRASIL - GRAFO DE CAPITAIS E RODOVIAS ===\n\n");
        
        for (Cidade cidade : cidades) {
            sb.append(cidade).append(" (").append(cidade.getRegiao()).append("):\n");
            List<Cidade> conectadas = getCidadesConectadas(cidade);
            if (conectadas.isEmpty()) {
                sb.append("  - Sem conexões diretas\n");
            } else {
                for (Cidade conectada : conectadas) {
                    sb.append("  → ").append(conectada).append("\n");
                }
            }
            sb.append("\n");
        }
        
        return sb.toString();
    }
}
