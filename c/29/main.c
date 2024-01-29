#include <stdio.h>
#include <stdlib.h>  
#include <locale.h>
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");
    int lin, col;
    system("clear");  
    for (lin = 1; lin <= 8; lin++) {
        for (col = 1; col <= 8; col++) {
            if ((lin + col) % 2 == 0) {
                printf("\u2588\u2588");  //utilizei unicode por conta de erros
            } else {printf("  ");}
        }
        printf("\n");  // nova linha
    }
    printf("\n");
    for (lin = 1; lin <= 10; lin++) {
        for (col = 1; col <= 20; col++) {
            printf("xO"); 
        }
        printf("\n");  // nova linha
    }
    return 0;
}
