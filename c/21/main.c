/*em um cercado ha varios patos e coelhos, escreva um programa que solicite ao
usuario o total de cabeças e o total de pés, e determine quantos coelhos se
encontram nesse cercado*/
#include <stdio.h>

int main() {
        int cabecas,pes,coelhos=0,patos=0;
        printf("Digite o numero de cabecas: ");
        scanf("%d", &cabecas);
        printf("Digite o numero de pes: ");
        scanf("%d", &pes);

        while (pes % cabecas != 0 && (cabecas*2<pes && cabecas*4>pes))   {
            printf("Digite novamente o numero de pes: ");
            scanf("%d", &pes);
        }
    

        for (coelhos = 0; coelhos <= cabecas; coelhos++){
            patos = cabecas - coelhos;
            if ((coelhos * 4 + patos * 2 ) == pes){
                printf("Quantidade de coelhos: %d\n", coelhos);
                printf("Quantidade de patos: %d\n", patos);
                break;
            }

        }

    return 0;
}
