public class ContaCorrente extends Conta {
    private double limiteChequeEspecial;

    public ContaCorrente(double limiteChequeEspecial){
        this.limiteChequeEspecial = limiteChequeEspecial;
    }

    @Override
    public void sacar(double valor){
        if(saldo + limiteChequeEspecial >= valor){
            saldo -= valor;
        }else{
            System.out.println("Saldo insuficiente");
        }
    }

    @Override
    public void imprimirExtrato(){
        System.out.println("Extrato da conta corrente - Saldo: "+saldo+" limite: "+limiteChequeEspecial);
    }

}
