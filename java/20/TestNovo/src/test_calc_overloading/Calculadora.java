package test_calc_overloading;

class Calculadora {
    int soma(int a, int b) {
        return a + b;
    }

    int soma(int a, int b, int c) {  // Sobrecarga: mesmo nome, mas parâmetros diferentes
        return a + b + c;
    }
}