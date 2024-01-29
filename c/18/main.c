
#include <stdio.h>
int main() {

    float  pedro,joao,parte_pedro,parte_joao;
    printf("Digite a quantia que Pedro jogou: ");
    scanf("%d",&pedro);
    printf("Digite a quantia que Joao jogou: ");
    scanf("%d",&joao);
    parte_pedro = pedro/(pedro+joao);
    parte_joao = joao/(pedro+joao);
    printf("Pedro tem direito a %.2f%% do valor do prêmio.\n",parte_pedro*100);
    printf("João tem direito a %.2f%% do valor do prêmio.\n",parte_joao*100);
    return 0;
}
