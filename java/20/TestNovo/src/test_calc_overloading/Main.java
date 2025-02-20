package test_calc_overloading;

public class Main {
    public static void main(String[] args) {
        Calculadora calc = new Calculadora();
        System.out.println(calc.soma(2, 3));      // Chama soma(int, int)
        System.out.println(calc.soma(2, 3, 4));   // Chama soma(int, int, int)
    }
}