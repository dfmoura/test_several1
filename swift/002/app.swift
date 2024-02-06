// app.swift

let numeros = [10,12,16,18,22]

func buscaLinear(numeros: [Int], valorBuscado: Int) -> Bool {
    for numero in numeros{
        if numero == valorBuscado{
            return true
        }
    }
    return false
}

if buscaLinear(numeros: numeros, valorBuscado:13){
    print("Valor encontrado")
}else{
    print("Valor nao encontrado")
}