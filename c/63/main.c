//for simples

#include <stdio.h>
#include <stdlib.h>
#include <locale.h>
#include <ncurses.h>

int main() {
    setlocale(LC_ALL, "pt_PT.UTF-8");
    
    // Initialize the ncurses library
    /*initscr();
    cbreak();
    noecho();
    keypad(stdscr, TRUE);

    // Print a message and wait for user input
    //printw("Press any key to continue...");
    //getch();
    // Clean up and exit
    //endwin();*/

    char ch = 's';
    char resp;
    char secreto;
    int tentativas=1;

        secreto='j';
        while (secreto!='y'){

        secreto = rand() % 26 + 'a';
        printf("%c - %d",secreto,tentativas);
        tentativas++;

        }
/*        tentativas = 1;
        printf("Digite uma letra entre 'a' e 'z': ");

        while((scanf("%c",&resp))!=secreto)
        {
            printf("%c é incorreto. Tente novamente\n",resp);
            tentativas++;
        }
        printf("%c É CORRETO!!\n", resp);
        printf("Você acertou em %d tentativas\n", tentativas);
        printf("\nQuer jogar novamente? (s/n): ");
        scanf("%c",&resp);
*/
    printf("\n\n");
    return 0;
}

