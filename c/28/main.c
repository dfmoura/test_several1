#include <stdio.h>
#include <termios.h>
#include <unistd.h>
#include <locale.h>

int main() {

    setlocale(LC_ALL,"pt_PT.UTF-8");
    char ch;
    int cont=0;
    printf("Digite uma frase\n" );
    while ((ch=getchar())!= '\n'){
        if(ch=='0'){
            printf("\nZERO detectado\n");
            cont++;
        }
        if(cont>0){
            printf("Você digitou %d zeros.\n",cont);
        }else{
            printf("Você não digitou nenhum zero.");
        }
    }
    printf("\n" );

    return 0;
}
