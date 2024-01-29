#include <stdio.h>
#include <termios.h>
#include <unistd.h>
#include <locale.h>

// Function to simulate getch() behavior
char my_getch() {
    struct termios oldt, newt;
    char ch;
    
    // Store current terminal settings
    tcgetattr(STDIN_FILENO, &oldt);
    newt = oldt;
    
    // Modify terminal settings for non-canonical mode (no line buffering)
    newt.c_lflag &= ~(ICANON | ECHO);
    tcsetattr(STDIN_FILENO, TCSANOW, &newt);
    
    // Read a single character
    read(STDIN_FILENO, &ch, 1);
    
    // Restore original terminal settings
    tcsetattr(STDIN_FILENO, TCSANOW, &oldt);
    
    return ch;
}

int main() {
    setlocale(LC_ALL,"pt_PT.UTF-8");

    printf("Digite uma letra minúscula: ");
    char c = my_getch();
    printf("\nVocê digitou a letra: %c\n", c);
    char C;
    if (c >= 'a' && c<='z'){
        C = c - 'a' + 'A';
        printf("A letra maiúscula é: %c\n", C);
    }else{
        printf("Digitação inválida, digite uma letra minúscula.\n");
    }
    return 0;
}