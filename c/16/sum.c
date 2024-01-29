#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
//volume circular
int main() {
    setlocale(LC_ALL,"pt_PT.UTF-8");
    double raio, altura;
    printf("PROGRAMA DE CÁLCULO DE VOLUME CIRCULAR\n");
    printf("======================================\n\n");
    printf("Digite qual o raio: ");
    scanf("%lf",&raio);
    printf("Digite qual a altura: ");
    scanf("%lf",&altura);
    printf("\nVol = %lf\n",3.141592 * (raio * raio)* altura);
    
    return 0;
}
