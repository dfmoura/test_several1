#include <stdio.h>
#include <stdlib.h>

int main() {
    
    //mostra a funcao getchar e putchar
    char c;
    printf("\nPressione uma tecla: ");
    c = getchar();
    printf("\nA tecla sucessora ASCII eh %c\n", c+1);
    return 0;
}
