public class InverterComLaco {
    public static void main(String[] args) {
        String palavra = "Ornitorrinco";
        String invertida = "";


// Percorre a palavra de trás para frente (do último caractere até o primeiro),
// concatenando cada caractere na variável 'invertida' para formar a palavra invertida.
        for (int i = palavra.length() - 1; i >= 0; i--) {
            invertida += palavra.charAt(i);
        }

        System.out.println("Original: " + palavra);
        System.out.println("Invertida: " + invertida);
    }
}
