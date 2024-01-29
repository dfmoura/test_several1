#include <stdio.h>
#include <termios.h>
#include <unistd.h>
#include <locale.h>

// estrutura de decisao simples

int main() {
    setlocale(LC_ALL,"pt_PT.UTF-8");
    int anos;
    printf("Quantos anos você tem?\n");
    scanf("%d",&anos);
    if(anos < 30){
        printf("Você é muito jovem!\n");
    }
        


    return 0;
}