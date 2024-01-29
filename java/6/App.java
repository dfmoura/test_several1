import java.util.Scanner;

public class App {
    public static void main(String[] args) {
        Scanner leitorDeEntradas = new Scanner(System.in);

        try {
            float valorSalario = leitorDeEntradas.nextFloat();
            float valorBeneficios = leitorDeEntradas.nextFloat();
            float valorImposto;
            if (valorSalario <= 1100.00) {
                valorImposto = 0.05F * valorSalario;
            } else if (valorSalario>= 1100.01 && valorSalario <= 2500.00) {
                valorImposto = 0.10F * valorSalario;
            } else {
                valorImposto = 0.15F * valorSalario;
            }
            float saida = valorSalario - valorImposto + valorBeneficios;
            System.out.printf(String.format("%.2f", saida));
        } catch (InputMismatchException e) {
            System.out.println("...............");
        } finally {
            leitorDeEntradas.close(); //
        }   
    }
}    
         