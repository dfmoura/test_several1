#include <stdio.h>
#include <termios.h>
#include <unistd.h>
#include <locale.h>

int main() {

    setlocale(LC_ALL,"pt_PT.UTF-8");
    char ch;
    printf("Digite uma letra de 'a' a 'z':\n" );
    ch=getchar();
    if(ch>='a'){
        if(ch<='z'){
            printf("\nVocê digitou uma letra minúscula.\n");
        }
    }


    return 0;
}
