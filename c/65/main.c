//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
#include <ncurses.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");
    
    int a;
    for(a=36;a>0;a/=2){
        printf("%d\t",a);

    }

    printf("\n");
    return 0;
}

