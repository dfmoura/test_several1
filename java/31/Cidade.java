/**
 * Classe que representa uma cidade no problema do caixeiro viajante.
 * Cada cidade tem um nome e coordenadas (x, y) no plano cartesiano.
 * 
 * O problema do caixeiro viajante consiste em encontrar o caminho mais curto
 * que visite todas as cidades exatamente uma vez e retorne à cidade inicial.
 */
public class Cidade {
    private String nome;
    private double x; // Coordenada X no plano cartesiano
    private double y; // Coordenada Y no plano cartesiano
    
    /**
     * Construtor para criar uma nova cidade
     * @param nome Nome da cidade
     * @param x Coordenada X
     * @param y Coordenada Y
     */
    public Cidade(String nome, double x, double y) {
        this.nome = nome;
        this.x = x;
        this.y = y;
    }
    
    /**
     * Calcula a distância euclidiana entre esta cidade e outra cidade
     * @param outraCidade A cidade de destino
     * @return A distância entre as duas cidades
     */
    public double calcularDistancia(Cidade outraCidade) {
        double deltaX = this.x - outraCidade.x;
        double deltaY = this.y - outraCidade.y;
        return Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    }
    
    // Getters para acessar os atributos
    public String getNome() {
        return nome;
    }
    
    public double getX() {
        return x;
    }
    
    public double getY() {
        return y;
    }
    
    /**
     * Representação em string da cidade
     * @return String formatada com nome e coordenadas
     */
    @Override
    public String toString() {
        return String.format("%s (%.1f, %.1f)", nome, x, y);
    }
}
