/*em um cercado ha varios patos e coelhos, escreva um programa que solicite ao
usuario o total de cabeças e o total de pés, e determine quantos coelhos se
encontram nesse cercado*/
#include <stdio.h>
int main() {

    float  cobre,zinco,latao;
    printf("Digite quantos quilos de LATÃO você necessita: ");
    scanf("%f",&latao);
    printf("Para esta quantidade de LATÃO, serão necessários: %.2fkg de cobre e %.2fkg de zinco.\n",latao*0.7,latao*0.3)
    return 0;
}
