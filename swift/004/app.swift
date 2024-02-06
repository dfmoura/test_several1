// app.swift

let numeros = [10,12,16,18,22]

func buscaBinaria (_ numeros: [Int], _ valorProcurado: Int) -> Bool {
    var inicio = 0
    var fim = numeros.count - 1

    while inicio <= fim {
        let meio = (inicio + fim) / 2

        if numeros[meio] == valorProcurado {
            return true
        }
        
        if numeros[meio] < valorProcurado {
            inicio = meio + 1
        } else {
            fim = meio - 1
        }
    }
    return false
}

if buscaBinaria(numeros, 2) {
    print("Valor encontrado")
} else {
    print("Valor nao encontrado")
}