public class ContaPoupanca extends Conta{
    private double taxaJuros;

    public ContaPoupanca (double taxaJuros){
        this.taxaJuros = taxaJuros;
    }

    @Override
    public void sacar(double valor){
        if (saldo>= valor){
            saldo-=valor;
        }else{
            System.out.println("Saldo insuficiente");
        }
    }

    public void aplicarJuros(){
        saldo += saldo*taxaJuros;
    }

    @Override
    public void imprimirExtrato(){
        System.out.println("extrato da poupança - Saldo: "+saldo);
    }



}