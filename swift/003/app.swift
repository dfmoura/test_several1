// app.swift

let numeros = [10,12,16,18,22]

func buscaLinear(numeros: [Int], valorBuscado: Int) -> Bool {
    for numero in numeros{
        if numero == valorBuscado{
            return true
        }else if numero > valorBuscado {
            return false
        }
    }
    return false
}

if buscaLinear(numeros: numeros, valorBuscado:100){
    print("Valor encontrado")
}else{
    print("Valor nao encontrado")
}