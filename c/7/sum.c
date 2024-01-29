#include <stdio.h>
#include <stdlib.h>

int main() {

    //operadores aritmeticos de atribuicao
    float nota, media = 0.0;

    printf("\nDigite a primeira nota: ");
    scanf("%f",&nota);
    media += nota;

    printf("\nDigite a segunda nota: ");
    scanf("%f",&nota);
    media += nota;    

    printf("\nDigite a terceira nota: ");
    scanf("%f",&nota);
    media += nota;

    printf("\nDigite a quarta nota: ");
    scanf("%f",&nota);
    media += nota;

    media /= 4.0;
    printf("\nMEDIA: %.2f\n",media);

    return 0;

}
