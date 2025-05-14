import 'mmy_project.dart';
import 'notas.dart';
import 'dart:io';
import 'dart:math';

void main() {
    print(mmy_project);

    var n1 = 10.0;
    var n2 = 7.0;

    var media = calcularMedia(n1, n2);
    print("A média entre $n1 e $n2 é: $media\n");
    
    print("Digite um valor inteiro não negativo: ");
    var n = int.parse(stdin.readLineSync()!);
    print('$n! = ${fatorial(n)}');
    print("");


    const tamanhoLista = 10;
    List<double> lista = geradorDeLista(tamanhoLista);

    var maiorValor = lista[0];
    var posicao = 1;
    while (posicao < tamanhoLista) {
        if (lista[posicao] > maiorValor) {
        maiorValor = lista[posicao];
        }
        posicao++;
    }
    print("Conteúdo da lista: $lista");
    print("Maior valor da lista: $maiorValor\n");



    int palpite;
    Random rand = new Random();
    int resposta = rand.nextInt(100);
    do{
        print("Tente adivinha o número:");
        String temp = stdin.readLineSync()!;
        palpite = int.parse(temp);
        if(palpite < resposta){
            print("Valor muito baixo!");
        }else if(palpite > resposta){
            print("Valor muito alto!");
    }
    }while(palpite != resposta);
    print("Acertou!\n");


    print("A:Converter Celsius para Fahrenheit\nB:Converter Fahrenheit para Celsius");
    String? opcao;
    do{
        opcao = stdin.readLineSync()?.toUpperCase();
    }while(opcao != "A" && opcao != "B");
    print("Informe a temperatura:");
    String temper = stdin.readLineSync()!;
    int temperatura = int.parse(temper);
    switch(opcao){
        case "A":
            print("$temperatura graus Celsius equiva a ${temperatura* 1.8 +32} graus Fahrenheit");
            break;
        case "B":
            print("$temperatura graus Fahrenheit equiva a ${(temperatura-32)/1.8} graus Celsius");
            break;
    }


    const int TENTATIVAS = 1000000;
    int corretas = 0;
    Random rand1 = new Random();
    for (int i = 0; i < TENTATIVAS; i++) {
        int portaPremio = rand1.nextInt(3) + 1;
        int escolha = 1;
        int eliminada;

        if(portaPremio == 2){
            eliminada = 3;
        }else if (portaPremio == 3){
            eliminada = 2;
    }else {
        eliminada  = rand1.nextInt(2) + 2;
    }

    if (eliminada == 2){
        escolha = 3;
    } else if (eliminada == 3){
        escolha = 2;
    }
        if (escolha == portaPremio){
            corretas++;
        }
    }
    print("A porcentagem de escolhas corretas foi de ${corretas / TENTATIVAS * 100}%\n");




    const int ITERACOES = 1000;
    double serie = 1.0;
    double denominador = 3.0;
    double sinal = -1.0;

    for(int i=0; i < ITERACOES; i++){
        serie += sinal * (1 / denominador);
        denominador += 2.0;
        sinal *= -1.0;
    }
    double pi = 4 * serie;
    print("Valor calculado de pi: $pi\n");



    double nota1 = 10.0;
    double nota2 = 7.0;
    double media1 = calcularMedia(nota1, nota2);
    print("A média entre $nota1 e $nota2 é: $media1 \n");



}



    double calcularMedia(double n1, double n2) {
    return (n1 + n2) / 2;
    }


    int fatorial (int n){
        if (n <=0) return 1;
        else return n * fatorial(n-1);
    }


List<double> geradorDeLista(int n) {
  var rng = Random();
  List<double> lista = <double>[];
  for (var i = 0; i < n; i++) {
    lista.add(rng.nextDouble() * 50);
  }
  return lista;
}