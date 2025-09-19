public class Vertice {
    private Integer nome;
    private StatusVisitaVertice status;
    private Integer distancia;
    private Vertice pai;

    public Vertice(Integer nome) {
        this.nome = nome;
    }

    public Vertice(Integer nome, StatusVisitaVertice status) {
        this.nome = nome;
        this.status = status;
    }

    public Integer getNome() {
        return nome;
    }

    public void setNome(Integer nome) {
        this.nome = nome;
    }

    public StatusVisitaVertice getStatus() {
        return status;
    }

    public void setStatus(StatusVisitaVertice status) {
        this.status = status;
    }

    public Integer getDistancia() {
        return distancia;
    }

    public void setDistancia(Integer distancia) {
        this.distancia = distancia;
    }

    public Vertice getPai() {
        return pai;
    }

    public void setPai(Vertice pai) {
        this.pai = pai;
    }
}
