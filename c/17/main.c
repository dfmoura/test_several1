/*em um cercado ha varios patos e coelhos, escreva um programa que solicite ao
usuario o total de cabeças e o total de pés, e determine quantos coelhos se
encontram nesse cercado*/
#include <stdio.h>
int main() {
    int cabecas, pes,coelhos, patos;
    printf("Digite o total de cabeças: ");
    scanf("%d", &cabecas);
    printf("Digite o total de pés: ");
    scanf("%d", &pes);
    // total de coelhos e patos
    coelhos = (pes - 2 * cabecas) / 2;
    patos = cabecas - coelhos;
    /*para nao ter mais cabeça que pes ou vice-versa ... com o &&
    1) o total de coelhos tem que ser maior igual a zero
    2) o total de patos tem que ser maior igual a zero
    3) a soma de coelhos e patos deve ser igual ao numero de cabeças
    4) a soma do total de pés deve ser igua a soma total dos pes dos coelhos e patos
    */ 
    if (coelhos >= 0 && patos >= 0 && (coelhos + patos) == cabecas && (4 * coelhos + 2 * patos) == pes) {
        printf("total de coelhos: %d\n", coelhos);
        printf("total de patos: %d\n", patos);
    } else {
        printf("Valor indevido, número de cabeças maior que número de pés ou vice-versa, etc.\n");
    }
    return 0;
}
