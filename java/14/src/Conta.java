public abstract class Conta implements ContaBancaria{
	protected double saldo;
	
	
	@Override
	public void depositar(double valor) {
		saldo += valor;
	}
 
	@Override
	public abstract void sacar (double valor);
	
	@Override
	public double consultarSaldo() {
		return saldo;
	}
	
	public abstract void imprimirExtrato();
	
}
