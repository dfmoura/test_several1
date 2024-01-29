#include <stdio.h>
#include <stdlib.h>

int main() {
    int num1, num2, sum;
    //teste basico
    printf("Digite dois numeros: ");
    scanf("%d %d", &num1, &num2);
    sum = num1 + num2;
    printf("Soma: %d\n", sum);
    
    //operadores
    printf("Operadores + - * / %%\n");
    
    //endereco da variavel alocada
    int n=2;
    printf("Valor=%d, endereco = %p\n",n,&n);

    //calcula a sua idade em dias
    float anos,dias;
    printf("digite a sua idade em anos: ");
    scanf("%f",&anos);
    dias=anos*365;
    printf("A sua idade em dias eh %.0f.\n",dias);

    //calcular a media de 4 notas
    float p1,p2,p3,p4;
    double media;
    printf("\nDigite as notas das 4 provas: ");
    scanf("%f%f%f%f",&p1,&p2,&p3,&p4);
    media=(p1+p2+p3+p4)/4.0;
    printf("Media: %.2f\n",media);

    //adivinhacao dos da soma de cinco numeros
    int x,r;
    printf("\n Digite um numero de ate 4 algarismos: ");
    scanf("%d",&x);
    r=19998 + x;
    printf("\nO resultado da soma eh: %d",r);
    printf("\nDigite o segundo numero: ");
    scanf("%d",&x);
    printf("\nO meu numero eh: %d",9999-x);
    printf("\nDigite o quarto numero: ");
    scanf("%d",&x);
    printf("\nO meu numero eh: %d\n",9999-x);


    //programa que converte temperaturas
    float ftemp,ctemp;
    printf("Digite temperatura em graus celsius: ");
    scanf("%f",&ctemp);
    ftemp=ctemp*9/5+32;
    printf("\nTemperatura em graus Fahrenheit eh %.2f\n",ftemp);

    //printf dec hexa octa
    char a='A';
    printf("\nDigite um caractere e veja o em decimal,");
    printf(" octal e hexadecimal: ");
    scanf("%c",&a);
    printf("\nCaractere = %c\nDec\t= %d\nOct\t= %o\nHex\t= %x\n",a,a,a,a);

    //data entrada
    int dia, mes, ano;
    printf("Digte uma data no formato dd/mm/aaaa: ");
    scanf("%d%*c%d%*c%d",&dia,&mes,&ano);
    printf("A data que voce digitou foi: %02d/%02d/%d\n",dia,mes,ano);


    return 0;

}
