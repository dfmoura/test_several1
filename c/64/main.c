//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
#include <ncurses.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");
    
    int i,j;
    for(i=0,j=0;i<10;i++){
        for(;j<10;j++){
            printf("%d",i+j);
        }
    }

    printf("\n\n");
    return 0;
}

