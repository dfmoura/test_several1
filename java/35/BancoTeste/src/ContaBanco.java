import java.util.Objects;

public class ContaBanco {

    public int numConta;
    protected String tipo;
    private String dono;
    private float saldo;
    private boolean status;




    public void estadoAtual(){
        System.out.println("----------------------------------");
        System.out.println("Conta: "+this.getNumConta());
        System.out.println("Tipo: "+this.getTipo());
        System.out.println("Dono: "+this.getDono());
        System.out.println("Saldo: "+this.getSaldo());
        System.out.println("Status: "+this.isStatus());

    }

    public void abrirConta(String t){
        this.setTipo(t);
        this.setStatus(true);
        if (Objects.equals(t, "CC")){
            this.setSaldo(50);
            System.out.println("Conta corrente aberta com sucesso!");
        }else if (Objects.equals(t, "CP")){
            this.setSaldo(150);
            System.out.println("Conta poupança aberta com sucesso!");
        }

    }

    public void fecharConta(){
        if(this.getSaldo()>0){
            System.out.println("Conta não pode ser fechada porque ainda tem dinheiro!");
        }else if (this.getSaldo()<0){
            System.out.println("Conta não pode ser fechada porque ainda tem dinheiro!");
        }else{
            this.setStatus(false);
            System.out.println("Conta fechada com sucesso!");
        }

    }

    public void depositar(float v){
        if (this.isStatus()){
            this.setSaldo(this.getSaldo()+v);
            System.out.println("Deposito realizado na conta de "+this.getDono());

        }else{
            System.out.println("Impossível depositar em uma conta fechada!");
        }
    }

    public void sacar(float v){
        if (this.isStatus()){
            if (this.getSaldo()>= v){
                this.setSaldo(this.getSaldo()-v);
                System.out.println("Saque realizado na conta de "+this.getDono());
            }else{
                System.out.println("Saldo insuficiente para saque!");
            }
        } else {
            System.out.println("Impossível sacar de uma conta fechada!");
        }
    }

    public void pagarMensal(){
        int v=0;
        if (Objects.equals(this.getTipo(), "CC")){
            v=12;
        }else if (Objects.equals(this.getTipo(), "CP")){
            v=20;
        }
        if(this.isStatus()){
            this.setSaldo(this.getSaldo()-v);
            System.out.println("Mensalidade paga com sucesso por "+this.getDono());
        }else {
            System.out.println("Impossível pagar uma conta fechada!");
        }
    }

    public ContaBanco() {
        this.setSaldo(0);
        this.setStatus(false);
    }

    public int getNumConta() {
        return numConta;
    }

    public void setNumConta(int numConta) {
        this.numConta = numConta;
    }

    public String getTipo() {
        return tipo;
    }

    public void setTipo(String tipo) {
        this.tipo = tipo;
    }

    public String getDono() {
        return dono;
    }

    public void setDono(String dono) {
        this.dono = dono;
    }

    public float getSaldo() {
        return saldo;
    }

    public void setSaldo(float saldo) {
        this.saldo = saldo;
    }

    public boolean isStatus() {
        return status;
    }

    public void setStatus(boolean status) {
        this.status = status;
    }
}
