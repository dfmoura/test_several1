#include <stdlib.h>
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

#include <unistd.h> // For sleep function

int main() {
    int i;

    for (i = 0; i <= 10; ++i) {
        printf("Progress: %d%%", i * 20);
        fflush(stdout); // Flush the output buffer to ensure immediate printing

        // Wait for a short period to simulate some processing
        sleep(1);

        // Move the cursor back to the beginning of the line using "\r"
        printf("\r");

        // Clear the line after the cursor using ANSI escape sequence
        printf("\033[K");
    }

    printf("Loading complete!\n");

    return 0;
}