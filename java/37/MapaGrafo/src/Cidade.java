/**
 * Classe que representa uma cidade capital no mapa do Brasil
 * Contém informações básicas como nome, estado e região
 */
public class Cidade {
    private String nome;
    private String estado;
    private String regiao;
    
    /**
     * Construtor da classe Cidade
     * @param nome Nome da cidade
     * @param estado Sigla do estado
     * @param regiao Região do Brasil (Norte, Nordeste, etc.)
     */
    public Cidade(String nome, String estado, String regiao) {
        this.nome = nome;
        this.estado = estado;
        this.regiao = regiao;
    }
    
    // Getters
    public String getNome() {
        return nome;
    }
    
    public String getEstado() {
        return estado;
    }
    
    public String getRegiao() {
        return regiao;
    }
    
    /**
     * Retorna uma representação em string da cidade
     * @return String formatada com nome e estado
     */
    @Override
    public String toString() {
        return nome + " (" + estado + ")";
    }
    
    /**
     * Verifica se duas cidades são iguais baseado no nome
     * @param obj Objeto a ser comparado
     * @return true se as cidades forem iguais
     */
    @Override
    public boolean equals(Object obj) {
        if (this == obj) return true;
        if (obj == null || getClass() != obj.getClass()) return false;
        Cidade cidade = (Cidade) obj;
        return nome.equals(cidade.nome);
    }
    
    /**
     * Gera hash code baseado no nome da cidade
     * @return Hash code da cidade
     */
    @Override
    public int hashCode() {
        return nome.hashCode();
    }
}
