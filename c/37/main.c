#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

/*semidigitos */
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    char ch;
    while ((ch=getchar())!='X'){
        if(ch >= '0' && ch <= '9'){
            continue;
            printf("%c",ch);
        }
    }
    printf("\n");

     return 0;   
}
