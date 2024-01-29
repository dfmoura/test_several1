#include <stdio.h>
#include <stdlib.h>
#include <locale.h>


int main() {

    setlocale(LC_ALL,"pt_PT.UTF-8");
    
    char carac;
    printf("\nPressione uma tecla: ");
    carac=getchar();
    printf("\nA próxima tecla duas posições desta na tabela ASCII é: %c.\n\n",carac+2);

    return 0;

}
