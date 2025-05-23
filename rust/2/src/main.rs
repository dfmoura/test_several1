struct Usuario{
    ativo: bool,
    nome: String,
    saldo: f64,
}


fn main() {

    let cliente: Usuario = Usuario {
        ativo: true,
        nome: String::from("Diogo"),
        saldo: 100.0,
    };
    println!("{} {} {}", cliente.ativo, cliente.nome, cliente.saldo);

}
