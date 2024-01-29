#include <stdio.h>
#include <termios.h>
#include <unistd.h>
#include <locale.h>

int main() {

    setlocale(LC_ALL,"pt_PT.UTF-8");
    int a,b,i, n,m, soma = 0;
    printf("Digite um número: ");
    scanf("%d",&n);
    m=n;
    if(n < 0) n = -n;
    for(i=1; n>0;n--)
    {
        soma +=i;
        printf("..%d...",n);
        printf("..%d...",i);
        i +=2;
        printf("..%d..\n",i);
    }
    printf("O quadrado de %d é ", m);
    printf("%d.\n", soma);
    return 0;
}
