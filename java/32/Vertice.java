/**
 * Classe que representa um vértice do grafo
 * Contém informações sobre o nome, status de visita, distância e vértice pai
 */
public class Vertice {
    private Integer nome;
    private StatusVisitaVertice status;
    private Integer distancia;
    private Vertice pai;
    
    /**
     * Construtor que inicializa um vértice com nome
     * @param nome identificador do vértice
     */
    public Vertice(Integer nome) {
        this.nome = nome;
        this.status = StatusVisitaVertice.NOVO;
        this.distancia = null;
        this.pai = null;
    }
    
    /**
     * Construtor que inicializa um vértice com nome e status
     * @param nome identificador do vértice
     * @param status status de visita do vértice
     */
    public Vertice(Integer nome, StatusVisitaVertice status) {
        this.nome = nome;
        this.status = status;
        this.distancia = null;
        this.pai = null;
    }
    
    /**
     * Retorna o nome do vértice
     * @return nome do vértice
     */
    public Integer getNome() {
        return nome;
    }
    
    /**
     * Define o nome do vértice
     * @param nome novo nome do vértice
     */
    public void setNome(Integer nome) {
        this.nome = nome;
    }
    
    /**
     * Retorna o status de visita do vértice
     * @return status de visita
     */
    public StatusVisitaVertice getStatus() {
        return status;
    }
    
    /**
     * Define o status de visita do vértice
     * @param status novo status de visita
     */
    public void setStatus(StatusVisitaVertice status) {
        this.status = status;
    }
    
    /**
     * Retorna a distância do vértice
     * @return distância do vértice
     */
    public Integer getDistancia() {
        return distancia;
    }
    
    /**
     * Define a distância do vértice
     * @param distancia nova distância
     */
    public void setDistancia(Integer distancia) {
        this.distancia = distancia;
    }
    
    /**
     * Retorna o vértice pai
     * @return vértice pai
     */
    public Vertice getPai() {
        return pai;
    }
    
    /**
     * Define o vértice pai
     * @param pai novo vértice pai
     */
    public void setPai(Vertice pai) {
        this.pai = pai;
    }
    
    /**
     * Retorna uma representação em string do vértice
     * @return string representando o vértice
     */
    @Override
    public String toString() {
        return "Vértice{" +
                "nome=" + nome +
                ", status=" + status +
                ", distancia=" + distancia +
                ", pai=" + (pai != null ? pai.getNome() : "null") +
                '}';
    }
}
