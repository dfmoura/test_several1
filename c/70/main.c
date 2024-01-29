//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");
    

    int num;
    int reverso = 0;

    printf("Digite um número inteiro: ");
    scanf("%d",&num);
    while (num != 0) {
        int digito = num % 10;    // pegar o ultimo digito do numero
        printf("%d\n",digito);
        reverso = reverso * 10 + digito; // acrescenta o dígito ao número invertido
        printf("%d\n",reverso);
        num = num / 10;          // Remova o último dígito do número original
        printf("%d\n",num);
    }


    printf("Seu número invertido é: %d\n", reverso);

    printf("\n");
    return 0;
}

