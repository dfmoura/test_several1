#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

/*adivinhacoes */
int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");

    float incr=50.0, adiv=50.0;
    int tentat;

    printf("Pense em um número entre 1 e 99, e responda \n");
    printf(" =, > ou < para igual, maior ou menor\n");

    while (incr >= 1.0){
        char ch;
        incr /=2;
        printf("\n=, > ou < a %d? ", (int)adiv);
            while((ch=getchar())=='\n');
            tentat++;
            if (ch == '='){
                break;
            }else if (ch == '>'){ 
                adiv += incr;
            }else if (ch == '<'){
                adiv -= incr;
            }else{
                printf("\nEntrada inválida. Use apenas '=', '>' ou '<'.\n");
                continue;
            }
    }
    printf("\nO número é %d",(int)adiv);
    printf("\nCOMO SOU ESPERTO!!!!\n");
    printf("\nTentativas: %d\n",tentat);
    return 0;   
}
