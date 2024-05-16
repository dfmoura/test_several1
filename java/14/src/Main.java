public class Main {
    public static void main(String[] args) {
        Conta ContaCorrente = new ContaCorrente(500);
        Conta ContaPoupanca = new ContaPoupanca(0.5);

        ContaCorrente.depositar(50);
        ContaCorrente.sacar(10);
        ContaCorrente.imprimirExtrato();

        ContaPoupanca.depositar(800);
        ContaPoupanca.sacar(10);
        ContaPoupanca.imprimirExtrato();
        
    }
}
