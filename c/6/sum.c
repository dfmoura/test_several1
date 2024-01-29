#include <stdio.h>
#include <stdlib.h>

int main() {

    //operador de incremento e decremento
    //prefixado
    int n,x;
    n=5;
    x=++n;
    printf("\nN=%d X=%d\n",n,x);
    //pos fixado
    n=5;
    x=n++;
    printf("\nN=%d X=%d\n",n,x);

    int m,y;
    m=5;
    y=--m;
    printf("\nM=%d Y=%d\n",m,y);
    //pos fixado
    m=5;
    y=m--;
    printf("\nM=%d Y=%d\n",m,y);

    printf("%d%c%d",++x,'\n',5*y+4);
    printf("%d\t%d\t%d\n",n,n+1,n++);

    n=0;
    int i=3;
    n=i*(i+1)+(++i);
    printf("\nn = %d\n",n);

    i=3;
    n=i*(i+1)+(i++);
    printf("\nn = %d\n",n);

    i=3;
    printf("\nn = %d\n",n=i*(i+1)+(i++));

    i=0;
    i=3;
    printf("\n%d\t%d\t%d\n",(i=i+1),(i=i+1),(i=i+1));

    return 0;

}
