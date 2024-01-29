#include <stdio.h>
#include <stdlib.h>
#include <locale.h>


// jogo da velha

int main()
{
    setlocale(LC_ALL, "pt_PT.UTF-8");

    unsigned char m[3][3];
    int lin, col, j=0;

    const int TRUE = 1;
    const char O ='o', X='x';

    printf("Digite coordenadas na forma lin col: \n");

    for(lin=0;lin<3;lin++)
        for(col=0;col<3;col++)
            m[lin][col]='.';

    while (TRUE)
    {
        for(lin=0;lin<3;lin++)
        {
            for(col=0;col<3;col++)
                printf("%c",m[lin][col]);
            printf("\n");
        }

        if((m[0][0]==0 &&m[0][1]==0 && m[0][2]==0)||
           (m[1][0]==0 &&m[1][1]==0 && m[1][2]==0)||
           (m[2][0]==0 &&m[2][1]==0 && m[2][2]==0)||
           (m[0][0]==0 &&m[1][0]==0 && m[2][0]==0)||
           (m[0][1]==0 &&m[1][1]==0 && m[2][1]==0)||
           (m[0][2]==0 &&m[1][2]==0 && m[2][2]==0)||
           (m[0][0]==0 &&m[1][1]==0 && m[2][2]==0)||
           (m[0][2]==0 &&m[0][1]==0 && m[0][0]==0))
           {
                printf("\aVocê ganhou, primeiro jogador!!!\n");
                break;
           }

        if((m[0][0]==X &&m[0][1]==X && m[0][2]==X)||
           (m[1][0]==X &&m[1][1]==X && m[1][2]==X)||
           (m[2][0]==X &&m[2][1]==X && m[2][2]==X)||
           (m[0][0]==X &&m[1][0]==X && m[2][0]==X)||
           (m[0][1]==X &&m[1][1]==X && m[2][1]==X)||
           (m[0][2]==X &&m[1][2]==X && m[2][2]==X)||
           (m[0][0]==X &&m[1][1]==X && m[2][2]==X)||
           (m[0][2]==X &&m[0][1]==X && m[0][0]==X))
           {
                printf("\aVocê ganhou, segundo jogador!!!\n");
                break;
           }
           if(j==9)
           {
            printf("\aEmpatou!!!\n");
            break;
           }
           printf("Coordenadas: ");
           scanf("%d%d",&lin,&col);

           if(m[lin][col]=='.')
           {
            if(j%2) m[lin][col]=X;
            else m[lin][col]=0;
            j++;
           }


    }
    

    


    printf("\n");
    return 0;
}
