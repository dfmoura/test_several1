/**
 * Classe que representa uma rodovia federal no mapa do Brasil
 * Contém informações sobre a rodovia e as cidades que ela conecta
 */
public class Rodovia {
    private String numero;
    private Cidade origem;
    private Cidade destino;
    private String descricao;
    
    /**
     * Construtor da classe Rodovia
     * @param numero Número da rodovia (ex: "BR-010")
     * @param origem Cidade de origem
     * @param destino Cidade de destino
     * @param descricao Descrição adicional da rodovia
     */
    public Rodovia(String numero, Cidade origem, Cidade destino, String descricao) {
        this.numero = numero;
        this.origem = origem;
        this.destino = destino;
        this.descricao = descricao;
    }
    
    // Getters
    public String getNumero() {
        return numero;
    }
    
    public Cidade getOrigem() {
        return origem;
    }
    
    public Cidade getDestino() {
        return destino;
    }
    
    public String getDescricao() {
        return descricao;
    }
    
    /**
     * Retorna uma representação em string da rodovia
     * @return String formatada com número e cidades conectadas
     */
    @Override
    public String toString() {
        return numero + ": " + origem + " → " + destino;
    }
    
    /**
     * Verifica se a rodovia conecta duas cidades específicas
     * @param cidade1 Primeira cidade
     * @param cidade2 Segunda cidade
     * @return true se a rodovia conecta as duas cidades
     */
    public boolean conecta(Cidade cidade1, Cidade cidade2) {
        return (origem.equals(cidade1) && destino.equals(cidade2)) ||
               (origem.equals(cidade2) && destino.equals(cidade1));
    }
    
    /**
     * Retorna a cidade de destino a partir de uma cidade de origem
     * @param cidadeOrigem Cidade de origem
     * @return Cidade de destino, ou null se a cidade não for origem desta rodovia
     */
    public Cidade getDestinoDe(Cidade cidadeOrigem) {
        if (origem.equals(cidadeOrigem)) {
            return destino;
        } else if (destino.equals(cidadeOrigem)) {
            return origem;
        }
        return null;
    }
}
