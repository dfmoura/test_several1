#include <stdio.h>
#include <stdlib.h>

int main() {

    //operadores relacionais > >= < <= == !=
    int Verdadeiro,Falso;
    Verdadeiro = (15 < 20);
    Falso = (15 == 20);
    printf("Verdadeiro %d\n",Verdadeiro);
    printf("Falso %d\n",Falso);

    //procedencia dos operadores relacionais
    printf("O valor da expressao 4+1<3 eh %d\n", 4+1<3);
    printf("O valor da expressao 2<1+3 eh %d\n", 2<1+3);


    /* operadores logicos 
    &&  e
    ||  ou
    !   nao
    xxx && yyy  resulta verdadeiro
    xxx || yyy  resulta verdadeiro se uma das situacoes forem verdadeiras
    !xxx        resulta verdadeiro se a situacao for falsa (o oposto)
    */

    printf("Nao verdadeiro: %d\n",!5);
    printf("Verdadeiro: %d\n",1||2);
    printf("Nao verdadeiro: %d\n",!5);

    printf("%d\n",(5+1)/2*3);
    int i,j; 
    i=j=(2+3)/4;
    printf("%d - %d\n",i,j); 
    
    
    int a=1,b=2,c;
    c=a+++b;
    printf("c=a+++b  --> %f\n",c);

    int d=4;
    a=1,b=2,c=3;
    a += b + c;
    printf("\na += b + c --> %d\n",a);
    d=4,a=1,b=2,c=3;
    b *= c = d + 2;
    printf("b *= c = d + 2  --> %d\n",b);
    d=4,a=1,b=2,c=3;
    d %= (a+a+a);
    printf("d %%= a+a+a --> %d\n", d);
    d=4,a=1,b=2,c=3;
    d -= c -= b -= a;
    printf("d -= c -= b -= a   -->  %d\n",b);
    d=4,a=1,b=2,c=3;
    a += b+= c += 7;
    printf("a += b+= c += 7   -->  %d\n",a);
    printf("%d\n",1 != 1 == 1);

    float z;
    int w;
    w = 22345;
    z = (float)(w);
    printf("%f\n",z);
    


    return 0;

}
