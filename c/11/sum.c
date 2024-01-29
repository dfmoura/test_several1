#include <stdio.h>
#include <stdlib.h>
#include <locale.h>


int main() {

    setlocale(LC_ALL,"pt_PT.UTF-8");
    float meses, dias, anos;
    printf("Digite a sua idade em anos: ");
    scanf("%f",&anos);
    dias = anos*365;
    meses = anos*12;
    printf("\nA sua idade em dias é: %.f\n",dias);
    printf("\nA sua idade em meses é: %.0f.\n",meses);
    printf("%d\n",-5);

    int n=1;
    printf("Valor=%d, endereco=%p\n",n,&n);

/*teste*/

    return 0;

}
