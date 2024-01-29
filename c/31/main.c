#include <stdio.h>
#include <stdlib.h>  
#include <locale.h>
//diagonal
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    int lin, col;
    for(lin=1; lin<25;lin++){
        for(col=1;col<25;col++){
            if(lin==col){
                printf("\u2588");
            }else{
                printf("\u2800");
            }
        }printf("\n\n");
    }
    return 0;
}
