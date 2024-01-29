/*em um cercado ha varios patos e coelhos, escreva um programa que solicite ao
usuario o total de cabeças e o total de pés, e determine quantos coelhos se
encontram nesse cercado*/
#include <stdio.h>
int main() {

    float  colocado1,colocado2,colocado3,parte_colocado1,parte_colocado2,parte_colocado3;
    printf("Digite o total de pontos que o Colocado 1 alcançou: ");
    scanf("%d",&colocado1);
    printf("Digite o total de pontos que o Colocado 2 alcançou: ");
    scanf("%d",&colocado2);
    printf("Digite o total de pontos que o Colocado 3 alcançou: ");
    scanf("%d",&colocado3);

    parte_colocado1 = (colocado1/(colocado1+colocado2+colocado3))*780000;
    parte_colocado2 = (colocado2/(colocado1+colocado2+colocado3))*780000;
    parte_colocado3 = (colocado3/(colocado1+colocado2+colocado3))*780000;
    printf("Colocado 1 tem direito a R$%.2f do valor do prêmio.\n",parte_colocado1);
    printf("Colocado 2 tem direito a R$%.2f do valor do prêmio.\n",parte_colocado2);
    printf("Colocado 3 tem direito a R$%.2f do valor do prêmio.\n",parte_colocado3);
    return 0;
}
