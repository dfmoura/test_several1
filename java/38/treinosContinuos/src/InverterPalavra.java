public class InverterPalavra {
    public static void main(String[] args) {
        String palavra = "Onomatopeia";

        String invertida = new StringBuilder(palavra).reverse().toString();
        System.out.println("Original: "+palavra);
        System.out.println("Invertida: "+invertida);
    }
}
