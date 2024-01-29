/*maratona ufu - coffee break*/
/*SOLUÇÃO: CONTAR O TOTAL DE BANDEJAS VAZIAS ENTRE AS CHEIAS
1) preencher vetor
2) 
*/



#include <stdio.h>
#include <stdlib.h>
#include <locale.h>


int main() {
    
    int n,y;
    char x;
    printf("Total de bandejas: ");
    scanf("%d", &n);
    printf("Informe a situacao de cada bandeja: ");
    
    int vector[n];
    for (int i = 0; i < n; i++) {
        scanf(" %c", &x);
        if (x == 'C'){
        vector[i] = 1;
        }else if (x == 'V'){
        vector[i] = 0;
        }
    }
    for (int i = 0; i < n; i++) {
        printf("%d ", vector[i]);
    }
    printf("\n");


    int posicaoInicio = -1;
    for (int i = 0; i < n; i++) {
        if (vector[i] == 1) {
            posicaoInicio = i;
            break;
        }
    }
    printf("Inicio: %d ",posicaoInicio);

    
    int posicaoFim = -1;
    for (int i = n - 1; i >= 0; i--) {
        if (vector[i] == 1) {
            posicaoFim = i;
            break;
        }
    }
    printf("Fim: %d.\n",posicaoFim);


    int contagem = 0;
    if (posicaoInicio != -1 && posicaoFim != -1) {
        for (int i = posicaoInicio; i < posicaoFim; i++) {
            if (vector[i] == 0) {
                contagem++;
            }
        }
    }

    printf("Posições para agrupar: %d\n", contagem);




    return 0;
    
}
